import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq, inArray } from 'drizzle-orm';
import * as schema from './database/schema';

/**
 * Jeu de démonstration ADDITIF pour valider visuellement les cartes boutique,
 * les en-têtes et les quatre formats de section. N'écrase rien : toutes les
 * lignes créées portent un id préfixé `dddddddd-…`, ce qui rend le nettoyage
 * total (`--clean`) sûr et sans effet de bord sur les vraies données.
 *
 *   npx tsx src/seed-demo-stores.ts          → crée le jeu
 *   npx tsx src/seed-demo-stores.ts --clean  → le supprime
 *   … --force                                → supprime aussi les commandes de
 *                                              test qui référencent ces produits
 */

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema }) as any;

const P = 'dddddddd-0000-4000-8000-';
const id = (n: number) => `${P}${String(n).padStart(12, '0')}`;

const IMG = (q: string, w = 600) =>
  `https://images.unsplash.com/${q}?w=${w}&q=80&auto=format&fit=crop`;

// Photos réutilisables — logos carrés, couvertures larges, produits.
const LOGOS = [
  IMG('photo-1560472354-b33ff0c44a43', 300),
  IMG('photo-1441986300917-64674bd600d8', 300),
  IMG('photo-1607082348824-0a96f2a4b9da', 300),
  IMG('photo-1556742049-0cfed4f6a45d', 300),
  IMG('photo-1542291026-7eec264c27ff', 300),
  IMG('photo-1523275335684-37898b6baf30', 300),
];
const COVERS = [
  IMG('photo-1521737604893-d14cc237f11d', 1200),
  IMG('photo-1555529669-e69e7aa0ba9a', 1200),
  IMG('photo-1481437156560-3205f6a55735', 1200),
  IMG('photo-1567401893414-76b7b1e5a7a5', 1200),
  IMG('photo-1441984904996-e0b6ba687e04', 1200),
  IMG('photo-1472851294608-062f824d29cc', 1200),
];
const GALLERY = [
  IMG('photo-1441986300917-64674bd600d8'),
  IMG('photo-1573855619003-97b4799dcd8b'),
  IMG('photo-1534452203293-494d7ddbf7e0'),
  IMG('photo-1519415387722-a1c3bbef716c'),
];
const PRODUCT_IMAGES = [
  IMG('photo-1505740420928-5e560c06d30e'),
  IMG('photo-1523275335684-37898b6baf30'),
  IMG('photo-1542291026-7eec264c27ff'),
  IMG('photo-1526170375885-4d8ecf77b99f'),
  IMG('photo-1560769629-975ec94e6a86'),
  IMG('photo-1572635196237-14b3f281503f'),
  IMG('photo-1546868871-7041f2a55e12'),
  IMG('photo-1585386959984-a4155224a1ad'),
  IMG('photo-1600185365483-26d7a4cc7519'),
  IMG('photo-1491553895911-0055eca6402d'),
  IMG('photo-1595950653106-6c9ebd614d3a'),
  IMG('photo-1560343090-f0409e92791a'),
];

type Layout = 'grid' | 'rail' | 'list' | 'showcase';

/**
 * Noms volontairement contrastés : très court, moyen, très long, ALL CAPS,
 * accents/diacritiques et emoji. C'est le test de non-débordement des cartes.
 */
const STORES: {
  name: string;
  city: string;
  country: string;
  description: string;
  sections: { title: string; subtitle: string | null; layout: Layout }[];
}[] = [
  {
    name: 'Ba',
    city: 'Niamey',
    country: 'Niger',
    description: 'Le plus court nom du marché — test de carte minimale.',
    sections: [
      { title: 'Nouveautés', subtitle: 'Arrivages de la semaine', layout: 'grid' },
      { title: 'Coup de cœur', subtitle: null, layout: 'showcase' },
    ],
  },
  {
    name: 'Sahel Électronique',
    city: 'Zinder',
    country: 'Niger',
    description:
      'Téléphonie, informatique et accessoires. Garantie 12 mois sur tout le catalogue.',
    sections: [
      { title: 'Smartphones', subtitle: 'Les modèles les plus vendus', layout: 'rail' },
      { title: 'Accessoires', subtitle: 'Câbles, coques, chargeurs', layout: 'grid' },
      { title: 'Bons plans', subtitle: 'Stocks limités', layout: 'list' },
    ],
  },
  {
    name: 'Maison du Textile et de la Confection Traditionnelle du Sahel',
    city: 'Maradi',
    country: 'Niger',
    description:
      'Un nom délibérément interminable pour vérifier que la carte ne déborde jamais, quel que soit le nombre de lignes du titre.',
    sections: [
      { title: 'Tissus wax', subtitle: 'Pagnes et coupons', layout: 'showcase' },
      { title: 'Prêt-à-porter', subtitle: null, layout: 'grid' },
    ],
  },
  {
    name: 'BOUTIQUE EXPRESS DAKAR',
    city: 'Dakar',
    country: 'Sénégal',
    description: 'Tout en majuscules — vérification de la hauteur de ligne.',
    sections: [
      { title: 'Sélection du gérant', subtitle: 'Choisis à la main', layout: 'list' },
      { title: 'Promotions', subtitle: 'Jusqu’à -40 %', layout: 'rail' },
    ],
  },
  {
    name: 'Épicerie Ndèye Fatou & Frères',
    city: 'Abidjan',
    country: "Côte d'Ivoire",
    description: 'Accents et esperluette : test des diacritiques dans les titres.',
    sections: [
      { title: 'Produits frais', subtitle: 'Livrés le jour même', layout: 'grid' },
      { title: 'Épicerie fine', subtitle: null, layout: 'rail' },
      { title: 'En vitrine', subtitle: 'Le produit du moment', layout: 'showcase' },
    ],
  },
  {
    name: 'Kano Fashion 🛍️ Store',
    city: 'Kano',
    country: 'Nigeria',
    description: 'Un emoji dans le nom — test du rendu des caractères larges.',
    sections: [
      { title: 'Tendances', subtitle: 'Ce que tout le monde porte', layout: 'rail' },
      { title: 'Chaussures', subtitle: null, layout: 'list' },
    ],
  },
];

const PRODUCT_NAMES = [
  'Écouteurs',
  'Chemise en coton imprimé wax, coupe ajustée, taille M',
  'Sac à main cuir',
  'MONTRE CONNECTÉE SPORT',
  'Sandales en cuir tressé fait main à Maradi par des artisans locaux',
  'Parfum 50 ml',
  'Chargeur rapide 65 W USB-C',
  'Tapis berbère',
  'Lunettes de soleil polarisées avec étui rigide et chiffon microfibre',
  'Théière',
  'Ensemble bazin riche brodé main',
  'Enceinte bluetooth étanche',
];

/**
 * Sections de la LISTE des boutiques (admin central). Les index renvoient à
 * `STORES`. Volontairement chevauchantes : une même boutique doit pouvoir
 * figurer dans plusieurs sections, et le cœur doit basculer partout à la fois.
 * La dernière est vide — une section sans boutique ne doit pas casser l'écran.
 */
const GROUPS: {
  title: string;
  subtitle: string | null;
  icon: string | null;
  storeIndexes: number[];
}[] = [
  {
    title: 'Électronique',
    subtitle: 'Téléphonie, informatique et accessoires',
    icon: 'smartphone',
    storeIndexes: [1, 5],
  },
  {
    title: 'Mode et textile',
    subtitle: 'Prêt-à-porter, tissus et confection traditionnelle',
    icon: 'shirt',
    storeIndexes: [2, 3, 5],
  },
  {
    title: 'Alimentation',
    subtitle: null,
    icon: 'shoppingBasket',
    storeIndexes: [4, 0],
  },
  {
    title:
      'Sélection éditoriale de la rédaction ExpressAfri pour la saison en cours',
    subtitle: 'Titre très long — test de non-débordement de l’en-tête',
    icon: null,
    storeIndexes: [0, 1, 2, 3, 4, 5],
  },
  {
    title: 'Bientôt disponible',
    subtitle: 'Section vide — ne doit rien afficher côté client',
    icon: null,
    storeIndexes: [],
  },
];

/**
 * Moyens de paiement par boutique. Les `provider` doivent exister dans le
 * catalogue global `payment_methods` (alimenté par `src/seed.ts`) : le service
 * refuse tout provider absent, et le seed doit refléter cette contrainte.
 *
 * Répartition volontairement inégale : une boutique sans aucun moyen (le rail
 * doit alors disparaître), une avec un seul, une avec quatre.
 */
const PAYMENTS: {
  provider: string;
  type: string;
  displayName: string;
  instructions: string | null;
}[] = [
  {
    provider: 'orange_money',
    type: 'mobile_money',
    displayName: 'Orange Money',
    instructions: 'Composez #144# puis suivez les instructions.',
  },
  {
    provider: 'moov_money',
    type: 'mobile_money',
    displayName: 'Moov Money',
    instructions: null,
  },
  {
    provider: 'wave',
    type: 'mobile_money',
    displayName: 'Wave',
    instructions: 'Scannez le QR code en boutique.',
  },
  {
    provider: 'cod',
    type: 'cash_on_delivery',
    displayName: 'Paiement à la livraison',
    instructions: 'Préparez le montant exact — le livreur ne rend pas la monnaie.',
  },
];

/** Nombre de moyens activés par boutique, indexé comme `STORES`. */
const PAYMENT_COUNTS = [0, 4, 2, 1, 3, 2];

/**
 * Tables qui référencent `table` par une FK, telles qu'elles existent vraiment
 * en base. Les lister en dur dériverait à la première table ajoutée — et le
 * schéma en compte une trentaine qui pendent après `stores`.
 */
async function referencingTables(table: string) {
  const { rows } = await pool.query<{ table_name: string; column_name: string }>(
    `SELECT DISTINCT tc.table_name, kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON kcu.constraint_name = tc.constraint_name
       JOIN information_schema.constraint_column_usage ccu
         ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = $1`,
    [table],
  );
  return rows.filter((r) => r.table_name !== table);
}

/**
 * Supprime des lignes de `table` et, récursivement, tout ce qui y pend.
 *
 * La récursion est nécessaire : les dépendances font plusieurs niveaux
 * (`stores` → `conversations` → `messages`) et un simple DELETE sur le premier
 * niveau viole la FK du second. Quand la table intermédiaire n'a pas de colonne
 * `id`, on ne peut pas descendre plus bas — un DELETE direct suffit alors, car
 * une table sans clé primaire propre n'est référencée par personne.
 *
 * Les noms de table et de colonne viennent du catalogue système, jamais d'une
 * entrée utilisateur ; les identifiants restent paramétrés.
 */
async function purge(table: string, ids: string[], seen = new Set<string>()) {
  if (!ids.length) return;

  for (const ref of await referencingTables(table)) {
    // Garde-fou contre les cycles de FK (une table peut se référencer elle-même
    // via un parent_id) : on ne redescend pas deux fois dans le même chemin.
    const path = `${table}>${ref.table_name}.${ref.column_name}`;
    if (seen.has(path)) continue;
    const next = new Set(seen).add(path);

    if (await hasIdColumn(ref.table_name)) {
      const { rows } = await pool.query<{ id: string }>(
        `SELECT id FROM "${ref.table_name}" WHERE "${ref.column_name}" = ANY($1::uuid[])`,
        [ids],
      );
      await purge(
        ref.table_name,
        rows.map((r) => r.id),
        next,
      );
    } else {
      await pool.query(
        `DELETE FROM "${ref.table_name}" WHERE "${ref.column_name}" = ANY($1::uuid[])`,
        [ids],
      );
    }
  }

  await pool.query(`DELETE FROM "${table}" WHERE id = ANY($1::uuid[])`, [ids]);
}

const idColumnCache = new Map<string, boolean>();
async function hasIdColumn(table: string) {
  const cached = idColumnCache.get(table);
  if (cached !== undefined) return cached;
  const { rows } = await pool.query(
    `SELECT 1 FROM information_schema.columns
      WHERE table_name = $1 AND column_name = 'id' AND data_type = 'uuid'`,
    [table],
  );
  const has = rows.length > 0;
  idColumnCache.set(table, has);
  return has;
}

/**
 * Tables dont la suppression détruirait des données produites par de vrais
 * usages (commandes, paiements, conversations…) plutôt que par le seed.
 * `purge` les traverse en cascade, donc il faut prévenir avant de les toucher.
 */
const SENSITIVE_TABLES = new Set([
  'orders',
  'order_items',
  'payments',
  'refunds',
  'returns',
  'disputes',
  'receipts',
  'shipments',
  'conversations',
  'messages',
  'product_reviews',
  'payouts',
  'affiliate_commissions',
]);

/**
 * Recense ce que la purge des boutiques de démo détruirait dans les tables
 * sensibles. On compte avant de supprimer : un `--clean` ne doit jamais effacer
 * une commande ou une conversation réelle sans l'avoir annoncé.
 */
async function assessCollateral(storeIds: string[]) {
  const found: { table: string; rows: number }[] = [];
  for (const ref of await referencingTables('stores')) {
    if (!SENSITIVE_TABLES.has(ref.table_name)) continue;
    const { rows } = await pool.query(
      `SELECT count(*)::int AS n FROM "${ref.table_name}"
        WHERE "${ref.column_name}" = ANY($1::uuid[])`,
      [storeIds],
    );
    if (rows[0].n > 0) found.push({ table: ref.table_name, rows: rows[0].n });
  }
  return found;
}

async function clean() {
  console.log('Nettoyage du jeu de démonstration…');
  const storeIds = STORES.map((_, i) => id(1 + i));
  const groupIds = GROUPS.map((_, i) => id(50 + i));

  // Les boutiques de démo peuvent avoir accumulé de vraies traces d'usage
  // (commandes, conversations) pendant les tests. La purge les emporterait en
  // cascade : on refuse, et on laisse le choix explicite.
  const collateral = await assessCollateral(storeIds);
  if (collateral.length && !process.argv.includes('--force')) {
    throw new Error(
      `La suppression des boutiques de démonstration détruirait aussi :\n` +
        collateral.map((c) => `  · ${c.rows} ligne(s) dans ${c.table}`).join('\n') +
        `\nCes données viennent d'usages réels, pas du seed. Relancer avec --force ` +
        `pour les supprimer, ou les archiver d'abord.`,
    );
  }
  if (collateral.length) {
    console.log(
      `  ! --force : ${collateral
        .map((c) => `${c.rows} ${c.table}`)
        .join(', ')} seront supprimés`,
    );
  }

  const prods = await db
    .select({ id: schema.products.id })
    .from(schema.products)
    .where(inArray(schema.products.storeId, storeIds));
  const prodIds = prods.map((p: any) => p.id);

  // Les produits ne pendent pas après `stores` par une FK cascade : il faut
  // les purger explicitement, avec leurs propres dépendances.
  if (prodIds.length) await purge('products', prodIds);
  // `purge` remonte les FK de `stores` : bannières, sections, moyens de
  // paiement, médias et catégories partent avec, sans les énumérer ici.
  await purge('stores', storeIds);
  // Les sections de la liste des boutiques n'ont pas de `storeId` : elles ne
  // disparaissent pas avec les boutiques, il faut les cibler par leur id.
  await purge('store_groups', groupIds);

  console.log(
    `  ✓ ${STORES.length} boutiques et ${GROUPS.length} sections de démonstration supprimées`,
  );
}

async function main() {
  if (process.argv.includes('--clean')) {
    await clean();
    return;
  }

  // Idempotent : on repart d'un état propre avant de réinsérer.
  await clean();
  console.log('Création du jeu de démonstration…');

  let seq = 100;
  const nextId = () => id(++seq);

  for (let i = 0; i < STORES.length; i++) {
    const def = STORES[i];
    const storeId = id(1 + i);
    const slugBase = `demo-${i}`;

    await db.insert(schema.stores).values({
      id: storeId,
      name: def.name,
      email: `demo${i}@expressafri.test`,
      phone: `+227 90 00 00 0${i}`,
      country: def.country,
      city: def.city,
      description: def.description,
      status: 'approved',
      commissionRate: '5.00',
    });

    // Logo + couverture + galerie : ce sont eux qui remplissent la zone claire
    // de la carte et l'en-tête de la page boutique.
    await db.insert(schema.storeMedia).values([
      {
        id: nextId(),
        storeId,
        type: 'logo',
        url: LOGOS[i % LOGOS.length],
        alt: `Logo ${def.name}`,
        sortOrder: 0,
      },
      {
        id: nextId(),
        storeId,
        type: 'cover',
        url: COVERS[i % COVERS.length],
        alt: `Couverture ${def.name}`,
        sortOrder: 0,
      },
      ...GALLERY.slice(0, 3).map((url, g) => ({
        id: nextId(),
        storeId,
        type: 'gallery',
        url,
        alt: `Photo ${g + 1}`,
        sortOrder: g,
      })),
    ]);

    // Une bannière de campagne sur deux boutiques seulement : il faut aussi
    // pouvoir vérifier le rendu sans bandeau.
    if (i % 2 === 0) {
      await db.insert(schema.banners).values({
        id: nextId(),
        storeId,
        title: `Campagne ${def.name}`,
        subtitle: 'Offre limitée',
        imageUrl: COVERS[(i + 3) % COVERS.length],
        ctaText: 'Voir',
        discountLabel: '-30%',
        isActive: true,
        position: 0,
        screen: 'store',
      });
    }

    // Deux catégories par boutique → les puces de filtre sont visibles.
    const cats = await db
      .insert(schema.categories)
      .values([
        {
          id: nextId(),
          storeId,
          name: 'Sélection',
          slug: `${slugBase}-selection`,
          isActive: true,
        },
        {
          id: nextId(),
          storeId,
          name: 'Autres articles',
          slug: `${slugBase}-autres`,
          isActive: true,
        },
      ])
      .returning();

    // 12 produits : assez pour remplir plusieurs sections sans les vider.
    const productIds: string[] = [];
    for (let p = 0; p < 12; p++) {
      const pid = nextId();
      productIds.push(pid);
      const price = 2500 + p * 1750;
      await db.insert(schema.products).values({
        id: pid,
        storeId,
        categoryId: cats[p % 2].id,
        name: PRODUCT_NAMES[p % PRODUCT_NAMES.length],
        slug: `${slugBase}-p${p}`,
        description: 'Article de démonstration pour la validation visuelle.',
        price: String(price),
        // Une remise un produit sur trois → badge -x% visible sans être partout.
        comparePrice: p % 3 === 0 ? String(Math.round(price * 1.35)) : null,
        currency: 'XOF',
        status: 'active',
        moderationStatus: 'approved',
        isFeatured: p < 3,
      });
      await db.insert(schema.productImages).values({
        id: nextId(),
        productId: pid,
        url: PRODUCT_IMAGES[(i * 2 + p) % PRODUCT_IMAGES.length],
        alt: 'Photo produit',
        sortOrder: 0,
      });
    }

    // Sections : chaque boutique en a plusieurs, tous formats confondus.
    for (let s = 0; s < def.sections.length; s++) {
      const sec = def.sections[s];
      const sectionId = nextId();
      await db.insert(schema.storeSections).values({
        id: sectionId,
        storeId,
        title: sec.title,
        subtitle: sec.subtitle,
        layout: sec.layout,
        sortOrder: s,
        isActive: true,
      });
      // Fenêtre glissante sur le catalogue : les sections ne montrent pas
      // toutes les mêmes produits.
      const slice = productIds.slice(s * 3, s * 3 + 5);
      await db.insert(schema.storeSectionItems).values(
        slice.map((productId, k) => ({
          id: nextId(),
          sectionId,
          productId,
          sortOrder: k,
        })),
      );
    }

    console.log(
      `  ✓ ${def.name} — ${def.sections.length} sections (${def.sections
        .map((s) => s.layout)
        .join(', ')}), 12 produits`,
    );
  }

  // Moyens de paiement : insérés en direct, mais bornés au catalogue réel pour
  // ne pas créer un état que l'API refuserait de relire ou de modifier.
  const catalog = await db
    .select({
      code: schema.paymentMethods.code,
      logoUrl: schema.paymentMethods.logoUrl,
    })
    .from(schema.paymentMethods);
  const known = new Map<string, string | null>(
    catalog.map((c: any) => [c.code, c.logoUrl]),
  );
  const usable = PAYMENTS.filter((p) => known.has(p.provider));
  const skipped = PAYMENTS.filter((p) => !known.has(p.provider));
  if (skipped.length) {
    console.log(
      `  ! providers absents du catalogue, ignorés : ${skipped
        .map((p) => p.provider)
        .join(', ')} (lancer le seed principal pour les créer)`,
    );
  }

  for (let i = 0; i < STORES.length; i++) {
    const count = Math.min(PAYMENT_COUNTS[i] ?? 0, usable.length);
    if (!count) continue;
    await db.insert(schema.storePaymentMethods).values(
      usable.slice(0, count).map((p, k) => ({
        id: nextId(),
        storeId: id(1 + i),
        provider: p.provider,
        type: p.type,
        displayName: p.displayName,
        // Repli sur le logo du catalogue, comme le fait `create()` de l'API :
        // sans lui le rail client n'afficherait que des icônes génériques.
        logoUrl: known.get(p.provider) ?? null,
        instructions: p.instructions,
        // Pas de `countries` : liste vide = tous pays, donc le rail reste
        // visible quel que soit le pays du client de test.
        isEnabled: true,
        isPublic: true,
        sortOrder: k,
      })),
    );
  }
  console.log(
    `  ✓ moyens de paiement répartis (${PAYMENT_COUNTS.join(', ')} par boutique)`,
  );

  // Sections de la liste des boutiques — admin central, sans `storeId`.
  for (let g = 0; g < GROUPS.length; g++) {
    const grp = GROUPS[g];
    const groupId = id(50 + g);
    await db.insert(schema.storeGroups).values({
      id: groupId,
      title: grp.title,
      subtitle: grp.subtitle,
      icon: grp.icon,
      sortOrder: g,
      isActive: true,
    });
    if (grp.storeIndexes.length) {
      await db.insert(schema.storeGroupItems).values(
        grp.storeIndexes.map((storeIndex, k) => ({
          id: nextId(),
          groupId,
          storeId: id(1 + storeIndex),
          sortOrder: k,
        })),
      );
    }
    console.log(
      `  ✓ section « ${grp.title.slice(0, 40)} » — ${grp.storeIndexes.length} boutiques`,
    );
  }

  const layouts = new Set(STORES.flatMap((s) => s.sections.map((x) => x.layout)));
  console.log(`\n${STORES.length} boutiques créées.`);
  console.log(`${GROUPS.length} sections de liste créées (dont une vide).`);
  console.log(`Formats couverts : ${[...layouts].join(', ')}`);
  console.log('Nettoyage : npx tsx src/seed-demo-stores.ts --clean');
}

main()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error(err);
    await pool.end();
    process.exit(1);
  });
