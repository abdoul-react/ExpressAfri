# Architecture du système d'administration ExpressAfri

> Version : 1.0 — 16/07/2026
> Ce document décrit l'architecture complète du panneau d'administration, son intégration avec l'application mobile existante, et le système de gouvernance de la plateforme.

---

## Table des matières

1. [Architecture globale de la plateforme](#1-architecture-globale-de-la-plateforme)
2. [Philosophie : Admin-first, Backend-Contract-first](#2-philosophie--admin-first-backend-contract-first)
3. [Système de gouvernance : Super Admin + RBAC + Permissions granulaires](#3-système-de-gouvernance--super-admin--rbac--permissions-granulaires)
4. [Catalogue des permissions](#4-catalogue-des-permissions)
5. [Rôles prédéfinis](#5-rôles-prédéfinis)
6. [Architecture de l'application Admin](#6-architecture-de-lapplication-admin)
7. [Modules de l'Admin](#7-modules-de-ladmin)
8. [Flux de données](#8-flux-de-données)
9. [Audit Log](#9-audit-log)
10. [Plan d'implémentation](#10-plan-dimplémentation)
11. [Glossaire](#11-glossaire)

---

## 1. Architecture globale de la plateforme

```
                        EXPRESSAFRI PLATFORM
                    ┌──────────────────────────┐
                    │        CORE PLATFORM      │
                    │   (backend, auth, db)     │
                    └──────────┬───────────────┘
                               │
            ┌──────────────────┼──────────────────┐
            ▼                  ▼                  ▼
    ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
    │  MOBILE APP  │   │  ADMIN WEB   │   │   FUTURE     │
    │  (Expo RN)   │   │  (React+Vite)│   │   (Web...?)  │
    └──────────────┘   └──────────────┘   └──────────────┘
```

Chaque client de la plateforme suit la **même philosophie d'architecture** :

```
UI → Feature → Service → DataSource Interface → Mock | Api → Backend
```

### Principes fondamentaux

- **L'Admin Panel est un client de la plateforme**, au même titre que l'application mobile
- **Le Super Admin ne doit jamais accéder directement à la base de données** — toutes les opérations passent par l'API
- **Les permissions sont vérifiées à deux endroits** : l'interface utilisateur (UX) ET le backend (sécurité)
- **Toute action sensible est tracée** dans l'Audit Log, y compris les actions du Super Admin

---

## 2. Philosophie : Admin-first, Backend-Contract-first

### Ce qu'on NE fait PAS

```
❌ Créer des écrans Admin
        ↓
   Inventer des données temporaires
        ↓
   Créer le backend plus tard
```

### Ce qu'on FAIT

```
1. Concevoir le système de gouvernance (rôles + permissions)
        ↓
2. Construire l'interface Admin avec MockDataSource
   (même pattern DataSource que l'app mobile)
        ↓
3. Définir les contrats backend à partir des besoins réels
   de l'Admin ET de l'application mobile
        ↓
4. Construire le backend correspondant
        ↓
5. Basculer MockDataSource → ApiDataSource
        ↓
6. Connecter l'application mobile au même backend
```

### Pourquoi cette approche ?

| Raison | Explication |
|--------|-------------|
| **L'Admin révèle le modèle** | Tous les modules, ressources et opérations de la plateforme sont définis par les besoins de l'Admin |
| **Pas de réécriture** | Les écrans et la logique métier sont construits sur des contrats (DataSource), pas sur du mock jetable |
| **Parallélisation** | L'équipe frontend peut travailler sur l'Admin pendant que le backend est développé |
| **Modèle fonctionnel** | L'Admin sert de spécification exécutable pour le backend |

---

## 3. Système de gouvernance : Super Admin + RBAC + Permissions granulaires

### Hiérarchie

```
                    SUPER ADMIN
                    (accès total)
                         │
       ┌─────────────────┼─────────────────┬─────────────────┐
       │                 │                 │                 │
   PRODUCT_ADMIN    ORDER_ADMIN       CONTENT_ADMIN     SUPPORT_ADMIN
   ┌──────────┐   ┌──────────┐     ┌──────────┐     ┌──────────┐
   │ Produits │   │Commandes │     │  CMS     │     │ Support  │
   │ Catég.   │   │Paiements │     │Bannières │     │ Clients  │
   │ Boutiques│   │Rembourse.│     │Promotions│     │ Tickets  │
   └──────────┘   └──────────┘     └──────────┘     └──────────┘
```

### Le Super Admin

Le **Super Admin** est le gouverneur de la plateforme. Il peut :

- Gérer tous les utilisateurs (clients et admins)
- Créer, modifier, suspendre ou supprimer des administrateurs
- Définir les rôles et leurs permissions
- Créer des rôles personnalisés
- Accéder à tous les modules sans restriction
- Consulter l'intégralité des journaux d'audit
- Modifier les paramètres globaux de la plateforme
- Activer ou désactiver des fonctionnalités

> **Même le Super Admin est tracé** : toutes ses actions sont enregistrées dans l'Audit Log.

### Modèle des permissions

Le système est basé sur :

```
Utilisateur (Admin)
     ↓
Rôle (ex: product_admin)
     ↓
Permissions (ex: products.read, products.create)
     ↓
Ressources (ex: products, orders, users)
     ↓
Actions (ex: read, create, update, delete)
```

Une permission est une chaîne de caractères au format `resource.action` :

```
products.read      → Voir les produits
products.create    → Créer un produit
products.update    → Modifier un produit
products.delete    → Supprimer un produit
orders.refund      → Rembourser une commande
admins.create      → Créer un administrateur
```

### Vérification des permissions

```ts
// Côté frontend (UX) — cache les éléments non autorisés
// Côté backend (sécurité) — re-vérifie toujours
// Les deux sont obligatoires, jamais l'un sans l'autre
```

---

## 4. Catalogue des permissions

### Ressources et actions disponibles

| Ressource | Actions disponibles |
|-----------|-------------------|
| `admins` | `read`, `create`, `update`, `delete` |
| `roles` | `read`, `create`, `update`, `delete`, `assign` |
| `permissions` | `read`, `assign` |
| `users` | `read`, `create`, `update`, `delete`, `ban` |
| `products` | `read`, `create`, `update`, `delete`, `export` |
| `categories` | `read`, `create`, `update`, `delete` |
| `stores` | `read`, `create`, `update`, `delete`, `approve`, `reject` |
| `orders` | `read`, `create`, `update`, `cancel`, `refund`, `export` |
| `payments` | `read`, `refund` |
| `content` | `read`, `create`, `update`, `delete` |
| `promotions` | `read`, `create`, `update`, `delete` |
| `coupons` | `read`, `create`, `update`, `delete` |
| `campaigns` | `read`, `create`, `update`, `delete` |
| `analytics` | `read`, `export` |
| `audit` | `read`, `export` |
| `messages` | `read`, `update` |
| `notifications` | `read`, `create`, `update` |
| `settings` | `read`, `update` |
| `features` | `read`, `update` |
| `shipping` | `read`, `create`, `update`, `delete` |
| `reports` | `read`, `update` |

### Tableau complet des permissions

```ts
const PERMISSIONS = {
  // ── Administration système (Super Admin uniquement) ──
  'admins.read':       'Voir la liste des administrateurs',
  'admins.create':     'Créer un administrateur',
  'admins.update':     'Modifier un administrateur',
  'admins.delete':     'Supprimer un administrateur',

  'roles.read':        'Voir les rôles',
  'roles.create':      'Créer un rôle personnalisé',
  'roles.update':      'Modifier un rôle',
  'roles.delete':      'Supprimer un rôle',
  'roles.assign':      'Assigner des permissions à un rôle',

  'permissions.read':  'Voir les permissions disponibles',
  'permissions.assign':'Assigner une permission à un rôle',

  // ── Utilisateurs clients ──
  'users.read':        'Voir les utilisateurs clients',
  'users.create':      'Créer un compte client',
  'users.update':      'Modifier un client',
  'users.delete':      'Supprimer un client',
  'users.ban':         'Bannir un client',

  // ── Produits ──
  'products.read':     'Voir les produits',
  'products.create':   'Créer un produit',
  'products.update':   'Modifier un produit',
  'products.delete':   'Supprimer un produit',
  'products.export':   'Exporter les produits',

  // ── Catégories ──
  'categories.read':   'Voir les catégories',
  'categories.create': 'Créer une catégorie',
  'categories.update': 'Modifier une catégorie',
  'categories.delete': 'Supprimer une catégorie',

  // ── Boutiques ──
  'stores.read':       'Voir les boutiques',
  'stores.create':     'Créer une boutique',
  'stores.update':     'Modifier une boutique',
  'stores.delete':     'Supprimer une boutique',
  'stores.approve':    'Approuver une boutique',
  'stores.reject':     'Rejeter une boutique',

  // ── Commandes ──
  'orders.read':       'Voir les commandes',
  'orders.update':     'Modifier le statut d\'une commande',
  'orders.cancel':     'Annuler une commande',
  'orders.refund':     'Rembourser une commande',
  'orders.export':     'Exporter les commandes',

  // ── Paiements ──
  'payments.read':     'Voir les transactions',
  'payments.refund':   'Effectuer un remboursement',

  // ── Contenu CMS ──
  'content.read':      'Voir le contenu CMS',
  'content.create':    'Créer du contenu',
  'content.update':    'Modifier le contenu',
  'content.delete':    'Supprimer du contenu',

  // ── Promotions ──
  'promotions.read':   'Voir les promotions',
  'promotions.create': 'Créer une promotion',
  'promotions.update': 'Modifier une promotion',
  'promotions.delete': 'Supprimer une promotion',

  // ── Coupons ──
  'coupons.read':      'Voir les coupons',
  'coupons.create':    'Créer un coupon',
  'coupons.update':    'Modifier un coupon',
  'coupons.delete':    'Supprimer un coupon',

  // ── Campagnes ──
  'campaigns.read':    'Voir les campagnes',
  'campaigns.create':  'Créer une campagne',
  'campaigns.update':  'Modifier une campagne',
  'campaigns.delete':  'Supprimer une campagne',

  // ── Analytiques ──
  'analytics.read':    'Voir les statistiques',
  'analytics.export':  'Exporter les rapports',

  // ── Audit ──
  'audit.read':        'Consulter les journaux d\'activité',
  'audit.export':      'Exporter les journaux',

  // ── Messages / Support ──
  'messages.read':     'Voir les messages',
  'messages.update':   'Répondre aux messages',

  // ── Notifications ──
  'notifications.read':'Voir les notifications',
  'notifications.create':'Envoyer une notification',
  'notifications.update':'Modifier une notification',

  // ── Paramètres ──
  'settings.read':     'Voir les paramètres',
  'settings.update':   'Modifier les paramètres',

  // ── Fonctionnalités ──
  'features.read':     'Voir les fonctionnalités',
  'features.update':   'Activer/désactiver une fonctionnalité',

  // ── Livraison ──
  'shipping.read':     'Voir les zones de livraison',
  'shipping.create':   'Créer une règle de livraison',
  'shipping.update':   'Modifier une règle de livraison',
  'shipping.delete':   'Supprimer une règle de livraison',

  // ── Signalements ──
  'reports.read':      'Voir les signalements',
  'reports.update':    'Traiter un signalement',
} as const
```

---

## 5. Rôles prédéfinis

### Super Administrateur

```ts
super_admin: {
  label: 'Super Administrateur',
  description: 'Accès total et illimité à toutes les fonctionnalités de la plateforme',
  isSuperAdmin: true,  // bypass toutes les vérifications de permissions
  permissions: '*',     // toutes les permissions
}
```

### Administrateur Produits

```ts
product_admin: {
  label: 'Administrateur Produits',
  description: 'Gère le catalogue, les catégories et les boutiques',
  permissions: [
    'products.read', 'products.create', 'products.update',
    'products.delete', 'products.export',
    'categories.read', 'categories.create', 'categories.update',
    'categories.delete',
    'stores.read', 'stores.update', 'stores.approve',
  ],
}
```

### Administrateur Commandes

```ts
order_admin: {
  label: 'Administrateur Commandes',
  description: 'Gère les commandes, les paiements et les remboursements',
  permissions: [
    'orders.read', 'orders.update', 'orders.cancel',
    'orders.refund', 'orders.export',
    'payments.read', 'payments.refund',
    'users.read',
  ],
}
```

### Administrateur Contenu

```ts
content_admin: {
  label: 'Administrateur Contenu',
  description: 'Gère le CMS, les bannières, les promotions et les coupons',
  permissions: [
    'content.read', 'content.create', 'content.update', 'content.delete',
    'promotions.read', 'promotions.create', 'promotions.update',
    'promotions.delete',
    'coupons.read', 'coupons.create', 'coupons.update', 'coupons.delete',
  ],
}
```

### Administrateur Support

```ts
support_admin: {
  label: 'Administrateur Support',
  description: 'Gère les clients, les messages et les signalements',
  permissions: [
    'users.read', 'users.update',
    'orders.read',
    'messages.read', 'messages.update',
    'reports.read', 'reports.update',
  ],
}
```

### Administrateur Marketing

```ts
marketing_admin: {
  label: 'Administrateur Marketing',
  description: 'Gère les campagnes, les promotions et les analyses',
  permissions: [
    'campaigns.read', 'campaigns.create', 'campaigns.update',
    'campaigns.delete',
    'promotions.read', 'promotions.create', 'promotions.update',
    'coupons.read', 'coupons.create', 'coupons.update',
    'analytics.read',
  ],
}
```

### Rôles personnalisés

Le Super Admin peut créer des rôles personnalisés avec un ensemble spécifique de permissions :

```ts
// Exemple de rôle personnalisé créé par le Super Admin
custom_role: {
  label: 'Modérateur Catalogue',
  description: 'Peut voir et modifier les produits, mais pas en créer ni en supprimer',
  permissions: [
    'products.read',
    'products.update',
    'categories.read',
  ],
}
```

---

## 6. Architecture de l'application Admin

### Stack technologique

| Technologie | Rôle |
|-------------|------|
| **React 18** | Bibliothèque UI |
| **Vite** | Build tool (HMR, performances) |
| **TypeScript** | Typage strict |
| **React Router v6** | Routage déclaratif |
| **TanStack Query** | Cache serveur, mutations, refetch |
| **Tailwind CSS** | Styles utilitaires |
| **Axios** | Client HTTP avec intercepteurs JWT |
| **shadcn/ui** ou Radix | Composants accessibles (optionnel) |
| **Recharts** ou **Chart.js** | Graphiques (dashboard) |
| **Zod** | Validation (partagée avec le backend) |

### Structure des dossiers

```
apps/admin/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
│
└── src/
    │
    ├── main.tsx                         ← Point d'entrée
    ├── App.tsx                          ← Providers + Router
    │
    ├── infrastructure/
    │   └── data-source/
    │       ├── index.ts                 ← Barrel + instances (Mock actuellement)
    │       │
    │       ├── AdminProductDataSource.ts     ← Interface CRUD produits
    │       ├── AdminCategoryDataSource.ts    ← Interface CRUD catégories
    │       ├── AdminStoreDataSource.ts       ← Interface CRUD boutiques
    │       ├── AdminOrderDataSource.ts       ← Interface CRUD commandes
    │       ├── AdminPaymentDataSource.ts     ← Interface CRUD paiements
    │       ├── AdminUserDataSource.ts        ← Interface CRUD utilisateurs
    │       ├── AdminRoleDataSource.ts        ← Interface CRUD rôles
    │       ├── AdminPermissionDataSource.ts  ← Interface permissions
    │       ├── AdminContentDataSource.ts     ← Interface CRUD contenu
    │       ├── AdminPromotionDataSource.ts   ← Interface CRUD promotions
    │       ├── AdminCouponDataSource.ts      ← Interface CRUD coupons
    │       ├── AdminCampaignDataSource.ts    ← Interface CRUD campagnes
    │       ├── AdminAnalyticsDataSource.ts   ← Interface analytics
    │       ├── AdminAuditDataSource.ts       ← Interface audit
    │       ├── AdminMessageDataSource.ts     ← Interface messages
    │       ├── AdminSettingDataSource.ts     ← Interface paramètres
    │       ├── AdminAuthDataSource.ts        ← Interface authentification admin
    │       │
    │       ├── mock/                    ← MockDataSource + données fictives
    │       │   ├── index.ts
    │       │   ├── MockAdminProductDataSource.ts
    │       │   ├── MockAdminOrderDataSource.ts
    │       │   ├── MockAdminUserDataSource.ts
    │       │   ├── MockAdminRoleDataSource.ts
    │       │   ├── MockAdminAuthDataSource.ts
    │       │   └── data/
    │       │       ├── mockProducts.ts
    │       │       ├── mockOrders.ts
    │       │       ├── mockUsers.ts
    │       │       ├── mockAdmins.ts
    │       │       └── ...
    │       │
    │       └── api/                     ← ApiDataSource (quand le backend sera prêt)
    │           ├── index.ts
    │           ├── ApiAdminProductDataSource.ts
    │           ├── ApiAdminOrderDataSource.ts
    │           └── ...
    │
    ├── features/
    │   ├── auth/
    │   │   ├── index.ts
    │   │   ├── pages/
    │   │   │   └── LoginPage.tsx
    │   │   ├── hooks/
    │   │   │   ├── useAdminLogin.ts
    │   │   │   └── useAdminAuth.ts          ← Contexte auth + permissions
    │   │   └── services/
    │   │       └── adminAuthService.ts
    │   │
    │   ├── dashboard/
    │   │   ├── index.ts
    │   │   ├── pages/
    │   │   │   └── DashboardPage.tsx
    │   │   └── hooks/
    │   │       └── useDashboard.ts
    │   │
    │   ├── products/
    │   │   ├── index.ts
    │   │   ├── pages/
    │   │   │   ├── AdminProductListPage.tsx
    │   │   │   └── AdminProductFormPage.tsx
    │   │   ├── hooks/
    │   │   │   ├── useAdminProducts.ts
    │   │   │   ├── useCreateProduct.ts
    │   │   │   ├── useUpdateProduct.ts
    │   │   │   └── useDeleteProduct.ts
    │   │   └── services/
    │   │       └── adminProductService.ts
    │   │
    │   ├── categories/
    │   ├── stores/
    │   ├── orders/
    │   ├── customers/
    │   ├── payments/
    │   ├── content/
    │   ├── promotions/
    │   ├── coupons/
    │   ├── campaigns/
    │   ├── messages/
    │   ├── analytics/
    │   ├── admins/                   ← Super Admin only
    │   ├── roles/                    ← Super Admin only
    │   ├── audit/                    ← Super Admin only
    │   └── settings/                 ← Super Admin only
    │
    ├── components/
    │   ├── layout/
    │   │   ├── AdminLayout.tsx
    │   │   ├── Sidebar.tsx              ← permission-aware
    │   │   ├── TopNavbar.tsx
    │   │   └── PageHeader.tsx
    │   ├── shared/
    │   │   ├── DataTable.tsx
    │   │   ├── SearchInput.tsx
    │   │   ├── Pagination.tsx
    │   │   ├── ConfirmDialog.tsx
    │   │   ├── StatusBadge.tsx
    │   │   ├── EmptyState.tsx
    │   │   ├── LoadingState.tsx
    │   │   └── ErrorState.tsx
    │   ├── guards/
    │   │   ├── PermissionGuard.tsx       ← Cache si pas la permission
    │   │   └── ProtectedRoute.tsx        ← Redirige si pas la permission
    │   └── forms/
    │       ├── ProductForm.tsx
    │       ├── ImageUpload.tsx
    │       └── RichTextEditor.tsx
    │
    ├── lib/
    │   ├── api.ts                  ← Client Axios avec intercepteurs
    │   └── permissions.ts          ← Helpers de vérification
    │
    └── types/
        ├── index.ts
        ├── AdminUser.ts
        ├── Permission.ts
        ├── Role.ts
        └── ...
```

### Comparaison Mobile vs Admin

| Aspect | Application Mobile | Admin Panel |
|--------|-------------------|-------------|
| **Stack** | Expo + React Native | React + Vite + Tailwind |
| **State serveur** | TanStack Query | TanStack Query |
| **State client** | Zustand + AsyncStorage | React Context + localStorage |
| **DataSource** | 6 interfaces (lecture seule) | ~17 interfaces (CRUD) |
| **Mock** | Oui (MockDataSource) | Oui (MockDataSource) |
| **Auth** | Email/Phone + OTP | Email + Password + JWT |
| **Rôles** | Un seul : `customer` | Multi-rôles avec permissions |
| **Mode hors-ligne** | Oui (Mock) | Non (toujours connecté) |

---

## 7. Modules de l'Admin

### Liste complète des modules

| # | Module | Accès | Dépendances |
|---|--------|-------|-------------|
| 1 | **Dashboard** | Tous les admins | analytics, orders, users |
| 2 | **Produits** | product_admin, super_admin | categories |
| 3 | **Catégories** | product_admin, super_admin | — |
| 4 | **Boutiques** | product_admin, super_admin | products |
| 5 | **Commandes** | order_admin, super_admin | users, payments |
| 6 | **Paiements** | order_admin, super_admin | orders |
| 7 | **Clients** | support_admin, super_admin | orders |
| 8 | **Messages** | support_admin, super_admin | users, orders |
| 9 | **Contenu CMS** | content_admin, super_admin | — |
| 10 | **Promotions** | content_admin, marketing_admin, super_admin | products |
| 11 | **Coupons** | content_admin, marketing_admin, super_admin | products |
| 12 | **Campagnes** | marketing_admin, super_admin | promotions |
| 13 | **Analytics** | marketing_admin, super_admin | — |
| 14 | **Signalements** | support_admin, super_admin | — |
| 15 | **Admins** | super_admin uniquement | roles |
| 16 | **Rôles** | super_admin uniquement | permissions |
| 17 | **Audit** | super_admin uniquement | — |
| 18 | **Paramètres** | super_admin uniquement | — |
| 19 | **Fonctionnalités** | super_admin uniquement | — |
| 20 | **Livraison** | super_admin uniquement | — |

### Détail d'un module type : Produits

```tsx
// 1. Interface DataSource
interface AdminProductDataSource {
  list(params: ProductQueryParams): Promise<PaginatedResult<Product>>
  getById(id: string): Promise<Product>
  create(data: CreateProductInput): Promise<Product>
  update(id: string, data: UpdateProductInput): Promise<Product>
  delete(id: string): Promise<void>
  export(params: ProductQueryParams): Promise<Blob>
}

// 2. MockDataSource
class MockAdminProductDataSource implements AdminProductDataSource {
  async list(params) {
    const filtered = mockProducts.filter(/* ... */)
    return { data: filtered, total: filtered.length, page: params.page }
  }
  async create(data) {
    const product = { id: cuid(), ...data, createdAt: new Date() }
    mockProducts.push(product)
    return product
  }
  // ...
}

// 3. Service
class AdminProductService {
  constructor(private dataSource: AdminProductDataSource) {}

  async getProducts(params: ProductQueryParams) {
    return this.dataSource.list(params)
  }

  async createProduct(data: CreateProductInput) {
    // Validation métier, transformation, etc.
    return this.dataSource.create(data)
  }
}

// 4. Hooks (TanStack Query)
function useAdminProducts(params: ProductQueryParams) {
  return useQuery({
    queryKey: ['admin', 'products', params],
    queryFn: () => adminProductService.getProducts(params),
  })
}

function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateProductInput) => adminProductService.createProduct(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }),
  })
}

// 5. Page
function AdminProductListPage() {
  const { data, isLoading } = useAdminProducts(filters)

  return (
    <PageLayout title="Produits" subtitle="Gérer le catalogue">
      <PermissionGuard permission="products.create">
        <Button onClick={openForm}>Créer un produit</Button>
      </PermissionGuard>
      <DataTable
        data={data}
        columns={productColumns}
        actions={({ row }) => (
          <>
            <PermissionGuard permission="products.update">
              <Button onClick={() => edit(row)}>Modifier</Button>
            </PermissionGuard>
            <PermissionGuard permission="products.delete">
              <Button onClick={() => confirmDelete(row)}>Supprimer</Button>
            </PermissionGuard>
          </>
        )}
      />
    </PageLayout>
  )
}
```

---

## 8. Flux de données

### Mobile → Afficher les produits

```
[ProductListScreen]
  → useProducts()
    → catalogService.getProducts(filters)
      → productDataSource.getProducts(filters)    [interface]
        → (dev)  MockProductDataSource.getProducts()
        → (prod) ApiProductDataSource.getProducts()
          → apiAdapter.get('/products', { params: filters })
            → Backend: GET /api/mobile/products
              → ProductController.listForMobile()
                → ProductService.getActiveProducts()
                  → ProductRepository.findMany(...)
                    → Prisma → PostgreSQL
  ← JSON → affiche l'UI
```

### Admin → Créer un produit

```
[AdminProductFormPage]
  → useCreateProduct(formData)
    → adminProductService.createProduct(formData)
      → adminProductDataSource.create(formData)  [interface]
        → (dev)  MockAdminProductDataSource.create(formData)
        → (prod) ApiAdminProductDataSource.create(formData)
          → api.post('/api/admin/products', formData)
            → Backend: POST /api/admin/products
              → auth (vérifie JWT)
              → rbac (vérifie permission: products.create)
              → validate (Zod)
              → ProductController.create()
                → ProductService.create(input)
                  → ProductRepository.create({ ...input, createdById: req.user.sub })
                    → Prisma → PostgreSQL
  ← 201 { product }
  → invalidate cache → redirection liste
```

### Admin → Se connecter

```
[LoginPage]
  → useAdminLogin(email, password)
    → adminAuthService.login(email, password)
      → adminAuthDataSource.login(email, password)  [interface]
        → (dev)  MockAdminAuthDataSource.login(email, password)
        → (prod) ApiAdminAuthDataSource.login(email, password)
          → api.post('/api/admin/auth/login', { email, password })
            → Backend: POST /api/admin/auth/login
              → AuthController.login()
                → AdminAuthService.login(email, password)
                  → UserRepository.findByEmail(email)
                  → bcrypt.compare(password, user.passwordHash)
                  → vérifier user.isActive && user.role !== null
                  → générer JWT { sub, role, permissions[], name }
                  → retourner { accessToken, user }
  ← { accessToken, user }
  → stocker dans localStorage + contexte React
  → rediriger vers /dashboard
```

---

## 9. Audit Log

### Principe

Toute action sensible est tracée avec les informations suivantes :

| Champ | Description | Exemple |
|-------|-------------|---------|
| `actorId` | Qui a fait l'action | `admin_abc123` |
| `actorEmail` | Email de l'admin | `admin@expressafri.com` |
| `actorRole` | Rôle de l'admin | `super_admin` |
| `action` | Type d'action | `product.delete` |
| `resource` | Type de ressource | `product` |
| `resourceId` | Identifiant de la ressource | `product_456` |
| `details` | Détails supplémentaires | `{ name: "T-shirt Niger", price: 15000 }` |
| `ipAddress` | Adresse IP | `197.xxx.xx.xx` |
| `userAgent` | Navigateur/client | `Mozilla/5.0 ...` |
| `status` | Succès ou échec | `success` / `failure` |
| `errorMessage` | Message d'erreur (si échec) | `Product not found` |
| `timestamp` | Date et heure | `2026-07-16T15:30:00Z` |

### Exemple d'entrée d'audit

```json
{
  "actorId": "admin_001",
  "actorEmail": "abdou@expressafri.com",
  "actorRole": "super_admin",
  "action": "product.delete",
  "resource": "product",
  "resourceId": "prod_1234",
  "details": {
    "name": "T-shirt Niger",
    "sku": "TS-NIGER-001",
    "price": 15000
  },
  "ipAddress": "197.214.xx.xx",
  "userAgent": "Mozilla/5.0 Chrome/120.0",
  "status": "success",
  "timestamp": "2026-07-16T15:30:00.000Z"
}
```

### Actions tracées

| Catégorie | Actions tracées |
|-----------|----------------|
| **Authentification** | login, logout, login.failed |
| **Admins** | admin.create, admin.update, admin.delete, admin.suspend |
| **Rôles** | role.create, role.update, role.delete, role.assign |
| **Permissions** | permission.assign, permission.revoke |
| **Produits** | product.create, product.update, product.delete |
| **Catégories** | category.create, category.update, category.delete |
| **Boutiques** | store.approve, store.reject, store.suspend |
| **Commandes** | order.cancel, order.refund, order.status.change |
| **Paiements** | payment.refund |
| **Clients** | user.ban, user.unban, user.delete |
| **Paramètres** | setting.update |
| **Fonctionnalités** | feature.activate, feature.deactivate |

---

## 10. Plan d'implémentation

### Phase 1 — Architecture du système Admin

```
Objectif : Mettre en place le squelette de l'application admin
Durée estimée : 1 sprint
```

- [ ] Créer le projet React + Vite + TypeScript + Tailwind
- [ ] Mettre en place le routage (React Router)
- [ ] Définir le système de permissions (types, constantes)
- [ ] Créer `AdminAuthDataSource` (interface + Mock + futur Api)
- [ ] Créer la page de connexion admin
- [ ] Créer le layout admin (Sidebar, TopNavbar, PageHeader)
- [ ] Créer `PermissionGuard` et `ProtectedRoute`
- [ ] Rendre la sidebar permission-aware
- [ ] Mettre en place le barrel `infrastructure/data-source/index.ts`

### Phase 2 — Modules Core avec MockDataSource

```
Objectif : Construire tous les modules admin avec des données mockées
Durée estimée : 3-4 sprints
```

**Sprint 1** — Modules principaux :
- [ ] Dashboard (KPIs, graphiques, activité récente)
- [ ] Produits (liste, création, modification, suppression)
- [ ] Catégories (arborescence, CRUD)

**Sprint 2** — Modules commerciaux :
- [ ] Commandes (liste, détail, changement de statut)
- [ ] Paiements (transactions, remboursements)
- [ ] Clients (liste, profil, historique)

**Sprint 3** — Modules contenu + marketing :
- [ ] Contenu CMS (bannières, pages)
- [ ] Promotions
- [ ] Coupons
- [ ] Campagnes
- [ ] Analytics / Statistiques

**Sprint 4** — Modules Super Admin :
- [ ] Gestion des admins (CRUD)
- [ ] Gestion des rôles (CRUD + assignation permissions)
- [ ] Audit Log (consultation, filtres, export)
- [ ] Paramètres globaux
- [ ] Gestion des fonctionnalités (feature flags)

### Phase 3 — Conception du Backend

```
Objectif : Définir tous les contrats backend avant de coder
Durée estimée : 1 sprint
```

- [ ] Schéma Prisma complet (toutes les entités)
- [ ] Contrats des routes mobile (GET) + admin (CRUD)
- [ ] Système d'authentification (JWT + rôles + permissions)
- [ ] Middleware RBAC
- [ ] Validation Zod (schémas partagés)
- [ ] Politiques d'audit

### Phase 4 — Développement du Backend

```
Objectif : Implémenter le backend complet
Durée estimée : 3-4 sprints
```

- [ ] Prisma schema + migrations
- [ ] Routes mobile (GET) — pour l'application existante
- [ ] Routes admin (CRUD) — pour le dashboard
- [ ] Middleware auth + rbac
- [ ] Controllers + Services + Repositories
- [ ] Audit log middleware
- [ ] Upload d'images
- [ ] Tests

### Phase 5 — Bascule vers la production

```
Objectif : Connecter les clients au vrai backend
Durée estimée : 1 sprint
```

- [ ] Écrire les ApiDataSource pour l'Admin
- [ ] Écrire les ApiDataSource pour le Mobile
- [ ] Basculer le barrel de Mock → Api
- [ ] Tester l'intégration complète
- [ ] Supprimer les MockDataSource (ou les garder pour le développement local)
- [ ] Déploiement

---

## 11. Glossaire

| Terme | Définition |
|-------|------------|
| **Super Admin** | Administrateur avec accès total à la plateforme. Peut gérer les admins, les rôles, les permissions. |
| **Admin** | Administrateur avec un rôle spécifique et un ensemble de permissions. |
| **RBAC** | Role-Based Access Control — contrôle d'accès basé sur les rôles. |
| **Permission** | Droit d'effectuer une action sur une ressource (`products.create`). |
| **Rôle** | Ensemble de permissions. Peut être prédéfini ou personnalisé. |
| **DataSource** | Interface abstraite définissant les opérations possibles sur une ressource. Abstrait le Mock de l'API réelle. |
| **MockDataSource** | Implémentation DataSource utilisant des données fictives locales. |
| **ApiDataSource** | Implémentation DataSource appelant le backend via HTTP. |
| **Audit Log** | Journal horodaté de toutes les actions sensibles effectuées par les admins. |
| **Feature Flag** | Interrupteur permettant d'activer/désactiver une fonctionnalité sans déploiement. |
| **Permission-aware UI** | Interface qui s'adapte dynamiquement aux permissions de l'utilisateur connecté. |
| **Client de la plateforme** | Application (mobile, admin web, etc.) qui consomme l'API de la plateforme ExpressAfri. |

---

## Intégration avec l'architecture existante

### Rappel : Architecture actuelle du mobile

```
app/ (Expo Router — screens)
   ↓
features/ (hooks + services métier)
   ↓
store/ + types/ (Zustand + contrats)
   ↓
DataSource Abstraction (interfaces par domaine)
   ↓
infrastructure/ (MockDataSource | ApiDataSource)
```

### Architecture avec l'Admin

```
┌─────────────────────────────────────────────────────────────┐
│                     EXPRESSAFRI PLATFORM                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────┐    ┌──────────────────────────┐    │
│  │    MOBILE APP        │    │      ADMIN WEB            │    │
│  │                      │    │                           │    │
│  │  app/ → features/    │    │  features/ → pages/       │    │
│  │  → DataSource (lecture)│  │  → DataSource (CRUD)     │    │
│  │  → Mock | Api        │    │  → Mock | Api            │    │
│  └──────────┬───────────┘    └─────────────┬─────────────┘    │
│             │                               │                  │
│             ▼                               ▼                  │
│    ┌──────────────────────────────────────────────┐          │
│    │              BACKEND API (Express)             │          │
│    │                                               │          │
│    │  /api/mobile/*  ← GET (lecture seule)        │          │
│    │  /api/admin/*   ← CRUD (avec RBAC)           │          │
│    │                                               │          │
│    │  Middleware : Auth → RBAC → Validate → Audit │          │
│    └──────────────────────┬───────────────────────┘          │
│                           │                                   │
│                           ▼                                   │
│    ┌──────────────────────────────────────────────┐          │
│    │              PostgreSQL + Prisma              │          │
│    └──────────────────────────────────────────────┘          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Règles d'intégration

1. **Le mobile ne change pas** — ses DataSource actuelles (Product, Order, etc.) continuent de fonctionner
2. **L'Admin a ses propres DataSource** — avec des méthodes CRUD complètes
3. **Le backend expose deux familles de routes** :
   - `/api/mobile/*` — lecture seule, conforme aux contrats des DataSource mobiles
   - `/api/admin/*` — CRUD, protégé par RBAC, conforme aux contrats des DataSource admin
4. **Les deux clients partagent la même base de données** via Prisma
5. **Le système d'auth est unifié** (JWT) mais les flows sont différents (OTP pour mobile, password pour admin)
6. **Les types métier** (`Product`, `Order`, `User`, etc.) sont définis une seule fois dans le schéma Prisma
