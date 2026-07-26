// Baseline de la table de suivi drizzle.
//
// La base a été créée par `push`/seed : le schéma est à jour jusqu'à 0035 mais
// `drizzle.__drizzle_migrations` est vide. `drizzle-kit migrate` rejoue donc
// 0000, échoue sur « le type admin_role existe déjà » et avale l'erreur (exit 1
// silencieux). On marque 0000..0035 comme déjà appliquées, avec le hash exact
// attendu par le migrator (sha256 du fichier .sql brut) et le `when` du journal.
// 0036 reste non marquée : c'est `npm run migrate` qui l'appliquera réellement.
require('dotenv').config();
const { Client } = require('pg');
const crypto = require('crypto');
const { readFileSync } = require('fs');
const { join } = require('path');

const BASELINE_THROUGH = 35;

(async () => {
  const journal = JSON.parse(
    readFileSync(join(__dirname, '../drizzle/meta/_journal.json'), 'utf8'),
  );

  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  const { rows: existing } = await c.query(
    'select count(*)::int as n from drizzle.__drizzle_migrations',
  );
  if (existing[0].n > 0) {
    console.log(`Table de suivi déjà peuplée (${existing[0].n} lignes) — rien à faire.`);
    await c.end();
    return;
  }

  const toMark = journal.entries.filter((e) => e.idx <= BASELINE_THROUGH);

  await c.query('begin');
  try {
    for (const entry of toMark) {
      const sql = readFileSync(
        join(__dirname, `../drizzle/${entry.tag}.sql`),
        'utf8',
      );
      const hash = crypto.createHash('sha256').update(sql).digest('hex');
      await c.query(
        'insert into drizzle.__drizzle_migrations (hash, created_at) values ($1, $2)',
        [hash, entry.when],
      );
      console.log(`marquée ${entry.tag}`);
    }
    await c.query('commit');
  } catch (e) {
    await c.query('rollback');
    throw e;
  }

  console.log(`\n${toMark.length} migrations marquées comme appliquées (jusqu'à 0${BASELINE_THROUGH}).`);
  console.log('Lancer maintenant : npm run migrate');
  await c.end();
})().catch((e) => {
  console.error('ERREUR:', e.message);
  process.exit(1);
});
