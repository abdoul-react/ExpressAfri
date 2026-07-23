/**
 * Migration ponctuelle : ajoute les paramètres de l'écran Boutique
 * (affichage de « Recommandé pour vous ») dans app_settings.
 * Idempotent (ON CONFLICT DO NOTHING) — exécuter avec : npx tsx src/migrate-shop-settings.ts
 */
import 'dotenv/config'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  const rows = [
    { key: 'shop.showRecommended', value: 'true', type: 'boolean', label: "Afficher « Recommandé pour vous » (écran Boutique)", group: 'shop' },
  ]
  for (const r of rows) {
    await pool.query(
      `INSERT INTO app_settings (key, value, type, label, "group")
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (key) DO NOTHING`,
      [r.key, r.value, r.type, r.label, r.group],
    )
  }
  const res = await pool.query(`SELECT key, value FROM app_settings WHERE key LIKE 'shop.%' ORDER BY key`)
  console.log('Paramètres shop.* en base :', res.rows)
  await pool.end()
}
main()
