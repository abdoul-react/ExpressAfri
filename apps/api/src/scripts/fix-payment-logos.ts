/**
 * Script de migration : remplace les URLs SVG des méthodes de paiement
 * par des URLs PNG compatibles mobile (expo-image ne supporte pas les SVG).
 *
 * Usage :
 *   cd apps/api
 *   npx tsx src/scripts/fix-payment-logos.ts
 */
import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Mapping code → nouvelle URL PNG
// Ces URLs sont des images PNG/JPG directement accessibles et stables
const LOGO_UPDATES: Record<string, string> = {
  // Orange Money : PNG du logo Orange (thumbail Wikipedia générée côté serveur = JPEG/PNG)
  orange_money:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Orange_logo.svg/200px-Orange_logo.svg.png',
  // Carte bancaire / Mastercard : PNG via logo Mastercard
  card: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/200px-Mastercard-logo.svg.png',
};

// Vérifie si une URL pointe vers un SVG
function isSvg(url: string): boolean {
  return /\.svg(\?.*)?$/i.test(url) || url.includes('image/svg');
}

async function main() {
  const client = await pool.connect();
  try {
    // Chercher toutes les lignes avec un SVG (chemin contenant .svg)
    const result = await client.query(
      "SELECT id, code, name, logo_url FROM payment_methods WHERE logo_url LIKE '%.svg%' OR logo_url LIKE '%/svg/%'",
    );

    console.log(
      `\n🔍 ${result.rows.length} méthode(s) avec un logo SVG trouvée(s):\n`,
    );

    for (const row of result.rows) {
      console.log(`  - ${row.name} (${row.code}) : ${row.logo_url}`);

      const newUrl = LOGO_UPDATES[row.code];
      if (newUrl) {
        await client.query(
          'UPDATE payment_methods SET logo_url = $1, updated_at = NOW() WHERE id = $2',
          [newUrl, row.id],
        );
        console.log(`    ✓ Mis à jour → ${newUrl}\n`);
      } else {
        console.log(
          `    ⚠ Pas de remplacement défini pour '${row.code}'. Mettez à jour LOGO_UPDATES dans ce script.\n`,
        );
      }
    }

    // Vérification finale
    const check = await client.query(
      'SELECT code, name, logo_url FROM payment_methods ORDER BY position',
    );
    console.log('\n📋 État final des méthodes de paiement :\n');
    for (const row of check.rows) {
      const svgFlag = isSvg(row.logo_url) ? ' ⚠ SVG' : ' ✓';
      console.log(`  ${row.code.padEnd(20)} ${svgFlag}  ${row.logo_url}`);
    }

    console.log('\n✅ Migration terminée.\n');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('❌ Erreur :', e.message);
  process.exit(1);
});
