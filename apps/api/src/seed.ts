import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import * as schema from './database/schema';

// ── Protection : le seed écrase TOUTE la base.
// Passer --force pour confirmer l'exécution.
const isForced = process.argv.includes('--force');
if (!isForced) {
  console.error(
    '\n⛔  DANGER : ce script efface et réinsère TOUTES les données.',
  );
  console.error('   Relancez avec --force pour confirmer :');
  console.error('   npx ts-node src/seed.ts --force\n');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema }) as any;

async function main() {
  console.log('Seeding database...');

  // 0. Clean existing data
  await db.execute(`TRUNCATE TABLE
    "ticket_messages", "admin_tickets", "internal_messages",
    "order_items", "order_status_log", "orders", "customers",
    "affiliate_commissions", "coupon_usage",
    "coupons", "affiliates",
    "product_variants", "product_images", "products", "categories",
    "store_kyc", "stores",
    "app_settings", "feature_flags",
    "banners", "static_pages", "logos", "feed_sections",
    "social_links", "seo_metadata", "payment_methods",
    "content_blocks", "wishlist_items", "conversations", "messages"
  CASCADE`);
  await db.execute(`DELETE FROM "admins"`);
  await db.execute(`DELETE FROM "roles"`);

  // 1. Roles
  const [roleSuperAdmin] = await db
    .insert(schema.roles)
    .values({
      label: 'Super Admin',
      description: 'Accès complet à toutes les fonctionnalités',
      permissions: ['*'],
      isSuperAdmin: true,
    })
    .returning();

  await db.insert(schema.roles).values([
    {
      label: 'Marketing',
      description: 'Gestion des coupons, affiliés et campagnes',
      permissions: [
        'coupons.read', 'coupons.create', 'coupons.update', 'coupons.delete',
        'affiliates.read', 'affiliates.create', 'affiliates.update', 'affiliates.approve',
        'campaigns.read', 'campaigns.create', 'campaigns.update', 'campaigns.delete',
        'promotions.read', 'promotions.create', 'promotions.update',
        'analytics.read',
      ],
      isSuperAdmin: false,
    },
    {
      label: 'Modérateur',
      description: 'Modération des produits, avis et signalements',
      permissions: [
        'products.read', 'products.moderate',
        'content.moderate',
        'reports.read', 'reports.update',
        'orders.read',
      ],
      isSuperAdmin: false,
    },
    {
      label: 'Support Client',
      description: 'Gestion des commandes, litiges et messages clients',
      permissions: [
        'orders.read', 'orders.update',
        'users.read',
        'messages.read', 'messages.update',
        'disputes.read', 'disputes.update', 'disputes.resolve',
        'reports.read',
      ],
      isSuperAdmin: false,
    },
    {
      label: 'Finance',
      description: 'Gestion des versements, commissions et transactions',
      permissions: [
        'payments.read',
        'commissions.read', 'commissions.approve',
        'stores.read',
        'analytics.read',
      ],
      isSuperAdmin: false,
    },
    {
      label: 'Gérant de boutique',
      description: 'Accès limité à la boutique assignée — produits, commandes et messages',
      permissions: [
        'products.read', 'products.create', 'products.update', 'products.delete',
        'orders.read', 'orders.update',
        'categories.read',
        'messages.read',
      ],
      isSuperAdmin: false,
    },
  ]);
  console.log(`  ✓ 6 roles created`);

  // 2. Admin principal
  const hash = await bcrypt.hash('admin123', 10);
  const [admin] = await db
    .insert(schema.admins)
    .values({
      email: 'admin@expressafri.com',
      name: 'Admin Principal',
      passwordHash: hash,
      role: 'super_admin',
      isSuperAdmin: true,
      isActive: true,
    })
    .returning();
  console.log(`  ✓ Admin créé : ${admin.email}`);
  // NOTE: le mot de passe initial est admin123 — à changer impérativement en production

  // ── Boutique système (UUID fixe) ──
  const SYSTEM_STORE_ID = '00000000-0000-0000-0000-000000000001';
  await db
    .insert(schema.stores)
    .values({
      id: SYSTEM_STORE_ID,
      name: 'ExpressAfri Système',
      email: 'system@expressafri.com',
      country: 'Niger',
      status: 'active',
    })
    .onConflictDoNothing();
  console.log('  ✓ Boutique système créée');

  // ── Méthodes de paiement ──
  await db.insert(schema.paymentMethods).values([
    {
      code: 'orange_money',
      name: 'Orange Money',
      description: "Paiement via Orange Money (Niger, Côte d'Ivoire, Mali...)",
      logoUrl:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Orange_logo.svg/200px-Orange_logo.svg.png',
      type: 'mobile-money',
      isActive: true,
      position: 0,
      feePercent: 1.5,
      feeFixed: 0,
      minAmount: 100,
      maxAmount: 1000000,
      supportedCountries: ['NE', 'CI', 'ML', 'SN', 'BF', 'CM', 'MG', 'GN'],
      isSandbox: true,
    },
    {
      code: 'moov_money',
      name: 'Moov Money',
      description: 'Paiement via Moov Money (Niger, Bénin, Togo...)',
      logoUrl: 'https://cdn-icons-png.flaticon.com/512/3662/3662975.png',
      type: 'mobile-money',
      isActive: true,
      position: 1,
      feePercent: 1.5,
      feeFixed: 0,
      minAmount: 100,
      maxAmount: 500000,
      supportedCountries: ['NE', 'BJ', 'TG', 'CI', 'BF'],
      isSandbox: true,
    },
    {
      code: 'wave',
      name: 'Wave',
      description: "Paiement via Wave (Sénégal, Côte d'Ivoire, Mali)",
      logoUrl: 'https://cdn-icons-png.flaticon.com/512/2331/2331924.png',
      type: 'mobile-money',
      isActive: true,
      position: 2,
      feePercent: 1.0,
      feeFixed: 0,
      minAmount: 100,
      maxAmount: 2000000,
      supportedCountries: ['SN', 'CI', 'ML', 'BF', 'UG'],
      isSandbox: true,
    },
    {
      code: 'mtn_momo',
      name: 'MTN Mobile Money',
      description: 'Paiement via MTN MoMo',
      logoUrl:
        'https://upload.wikimedia.org/wikipedia/commons/9/93/New-mtn-logo.jpg',
      type: 'mobile-money',
      isActive: true,
      position: 3,
      feePercent: 1.5,
      feeFixed: 0,
      minAmount: 100,
      maxAmount: 1000000,
      supportedCountries: ['GH', 'CI', 'CM', 'BJ', 'GN', 'RW', 'UG', 'ZM'],
      isSandbox: true,
    },
    {
      code: 'card',
      name: 'Carte bancaire',
      description: 'Visa, Mastercard, UnionPay',
      logoUrl:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/200px-Mastercard-logo.svg.png',
      type: 'card',
      isActive: true,
      position: 4,
      feePercent: 2.5,
      feeFixed: 0,
      minAmount: 1000,
      maxAmount: 5000000,
      supportedCountries: [],
      isSandbox: true,
    },
    {
      code: 'cod',
      name: 'Paiement à la livraison',
      description: 'Payez en espèces à la réception de votre commande',
      logoUrl: 'https://cdn-icons-png.flaticon.com/512/2331/2331964.png',
      type: 'cod',
      isActive: true,
      position: 5,
      feePercent: 0,
      feeFixed: 500,
      minAmount: 0,
      maxAmount: 500000,
      supportedCountries: ['NE', 'SN', 'CI', 'ML', 'BF', 'BJ', 'TG'],
      isSandbox: false,
    },
    {
      code: 'wallet',
      name: 'Portefeuille ExpressAfri',
      description: 'Utilisez votre solde et vos bonus ExpressAfri',
      logoUrl: 'https://cdn-icons-png.flaticon.com/512/2168/2168252.png',
      type: 'wallet',
      isActive: true,
      position: 6,
      feePercent: 0,
      feeFixed: 0,
      minAmount: 0,
      maxAmount: 10000000,
      supportedCountries: [],
      isSandbox: false,
    },
  ]);
  console.log('  ✓ 7 méthodes de paiement créées');

  // ── Sections feed ──
  await db.insert(schema.feedSections).values([
    {
      title: 'Offres groupées',
      type: 'products',
      displayStyle: 'horizontal-scroll',
      position: 0,
      isActive: true,
    },
    {
      title: 'Deal du jour',
      type: 'products',
      displayStyle: 'horizontal-scroll',
      position: 1,
      isActive: true,
    },
    {
      title: 'Bannières promotionnelles',
      type: 'banners',
      displayStyle: 'card',
      position: 2,
      isActive: true,
    },
    {
      title: 'Recommandé pour vous',
      type: 'products',
      displayStyle: 'grid',
      position: 3,
      isActive: true,
    },
    {
      title: 'Boutiques à découvrir',
      type: 'stores',
      displayStyle: 'horizontal-scroll',
      position: 4,
      isActive: false,
    },
  ]);
  console.log('  ✓ 5 sections feed créées');

  // ── Raccourcis accueil (content_blocks) ──
  const shortcuts = [
    { id: '1', labelKey: 'home.electronics', icon: 'laptop' },
    { id: '2', labelKey: 'home.fashion', icon: 'tshirtCrew' },
    { id: '3', labelKey: 'home.beauty', icon: 'lipstick' },
    { id: '4', labelKey: 'home.home', icon: 'home' },
    { id: '5', labelKey: 'home.sports', icon: 'basketball' },
    { id: '6', labelKey: 'home.phones', icon: 'cellphone' },
    { id: '7', labelKey: 'home.automotive', icon: 'car' },
    { id: '8', labelKey: 'home.supermarket', icon: 'cart' },
  ];
  await db.insert(schema.contentBlocks).values(
    shortcuts.map((s, i) => ({
      storeId: SYSTEM_STORE_ID,
      key: `shortcut_${String(i + 1).padStart(2, '0')}`,
      value: JSON.stringify(s),
      type: 'json',
      groupName: 'shortcuts',
      label: `Raccourci — ${s.labelKey}`,
      isActive: true,
    })),
  );
  console.log('  ✓ 8 raccourcis accueil créés');

  // ── Posts Feed ──
  const feedPosts = [
    {
      title: 'Samsung Galaxy A54 — Meilleur rapport qualité/prix 2026',
      image:
        'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400',
      author: 'TechAfri',
      likes: 342,
      height: 280,
    },
    {
      title: 'Les tendances mode africaine à adopter cet été',
      image:
        'https://images.unsplash.com/photo-1580657018950-c7f7d6a6d990?w=400',
      author: 'Aminata Fashion',
      likes: 521,
      height: 340,
    },
    {
      title: 'Top 5 smartphones < 100 000 FCFA en 2026',
      image:
        'https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=400',
      author: 'GeekSahel',
      likes: 189,
      height: 260,
    },
    {
      title: "Karité pur : bienfaits et comment l'utiliser",
      image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400',
      author: 'Beauté Africaine',
      likes: 276,
      height: 310,
    },
    {
      title: 'Casque JBL Tune : test complet en conditions réelles',
      image:
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
      author: 'SoundCheck NE',
      likes: 143,
      height: 290,
    },
    {
      title: 'Guide : bien choisir son ventilateur pour la chaleur',
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
      author: 'HomeAfri',
      likes: 98,
      height: 270,
    },
    {
      title: 'Montre connectée : laquelle choisir sous 30 000 FCFA ?',
      image:
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
      author: 'TechAfri',
      likes: 415,
      height: 300,
    },
    {
      title: 'Les meilleures sneakers tendance du moment',
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
      author: 'StyleSahel',
      likes: 633,
      height: 320,
    },
  ];

  await db.insert(schema.contentBlocks).values(
    feedPosts.map((post, i) => ({
      storeId: SYSTEM_STORE_ID,
      key: `feed_post_${String(i + 1).padStart(2, '0')}`,
      value: JSON.stringify({
        id: `fp${i + 1}`,
        image: post.image,
        title: post.title,
        author: post.author,
        authorAvatar: `https://picsum.photos/seed/av${i}/80`,
        likes: post.likes,
        height: post.height,
        duration:
          i % 2 === 0
            ? `00:${(15 + i * 3).toString().padStart(2, '0')}`
            : undefined,
      }),
      type: 'json',
      groupName: 'feed',
      label: `Post Feed — ${post.title.slice(0, 30)}`,
      isActive: true,
    })),
  );
  console.log('  ✓ 8 posts feed créés');

  // ── Tendances de recherche ──
  await db.insert(schema.contentBlocks).values({
    storeId: SYSTEM_STORE_ID,
    key: 'trending',
    value: JSON.stringify([
      'Smartphone Samsung',
      'Robe africaine',
      'Chaussures Nike',
      'Montre connectée',
      'Casque Bluetooth',
      'Sac à main',
      'Électroménager',
      'Parfum original',
      'Tissu wax',
      'Chargeur rapide',
    ]),
    type: 'json',
    groupName: 'search',
    label: 'Termes tendances',
    isActive: true,
  });
  console.log('  ✓ Tendances de recherche créées');

  // ── Suggestions de personnes ──
  const suggestedPeople = [
    { id: 'sp1', name: 'Aminata Fashion', followers: '12.5k', avatar: '' },
    { id: 'sp2', name: 'TechShop Niger', followers: '8.3k', avatar: '' },
    { id: 'sp3', name: 'Beauté Africaine', followers: '5.1k', avatar: '' },
  ];
  await db.insert(schema.contentBlocks).values(
    suggestedPeople.map((p, i) => ({
      storeId: SYSTEM_STORE_ID,
      key: `person_${String(i + 1).padStart(2, '0')}`,
      value: JSON.stringify(p),
      type: 'json',
      groupName: 'suggested_people',
      label: `Suggestion — ${p.name}`,
      isActive: true,
    })),
  );
  console.log('  ✓ 3 suggestions de personnes créées');

  // ── Bannières ──
  await db.insert(schema.banners).values([
    {
      title: 'Bienvenue sur ExpressAfri',
      subtitle: 'Livraison rapide partout en Afrique',
      description: 'Découvrez des milliers de produits au meilleur prix',
      imageUrl: 'https://picsum.photos/seed/banner1/800/300',
      linkUrl: '/search',
      ctaText: 'Découvrir',
      discountLabel: null,
      isActive: true,
      position: 0,
      screen: 'home',
      backgroundColor: '#FF6B35',
    },
    {
      title: 'Offres Mobile Money',
      subtitle: '-5% avec Orange Money & Wave',
      description: 'Payez avec Mobile Money et économisez sur chaque achat',
      imageUrl: 'https://picsum.photos/seed/banner2/800/300',
      linkUrl: '/payment',
      ctaText: 'En profiter',
      discountLabel: '-5%',
      isActive: true,
      position: 1,
      screen: 'home',
      backgroundColor: '#FF8C00',
    },
    {
      title: 'Livraison Gratuite',
      subtitle: "Dès 10 000 FCFA d'achat",
      description:
        'Profitez de la livraison gratuite sur toute commande éligible',
      imageUrl: 'https://picsum.photos/seed/banner3/800/300',
      linkUrl: '/stores',
      ctaText: 'Voir les boutiques',
      discountLabel: 'GRATUIT',
      isActive: true,
      position: 2,
      screen: 'home',
      backgroundColor: '#2ECC71',
    },
    // ── Bannières écran Compte (CMS) ──
    {
      title: "Économies de l'été",
      subtitle: "Jusqu'à -40% sur des milliers d'articles",
      description:
        'Profitez des meilleures offres de la saison sur ExpressAfri',
      imageUrl: 'https://picsum.photos/seed/account1/800/300',
      linkUrl: '/search',
      ctaText: 'En profiter',
      discountLabel: '-40%',
      isActive: true,
      position: 0,
      screen: 'account',
      backgroundColor: '#FF6B35',
    },
    {
      title: "S'épanouir avec ExpressAfri",
      subtitle: 'Beauté, mode et bien-être à portée de main',
      description: 'Découvrez notre sélection beauté et mode africaine',
      imageUrl: 'https://picsum.photos/seed/account2/800/300',
      linkUrl: '/search?category=beauty-health',
      ctaText: 'Découvrir',
      discountLabel: null,
      isActive: true,
      position: 1,
      screen: 'account',
      backgroundColor: '#9B59B6',
    },
    {
      title: 'Offre groupée bonus',
      subtitle: 'Achetez 2 articles, obtenez -15%',
      description:
        'Combinez vos achats et économisez davantage avec nos offres groupées',
      imageUrl: 'https://picsum.photos/seed/account3/800/300',
      linkUrl: '/placeholder?title=Offres%20group%C3%A9es&icon=gift',
      ctaText: 'Voir les offres',
      discountLabel: '-15%',
      isActive: true,
      position: 2,
      screen: 'account',
      backgroundColor: '#27AE60',
    },
  ]);
  console.log('  ✓ 6 bannières créées (3 home + 3 account)');

  // ── Logos ──
  // Note : laisser l'URL vide ou utiliser null pour afficher le logo SVG natif dans l'app mobile
  // L'admin peut uploader un vrai logo depuis le CMS
  const LOGO_PLACEHOLDER = ''; // Pas de logo par défaut — le logo SVG natif sera utilisé
  await db.insert(schema.logos).values([
    { context: 'splash', url: LOGO_PLACEHOLDER, label: 'Logo Splash Screen' },
    {
      context: 'header',
      url: LOGO_PLACEHOLDER,
      label: 'Logo Header (app mobile)',
    },
    { context: 'tab-bar', url: LOGO_PLACEHOLDER, label: 'Logo Tab Bar' },
    { context: 'login', url: LOGO_PLACEHOLDER, label: 'Logo Page Login' },
    { context: 'favicon', url: LOGO_PLACEHOLDER, label: 'Favicon Admin' },
    {
      context: 'email',
      url: LOGO_PLACEHOLDER,
      label: 'Logo Emails transactionnels',
    },
    {
      context: 'notification',
      url: LOGO_PLACEHOLDER,
      label: 'Logo Notifications push',
    },
  ]);
  console.log('  ✓ 7 logos créés');

  // ── Réseaux sociaux ──
  await db.insert(schema.socialLinks).values([
    {
      platform: 'facebook',
      url: 'https://facebook.com/expressafri',
      label: 'Facebook',
      icon: 'facebook',
      isActive: true,
    },
    {
      platform: 'instagram',
      url: 'https://instagram.com/expressafri',
      label: 'Instagram',
      icon: 'instagram',
      isActive: true,
    },
    {
      platform: 'twitter',
      url: 'https://twitter.com/expressafri',
      label: 'X (Twitter)',
      icon: 'twitter',
      isActive: true,
    },
    {
      platform: 'whatsapp',
      url: 'https://wa.me/22700000000',
      label: 'WhatsApp Support',
      icon: 'whatsapp',
      isActive: true,
    },
    {
      platform: 'tiktok',
      url: 'https://tiktok.com/@expressafri',
      label: 'TikTok',
      icon: 'tiktok',
      isActive: false,
    },
  ]);
  console.log('  ✓ 5 réseaux sociaux créés');

  // ── SEO Metadata ──
  await db.insert(schema.seoMetadata).values([
    {
      page: 'home',
      title: 'ExpressAfri — E-commerce Afrique',
      description:
        'Achetez en ligne en toute confiance. Livraison rapide partout en Afrique.',
      keywords:
        "e-commerce, afrique, niger, sénégal, côte d'ivoire, achats en ligne, livraison",
      ogImage: null,
    },
    {
      page: 'store',
      title: 'Boutiques — ExpressAfri',
      description: 'Découvrez toutes les boutiques partenaires ExpressAfri.',
      keywords: 'boutiques, vendeurs, marchands, afrique',
      ogImage: null,
    },
    {
      page: 'product',
      title: 'Produits — ExpressAfri',
      description:
        "Trouvez le produit qu'il vous faut parmi des milliers d'articles.",
      keywords: 'produits, articles, offres, promotions',
      ogImage: null,
    },
    {
      page: 'about',
      title: 'À propos — ExpressAfri',
      description: "Découvrez la mission et les valeurs d'ExpressAfri.",
      keywords: 'à propos, mission, equipe, expressafri',
      ogImage: null,
    },
  ]);
  console.log('  ✓ 4 pages SEO créées');

  // ── App Settings ──
  await db.insert(schema.appSettings).values([
    {
      key: 'app.name',
      value: 'ExpressAfri',
      type: 'text',
      label: "Nom de l'application",
      group: 'general',
    },
    {
      key: 'app.tagline',
      value: "L'e-commerce africain",
      type: 'text',
      label: 'Slogan',
      group: 'general',
    },
    {
      key: 'app.country',
      value: 'NE',
      type: 'text',
      label: 'Pays par défaut',
      group: 'general',
    },
    {
      key: 'app.currency',
      value: 'XOF',
      type: 'text',
      label: 'Devise',
      group: 'general',
    },
    {
      key: 'app.language',
      value: 'fr',
      type: 'text',
      label: 'Langue par défaut',
      group: 'general',
    },
    {
      key: 'app.footer',
      value: '© 2026 ExpressAfri. Tous droits réservés.',
      type: 'text',
      label: 'Pied de page',
      group: 'general',
    },
    {
      key: 'app.version',
      value: '1.0.0',
      type: 'text',
      label: 'Version application',
      group: 'general',
    },
    {
      key: 'app.supportEmail',
      value: 'support@expressafri.com',
      type: 'text',
      label: 'Email support',
      group: 'general',
    },
    {
      key: 'app.supportPhone',
      value: '+227 00 00 00 00',
      type: 'text',
      label: 'Téléphone support',
      group: 'general',
    },
    {
      key: 'theme.primaryColor',
      value: '#FF6B35',
      type: 'color',
      label: 'Couleur principale',
      group: 'theme',
    },
    {
      key: 'theme.secondaryColor',
      value: '#2ECC71',
      type: 'color',
      label: 'Couleur secondaire',
      group: 'theme',
    },
    // Branding de l'en-tête : nom stylisé à côté du logo (façon AliExpress)
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
    // Badges et étiquettes (bandeaux promo gérés dans l'onglet Bannières)
    {
      key: 'promo.dealLabel',
      value: '80% de réduction à durée limitée',
      type: 'text',
      label: 'Label Deal du Jour',
      group: 'promo',
    },
    {
      key: 'promo.bundleLabel',
      value: '-3 $ sur 3 articles',
      type: 'text',
      label: 'Label Offres groupées',
      group: 'promo',
    },
    {
      key: 'promo.freeShip',
      value: 'Livraison gratuite dès 3 articles',
      type: 'text',
      label: 'Texte livraison gratuite',
      group: 'promo',
    },
    {
      key: 'home.heroTitle',
      value: 'Bienvenue sur ExpressAfri',
      type: 'text',
      label: 'Titre héro page accueil',
      group: 'content',
    },
    {
      key: 'home.heroSubtitle',
      value: "L'e-commerce africain",
      type: 'text',
      label: 'Sous-titre héro page accueil',
      group: 'content',
    },
    {
      key: 'commerce.minOrderAmount',
      value: '500',
      type: 'number',
      label: 'Montant minimum commande (FCFA)',
      group: 'commerce',
    },
    {
      key: 'commerce.freeShippingThreshold',
      value: '10000',
      type: 'number',
      label: 'Seuil livraison gratuite (FCFA)',
      group: 'commerce',
    },
    {
      key: 'commerce.baseShippingFee',
      value: '1000',
      type: 'number',
      label: 'Frais de livraison de base (FCFA)',
      group: 'commerce',
    },
    {
      key: 'commerce.commissionRate',
      value: '5',
      type: 'number',
      label: 'Commission plateforme (%)',
      group: 'commerce',
    },
    {
      key: 'commerce.returnsAllowed',
      value: 'true',
      type: 'boolean',
      label: 'Retours autorisés',
      group: 'commerce',
    },
    {
      key: 'commerce.returnDays',
      value: '7',
      type: 'number',
      label: 'Délai retour (jours)',
      group: 'commerce',
    },
    {
      key: 'notif.orderConfirmation',
      value: 'true',
      type: 'boolean',
      label: 'Notif. confirmation commande',
      group: 'notifications',
    },
    {
      key: 'notif.orderShipped',
      value: 'true',
      type: 'boolean',
      label: 'Notif. expédition',
      group: 'notifications',
    },
    {
      key: 'notif.promotions',
      value: 'true',
      type: 'boolean',
      label: 'Notif. promotions',
      group: 'notifications',
    },
    // Fidélité
    {
      key: 'loyalty.bonusValue',
      value: '20',
      type: 'number',
      label: 'Valeur du bonus fidélité (%)',
      group: 'loyalty',
    },
  ]);
  console.log('  ✓ 25 paramètres applicatifs créés');

  // ── Feature flags ──
  await db.insert(schema.featureFlags).values([
    {
      key: 'mobile.search',
      label: 'Recherche',
      description: 'Activer la barre de recherche',
      group: 'mobile',
      enabled: true,
    },
    {
      key: 'mobile.wishlist',
      label: 'Liste de souhaits',
      description: 'Activer les favoris',
      group: 'mobile',
      enabled: true,
    },
    {
      key: 'mobile.reviews',
      label: 'Avis produits',
      description: 'Activer les avis et notes',
      group: 'mobile',
      enabled: true,
    },
    {
      key: 'mobile.chat',
      label: 'Messagerie',
      description: 'Activer le chat client-vendeur',
      group: 'mobile',
      enabled: true,
    },
    {
      key: 'mobile.cameraSearch',
      label: 'Recherche par image',
      description: 'Activer la recherche par caméra',
      group: 'mobile',
      enabled: true,
    },
    {
      key: 'mobile.wallet',
      label: 'Portefeuille',
      description: 'Activer le portefeuille et bonus',
      group: 'mobile',
      enabled: true,
    },
    {
      key: 'mobile.loyalty',
      label: 'Programme fidélité',
      description: 'Activer les points de fidélité',
      group: 'mobile',
      enabled: true,
    },
    {
      key: 'mobile.affiliates',
      label: "Programme d'affiliation",
      description: "Activer les liens d'affiliation",
      group: 'mobile',
      enabled: false,
    },
    {
      key: 'payment.mobileMoney',
      label: 'Mobile Money',
      description: 'Activer les paiements Mobile Money',
      group: 'payments',
      enabled: true,
    },
    {
      key: 'payment.card',
      label: 'Carte bancaire',
      description: 'Activer le paiement par carte',
      group: 'payments',
      enabled: true,
    },
    {
      key: 'payment.cod',
      label: 'Paiement à la livraison',
      description: 'Activer le paiement à la livraison',
      group: 'payments',
      enabled: true,
    },
    {
      key: 'payment.wallet',
      label: 'Portefeuille',
      description: 'Activer le paiement via solde',
      group: 'payments',
      enabled: true,
    },
    {
      key: 'commerce.multiStore',
      label: 'Multi-boutiques',
      description: 'Permettre plusieurs boutiques',
      group: 'commerce',
      enabled: true,
    },
    {
      key: 'commerce.flashSales',
      label: 'Ventes flash',
      description: 'Activer les deals limités dans le temps',
      group: 'commerce',
      enabled: true,
    },
    {
      key: 'commerce.bundles',
      label: 'Offres groupées',
      description: 'Activer les offres pack',
      group: 'commerce',
      enabled: true,
    },
  ]);
  console.log('  ✓ 15 feature flags créés');

  // ── Pages statiques ──
  await db.insert(schema.staticPages).values([
    {
      slug: 'cgv',
      title: 'Conditions Générales de Vente',
      content:
        "<h1>Conditions Générales de Vente</h1><p>Contenu à compléter par l'administrateur.</p>",
      type: 'html',
      isActive: true,
    },
    {
      slug: 'privacy',
      title: 'Politique de Confidentialité',
      content:
        "<h1>Politique de Confidentialité</h1><p>Contenu à compléter par l'administrateur.</p>",
      type: 'html',
      isActive: true,
    },
    {
      slug: 'about',
      title: "À propos d'ExpressAfri",
      content:
        "<h1>À propos</h1><p>ExpressAfri est la première plateforme e-commerce dédiée à l'Afrique.</p>",
      type: 'html',
      isActive: true,
    },
    {
      slug: 'faq',
      title: 'Foire aux questions',
      content: "<h1>FAQ</h1><p>Contenu à compléter par l'administrateur.</p>",
      type: 'html',
      isActive: true,
    },
  ]);
  console.log('  ✓ 4 pages statiques créées');

  // ── Boutique de démonstration + catégories ──
  const DEMO_STORE_ID = '00000000-0000-0000-0000-000000000002';
  await db
    .insert(schema.stores)
    .values({
      id: DEMO_STORE_ID,
      name: 'ExpressAfri Store',
      email: 'store@expressafri.com',
      country: 'Niger',
      status: 'active',
    })
    .onConflictDoNothing();

  const categories = await db
    .insert(schema.categories)
    .values([
      {
        storeId: DEMO_STORE_ID,
        name: 'Téléphones & Tablettes',
        slug: 'phones-tablets',
        isActive: true,
      },
      {
        storeId: DEMO_STORE_ID,
        name: 'Mode & Vêtements',
        slug: 'fashion',
        isActive: true,
      },
      {
        storeId: DEMO_STORE_ID,
        name: 'Beauté & Santé',
        slug: 'beauty-health',
        isActive: true,
      },
      {
        storeId: DEMO_STORE_ID,
        name: 'Maison & Cuisine',
        slug: 'home-kitchen',
        isActive: true,
      },
      {
        storeId: DEMO_STORE_ID,
        name: 'Sport & Loisirs',
        slug: 'sports-leisure',
        isActive: true,
      },
      {
        storeId: DEMO_STORE_ID,
        name: 'Électronique',
        slug: 'electronics',
        isActive: true,
      },
      {
        storeId: DEMO_STORE_ID,
        name: 'Chaussures',
        slug: 'shoes',
        isActive: true,
      },
      {
        storeId: DEMO_STORE_ID,
        name: 'Sacs & Accessoires',
        slug: 'bags-accessories',
        isActive: true,
      },
      {
        storeId: DEMO_STORE_ID,
        name: 'Automobile',
        slug: 'automotive',
        isActive: true,
      },
      {
        storeId: DEMO_STORE_ID,
        name: 'Alimentation',
        slug: 'food',
        isActive: true,
      },
    ])
    .returning();
  console.log('  ✓ 10 catégories créées');

  // ── Produits de démonstration ──
  const catMap: Record<string, string> = {};
  for (const cat of categories) {
    catMap[cat.slug] = cat.id;
  }

  const productsData = [
    {
      name: 'Samsung Galaxy A54',
      slug: 'samsung-galaxy-a54',
      categoryId: catMap['phones-tablets'],
      price: '185000',
      comparePrice: '220000',
      status: 'active',
      moderationStatus: 'approved',
      imageUrl:
        'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400',
    },
    {
      name: 'Tecno Spark 20',
      slug: 'tecno-spark-20',
      categoryId: catMap['phones-tablets'],
      price: '75000',
      comparePrice: '90000',
      status: 'active',
      moderationStatus: 'approved',
      imageUrl:
        'https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=400',
    },
    {
      name: 'Boubou Bazin Brodé',
      slug: 'boubou-bazin-brode',
      categoryId: catMap['fashion'],
      price: '35000',
      comparePrice: null,
      status: 'active',
      moderationStatus: 'approved',
      imageUrl:
        'https://images.unsplash.com/photo-1580657018950-c7f7d6a6d990?w=400',
    },
    {
      name: 'Robe Wax Premium',
      slug: 'robe-wax-premium',
      categoryId: catMap['fashion'],
      price: '18000',
      comparePrice: '25000',
      status: 'active',
      moderationStatus: 'approved',
      imageUrl:
        'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
    },
    {
      name: 'Crème Karité Pure 500g',
      slug: 'creme-karite-pure',
      categoryId: catMap['beauty-health'],
      price: '8500',
      comparePrice: null,
      status: 'active',
      moderationStatus: 'approved',
      imageUrl:
        'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400',
    },
    {
      name: 'Parfum Oud Excellence',
      slug: 'parfum-oud-excellence',
      categoryId: catMap['beauty-health'],
      price: '45000',
      comparePrice: '60000',
      status: 'active',
      moderationStatus: 'approved',
      imageUrl:
        'https://images.unsplash.com/photo-1541643600914-78b084683702?w=400',
    },
    {
      name: 'Ventilateur sur Pied 16"',
      slug: 'ventilateur-sur-pied',
      categoryId: catMap['home-kitchen'],
      price: '28000',
      comparePrice: '35000',
      status: 'active',
      moderationStatus: 'approved',
      imageUrl:
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
    },
    {
      name: 'Casserole Aluminium Set 5 pièces',
      slug: 'casserole-aluminium-set',
      categoryId: catMap['home-kitchen'],
      price: '15000',
      comparePrice: null,
      status: 'active',
      moderationStatus: 'approved',
      imageUrl:
        'https://images.unsplash.com/photo-1584990347449-a2d4c2c8cd6e?w=400',
    },
    {
      name: 'Casque Bluetooth JBL Tune',
      slug: 'casque-bluetooth-jbl',
      categoryId: catMap['electronics'],
      price: '32000',
      comparePrice: '45000',
      status: 'active',
      moderationStatus: 'approved',
      imageUrl:
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
    },
    {
      name: 'Montre Connectée Sport',
      slug: 'montre-connectee-sport',
      categoryId: catMap['electronics'],
      price: '22000',
      comparePrice: '30000',
      status: 'active',
      moderationStatus: 'approved',
      imageUrl:
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
    },
    {
      name: 'Sneakers Tendance Homme',
      slug: 'sneakers-tendance-homme',
      categoryId: catMap['shoes'],
      price: '25000',
      comparePrice: null,
      status: 'active',
      moderationStatus: 'approved',
      imageUrl:
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
    },
    {
      name: 'Sandales Cuir Femme',
      slug: 'sandales-cuir-femme',
      categoryId: catMap['shoes'],
      price: '12000',
      comparePrice: '18000',
      status: 'active',
      moderationStatus: 'approved',
      imageUrl:
        'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=400',
    },
  ];

  for (const p of productsData) {
    const [product] = await db
      .insert(schema.products)
      .values({
        storeId: DEMO_STORE_ID,
        categoryId: p.categoryId,
        name: p.name,
        slug: p.slug,
        price: p.price,
        comparePrice: p.comparePrice,
        currency: 'XOF',
        status: p.status,
        moderationStatus: p.moderationStatus,
        isFeatured: false,
      })
      .returning();

    await db.insert(schema.productImages).values({
      productId: product.id,
      url: p.imageUrl,
      alt: p.name,
      sortOrder: 0,
    });
  }
  console.log('  ✓ 12 produits de démonstration créés');

  console.log('\n✅ Base de données prête — données de seed insérées.');
  console.log(
    "   Compte admin créé. Changez le mot de passe via l'interface admin avant toute mise en production.",
  );
  await pool.end();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
