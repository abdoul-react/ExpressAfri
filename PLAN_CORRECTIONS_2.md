# PLAN DE CORRECTIONS N°2 — ExpressAfri
> Rédigé le 18 juillet 2026 · Suite du Plan N°1 (toutes corrections appliquées)

---

## Contexte

Le Plan N°1 est terminé à 100%. L'application est maintenant correctement connectée
au backend. La prochaine étape est de **peupler la base de données** avec les données
de démarrage (seed) pour que l'app mobile et le panel admin affichent du contenu réel
dès le premier lancement, sans configuration manuelle.

### Ce qui est vide en base actuellement
- `payment_methods` → l'app mobile affiche une liste vide au paiement
- `feed_sections` → l'accueil mobile n'a aucune section dynamique
- `content_blocks` (groupe `shortcuts`) → raccourcis de l'accueil mobile vides
- `content_blocks` (groupe `search` / `trending`) → tendances de recherche vides
- `content_blocks` (groupe `suggested_people`) → suggestions de personnes vides
- `banners` → pas de bannières promotionnelles
- `logos` → pas de logos configurés (splash, header, etc.)
- `social_links` → pas de liens réseaux sociaux
- `seo_metadata` → pas de métadonnées SEO
- `app_settings` → pas de paramètres applicatifs (nom app, couleurs, etc.)
- `feature_flags` → pas de feature flags
- `static_pages` → pas de pages légales (CGV, politique de confidentialité, etc.)
- `categories` + `products` → catalogue vide, rien à afficher dans l'app
- `stores` → aucune boutique, bloque les FK de products/categories/content_blocks

### Fichier à modifier
Un seul fichier central : **`apps/api/src/seed.ts`**

Le script existe déjà et se lance avec :
```bash
cd apps/api
npm run seed
```

Il fait un TRUNCATE propre puis insère les données. Il faut l'enrichir avec
toutes les données manquantes listées ci-dessus.

### Contrainte importante — storeId dans content_blocks
La table `content_blocks` a une colonne `storeId` NOT NULL avec FK vers `stores`.
Les blocs globaux (shortcuts, trending, suggested_people) doivent être rattachés
à une boutique système. Il faut créer une **boutique système** avec un UUID fixe
`'00000000-0000-0000-0000-000000000001'` qui sert de conteneur pour tout le contenu global.

---

## Table des matières

1. [Boutique système (prérequis)](#1-boutique-système-prérequis)
2. [Méthodes de paiement](#2-méthodes-de-paiement)
3. [Sections feed (accueil mobile)](#3-sections-feed-accueil-mobile)
4. [Raccourcis accueil](#4-raccourcis-accueil)
5. [Tendances de recherche](#5-tendances-de-recherche)
6. [Suggestions de personnes](#6-suggestions-de-personnes)
7. [Bannières promotionnelles](#7-bannières-promotionnelles)
8. [Logos application](#8-logos-application)
9. [Liens réseaux sociaux](#9-liens-réseaux-sociaux)
10. [Métadonnées SEO](#10-métadonnées-seo)
11. [Paramètres applicatifs (app_settings)](#11-paramètres-applicatifs-app_settings)
12. [Feature flags](#12-feature-flags)
13. [Pages statiques légales](#13-pages-statiques-légales)
14. [Catégories de produits](#14-catégories-de-produits)
15. [Boutiques et produits de démonstration](#15-boutiques-et-produits-de-démonstration)

---

## 1. Boutique système (prérequis)

### Problème
`content_blocks` requiert un `storeId` non nul. Les blocs globaux (shortcuts, trending,
suggested_people) n'appartiennent à aucune boutique marchande. Sans boutique système,
l'insertion de ces blocs échoue avec une violation de FK.

### Solution
Créer une boutique système avec un UUID fixe connu avant tout autre seed.
Cette boutique ne sera jamais visible dans l'app — elle sert uniquement de référence FK.

**Dans `seed.ts`, ajouter après le TRUNCATE :**

```ts
// ── Boutique système (UUID fixe) ──
const SYSTEM_STORE_ID = '00000000-0000-0000-0000-000000000001'
await db.insert(schema.stores).values({
  id: SYSTEM_STORE_ID,
  name: 'ExpressAfri Système',
  email: 'system@expressafri.com',
  country: 'Niger',
  status: 'active',
}).onConflictDoNothing()
console.log('  ✓ Boutique système créée')
```

**Note :** Le TRUNCATE existant inclut déjà `stores` donc pas de doublon à craindre.

---

## 2. Méthodes de paiement

### Problème
La table `payment_methods` est vide. L'app mobile appelle `GET /mobile/payment/methods`
qui lit cette table — elle reçoit un tableau vide et affiche "impossible de charger
les options".

### Solution
Insérer les méthodes de paiement adaptées à l'Afrique de l'Ouest (Mobile Money prioritaire).

**Dans `seed.ts`, ajouter :**

```ts
// ── Méthodes de paiement ──
await db.insert(schema.paymentMethods).values([
  {
    code: 'orange_money',
    name: 'Orange Money',
    description: 'Paiement via Orange Money (Niger, Côte d\'Ivoire, Mali...)',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Orange_logo.svg/200px-Orange_logo.svg.png',
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
    logoUrl: 'https://www.moov-africa.ne/themes/custom/moov/logo.svg',
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
    description: 'Paiement via Wave (Sénégal, Côte d\'Ivoire, Mali)',
    logoUrl: 'https://wave.com/assets/images/wave-logo.svg',
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
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/93/New-mtn-logo.jpg',
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
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a4/Mastercard_2019_logo.svg',
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
])
console.log('  ✓ 7 méthodes de paiement créées')
```

---

## 3. Sections feed (accueil mobile)

### Problème
La table `feed_sections` est vide. L'accueil mobile utilise `dynamicSections` depuis le
Plan N°1, mais sans données, il tombe sur le fallback statique. L'admin ne voit rien
à réordonner dans le CMS.

### Solution
Insérer 5 sections de démarrage couvrant les cas les plus courants.

**Dans `seed.ts`, ajouter :**

```ts
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
])
console.log('  ✓ 5 sections feed créées')
```

---


## 4. Raccourcis accueil

### Problème
`content_blocks` groupe=`shortcuts` est vide. `getHomeShortcuts()` tombe sur le
fallback statique dans le service. L'admin ne peut pas modifier les raccourcis via le CMS.

### Solution
Insérer 8 raccourcis dans `content_blocks` groupe=`shortcuts`. Chaque bloc a une valeur
JSON `{ id, labelKey, icon }`.

**Important :** `content_blocks` requiert `storeId` — utiliser `SYSTEM_STORE_ID`.

**Dans `seed.ts`, ajouter après la boutique système :**

```ts
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
]
await db.insert(schema.contentBlocks).values(
  shortcuts.map((s, i) => ({
    storeId: SYSTEM_STORE_ID,
    key: `shortcut_${String(i + 1).padStart(2, '0')}`,
    value: JSON.stringify(s),
    type: 'json',
    groupName: 'shortcuts',
    label: `Raccourci — ${s.labelKey}`,
    isActive: true,
  }))
)
console.log('  ✓ 8 raccourcis accueil créés')
```

---

## 5. Tendances de recherche

### Problème
`content_blocks` groupe=`search`, clé=`trending` est absent. `getSearchTrending()`
retourne `[]`. L'écran de recherche affiche une section "Tendances" vide.

### Solution
Insérer un seul bloc JSON contenant un tableau de termes tendances.

**Dans `seed.ts`, ajouter :**

```ts
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
})
console.log('  ✓ Tendances de recherche créées')
```

---

## 6. Suggestions de personnes

### Problème
`getSuggestedPeople()` retourne `[]` depuis le Plan N°1 (plus de fausses personnes).
La section "Personnes suggérées" est donc absente de l'onglet Feed.

### Solution
Insérer 3 profils dans `content_blocks` groupe=`suggested_people`.
Ces profils peuvent être des influenceurs ou vendeurs stars de la plateforme.

**Dans `seed.ts`, ajouter :**

```ts
// ── Suggestions de personnes ──
const suggestedPeople = [
  { id: 'sp1', name: 'Aminata Fashion', followers: '12.5k', avatar: '' },
  { id: 'sp2', name: 'TechShop Niger', followers: '8.3k', avatar: '' },
  { id: 'sp3', name: 'Beauté Africaine', followers: '5.1k', avatar: '' },
]
await db.insert(schema.contentBlocks).values(
  suggestedPeople.map((p, i) => ({
    storeId: SYSTEM_STORE_ID,
    key: `person_${String(i + 1).padStart(2, '0')}`,
    value: JSON.stringify(p),
    type: 'json',
    groupName: 'suggested_people',
    label: `Suggestion — ${p.name}`,
    isActive: true,
  }))
)
console.log('  ✓ 3 suggestions de personnes créées')
```

---

## 7. Bannières promotionnelles

### Problème
La table `banners` est vide. `BannerCarousel` de l'accueil mobile affiche un composant
vide. L'admin CMS n'a aucune bannière à gérer.

### Solution
Insérer 3 bannières de démarrage. Les images utilisent des URLs de placeholder
(à remplacer par de vraies images via le CMS admin).

**Dans `seed.ts`, ajouter :**

```ts
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
    subtitle: 'Dès 10 000 FCFA d\'achat',
    description: 'Profitez de la livraison gratuite sur toute commande éligible',
    imageUrl: 'https://picsum.photos/seed/banner3/800/300',
    linkUrl: '/stores',
    ctaText: 'Voir les boutiques',
    discountLabel: 'GRATUIT',
    isActive: true,
    position: 2,
    screen: 'home',
    backgroundColor: '#2ECC71',
  },
])
console.log('  ✓ 3 bannières créées')
```

---

## 8. Logos application

### Problème
La table `logos` est vide. Le CMS admin affiche une liste vide dans l'onglet "Logos".
Les contextes `splash`, `header`, `tab-bar`, etc. n'ont aucune image configurée.

### Solution
Insérer un logo pour chaque contexte défini dans le schéma. URLs temporaires à
remplacer par les vraies images via upload dans le CMS.

**Dans `seed.ts`, ajouter :**

```ts
// ── Logos ──
const LOGO_PLACEHOLDER = 'https://placehold.co/200x60/FF6B35/FFFFFF?text=ExpressAfri'
await db.insert(schema.logos).values([
  { context: 'splash',       url: LOGO_PLACEHOLDER, label: 'Logo Splash Screen' },
  { context: 'header',       url: LOGO_PLACEHOLDER, label: 'Logo Header (app mobile)' },
  { context: 'tab-bar',      url: LOGO_PLACEHOLDER, label: 'Logo Tab Bar' },
  { context: 'login',        url: LOGO_PLACEHOLDER, label: 'Logo Page Login' },
  { context: 'favicon',      url: LOGO_PLACEHOLDER, label: 'Favicon Admin' },
  { context: 'email',        url: LOGO_PLACEHOLDER, label: 'Logo Emails transactionnels' },
  { context: 'notification', url: LOGO_PLACEHOLDER, label: 'Logo Notifications push' },
])
console.log('  ✓ 7 logos créés')
```

---

## 9. Liens réseaux sociaux

### Problème
La table `social_links` est vide. La section réseaux sociaux dans le CMS admin et
dans l'app affiche du vide.

### Solution
Insérer les 5 plateformes sociales principales. URLs à compléter avec les vrais
comptes via le CMS.

**Dans `seed.ts`, ajouter :**

```ts
// ── Réseaux sociaux ──
await db.insert(schema.socialLinks).values([
  { platform: 'facebook',  url: 'https://facebook.com/expressafri',  label: 'Facebook',  icon: 'facebook',  isActive: true },
  { platform: 'instagram', url: 'https://instagram.com/expressafri', label: 'Instagram', icon: 'instagram', isActive: true },
  { platform: 'twitter',   url: 'https://twitter.com/expressafri',   label: 'X (Twitter)', icon: 'twitter', isActive: true },
  { platform: 'whatsapp',  url: 'https://wa.me/22700000000',         label: 'WhatsApp Support', icon: 'whatsapp', isActive: true },
  { platform: 'tiktok',    url: 'https://tiktok.com/@expressafri',   label: 'TikTok',    icon: 'tiktok',   isActive: false },
])
console.log('  ✓ 5 réseaux sociaux créés')
```

---


## 10. Métadonnées SEO

### Problème
La table `seo_metadata` est vide. `GET /content/seo` renvoie un tableau vide.
Le CMS admin ne peut pas modifier ce qui n'existe pas encore.

### Solution
Insérer les métadonnées pour les pages principales de l'application.

**Dans `seed.ts`, ajouter :**

```ts
// ── SEO Metadata ──
await db.insert(schema.seoMetadata).values([
  {
    page: 'home',
    title: 'ExpressAfri — E-commerce Afrique',
    description: 'Achetez en ligne en toute confiance. Livraison rapide partout en Afrique.',
    keywords: 'e-commerce, afrique, niger, sénégal, côte d\'ivoire, achats en ligne, livraison',
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
    description: 'Trouvez le produit qu\'il vous faut parmi des milliers d\'articles.',
    keywords: 'produits, articles, offres, promotions',
    ogImage: null,
  },
  {
    page: 'about',
    title: 'À propos — ExpressAfri',
    description: 'Découvrez la mission et les valeurs d\'ExpressAfri.',
    keywords: 'à propos, mission, equipe, expressafri',
    ogImage: null,
  },
])
console.log('  ✓ 4 pages SEO créées')
```

---

## 11. Paramètres applicatifs (app_settings)

### Problème
La table `app_settings` est vide. L'app mobile appelle `GET /mobile/settings` pour
récupérer la configuration de l'application (nom, couleurs, devise, etc.). Sans
données, tout est vide.

### Solution
Insérer les paramètres fondamentaux organisés par groupes.

**Dans `seed.ts`, ajouter :**

```ts
// ── App Settings ──
await db.insert(schema.appSettings).values([
  // Groupe : general
  { key: 'app.name',        value: 'ExpressAfri',  type: 'text',   label: "Nom de l'application", group: 'general' },
  { key: 'app.tagline',     value: 'L\'e-commerce africain',type: 'text', label: 'Slogan',         group: 'general' },
  { key: 'app.country',     value: 'NE',           type: 'text',   label: 'Pays par défaut',       group: 'general' },
  { key: 'app.currency',    value: 'XOF',          type: 'text',   label: 'Devise',                group: 'general' },
  { key: 'app.language',    value: 'fr',           type: 'text',   label: 'Langue par défaut',     group: 'general' },
  { key: 'app.supportEmail',value: 'support@expressafri.com', type: 'text', label: 'Email support', group: 'general' },
  { key: 'app.supportPhone',value: '+227 00 00 00 00', type: 'text', label: 'Téléphone support',   group: 'general' },
  // Groupe : theme
  { key: 'theme.primaryColor',   value: '#FF6B35', type: 'color', label: 'Couleur principale',  group: 'theme' },
  { key: 'theme.secondaryColor', value: '#2ECC71', type: 'color', label: 'Couleur secondaire',  group: 'theme' },
  // Groupe : commerce
  { key: 'commerce.minOrderAmount',    value: '500',   type: 'number', label: 'Montant minimum commande (FCFA)', group: 'commerce' },
  { key: 'commerce.freeShippingThreshold', value: '10000', type: 'number', label: 'Seuil livraison gratuite (FCFA)', group: 'commerce' },
  { key: 'commerce.commissionRate',    value: '5',     type: 'number', label: 'Commission plateforme (%)', group: 'commerce' },
  { key: 'commerce.returnsAllowed',    value: 'true',  type: 'boolean',label: 'Retours autorisés',         group: 'commerce' },
  { key: 'commerce.returnDays',        value: '7',     type: 'number', label: 'Délai retour (jours)',       group: 'commerce' },
  // Groupe : notifications
  { key: 'notif.orderConfirmation', value: 'true', type: 'boolean', label: 'Notif. confirmation commande', group: 'notifications' },
  { key: 'notif.orderShipped',      value: 'true', type: 'boolean', label: 'Notif. expédition',            group: 'notifications' },
  { key: 'notif.promotions',        value: 'true', type: 'boolean', label: 'Notif. promotions',            group: 'notifications' },
])
console.log('  ✓ 16 paramètres applicatifs créés')
```

---

## 12. Feature flags

### Problème
La table `feature_flags` est vide. L'app mobile appelle `GET /mobile/feature-flags`
et reçoit un tableau vide. L'admin ne peut pas activer/désactiver des fonctionnalités.

### Solution
Insérer les feature flags couvrant toutes les fonctionnalités majeures de l'app.

**Dans `seed.ts`, ajouter :**

```ts
// ── Feature flags ──
await db.insert(schema.featureFlags).values([
  // Groupe : mobile
  { key: 'mobile.search',          label: 'Recherche',              description: 'Activer la barre de recherche',    group: 'mobile',   enabled: true  },
  { key: 'mobile.wishlist',        label: 'Liste de souhaits',      description: 'Activer les favoris',              group: 'mobile',   enabled: true  },
  { key: 'mobile.reviews',         label: 'Avis produits',          description: 'Activer les avis et notes',        group: 'mobile',   enabled: true  },
  { key: 'mobile.chat',            label: 'Messagerie',             description: 'Activer le chat client-vendeur',   group: 'mobile',   enabled: true  },
  { key: 'mobile.cameraSearch',    label: 'Recherche par image',    description: 'Activer la recherche par caméra',  group: 'mobile',   enabled: true  },
  { key: 'mobile.wallet',          label: 'Portefeuille',           description: 'Activer le portefeuille et bonus', group: 'mobile',   enabled: true  },
  { key: 'mobile.loyalty',         label: 'Programme fidélité',     description: 'Activer les points de fidélité',   group: 'mobile',   enabled: true  },
  { key: 'mobile.affiliates',      label: 'Programme d\'affiliation', description: 'Activer les liens d\'affiliation', group: 'mobile', enabled: false },
  // Groupe : payments
  { key: 'payment.mobileMoney',    label: 'Mobile Money',           description: 'Activer les paiements Mobile Money', group: 'payments', enabled: true },
  { key: 'payment.card',           label: 'Carte bancaire',         description: 'Activer le paiement par carte',    group: 'payments', enabled: true  },
  { key: 'payment.cod',            label: 'Paiement à la livraison',description: 'Activer le paiement à la livraison', group: 'payments', enabled: true },
  { key: 'payment.wallet',         label: 'Portefeuille',           description: 'Activer le paiement via solde',    group: 'payments', enabled: true  },
  // Groupe : commerce
  { key: 'commerce.multiStore',    label: 'Multi-boutiques',        description: 'Permettre plusieurs boutiques',    group: 'commerce', enabled: true  },
  { key: 'commerce.flashSales',    label: 'Ventes flash',           description: 'Activer les deals limités dans le temps', group: 'commerce', enabled: true },
  { key: 'commerce.bundles',       label: 'Offres groupées',        description: 'Activer les offres pack',          group: 'commerce', enabled: true  },
])
console.log('  ✓ 15 feature flags créés')
```

---

## 13. Pages statiques légales

### Problème
La table `static_pages` est vide. Les liens "Conditions générales", "Politique de
confidentialité" etc. dans l'app et l'admin sont vides.

### Solution
Insérer les 4 pages légales minimales avec un contenu placeholder HTML.

**Dans `seed.ts`, ajouter :**

```ts
// ── Pages statiques ──
await db.insert(schema.staticPages).values([
  {
    slug: 'cgv',
    title: 'Conditions Générales de Vente',
    content: '<h1>Conditions Générales de Vente</h1><p>Contenu à compléter par l\'administrateur.</p>',
    type: 'html',
    isActive: true,
  },
  {
    slug: 'privacy',
    title: 'Politique de Confidentialité',
    content: '<h1>Politique de Confidentialité</h1><p>Contenu à compléter par l\'administrateur.</p>',
    type: 'html',
    isActive: true,
  },
  {
    slug: 'about',
    title: 'À propos d\'ExpressAfri',
    content: '<h1>À propos</h1><p>ExpressAfri est la première plateforme e-commerce dédiée à l\'Afrique.</p>',
    type: 'html',
    isActive: true,
  },
  {
    slug: 'faq',
    title: 'Foire aux questions',
    content: '<h1>FAQ</h1><p>Contenu à compléter par l\'administrateur.</p>',
    type: 'html',
    isActive: true,
  },
])
console.log('  ✓ 4 pages statiques créées')
```

---

## 14. Catégories de produits

### Problème
La table `categories` est vide. L'app mobile affiche des catégories via `GET /mobile/categories`
— elles ne s'affichent pas. Les filtres de recherche sont vides.

### Solution
Créer une boutique de démonstration et insérer 10 catégories couvrant les marchés
prioritaires d'Afrique de l'Ouest.

**Dans `seed.ts`, ajouter :**

```ts
// ── Boutique de démonstration + catégories ──
const DEMO_STORE_ID = '00000000-0000-0000-0000-000000000002'
await db.insert(schema.stores).values({
  id: DEMO_STORE_ID,
  name: 'ExpressAfri Store',
  email: 'store@expressafri.com',
  country: 'Niger',
  status: 'active',
}).onConflictDoNothing()

const categories = await db.insert(schema.categories).values([
  { storeId: DEMO_STORE_ID, name: 'Téléphones & Tablettes', slug: 'phones-tablets',    isActive: true },
  { storeId: DEMO_STORE_ID, name: 'Mode & Vêtements',       slug: 'fashion',           isActive: true },
  { storeId: DEMO_STORE_ID, name: 'Beauté & Santé',         slug: 'beauty-health',     isActive: true },
  { storeId: DEMO_STORE_ID, name: 'Maison & Cuisine',       slug: 'home-kitchen',      isActive: true },
  { storeId: DEMO_STORE_ID, name: 'Sport & Loisirs',        slug: 'sports-leisure',    isActive: true },
  { storeId: DEMO_STORE_ID, name: 'Électronique',           slug: 'electronics',       isActive: true },
  { storeId: DEMO_STORE_ID, name: 'Chaussures',             slug: 'shoes',             isActive: true },
  { storeId: DEMO_STORE_ID, name: 'Sacs & Accessoires',     slug: 'bags-accessories',  isActive: true },
  { storeId: DEMO_STORE_ID, name: 'Automobile',             slug: 'automotive',        isActive: true },
  { storeId: DEMO_STORE_ID, name: 'Alimentation',           slug: 'food',              isActive: true },
]).returning()
console.log('  ✓ 10 catégories créées')
```

---

## 15. Boutiques et produits de démonstration

### Problème
Sans produits en base, l'app mobile affiche un accueil vide. Il faut au moins
quelques produits pour valider que toute la chaîne fonctionne (accueil → fiche produit
→ panier → commande).

### Solution
Insérer 12 produits répartis sur les catégories les plus importantes, avec des images
Unsplash réelles et des prix en XOF.

**Dans `seed.ts`, ajouter (après la création des catégories) :**

```ts
// ── Produits de démonstration ──
// Récupérer les IDs des catégories créées
const catMap: Record<string, string> = {}
for (const cat of categories) {
  catMap[cat.slug] = cat.id
}

const productsData = [
  // Téléphones
  { name: 'Samsung Galaxy A54', slug: 'samsung-galaxy-a54', categoryId: catMap['phones-tablets'], price: '185000', comparePrice: '220000', status: 'active', moderationStatus: 'approved', imageUrl: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400' },
  { name: 'Tecno Spark 20', slug: 'tecno-spark-20', categoryId: catMap['phones-tablets'], price: '75000', comparePrice: '90000', status: 'active', moderationStatus: 'approved', imageUrl: 'https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=400' },
  // Mode
  { name: 'Boubou Bazin Brodé', slug: 'boubou-bazin-brode', categoryId: catMap['fashion'], price: '35000', comparePrice: null, status: 'active', moderationStatus: 'approved', imageUrl: 'https://images.unsplash.com/photo-1580657018950-c7f7d6a6d990?w=400' },
  { name: 'Robe Wax Premium', slug: 'robe-wax-premium', categoryId: catMap['fashion'], price: '18000', comparePrice: '25000', status: 'active', moderationStatus: 'approved', imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400' },
  // Beauté
  { name: 'Crème Karité Pure 500g', slug: 'creme-karite-pure', categoryId: catMap['beauty-health'], price: '8500', comparePrice: null, status: 'active', moderationStatus: 'approved', imageUrl: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400' },
  { name: 'Parfum Oud Excellence', slug: 'parfum-oud-excellence', categoryId: catMap['beauty-health'], price: '45000', comparePrice: '60000', status: 'active', moderationStatus: 'approved', imageUrl: 'https://images.unsplash.com/photo-1541643600914-78b084683702?w=400' },
  // Maison
  { name: 'Ventilateur sur Pied 16"', slug: 'ventilateur-sur-pied', categoryId: catMap['home-kitchen'], price: '28000', comparePrice: '35000', status: 'active', moderationStatus: 'approved', imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400' },
  { name: 'Casserole Aluminium Set 5 pièces', slug: 'casserole-aluminium-set', categoryId: catMap['home-kitchen'], price: '15000', comparePrice: null, status: 'active', moderationStatus: 'approved', imageUrl: 'https://images.unsplash.com/photo-1584990347449-a2d4c2c8cd6e?w=400' },
  // Électronique
  { name: 'Casque Bluetooth JBL Tune', slug: 'casque-bluetooth-jbl', categoryId: catMap['electronics'], price: '32000', comparePrice: '45000', status: 'active', moderationStatus: 'approved', imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400' },
  { name: 'Montre Connectée Sport', slug: 'montre-connectee-sport', categoryId: catMap['electronics'], price: '22000', comparePrice: '30000', status: 'active', moderationStatus: 'approved', imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400' },
  // Chaussures
  { name: 'Sneakers Tendance Homme', slug: 'sneakers-tendance-homme', categoryId: catMap['shoes'], price: '25000', comparePrice: null, status: 'active', moderationStatus: 'approved', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400' },
  { name: 'Sandales Cuir Femme', slug: 'sandales-cuir-femme', categoryId: catMap['shoes'], price: '12000', comparePrice: '18000', status: 'active', moderationStatus: 'approved', imageUrl: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=400' },
]

for (const p of productsData) {
  const [product] = await db.insert(schema.products).values({
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
  }).returning()

  await db.insert(schema.productImages).values({
    productId: product.id,
    url: p.imageUrl,
    alt: p.name,
    sortOrder: 0,
  })
}
console.log('  ✓ 12 produits de démonstration créés')
```

---

## Récapitulatif — Toutes les insertions

| # | Table | Données insérées | Prérequis |
|---|-------|-----------------|-----------|
| 1 | `stores` | 1 boutique système + 1 boutique démo | Aucun |
| 2 | `payment_methods` | 7 méthodes (Orange Money, Moov, Wave, MTN, Carte, COD, Wallet) | Aucun |
| 3 | `feed_sections` | 5 sections (Offres groupées, Deal du jour, Bannières, Recommandé, Boutiques) | Aucun |
| 4 | `content_blocks` | 8 raccourcis (groupe `shortcuts`) | Boutique système |
| 5 | `content_blocks` | 1 bloc tendances (groupe `search`) | Boutique système |
| 6 | `content_blocks` | 3 suggestions de personnes (groupe `suggested_people`) | Boutique système |
| 7 | `banners` | 3 bannières accueil | Aucun |
| 8 | `logos` | 7 logos (tous les contextes) | Aucun |
| 9 | `social_links` | 5 réseaux sociaux | Aucun |
| 10 | `seo_metadata` | 4 pages SEO | Aucun |
| 11 | `app_settings` | 16 paramètres (general, theme, commerce, notifications) | Aucun |
| 12 | `feature_flags` | 15 flags (mobile, payments, commerce) | Aucun |
| 13 | `static_pages` | 4 pages légales (CGV, Privacy, About, FAQ) | Aucun |
| 14 | `categories` | 10 catégories | Boutique démo |
| 15 | `products` + `product_images` | 12 produits avec images | Catégories |

**Ordre d'exécution dans `seed.ts` :**
```
TRUNCATE → Roles → Admin → Boutique système → Méthodes paiement →
Sections feed → Raccourcis → Tendances → Suggestions → Bannières →
Logos → Réseaux sociaux → SEO → App settings → Feature flags →
Pages statiques → Boutique démo → Catégories → Produits
```

---

## Prompt pour l'agent exécutant

```
Tu es un agent de développement. Tu dois enrichir le fichier de seed de la base
de données du projet ExpressAfri.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DOCUMENT DE RÉFÉRENCE OBLIGATOIRE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Lire OBLIGATOIREMENT avant tout travail :
  C:\Users\abdou\Desktop\ExpressAfri\PLAN_CORRECTIONS_2.md

Ce fichier contient le code exact à insérer dans seed.ts pour chaque section.
Ne pas improviser. Copier le code du plan tel quel.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RÈGLE ANTI-COMPACTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

À chaque compaction ou reprise :
1. Relire PLAN_CORRECTIONS_2.md
2. Vérifier le contenu actuel de apps/api/src/seed.ts
3. Reprendre à la prochaine tâche non cochée

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FICHIER UNIQUE À MODIFIER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  apps/api/src/seed.ts

Lire d'abord le fichier entier. Les données existantes (roles, admin) doivent
être CONSERVÉES. Ajouter les nouvelles insertions APRÈS le console.log admin existant
et AVANT le console.log final.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHECKLIST — À COCHER AU FUR ET À MESURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ ] S.1  — Lire seed.ts en entier
[ ] S.2  — Ajouter constante SYSTEM_STORE_ID et insert boutique système
[ ] S.3  — Ajouter DEMO_STORE_ID (déclaration, sera utilisée plus tard)
[ ] S.4  — Ajouter insert payment_methods (7 méthodes)
[ ] S.5  — Ajouter insert feed_sections (5 sections)
[ ] S.6  — Ajouter insert content_blocks raccourcis (8 blocs, groupe='shortcuts')
[ ] S.7  — Ajouter insert content_blocks tendances (1 bloc, groupe='search')
[ ] S.8  — Ajouter insert content_blocks suggestions (3 blocs, groupe='suggested_people')
[ ] S.9  — Ajouter insert banners (3 bannières)
[ ] S.10 — Ajouter insert logos (7 contextes)
[ ] S.11 — Ajouter insert social_links (5 plateformes)
[ ] S.12 — Ajouter insert seo_metadata (4 pages)
[ ] S.13 — Ajouter insert app_settings (16 paramètres)
[ ] S.14 — Ajouter insert feature_flags (15 flags)
[ ] S.15 — Ajouter insert static_pages (4 pages)
[ ] S.16 — Ajouter insert boutique démo (DEMO_STORE_ID)
[ ] S.17 — Ajouter insert categories (10 catégories) + récupération des IDs
[ ] S.18 — Ajouter insert products + product_images (12 produits)
[ ] S.19 — Vérifier que le console.log final ✅ est bien à la fin
[ ] S.20 — Vérifier que TypeScript compile : cd apps/api && npx tsc --noEmit

Une fois toutes les cases cochées, écrire :
"✅ SEED TERMINÉ" avec le nombre total de lignes insérées par table.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RÈGLES IMPORTANTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Ne pas toucher aux insertions roles et admin déjà présentes
- Respecter l'ordre : boutique système avant content_blocks (FK)
- Respecter l'ordre : boutique démo avant categories avant products
- Pour schema.contentBlocks : toujours fournir storeId = SYSTEM_STORE_ID
- Pour schema.categories et products : toujours fournir storeId = DEMO_STORE_ID
- Le TRUNCATE existant nettoie déjà stores → pas de problème de doublon
- Ne pas modifier le TRUNCATE existant
- Utiliser schema.paymentMethods, schema.feedSections, etc. (schéma importé)
- Vérifier les types : price est un string decimal ('185000' pas 185000)
```
