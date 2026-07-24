/**
 * Migration ponctuelle : ajoute les paramètres de branding de l'en-tête
 * (affichage du nom + couleurs du dégradé) dans app_settings.
 * Idempotent (ON CONFLICT DO NOTHING) — exécuter avec : npx tsx src/migrate-brand-settings.ts
 */
import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const rows = [
    {
      key: 'brand.showName',
      value: 'true',
      type: 'boolean',
      label: 'Afficher le nom à côté du logo (en-tête)',
      group: 'theme',
    },
    {
      key: 'brand.nameColor1',
      value: '#FF6B35',
      type: 'color',
      label: 'Couleur du nom — début du dégradé',
      group: 'theme',
    },
    {
      key: 'brand.nameColor2',
      value: '#E8590C',
      type: 'color',
      label: 'Couleur du nom — fin du dégradé',
      group: 'theme',
    },
  ];
  for (const r of rows) {
    await pool.query(
      `INSERT INTO app_settings (key, value, type, label, "group")
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (key) DO NOTHING`,
      [r.key, r.value, r.type, r.label, r.group],
    );
  }
  const res = await pool.query(
    `SELECT key, value FROM app_settings WHERE key LIKE 'brand.%' ORDER BY key`,
  );
  console.log('Paramètres brand.* en base :', res.rows);
  await pool.end();
}
main();
