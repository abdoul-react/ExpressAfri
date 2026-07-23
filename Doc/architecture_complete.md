# Architecture du projet ExpressAfri

## 1. Vue d'ensemble

**Application :** e-commerce mobile (React Native / Expo)
**Taille :** 35 écrans, 15 modules features, 15 composants réutilisables
**Stack :** Expo Router, TanStack React Query, Zustand, react-i18next
**Nom officiel :** Feature-Based Modular Layered Architecture with DataSource Abstraction

---

## 2. Architecture en couches

```
┌──────────────────────────────────────┐
│              app/                   │
│         Expo Router / Screens       │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────────┐
│                 FEATURES                      │
│                                              │
│  auth · address · catalog · cart · checkout  │
│  content · feed · home · messages            │
│  order · orders · payment · product          │
│  search · store                              │
└──────────────────────┬───────────────────────┘
                       │
                ┌──────┴──────┐
                ▼             ▼
        ┌──────────────┐ ┌────────────┐
        │    STORE     │ │   TYPES    │
        │   Zustand    │ │ Contracts  │
        └──────┬───────┘ └────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│         DATA ACCESS ABSTRACTION               │
│         DataSource<T> (interfaces)            │
│  ProductDataSource · CategoryDataSource       │
│  OrderDataSource · PaymentDataSource          │
│  ContentDataSource                            │
└──────────────┬──────────────────────┬─────────┘
               │                      │
               ▼                      ▼
     ┌────────────────────┐   ┌──────────────────┐
     │  MockDataSource   │   │  ApiDataSource   │
     │  (dev / défaut)    │   │  (production)    │
     └────────┬───────────┘   └────────┬─────────┘
              │                        │
              ▼                        ▼
     ┌────────────────────┐   ┌──────────────────┐
     │  Données mock     │   │   apiAdapter     │
     │  (fichiers TS)    │   │     → API REST   │
     └────────────────────┘   └──────────────────┘
```

### Règles strictes de dépendances

| Couche | Peut importer |
|--------|---------------|
| `app/` (écrans) | `@/features/*` (barrel only), `@/components`, `@/design-system`, `@/store`, `@/icons`, `@/hooks`, librairies externes |
| `src/features/*/` (hooks + services) | `@/infrastructure`, `@/store`, `@/types`, `@tanstack/react-query`, `@/features/*` (barrel only) |
| `src/components/` | `@/design-system`, `@/types`, `@/icons` (pas de services, pas de stores) |
| `src/infrastructure/` | Dépendances techniques uniquement (fetch, AsyncStorage, etc.) — jamais de code métier (`@/features/*`, `@/store/*`) |
| `src/store/` (Zustand) | `@/types`, `@/infrastructure` |

**Interdits :**
- ❌ Un écran n'importe jamais `@/infrastructure` ou `@tanstack/react-query`
- ❌ Une feature n'importe jamais l'interne d'une autre feature (`features/auth/store/...`)
- ❌ Un composant n'importe jamais un service ou un store métier

**Conformité vérifiée (dernière passe : 16/07/2026) :**

| Règle | Statut |
|-------|--------|
| `app/` → `@/services` | ✅ 0 (dossier supprimé) |
| `app/` → `@/infrastructure` | ✅ 0 |
| `app/` → `@tanstack/react-query` (hors `_layout.tsx`) | ✅ 0 |
| `app/` → deep `features/` | ✅ 0 |
| `src/components/` → infrastructure / query / features | ✅ 0 |
| `src/features/` → deep inter-features | ✅ 0 |
| `CartItem` : unique définition | ✅ 1 seule (`@/types`) |

---

## 3. Arborescence complète

```
ExpressAfri/
│
├── app/                           ← 35 ÉCRANS (Expo Router)
│   ├── _layout.tsx                ← Provider setup (QueryClient, Theme, Auth gate)
│   ├── onboarding.tsx             ← 3 slides
│   │
│   ├── (tabs)/                    ← Tab navigator
│   │   ├── _layout.tsx            ← CustomTabBar (5 tabs)
│   │   ├── index.tsx              ← Accueil (rails, grille, bannières)
│   │   ├── store.tsx              ← Catégories
│   │   ├── feed.tsx               ← Social feed
│   │   ├── cart.tsx               ← Panier
│   │   └── account.tsx            ← Compte
│   │
│   ├── auth/                      ← Auth flow (6 écrans)
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   ├── otp.tsx / otp-sent.tsx
│   │   └── forgot-password.tsx / forgot-password-sent.tsx
│   │
│   ├── product/[id].tsx           ← Détail produit
│   ├── search/index.tsx           ← Recherche + filtres
│   ├── camera/index.tsx           ← Recherche visuelle
│   │
│   ├── checkout/                   ← 3 écrans
│   │   ├── index.tsx
│   │   ├── payment.tsx
│   │   └── success.tsx
│   │
│   ├── address/                   ← 2 écrans
│   │   ├── index.tsx              ← Liste adresses
│   │   └── form.tsx               ← Ajout/édition
│   │
│   ├── orders/                    ← 3 écrans
│   │   ├── index.tsx              ← Liste
│   │   ├── [id].tsx               ← Détail
│   │   └── tracking.tsx           ← Suivi
│   │
│   ├── messages/                  ← 2 écrans
│   │   ├── index.tsx              ← Liste conversations
│   │   └── [id].tsx               ← Chat
│   │
│   ├── wallet/                    ← 2 écrans
│   │   ├── bonus.tsx
│   │   └── savings.tsx
│   │
│   ├── wishlist/index.tsx
│   ├── coupons/index.tsx
│   ├── stores/index.tsx
│   ├── settings/index.tsx
│   ├── profile/index.tsx
│   ├── payment/index.tsx
│   ├── suggestions/index.tsx
│   └── placeholder.tsx
│
├── src/
│   │
│   ├── design-system/             ← Design tokens
│   │   ├── colors.ts              ← Palette + light/dark themes
│   │   ├── spacing.ts             ← 4-base scale (0→56), radius, shadows
│   │   ├── typography.ts          ← fontSize (11→34), fontWeight, text styles
│   │   ├── ThemeContext.tsx        ← Provider + useColors() / useThemedStyles()
│   │   └── index.ts
│   │
│   ├── components/                ← 15 composants réutilisables
│   │   ├── index.ts               ← Barrel
│   │   ├── ProductCard.tsx        ← Carte produit (flex/width/size)
│   │   ├── Button.tsx             ← 5 variants × 3 sizes
│   │   ├── SearchBar.tsx          ← Mode édition ou navigation
│   │   ├── SectionHeader.tsx
│   │   ├── Price.tsx / Rating.tsx / Badge.tsx / Countdown.tsx
│   │   ├── QuantityStepper.tsx
│   │   ├── ScreenHeader.tsx
│   │   ├── Sheet.tsx              ← Bottom sheet (@gorhom)
│   │   ├── EmptyState.tsx / StatusState.tsx
│   │   ├── Skeleton.tsx / SkeletonCard.tsx
│   │   └── ...
│   │
│   ├── features/                  ← 15 MODULES FONCTIONNELS
│   │   │
│   │   ├── address/               ← Gestion adresses
│   │   │   ├── index.ts           ← Barrel (API publique)
│   │   │   └── useAddressForm.ts
│   │   │
│   │   ├── auth/                  ← Authentification
│   │   │   ├── index.ts
│   │   │   ├── authService.ts     ← Service métier intégré
│   │   │   └── useAuth.ts
│   │   │
│   │   ├── cart/                  ← Panier
│   │   │   ├── index.ts
│   │   │   ├── useCartData.ts
│   │   │   └── cartService.ts
│   │   │
│   │   ├── catalog/               ← Catalogue (produits)
│   │   │   ├── index.ts
│   │   │   ├── catalogService.ts  ← Service métier intégré
│   │   │   ├── useSuggestions.ts
│   │   │   ├── useWishlistProducts.ts
│   │   │   └── catalogViewModel.ts
│   │   │
│   │   ├── checkout/              ← Commande
│   │   │   ├── index.ts
│   │   │   ├── useCheckout.ts
│   │   │   ├── checkoutService.ts
│   │   │   └── __tests__/
│   │   │
│   │   ├── feed/                  ← Social feed
│   │   │   ├── index.ts
│   │   │   └── useFeed.ts
│   │   │
│   │   ├── home/                  ← Accueil
│   │   │   ├── index.ts
│   │   │   ├── useHomeFeed.ts
│   │   │   ├── useHomeShortcuts.ts
│   │   │   ├── BannerCarousel.tsx
│   │   │   ├── HomeHeader.tsx
│   │   │   ├── ShortcutRail.tsx
│   │   │   └── PromoModal.tsx
│   │   │
│   │   ├── messages/              ← Messagerie
│   │   │   ├── index.ts
│   │   │   ├── messagingService.ts ← Service métier intégré
│   │   │   └── useMessages.ts
│   │   │
│   │   ├── order/                 ← Machine à états commande
│   │   │   ├── index.ts
│   │   │   └── orderMachine.ts
│   │   │
│   │   ├── orders/                ← Commandes utilisateur
│   │   │   ├── index.ts
│   │   │   ├── orderService.ts    ← Service métier intégré
│   │   │   └── useOrders.ts
│   │   │
│   │   ├── payment/               ← Paiement
│   │   │   ├── index.ts
│   │   │   ├── paymentService.ts  ← Service métier intégré
│   │   │   ├── usePaymentMethods.ts
│   │   │   ├── useCardBrands.ts
│   │   │   └── paymentMachine.ts
│   │   │
│   │   ├── product/               ← Détail produit
│   │   │   ├── index.ts
│   │   │   └── useProduct.ts
│   │   │
│   │   ├── search/                ← Recherche
│   │   │   ├── index.ts
│   │   │   ├── useSearch.ts
│   │   │   ├── useSearchFilters.ts
│   │   │   └── SearchFiltersSheet.tsx
│   │   │
│   │   ├── content/               ← Contenu transversal (bannières, feed posts, raccourcis)
│   │   │   ├── index.ts
│   │   │   └── contentService.ts  ← Service métier intégré
│   │   │
│   │   └── store/                 ← Boutique
│   │       ├── index.ts
│   │       └── useStoreCatalog.ts
│   │
│   ├── infrastructure/            ← INFRASTRUCTURE TECHNIQUE
│   │   ├── index.ts               ← Barrel
│   │   ├── api/
│   │   │   └── apiAdapter.ts      ← Client HTTP (Bearer, refresh, retry)
│   │   ├── data-source/
│   │   │   ├── index.ts           ← Barrel + instances (Mock actuellement)
│   │   │   ├── DataSource.ts      ← Interface générique
│   │   │   ├── ProductDataSource.ts
│   │   │   ├── CategoryDataSource.ts
│   │   │   ├── OrderDataSource.ts
│   │   │   ├── PaymentDataSource.ts
│   │   │   ├── ContentDataSource.ts
│   │   │   ├── AuthDataSource.ts
│   │   │   ├── mock/              ← Implémentations Mock + données
│   │   │   │   ├── index.ts
│   │   │   │   ├── MockAuthDataSource.ts
│   │   │   │   ├── MockProductDataSource.ts
│   │   │   │   ├── MockCategoryDataSource.ts
│   │   │   │   ├── MockOrderDataSource.ts
│   │   │   │   ├── MockPaymentDataSource.ts
│   │   │   │   ├── MockContentDataSource.ts
│   │   │   │   ├── banners.ts
│   │   │   │   ├── categories.ts
│   │   │   │   ├── products.ts
│   │   │   │   └── payments.ts
│   │   │   └── api/               ← Implémentations API (prêtes pour production)
│   │   │       ├── index.ts
│   │   │       ├── ApiAuthDataSource.ts
│   │   │       ├── ApiProductDataSource.ts
│   │   │       ├── ApiCategoryDataSource.ts
│   │   │       ├── ApiOrderDataSource.ts
│   │   │       ├── ApiPaymentDataSource.ts
│   │   │       └── ApiContentDataSource.ts
│   │   ├── mock/
│   │   │   ├── index.ts
│   │   │   └── mockData.ts        ← Détection mock + helpers (isMock)
│   │   └── logging/
│   │       ├── index.ts
│   │       └── logger.ts          ← Logging console + monitoring
│   │
│   ├── store/                     ← ÉTAT CLIENT (Zustand + AsyncStorage)
│   │   ├── authStore.ts           ← Auth (user, tokens, onboarding)
│   │   ├── cartStore.ts           ← Panier
│   │   ├── addressStore.ts        ← Adresses
│   │   ├── settingsStore.ts       ← Langue, pays, thème
│   │   └── wishlistStore.ts       ← Favoris
│   │
│   ├── types/index.ts             ← 12 TYPES PARTAGÉS
│   │   Product, CartItem, Order, Category, Banner, FeedPost...
│   │
│   ├── (Note : les données mock sont dans infrastructure/data-source/mock/)
│   │
│   ├── hooks/usePrice.ts          ← Hook transverse (conversion devise)
│   ├── i18n/                      ← TRADUCTIONS (fr, en, ar)
│   ├── icons/                     ← 60 icônes SVG (paths.ts + composants)
│   └── utils/currency.ts
│
├── Doc/                           ← Documentation architecture
├── ARCHITECTURE_RULES.md          ← Règles d'architecture
└── ROADMAP.md
```

---

## 4. Design System

### Tokens

| Catégorie | Échelle |
|-----------|---------|
| **spacing** | 0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 56 |
| **radius** | 0, 6, 10, 14, 18, 999 (pill), 9999 (circle) |
| **fontSize** | 11, 12, 14, 15, 16, 18, 22, 28, 34 |
| **fontWeight** | 400, 500, 600, 700, 800 |
| **shadows** | sm (elevation:2), md (e:4), lg (e:8) |

### Palette

- **Primaire :** Orange #E8590C (drapeau Niger)
- **Secondaire :** Vert #0DB02B
- **Promo :** Rouge #FA2A2D
- **Thèmes :** Light + Dark, basculés via `ThemeContext` (Zustand settings)

### Consommation

Tous les composants utilisent `useThemedStyles(makeStyles)` — pas de couleurs en dur, pas de valeurs magiques.

---

## 5. Flux de données

### Cas standard : Liste de produits

```
Écran (app/(tabs)/store.tsx)
  │ useStoreCatalog()
  ▼
Hook (src/features/store/useStoreCatalog.ts)
  │ useQuery(["products"], catalogService.getProducts)
  │ useQuery(["categories"], catalogService.getCategories)
  ▼
Service (src/features/catalog/catalogService.ts)
  │ productDataSource.getProducts()
  │ categoryDataSource.getCategories()
  ▼
DataSource Abstraction (src/infrastructure/data-source/)
  │ interface ProductDataSource / CategoryDataSource
  ▼
MockDataSource (src/infrastructure/data-source/mock/)
  │ MockProductDataSource → mock/products.ts
  │ MockCategoryDataSource → mock/categories.ts
```

### Cas avec écriture : Ajout au panier

```
ProductCard.tsx
  │ onPress → onAddToCart?.(product, 1)   [prop callback]
  ▼
Screen (ex: app/(tabs)/store.tsx)
  │ onAddToCart = useCartStore((s) => s.add)
  ▼
cartStore (Zustand → AsyncStorage)
  │ add() → items.push(...)
  ▼
Persistance locale (AsyncStorage)
```

### Cas auth : Connexion

```
LoginScreen
  │ useAuth() → loginWithEmail(email, password)
  ▼
useAuth (src/features/auth/useAuth.ts)
  │ authService.loginWithEmail(email, password)
  ▼
authService (src/features/auth/authService.ts)
  │ apiAdapter.post("/auth/login", ...)
  ▼
apiAdapter (src/infrastructure/api/apiAdapter.ts) → API REST
```

---

## 6. État global (Zustand)

| Store | Clé AsyncStorage | Contenu |
|-------|-----------------|---------|
| `authStore` | `afriexpress-auth` | hasOnboarded, isAuthenticated, user, tokens |
| `cartStore` | `afriexpress-cart` | items[], count(), subtotalUsd() |
| `addressStore` | `afriexpress-addresses` | addresses[], defaultId |
| `settingsStore` | `afriexpress-settings` | language, currency, country, theme |
| `wishlistStore` | `afriexpress-wishlist` | ids[] (product IDs) |

Chaque store est hydraté depuis AsyncStorage au démarrage. Le panier est local (pas de sync backend pour l'instant).

---

## 7. Navigation (Expo Router)

```
Root Stack (_layout.tsx)
├── Auth Gate (redirect si non connecté)
│
├── Onboarding (fade)
├── Login / Register / OTP / Forgot Password (fade/slide)
│
├── TABS (5 tabs)
│   ├── Accueil         ← rails, grille, bannières, promo modal
│   ├── Boutique        ← catégories, grille produits
│   ├── Feed (+)        ← social feed (FAB central)
│   ├── Panier          ← items, suggestions, free shipping bar
│   └── Compte          ← profil, commandes, favoris, wallet
│
├── Product/[id]        ← slide_from_bottom (modal-like)
├── Search              ← fade
├── Camera              ← slide_from_bottom (modal-like)
├── Checkout (3 écrans) ← review → payment → success
├── Address (2 écrans)  ← liste + formulaire
├── Orders (3 écrans)   ← liste + détail + tracking
├── Messages (2 écrans) ← conversations + chat
├── Wallet (2 écrans)   ← bonus + savings
├── Wishlist / Coupons / Stores / Settings / Profile / Payment
│   Suggestions / Placeholder
```

---

## 8. Barrels — API publique des features

Chaque feature expose une **API publique** via `index.ts`. Aucun import ne traverse les internes d'une feature.

| Feature | Exports publics |
|---------|----------------|
| `address` | `useAddressForm` |
| `auth` | `useAuth` |
| `cart` | `useCartData`, `cartService` |
| `catalog` | `catalogService`, `useSuggestions`, `useWishlistProducts`, `getSuggestionsSlice`, `getWishlistProducts`, `searchProducts`, `getRelatedProducts` |
| `checkout` | `useCheckout`, `calculateSubtotal`, `calculateDiscount`, `calculateTotal`, `calculateShipping`, `applyPromoCode`, `PromoResult` |
| `feed` | `useFeed` |
| `content` | `contentService`, `Shortcut`, `SuggestedPerson` |
| `home` | `BannerCarousel`, `HomeHeader`, `PromoModal`, `ShortcutRail`, `useHomeFeed` |
| `messages` | `messagingService`, `useConversations`, `useConversation` |
| `order` | `createOrder`, `transitionOrderStatus`, `OrderStatus`, `Order` |
| `orders` | `orderService`, `useOrders`, `useOrderDetail` |
| `payment` | `paymentService`, `useCardBrands`, `usePaymentMethods`, `initiatePayment`, `setPaymentStatus`, `Payment`, `PaymentStatus`, `PaymentMethod` |
| `product` | `useProduct` |
| `search` | `useSearch`, `useSearchFilters`, `useFilteredProducts`, `SearchFiltersSheet`, `SearchFilters`, `SortOption` |
| `store` | `useStoreCatalog` |

```ts
// Utilisation (barrel uniquement) :
import { useAuth } from '@/features/auth';           // ✅
import { useAuth } from '@/features/auth/useAuth';     // ❌ interdit
```

---

## 9. DataSource-first (implémenté)

L'application fonctionne **sans backend** grâce au pattern DataSource concrètement implémenté.

### Architecture implémentée

Chaque service utilise une interface DataSource, sans connaître l'implémentation sous-jacente :

```ts
// src/features/catalog/catalogService.ts
import { productDataSource, categoryDataSource } from "@/infrastructure/data-source";

async getProducts(): Promise<Product[]> {
  return productDataSource.getProducts();  // ← ne sait pas si mock ou api
}
```

```
Feature Service
      │
      ▼
  DataSource<T> (interface)
      │
      ├── MockDataSource<T>   → données locales (développement)
      └── ApiDataSource<T>    → apiAdapter → API REST (futur)
```

### Implémentations disponibles

| Interface | MockDataSource | ApiDataSource |
|-----------|---------------|---------------|
| `AuthDataSource` | ✅ `MockAuthDataSource` | ✅ `ApiAuthDataSource` |
| `ProductDataSource` | ✅ `MockProductDataSource` | ✅ `ApiProductDataSource` |
| `CategoryDataSource` | ✅ `MockCategoryDataSource` | ✅ `ApiCategoryDataSource` |
| `OrderDataSource` | ✅ `MockOrderDataSource` | ✅ `ApiOrderDataSource` |
| `PaymentDataSource` | ✅ `MockPaymentDataSource` | ✅ `ApiPaymentDataSource` |
| `ContentDataSource` | ✅ `MockContentDataSource` | ✅ `ApiContentDataSource` |

### Bascule mock → production

Actuellement le barrel `infrastructure/data-source/index.ts` exporte les implémentations Mock :

```ts
export const productDataSource = new MockProductDataSource();
```

Pour basculer en production, il suffit de changer pour :

```ts
export const productDataSource: ProductDataSource = new ApiProductDataSource();
```

Aucun code métier (features, services, hooks) n'a besoin d'être modifié.

---

## 10. Règles de dépendances entre features

### Graphe autorisé

```
                         ┌──────────────┐
                         │    auth      │ ← indépendant — features accèdent à l'identité
                         └──────────────┘   via authStore (pas via @/features/auth)

                    ┌──────────────┐
                    │   catalog    │ ← racine : n'importe aucune feature
                    │  métier pur  │
                    └──────▲───────┘
                           │
                    ┌──────┼──────┐
                    │      │      │
              ┌─────┘      │      └─────┐
              │            │            │
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ product  │ │ search   │ │  home    │
        └──────────┘ └──────────┘ └─────▲────┘
                                        │
                                     store

┌──────────────┐
│    cart      │ ← métier pur, autonome (aucune feature ne l'importe)
└──────────────┘

┌──────────────┐
│   checkout   │ ← composition autonome (logique inline + stores)
└──────────────┘

    ┌──────────┐
    │   order  │ ← feature ordre (domaine pur)
    └────▲─────┘
         │
    ┌────┴─────┐
    │ payment  │ ← importe order (type uniquement)
    └──────────┘

┌──────────────┐
│   content    │ ← transversale : home et feed l'importent
└──────┬───────┘
       │
   ┌───┴───┐
   ▼       ▼
  home    feed

┌───────────┐  ┌───────────┐
│   order   │  │  orders   │ ← domain vs app : ordre autorisé
└───────────┘  └───────────┘

┌────────────┐
│  messages  │ ← indépendante
└────────────┘
```

### Règle stricte

> **Les features de composition (home, feed, store, checkout) peuvent dépendre de features métier,
> mais les features métier (catalog, cart, order, orders, payment, messages) ne doivent jamais
> dépendre d'une feature de composition.**

### Note sur `auth`

La feature `auth` est intentionnellement indépendante : aucune feature n'importe
`@/features/auth`. Les screens et le layout accèdent à l'état d'authentification
via `useAuthStore` (`@/store/authStore`). À l'avenir, si des features métier ont
besoin de l'identité utilisateur (orders, wishlist, messages), elles passeront
par `authStore` ou une couche `session` dédiée, jamais par `@/features/auth`.

### Clarification : `catalog` vs `store`

Ces deux features sont proches mais distinctes :

| Feature | Rôle | Contenu |
|---------|------|---------|
| `catalog` | Données et logique produit **pures** | `getProducts()`, `getProductById()`, `getCategories()`, `searchProducts()`, suggestions, wishlist |
| `store` | Composition d'écran boutique | `useStoreCatalog()` — catégorie active, sous-catégories, grille « recommandé » |

`catalog` est une feature métier réutilisable par d'autres features (search, product, home).
`store` est une feature de composition propre à l'écran boutique — elle importe `catalog` via son barrel.

### Interdictions

- ❌ Dépendances circulaires : A → B → C → A
- ❌ `catalog` → `home` (catalog ne compose pas l'accueil)
- ❌ `cart` → `checkout` (checkout accède au panier via `cartStore`, pas via `@/features/cart`)
- ❌ `catalog` → `store` (catalog ne doit pas dépendre d'un écran spécifique)

---

## 11. Points d'attention

### Résolus
- ✅ **`CartItem` dupliqué** : une seule définition dans `@/types/index.ts`. Plus de doublon.
- ✅ **`suggestions/` (feature vide)** : dossier supprimé.

### Résolus (16/07/2026)
- ✅ **Services déplacés dans leurs features** — chaque feature possède son propre service métier
- ✅ **Infrastructure créée** — `src/infrastructure/` avec `api/`, `mock/`, `logging/`
- ✅ **Dossier `src/services/` supprimé** — plus de God Folder
- ✅ **Barrels étendus** — les services sont exportés via les barrels de features
- ✅ **Feature `content/` créée** — partagée entre `home` et `feed`, supprime la dépendance `feed → home`
- ✅ **`src/data/` fusionné dans `infrastructure/data-source/mock/`** — élimine la duplication conceptuelle avec `infrastructure/mock/`, prépare le pattern DataSource
- ✅ **15 features** — content s'ajoute aux 14 existantes
- ✅ **DataSource pattern implémenté** — 6 interfaces + 6 MockDataSource + 6 ApiDataSource ; les services ne connaissent que l'interface

### Prochaines évolutions possibles
1. **Éclater `types/index.ts`** — déplacer les types dans leurs features respectives (ex: `Product` → `features/catalog/types.ts`)
2. **Panier** : si le backend devient la source officielle, migrer de Zustand local vers TanStack Query + sync optimiste

### Architecture actuelle (nom officiel)
**Feature-Based Modular Layered Architecture with DataSource Abstraction**
- 5 couches : `app/` → `features/` → `store/` + `types/` → `DataSource interfaces` → `implémentations (Mock | Api)`
- 15 modules fonctionnels organisés par domaine métier et composition d'interface, chacun avec son service intégré
- Barrels comme frontière stricte entre modules
- Pas de dossier `services/` global — chaque feature possède son service
- DataSource pattern : 6 interfaces, 6 MockDataSource, 6 ApiDataSource — métier isolé de l'infrastructure
- Infrastructure technique centralisée : `data-source/`, `api/`, `mock/`, `logging/`
- État client : Zustand (persisté AsyncStorage)
- État serveur : TanStack Query (React Query)
- DataSource-first : MockDataSource en développement, ApiDataSource prêt pour production
