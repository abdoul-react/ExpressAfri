# Règles d'architecture du projet

## 1. Couches

```
app/ (Expo Router — screens)
   ↓
features/ (hooks + services métier)
   ↓
store/ + types/ (Zustand + contrats)
   ↓
DataSource Abstration (interfaces par domaine)
   ↓
infrastructure/ (implémentations techniques)
```

- **Écran** : présentation et état UI local. N'importe jamais `@/infrastructure` ni `@tanstack/react-query` (sauf `_layout.tsx`).
- **Feature** : orchestration (hooks) + services métier. Les services utilisent les DataSource, pas l'infrastructure directement.
- **Store** : état client Zustand (panier, auth, settings, wishlist, adresses).
- **DataSource** : contrat abstrait par domaine (`ProductDataSource`, `OrderDataSource`...). Les features ne connaissent que l'interface.
- **Infrastructure** : implémentations (`MockDataSource`, `ApiDataSource`, `apiAdapter`, `logging`, `AsyncStorage`). Ne remonte jamais vers `features/` ou `store/`.

## 2. Règles

- Les écrans n'importent pas `@/infrastructure` ou `@tanstack/react-query` (sauf `_layout.tsx`).
- Les services métier vivent DANS leur feature (`features/catalog/catalogService.ts`), pas dans un dossier global.
- Les imports inter-features passent exclusivement par les barrels (`@/features/catalog`, pas `@/features/catalog/catalogService`).
- Les transformations de données vivent dans les hooks ou dans des helpers dédiés (pas dans les services).
- Direction des dépendances : `écran → feature → dataSource → infrastructure`.
- Dépendances circulaires interdites : si A dépend de B, B ne doit pas dépendre de A (ni transitivement).
- **DataSource pattern** : un service n'importe jamais les données mock directement. Il passe par l'interface DataSource. Le barrel `@/infrastructure/data-source` injecte l'implémentation (Mock en dev, Api en prod).
- **Auth indépendante** : aucune feature n'importe `@/features/auth`. Les besoins d'identité passent par `authStore` (`@/store/authStore`).
- **Distinction catalog / store** : `catalog` = données produits pures ; `store` = composition écran boutique. `catalog` ne dépend pas de `store`.

## 3. Graphe de dépendances autorisé

```
                    ┌──────────────┐
                    │   catalog    │  ← aucune dépendance sortante (racine)
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
                                        │
                                     store

┌──────────────┐
│    cart      │  ← métier pur, n'importe aucune feature
└──────────────┘
    ↑ via cartStore (Zustand)

┌──────────────┐
│   checkout   │  ← composition autonome (logique inline)
└──────────────┘
    ↓ (via store)
┌──────────────┐
│   order      │  ← feature ordre, importée par paymentMachine
└──────────────┘

┌──────────────┐
│   content    │  ← feature transversale
└──────┬───────┘
       │
   ┌───┴───┐
   ▼       ▼
  home    feed

┌───────────┐
│  order    │  ← domaine pur (machine à états, types)
└───────────┘

┌───────────┐
│  orders   │  ← feature applicative (accès aux commandes utilisateur)
└───────────┘

  messages   ← indépendante

    auth     ← indépendante (accès via authStore uniquement)
```

### Règles du graphe

- Les features de **composition** (`home`, `feed`, `store`, `checkout`) peuvent importer des features **métier** (`catalog`, `content`, `order`, `payment`).
- Les features **métier** (`catalog`, `cart`, `order`, `orders`, `payment`, `messages`) n'importent jamais les features de composition.
- `catalog` est la racine du graphe : `product`, `search`, `home`, `store` l'importent ; il n'importe **aucune** feature.
- `cart` est une feature métier actuellement autonome : aucune feature ne l'importe (checkout accède au panier via `cartStore` Zustand).
- `checkout` est autonome : logique métier inline + accès stores directement. Pas d'import vers `cart`, `order`, `payment` pour l'instant.
- `payment` importe `order` (type uniquement).
- `content` est transversale : `home` et `feed` l'importent, elle n'importe aucune feature.
- `order` (domaine pur) et `orders` (applicatif) : `orders` peut importer `order`, jamais l'inverse.
- Aucune feature ne peut importer `auth` (sauf screens et `_layout.tsx` via `authStore`).

## 4. DataSource pattern

### Structure

```
infrastructure/data-source/
├── DataSource.ts           ← interface générique (optionnelle)
├── AuthDataSource.ts       ← interface auth
├── ProductDataSource.ts    ← interface produit
├── CategoryDataSource.ts   ← interface catégorie
├── OrderDataSource.ts      ← interface commande
├── PaymentDataSource.ts    ← interface paiement
├── ContentDataSource.ts    ← interface contenu
├── index.ts                ← barrel + instances
├── mock/                   ← MockDataSource implementations
│   ├── MockAuthDataSource.ts
│   ├── MockProductDataSource.ts
│   ├── MockCategoryDataSource.ts
│   └── ...
└── api/                    ← ApiDataSource implementations
    ├── ApiAuthDataSource.ts
    ├── ApiProductDataSource.ts
    └── ...
```

### Règles

- Un service métier importe `@/infrastructure/data-source` et utilise les instances exportées (ex: `productDataSource`).
- Le barrel `index.ts` décide quelle implémentation est active (Mock ou Api). Actuellement : **toujours Mock**.
- Les implémentations Mock n'importent les données mock que depuis `infrastructure/data-source/mock/`.
- Les implémentations Api utilisent `apiAdapter` uniquement.
- Pour basculer en production, changer les imports dans `infrastructure/data-source/index.ts` :

```ts
// Avant (mock) :
export const productDataSource = new MockProductDataSource();
// Après (api) :
export const productDataSource: ProductDataSource = new ApiProductDataSource();
```
