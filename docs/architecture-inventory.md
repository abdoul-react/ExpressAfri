# Inventaire & Analyse Architecturelle — ExpressAfri (AfriExpress)

> **Application e-commerce mono-vendeur** — Vente de produits de Chine vers l'Afrique.
> Multi-devise · Multi-langue · Design premium inspiré d'AliExpress, amélioré et personnalisé.
> Stack : **Expo SDK 57 + React Native + TypeScript + expo-router**.

---

## 1. Identité & Positionnement

| Élément | Valeur |
|---------|--------|
| **Nom** | **AfriExpress** |
| **Baseline** | « La Chine à votre porte » / « China to your door » |
| **Logo** | Wordmark + étoile/soleil du Niger (SVG) |
| **Positionnement** | AliExpress africanisé, premium, épuré, mono-vendeur |
| **Cibles** | Marchés africains (Niger, Mali, Sénégal, Burkina Faso, Côte d'Ivoire, Nigeria, Ghana, Maroc) |

### Couleurs — Drapeau du Niger

| Token | Hex | Usage |
|-------|-----|-------|
| `brand.orange` (primaire) | `#E8590C` | CTA, prix, onglet actif, accents |
| `brand.orangeSun` | `#FF8A00` | Dégradés, badges promo, halo soleil |
| `brand.green` (secondaire) | `#0DB02B` | Succès, livraison gratuite, validations |
| `neutral.ink` | `#1A1A1A` | Texte principal |
| `neutral.slate` | `#6B7280` | Texte secondaire |
| `sale.red` | `#FA2A2D` | Prix barrés / urgence (usage limité) |

Dégradé signature : `#FF8A00 → #E8590C` (soleil du Niger).

---

## 2. Stack Technique

| Domaine | Choix | Raison |
|---------|-------|--------|
| Framework | Expo SDK 57, React Native 0.86, TypeScript ~6.0 | Cross-platform (iOS/Android/Web), strict typing |
| Navigation | **expo-router** (file-based) | Scalabilité, deep-linking, modularité, lazy loading |
| État global | **Zustand 5** (+ AsyncStorage persist) | Léger, simple, performant (5 stores atomiques) |
| Data / cache | **@tanstack/react-query 5** | Couche data prête pour backend, cache, retries |
| i18n | **i18next + react-i18next + expo-localization** | FR/EN/AR + RTL, détection appareil |
| Icônes | **react-native-svg** (set maison, 60+ icônes) | SVG pro, zéro emoji, zéro dépendance externe |
| Listes | **@shopify/flash-list** | Grilles produits performantes (masonry, grid) |
| Images | **expo-image** | Cache, blur-hash, perf |
| Animations | **react-native-reanimated 4.5** + gesture-handler | Transitions premium, skeleton pulse |
| Bottom sheets | **@gorhom/bottom-sheet** | Modals variantes, filtres, sélecteurs |
| Stockage | **@react-native-async-storage/async-storage** | Persistance panier/langue/devise/auth/addresses |
| Tests | **Vitest** | Tests unitaires |
| Linting | ESLint (expo-config) | — |

---

## 3. Architecture Globale — Les 4 Couches

```
app/ (écrans)                    ← Présentation uniquement
  ↓ importe
src/features/ (hooks)            ← Orchestration, composition, transformations
  ↓ importe
src/services/ (services)         ← Accès données, mapping, normalisation
  ↓ importe
src/data/ (mocks)                ← Données brutes (backend un jour)
```

### Règles strictes (vérifiées automatiquement par `npm run check:arch`)
1. Les écrans **ne doivent pas** importer directement `@/data`
2. Les services **doivent rester purs** : pas de logique UI, pas de rendu
3. Les transformations de données vivent dans les **hooks** ou dans des **helpers dédiés**
4. Les nouveaux domaines doivent avoir leur propre **service** et, si besoin, leur propre **hook**
5. La direction des dépendances doit toujours suivre : **écran → hook → service → données**

---

## 4. Arborescence Complète du Projet

```
ExpressAfri/
├── app/                            # Routes expo-router (36 écrans)
│   ├── _layout.tsx                 # Root providers (query, theme, i18n, gesture, bottom-sheet)
│   ├── (tabs)/                     # Barre d'onglets custom (5 onglets)
│   │   ├── _layout.tsx             # TabBar custom SVG
│   │   ├── index.tsx               # Accueil
│   │   ├── store.tsx               # Boutique (catégories)
│   │   ├── feed.tsx                # Fil d'actualité masonry
│   │   ├── cart.tsx                # Panier
│   │   └── account.tsx             # Compte
│   ├── auth/
│   │   ├── login.tsx               # Connexion téléphone/email
│   │   ├── register.tsx            # Inscription
│   │   ├── otp.tsx                 # Saisie OTP
│   │   ├── otp-sent.tsx            # OTP envoyé
│   │   ├── forgot-password.tsx     # Mot de passe oublié
│   │   └── forgot-password-sent.tsx
│   ├── product/[id].tsx            # Fiche produit
│   ├── search/
│   │   └── index.tsx               # Recherche + résultats + filtres
│   ├── checkout/
│   │   ├── index.tsx               # Récap commande
│   │   ├── payment.tsx             # Choix paiement
│   │   └── success.tsx             # Confirmation
│   ├── orders/
│   │   ├── index.tsx               # Liste commandes (onglets par statut)
│   │   └── [id].tsx                # Détail commande
│   ├── wallet/
│   │   ├── bonus.tsx               # Bonus/pièces
│   │   └── savings.tsx             # Cagnotte
│   ├── address/
│   │   ├── index.tsx               # Liste adresses
│   │   └── form.tsx                # Ajout/édition adresse
│   ├── messages/index.tsx          # Messagerie (Commandes/Promos)
│   ├── settings/index.tsx          # Réglages (langue, devise, pays, thème)
│   ├── wishlist/index.tsx          # Favoris
│   ├── coupons/index.tsx           # Coupons
│   ├── stores/index.tsx            # Boutiques suivies
│   ├── suggestions/index.tsx       # Suggestions
│   ├── profile/index.tsx           # Profil
│   ├── payment/index.tsx           # Méthodes de paiement
│   ├── camera/index.tsx            # Recherche visuelle (caméra)
│   ├── onboarding.tsx              # 3 slides onboarding
│   └── placeholder.tsx             # Écran générique
│
├── src/
│   ├── design-system/              # Système de design complet
│   │   ├── colors.ts               # Palette + light/dark themes + dégradés
│   │   ├── typography.ts           # Échelle 11-34px, variantes sémantiques
│   │   ├── spacing.ts              # Base 4 (0→56px), radius, shadows
│   │   ├── ThemeContext.tsx         # ThemeProvider, useColors, useThemedStyles
│   │   └── index.ts                # Export unifié + theme agrégé
│   │
│   ├── components/                 # 19 composants UI partagés
│   │   ├── index.ts                # Barillet d'export
│   │   ├── Badge.tsx
│   │   ├── Button.tsx
│   │   ├── Countdown.tsx
│   │   ├── EmptyState.tsx
│   │   ├── Price.tsx
│   │   ├── ProductCard.tsx
│   │   ├── QuantityStepper.tsx
│   │   ├── Rating.tsx
│   │   ├── ScreenHeader.tsx
│   │   ├── SearchBar.tsx
│   │   ├── SectionHeader.tsx
│   │   ├── Sheet.tsx               # Wrapper @gorhom/bottom-sheet
│   │   ├── Skeleton.tsx            # Skeleton base + SkeletonCircle
│   │   ├── SkeletonCard.tsx        # 8 variantes (Home, Card, ProductDetail, etc.)
│   │   └── StatusState.tsx         # Loading/Error/Empty unifié
│   │
│   ├── icons/                      # Système d'icônes SVG maison
│   │   ├── paths.ts                # 60+ tracés SVG (viewBox 24x24)
│   │   ├── Icon.tsx                # <Icon name size color fill />
│   │   ├── Logo.tsx                # Logo + SunMark
│   │   └── index.ts
│   │
│   ├── i18n/                       # Internationalisation
│   │   ├── index.ts                # Init i18next + détection appareil
│   │   └── locales/
│   │       ├── fr.json             # Français (défaut)
│   │       ├── en.json             # English
│   │       └── ar.json             # العربية (RTL)
│   │
│   ├── store/                      # 5 stores Zustand persistés
│   │   ├── authStore.ts            # Onboarding, auth, guest, user, tokens
│   │   ├── cartStore.ts            # Items CRUD, sélection, derived selectors
│   │   ├── settingsStore.ts        # Langue, devise, pays, RTL, thème + pays africains
│   │   ├── wishlistStore.ts        # IDs favoris, toggle
│   │   └── addressStore.ts         # Adresses CRUD, adresse par défaut
│   │
│   ├── services/                   # 6 services — seule couche autorisée à importer @/data
│   │   ├── index.ts                # Barillet d'export
│   │   ├── apiAdapter.ts           # Client HTTP générique + refresh token + fallback mock
│   │   ├── catalogService.ts       # Produits, catégories, sous-catégories
│   │   ├── authService.ts          # OTP, email login, password reset
│   │   ├── orderService.ts         # Commandes par statut, détail
│   │   ├── paymentService.ts       # Méthodes de paiement
│   │   ├── contentService.ts       # Bannières, feed posts, suggestions
│   │   └── logger.ts               # Logging console + monitoring URL
│   │
│   ├── data/                       # 4 fichiers mock — remplaçables par backend
│   │   ├── products.ts             # 20 produits (titres, prix, images, variantes, specs)
│   │   ├── categories.ts           # 10 catégories + raccourcis accueil + sous-catégories
│   │   ├── banners.ts              # 3 bannières promo + 16 feed posts masonry
│   │   └── payments.ts             # 4 méthodes (Mobile Money, Carte, COD, Wallet)
│   │
│   ├── features/                   # 12 domaines métier
│   │   ├── mock/
│   │   │   └── mockData.ts         # Détection mock (global/env/constants)
│   │   ├── home/
│   │   │   ├── useHomeFeed.ts      # Feed données accueil (bundle, deals, grid)
│   │   │   ├── useHomeShortcuts.ts # Raccourcis catégories
│   │   │   ├── HomeHeader.tsx      # Header accueil (logo, search, tabs, cat chips)
│   │   │   ├── BannerCarousel.tsx  # Carrousel bannières promo
│   │   │   ├── ShortcutRail.tsx    # Rail catégories rondes
│   │   │   └── PromoModal.tsx      # Pop-up nouvel acheteur
│   │   ├── product/
│   │   │   └── useProduct.ts       # Produit + similaires
│   │   ├── catalog/
│   │   │   ├── catalogViewModel.ts # Helpers purs (search, suggest, related, wishlist)
│   │   │   ├── useSuggestions.ts   # Suggestions produits
│   │   │   └── useWishlistProducts.ts # Favoris croisés catalogue
│   │   ├── cart/
│   │   │   ├── cartService.ts      # Logique quantité, stock, remove
│   │   │   └── useCartData.ts      # Données panier + status
│   │   ├── checkout/
│   │   │   ├── checkoutService.ts  # Calculs sous-total, shipping, promo, total
│   │   │   ├── useCheckout.ts      # Orchestration checkout
│   │   │   └── __tests__/
│   │   │       └── checkoutService.test.ts # Tests unitaires Vitest
│   │   ├── search/
│   │   │   ├── index.ts            # Barillet d'export
│   │   │   ├── useSearch.ts        # Recherche texte
│   │   │   ├── useSearchFilters.ts # Filtres avancés (tri, prix, note, livraison)
│   │   │   └── SearchFiltersSheet.tsx # Bottom sheet filtres
│   │   ├── store/
│   │   │   └── useStoreCatalog.ts  # Données boutique (catégories, sous-catégories)
│   │   ├── feed/
│   │   │   └── useFeed.ts          # Posts masonry + suggestions personnes
│   │   ├── orders/
│   │   │   └── useOrders.ts        # Commandes par statut + détail
│   │   ├── payment/
│   │   │   ├── paymentMachine.ts   # Machine à états paiement
│   │   │   └── usePaymentMethods.ts # Méthodes de paiement
│   │   ├── order/
│   │   │   └── orderMachine.ts     # Machine à états commande
│   │   └── address/
│   │       └── useAddressForm.ts   # Formulaire adresse (validation CRUD)
│   │
│   ├── hooks/
│   │   └── usePrice.ts             # Formatage prix dans devise active
│   │
│   ├── utils/
│   │   └── currency.ts             # Multi-devise (XOF/USD/NGN/EUR), conversion, formatage
│   │
│   └── types/
│       └── index.ts                # Product, Category, CartItem, Order, Banner, FeedPost, etc.
│
├── scripts/
│   └── check-architecture.mjs      # Validation automatique des dépendances
│
├── assets/                         # Images (icon, splash, favicon, android adaptive)
├── PHTO/                           # Captures d'écran de référence
├── Mobile Devices/                 # Maquettes devices
│
├── app.json                        # Configuration Expo (plugins, permissions, splash)
├── package.json                    # Dépendances & scripts
├── tsconfig.json                   # TypeScript strict, path alias @/
├── babel.config.js
├── eslint.config.js
├── .env.example                    # EXPO_PUBLIC_API_URL, EXPO_PUBLIC_USE_MOCK
├── .gitignore
├── README.md                       # Convention d'architecture
├── ROADMAP.md                      # Feuille de route complète (source de vérité)
└── ARCHITECTURE_RULES.md           # Règles d'architecture
```

---

## 5. Design System

### Couleurs
- **Palette complète** : 40+ tokens (orange Niger, vert, rouge promo, neutres)
- **Thèmes** : `lightColors` et `darkColors` (mêmes clés, valeurs inversées pour surfaces/textes)
- **Dégradés** : `sun`, `sunset`, `flag`, `promo`
- **Principe** : Aucun hex en dur dans les écrans — tout passe par `colors.*`

### Typographie
- Police : Inter / SF Pro
- Échelle : 11 / 12 / 14 / 15 / 16 / 18 / 22 / 28 / 34
- Variantes : `h1`, `h2`, `h3`, `sectionTitle`, `title`, `body`, `bodyStrong`, `caption`, `micro`, `price`, `priceLarge`, `button`

### Espacement
- Base 4 : `none(0)` → `giant(56)`
- Rayons : `sm(6)` → `pill(999)`, `circle(9999)`
- Ombres : `sm`, `md`, `lg` (unifiées cross-platform)

### Système de thème
- `ThemeProvider` injecte les couleurs via React Context
- `useColors()` → palette active
- `useThemedStyles(fn)` → styles mémoïsés reconstruits au changement de thème

---

## 6. Écrans & Fonctionnalités (parcours complet)

### 6.1 Accueil (`(tabs)/index.tsx`)
- Header : logo + cloche notifications + SearchBar + caméra
- Onglets : « Pour vous » / « Promos »
- Bannière carrousel (auto-play, dégradé, countdown)
- Rail catégories rondes (Jetons, Match, Marque+, Déstockage, Boutiques)
- Offres groupées (bandeau badge vert)
- Deal du jour avec timer + grille horizontale
- Grille infinie (FlashList, 2 colonnes) avec filtres catégories par chips
- Modal promo nouvel acheteur (1ère visite)
- Pull-to-refresh, skeletons

### 6.2 Boutique (`(tabs)/store.tsx`)
- Sidebar verticale catégories (10 catégories)
- Panneau droit : sous-catégories en grille (3 colonnes) + recommandé
- Barre promo supérieure (comme AliExpress)

### 6.3 Fil d'actualité (`(tabs)/feed.tsx`)
- Onglets « Inspiration » / « Abonnements »
- Masonry 2 colonnes (FlashList), vidéos/produits, likes, auteur
- Suggestions personnes à suivre
- Bouton central « + » dans la tabbar

### 6.4 Fiche Produit (`product/[id].tsx`)
- Galerie photos swipe + compteur
- Prix + prix barré + badge réduction
- Note + nb avis + nb ventes
- Sélecteur variantes (couleur/taille) en chips
- Garanties (livraison, protection acheteur, expédition vers)
- Spécifications, description
- Avis clients (2 avis mock)
- Produits similaires (grille)
- Barre d'action fixe : Favori · Ajouter au panier · Acheter maintenant

### 6.5 Recherche (`search/index.tsx`)
- Barre de recherche + suggestions instantanées
- Filtres avancés (bottom sheet) : tri, catégorie, prix, note, livraison gratuite, promo
- Résultats filtrés

### 6.6 Panier (`(tabs)/cart.tsx`)
- Lignes produit (image, variante, stepper quantité, prix)
- Sélection multiple (checkbox)
- Barre progression livraison gratuite
- Suppression (bouton poubelle)
- Total + bouton paiement collant
- « Vous aimerez aussi » (suggestions)

### 6.7 Checkout (`checkout/`)
- Adresse de livraison (pays africain, sélecteur)
- Récap articles + frais + promo + taxes + total
- Choix paiement : Mobile Money (Orange Money, MTN MoMo, Moov Money, Wave), Carte (Visa/MC), Paiement à la livraison, Portefeuille AfriExpress
- Écran succès

### 6.8 Compte (`(tabs)/account.tsx`)
- En-tête profil (avatar, nom, pays, badge notifs, réglages)
- Mes commandes (5 statuts : unpaid, toShip, shipped, toReview, returns)
- Grille raccourcis (Historique, Favoris, Coupons, Boutiques, Wallet, Bonus, Cagnotte, Service client)
- Promo + suggestions

### 6.9 Auth & Onboarding
- **Onboarding** : 3 slides (tagline, livraison, paiement) avec skip + pagination
- **Login** : téléphone (avec indicatif pays) ou email + mot de passe
- **OTP** : vérification code
- **Social** : Google, Apple, Facebook (UI)
- **Invité** : navigation libre, connexion requise au checkout
- **Gate** : redirection automatique dans `_layout.tsx` via `authStore`

### 6.10 Écrans secondaires
- **Commandes** : onglets par statut + détail commande (adresse, suivi, articles)
- **Favoris** : grille produits wishlist
- **Adresses** : liste + formulaire (pays, téléphone, rue, ville, province, code postal)
- **Messages** : canaux Commandes / Promos
- **Réglages** : Langue (FR/EN/AR + RTL), Devise (XOF/USD/NGN/EUR), Pays (8 pays africains), Thème, Notifications, Déconnexion
- **Wallet** : Bonus, Cagnotte
- **Coupons**, **Boutiques suivies**, **Suggestions**, **Profil**, **Paiement**
- **Appareil photo** : recherche visuelle (UI)
- **Placeholder** : écran générique pour liens non encore détaillés

---

## 7. Stores Zustand — Détail

### authStore
- `hasOnboarded`, `isAuthenticated`, `isGuest`, `user`, `hydrated`
- Actions : `completeOnboarding`, `signIn`, `continueAsGuest`, `signOut`, `updateProfile`
- Persistance : AsyncStorage (`afriexpress-auth`)
- Hydratation : charge les tokens dans apiAdapter au démarrage

### cartStore
- `items: CartItem[]`
- Actions : `add`, `remove`, `setQuantity`, `toggleSelected`, `setAllSelected`, `clear`
- Selecteurs : `count`, `selectedItems`, `subtotalUsd`
- Persistance : AsyncStorage (`afriexpress-cart`)

### settingsStore
- `language`, `currency`, `country`, `isRTL`, `hasSeenPromo`, `theme`
- `COUNTRIES` : 8 pays africains (NE, ML, SN, BF, CI, NG, GH, MA) avec devise et indicatif
- Actions : `setLanguage` (change i18n + RTL), `setCurrency`, `setCountry`, `toggleTheme`
- Persistance : AsyncStorage (`afriexpress-settings`)
- Réhydratation : rejoue la langue i18n au démarrage

### wishlistStore
- `ids: string[]`
- Actions : `toggle`, `has`
- Persistance : AsyncStorage (`afriexpress-wishlist`)

### addressStore
- `addresses: Address[]`, `defaultId: string | null`
- Actions : `add`, `update`, `remove`, `setDefault`
- Selecteur : `getDefaultAddress`
- Persistance : AsyncStorage (`afriexpress-addresses`)

---

## 8. Services — Détail

| Service | Méthodes | Données |
|---------|----------|---------|
| **catalogService** | `getProducts`, `getProductById`, `getByCategory`, `getCategories`, `getSubcategories` | products.ts, categories.ts |
| **authService** | `requestOtp`, `verifyOtp`, `loginWithEmail`, `requestPasswordReset` | Mock direct (pas de fichier data) |
| **orderService** | `getOrdersByStatus`, `getOrderById` | Mock interne (MOCK_ORDERS) |
| **paymentService** | `getMethods` | payments.ts |
| **contentService** | `getHomeShortcuts`, `getFeedPosts`, `getBanners`, `getSuggestedPeople` | banners.ts, categories.ts |
| **apiAdapter** | `get`, `post`, `setTokens`, `loadTokensFromStorage`, `clearTokens`, `getAccessToken` | Client HTTP générique |

### apiAdapter
- Vérifie `isMock()` : si mock → exécute le fallback, sinon requête HTTP réelle
- Gestion du refresh token automatique (401 → refresh → retry)
- Injection du header `Authorization: Bearer <token>`
- Persistance des tokens dans AsyncStorage

### Logger
- Niveaux : `info`, `warn`, `error`
- Console + envoi asynchrone vers `EXPO_PUBLIC_MONITORING_URL` (silencieux si pas configuré)

---

## 9. Systèmes Transverses

### Multi-langue (i18n)
- 3 langues : Français (défaut), English, العربية
- Détection automatique via `expo-localization`
- Namespaces plats (traductions par feature)
- RTL : bascule `I18nManager` + styles logiques (start/end) + persistance

### Multi-devise
- Devise par défaut : XOF (FCFA)
- Taux de conversion mockés (1 USD → 600 XOF / 1550 NGN / 0.92 EUR)
- `formatPrice(amountUsd, currency)` → format localisé (FCFA sans décimales, symbole après)
- `formatAmount(value, currency)` → format sans conversion

### Paiement (UI d'abord)
- 4 méthodes : Mobile Money (Orange Money, MTN MoMo, Moov Money, Wave), Carte (Visa/MC), COD, Wallet
- Abstraction prête pour Flutterwave/Paystack/Stripe

### Mock / Backend
- `isMock()` détecte : `globalThis.__USE_MOCK__` → `EXPO_PUBLIC_USE_MOCK` → `process.env.USE_MOCK` → `app.json extra.USE_MOCK`
- Défaut : `true` (l'app tourne sans backend)
- Services encapsulés via `apiAdapter` : remplacer le mock = brancher des vraies API sans toucher l'UI

---

## 10. Scalabilité & Robustesse

### Scalabilité
1. **File-based routing** : chaque écran = fichier indépendant, lazy-loaded, deep-linking natif
2. **Feature-based folders** : 12 domaines encapsulés (home, cart, checkout...), extension sans conflit
3. **Services isolés** : seule couche qui importe `data/` — brancher un backend = réécrire les services, l'UI inchangée
4. **React-Query** : caching, déduplication, retry, refetch — prêt pour scale API
5. **FlashList** partout : performances sur longues listes (grid, masonry)
6. **Zustand atomique** : 5 stores par domaine, pas de store global monolithique
7. **Architecture check automatisé** : `npm run check:arch` valide le sens des dépendances à chaque build
8. **Code-splitting** par feature (expo-router lazy)

### Robustesse
1. **TypeScript strict** + types dédiés (Product, Category, CartItem, Order, Banner, FeedPost...)
2. **Skeletons partout** : 8 variantes (Home, Card, ProductDetail, SearchResults, Store, Orders, HorizontalRail)
3. **StatusState unifié** : gestion loading/error/empty dans tous les écrans
4. **Gestion d'erreurs** : try/catch dans authStore, apiAdapter avec refresh token automatique + retry
5. **Mock/API switch** : détection multi-niveaux (global, env vars, app.json)
6. **Persistance** : 5 stores critiques persistés dans AsyncStorage
7. **RTL support** : bascule langue ↔ I18nManager ↔ styles logiques ↔ persistance
8. **Tests unitaires** : Vitest (checkoutService)
9. **Thème dark/light** : palette complète pour les deux modes
10. **Pas de hex en dur** : tout passe par le design system

---

## 11. Phases de Livraison

| Phase | Statut | Contenu |
|-------|--------|---------|
| P0 | ✅ | Fondations : scaffold Expo SDK 57, expo-router, TS, design-system, tokens, providers |
| P1 | ✅ | Icônes SVG (60+) + UI kit (Button, ProductCard, Price, Rating, SearchBar, etc.) |
| P2 | ✅ | i18n FR/EN/AR + RTL + sélecteurs langue/devise/pays + formatage prix |
| P3 | ✅ | Navigation + tabbar custom + Accueil complet (bannière, raccourcis, offres, deals, grille, promo modal) |
| P4 | ✅ | Boutique (sidebar + panneau) + Recherche (historique/tendances/résultats) |
| P5 | ✅ | Fiche produit (galerie, variantes, garanties, specs, avis, similaires) |
| P6 | ✅ | Panier + Checkout + Adresse + Paiements (Mobile Money, Carte, COD, Wallet) + Succès |
| P7 | ✅ | Compte (profil, commandes, grille, wallet, suggestions) |
| P8 | ✅ | Fil d'actualité (masonry 2 colonnes, Inspiration/Abonnements) |
| P9 | ✅ | Messages + Réglages (langue, devise, pays, thème) |
| P10 | ✅ | Auth : Onboarding → Login (téléphone/email/OTP/social/guest) → Gate redirection |
| P11 | ✅ | Commandes (onglets statuts), Favoris, Placeholder — tous les boutons branchés |
| P12 | ✅ | Corrections UX (search bar, settings redesign, store redesign) |
| P13 | ✅ | Fondations avancées : skeletons, bottom sheets, filtres recherche, animations, branchement backend préparé |
| P14 | ⏳ | QA multi-appareils, tests supplémentaires, dark mode automatique, animations, pagination, push notifications |

---

## 12. Métriques Clés

| Métrique | Valeur |
|----------|--------|
| Fichiers source .ts/.tsx | ~100 |
| Écrans (routes) | 36 |
| Composants UI partagés | 19 |
| Icônes SVG | 60+ |
| Stores Zustand | 5 |
| Services | 6 |
| Hooks métier | ~15 |
| Features (domaines) | 12 |
| Tests unitaires | 1 suite (checkoutService) |
| Langues | 3 (FR, EN, AR) |
| Devises supportées | 4 (XOF, USD, NGN, EUR) |
| Pays supportés | 8 africains |
| Dépendances | ~30 packages |
| TypeScript | Strict, TS 6.0 |
| Architecture check | Automatisé (scripts/check-architecture.mjs) |

---

## 13. Flux de Navigation

```
[Splash Screen]
    ↓ (hydratation authStore)
[Onboarding] (3 slides)
    ↓ completeOnboarding()
[Auth Gate]
    ├─ Login (téléphone/email)
    │   ├─ OTP verification → [TabBar]
    │   └─ Email + password → [TabBar]
    ├─ Social login (Google/Apple/Facebook) → [TabBar]
    └─ Invité (continueAsGuest) → [TabBar]

[TabBar] (5 onglets)
    ├─ Accueil → Product/[id] → Checkout
    ├─ Boutique → Product/[id]
    ├─ Feed
    ├─ Panier → Checkout → Paiement → Succès
    └─ Compte → Commandes / Favoris / Wallet / Réglages / Messages / etc.

[Modales transverses]
    ├─ Promo nouvel acheteur (1ère visite)
    ├─ Filtres recherche (bottom sheet)
    ├─ Sélecteur variantes (chips inline)
    ├─ Sélecteur langue/devise/pays (settings modals)
    └─ Confirmation suppression
```

---

## 14. Dépendances Clés (package.json)

```json
{
  "dependencies": {
    "@gorhom/bottom-sheet": "^5.2.14",
    "@react-native-async-storage/async-storage": "2.2.0",
    "@shopify/flash-list": "2.0.2",
    "@tanstack/react-query": "^5.62.0",
    "expo": "~57.0.1",
    "expo-camera": "~57.0.0",
    "expo-image": "~57.0.0",
    "expo-linear-gradient": "~57.0.0",
    "expo-localization": "~57.0.0",
    "expo-router": "~57.0.2",
    "expo-splash-screen": "~57.0.1",
    "i18next": "^24.2.0",
    "react": "19.2.3",
    "react-i18next": "^15.4.0",
    "react-native": "0.86.0",
    "react-native-gesture-handler": "~2.32.0",
    "react-native-reanimated": "4.5.0",
    "react-native-safe-area-context": "~5.7.0",
    "react-native-svg": "15.15.4",
    "zustand": "^5.0.2"
  },
  "devDependencies": {
    "typescript": "~6.0.3",
    "vitest": "^1.3.0",
    "eslint": "^9.39.4"
  }
}
```

---

## 15. Scripts Disponibles

| Commande | Description |
|----------|-------------|
| `npm start` | Lancement Expo |
| `npm run android` | Lancement sur Android |
| `npm run ios` | Lancement sur iOS |
| `npm run web` | Lancement sur Web |
| `npm run lint` | Linting ESLint |
| `npm run check:arch` | Vérification architecture (dépendances) |
| `npm test` | Tests unitaires Vitest |
