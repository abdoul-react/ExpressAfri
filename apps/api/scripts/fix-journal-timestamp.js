// Réaligne la ligne de suivi de 0024 sur le `when` corrigé du journal.
//
// L'entrée 0024 du journal portait 1784900000000, un timestamp aberrant
// supérieur à celui de toutes les migrations suivantes. Le migrator drizzle ne
// lit que la ligne au `created_at` maximum et n'applique que les migrations
// dont le `folderMillis` lui est supérieur : 0036 était donc silencieusement
// sautée, avec un message « migrations applied successfully » trompeur.
require('dotenv').config();
const { Client } = require('pg');
const crypto = require('crypto');
const { readFileSync } = require('fs');
const { join } = require('path');

(async () => {
  const journal = JSON.parse(
    readFileSync(join(__dirname, '../drizzle/meta/_journal.json'), 'utf8'),
  );
  const entry = journal.entries.find((e) => e.tag === '0024_otp_hash_and_ip');
  const sql = readFileSync(join(__dirname, `../drizzle/${entry.tag}.sql`), 'utf8');
  const hash = crypto.createHash('sha256').update(sql).digest('hex');

  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  const r = await c.query(
    'update drizzle.__drizzle_migrations set created_at = $1 where hash = $2 and created_at <> $1',
    [entry.when, hash],
  );
  console.log(`lignes réalignées : ${r.rowCount} (cible ${entry.when})`);

  const { rows } = await c.query(
    'select max(created_at)::text as max_created from drizzle.__drizzle_migrations',
  );
  console.log('max created_at en base :', rows[0].max_created);
  console.log('when de 0036           :', journal.entries.find((e) => e.idx === 36).when);

  await c.end();
})().catch((e) => {
  console.error('ERREUR:', e.message);
  process.exit(1);
});
