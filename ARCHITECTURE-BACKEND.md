# Architecture Backend — ExpressAfri

## Stack technique

| Couche | Technologie | Justification |
|---|---|---|
| **Framework** | **NestJS** (Node.js / TypeScript) | Même langage que le frontend (admin + mobile), architecture modulaire, DI, décorateurs, support microservices natif |
| **Base de données** | **PostgreSQL** | ACID, JSONB, Row Level Security, mature, déjà via pgAdmin 4 |
| **ORM** | **Drizzle** | Type-safe, performances, migrations simples, requêtes SQL-like |
| **Cache / Queue** | **Redis** | Sessions, cache catalogue, rate limiting, BullMQ pour files d'attente |
| **API** | **REST** | Standard, simple, bien supporté par le fetch natif du React Native |

---

## Architecture : Monolithe Modulaire

Pourquoi pas des microservices dès le départ ?

- **Petite équipe** (toi seul ou 2-3 personnes) → la complexité ops des microservices tue la productivité
- Les microservices résolvent des problèmes **d'organisation**, pas techniques
- Un monolithe modulaire bien structuré donne ~90% des bénéfices avec ~10% de la complexité
- Chaque module est **indépendant** et peut être extrait en microservice plus tard sans réécriture

```
apps/api/
├── src/
│   ├── modules/
│   │   ├── auth/              # Authentification, rôles, permissions, JWT
│   │   ├── stores/            # Boutiques, KYC, commission vendeur
│   │   ├── products/          # Catalogue, variantes, catégories, images
│   │   ├── orders/            # Commandes, checkout, expédition, suivi
│   │   ├── payments/          # Paiements, remboursements, transactions
│   │   ├── coupons/           # Codes promo (standards + affiliés)
│   │   ├── affiliates/        # Programme d'affiliation, commissions
│   │   ├── cart/              # Panier client
│   │   ├── customers/         # Clients, adresses
│   │   ├── returns/           # Retours et remboursements
│   │   ├── loyalty/           # Fidélité, points, récompenses
│   │   ├── notifications/     # Email, SMS, push (templates + logs)
│   │   ├── payouts/           # Versements (vendeurs + affiliés)
│   │   ├── analytics/         # Statistiques, rapports, cohortes
│   │   ├── content/           # CMS, bannières, pages
│   │   ├── reviews/           # Avis et évaluations
│   │   ├── receipts/          # Reçus, paramètres d'impression
│   │   ├── reports/           # Signalements / rapports
│   │   ├── disputes/          # Litiges, messages, timeline
│   │   ├── audit/             # Journal d'audit (traçabilité)
│   │   ├── delivery/          # Livreurs, affectations, notation
│   │   ├── shipping/          # Zones, méthodes, règles d'expédition
│   │   ├── mobile/            # API mobile (auth client, catalogue, profil, contenu)
│   │   └── dashboard/         # Vue d'ensemble admin
│   ├── common/
│   │   ├── guards/            # Guards NestJS (auth, permissions)
│   │   ├── interceptors/      # Logging, transformation, cache
│   │   ├── filters/           # Exception filters
│   │   ├── pipes/             # Validation pipes
│   │   ├── decorators/        # Custom decorators
│   │   └── utils/             # Helpers partagés
│   ├── database/
│   │   ├── migrations/        # Drizzle migrations
│   │   ├── schema/            # Schémas Drizzle (tables)
│   │   └── seed/              # Données de démo
│   └── main.ts                # Point d'entrée
├── test/                      # Tests e2e
├── package.json
└── tsconfig.json
```

### Règles du monolithe modulaire

1. Chaque module possède **son propre domaine** — pas de croisement direct de tables
2. Les modules communiquent via des **services publics** (pas d'accès DB direct)
3. Chaque module expose des **controllers REST** pour le monde extérieur
4. Pas de `JOIN` entre tables de modules différents — on agrège via des appels service→service
5. Les modules sont « extractibles » : si un domaine devient trop lourd, on le sort en microservice

---

## Schéma PostgreSQL (Drizzle ORM)

### Conventions

- `uuid` primaire + `created_at`/`updated_at` sur toutes les tables
- `store_id` comme clé de partition multi-tenant sur toutes les tables métier
- `status` avec CHECK constraint pour les états finis
- Index sur `store_id` + colonnes de recherche fréquentes
- Row Level Security (RLS) activé pour l'isolation des tenants

### Tables par domaine

#### auth

```sql
CREATE TABLE admins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role_id       UUID REFERENCES roles(id),
  is_super_admin BOOLEAN DEFAULT FALSE,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label       TEXT NOT NULL,
  description TEXT,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  is_super_admin BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

#### stores

```sql
CREATE TABLE stores (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT,
  country    TEXT NOT NULL DEFAULT 'Niger',
  status     TEXT NOT NULL DEFAULT 'pending'
             CHECK (status IN ('pending','active','suspended','rejected')),
  commission_rate DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE store_kyc (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     UUID NOT NULL REFERENCES stores(id),
  first_name   TEXT NOT NULL,
  last_name    TEXT NOT NULL,
  nationality  TEXT NOT NULL,
  date_of_birth DATE,
  nid_number   TEXT,
  rccm         TEXT,
  nif           TEXT,
  business_type TEXT,
  address      TEXT,
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','approved','rejected')),
  reviewed_by  UUID REFERENCES admins(id),
  reviewed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
```

#### products

```sql
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID NOT NULL REFERENCES stores(id),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  description TEXT,
  parent_id   UUID REFERENCES categories(id),
  image_url   TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, slug)
);

CREATE TABLE products (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id         UUID NOT NULL REFERENCES stores(id),
  category_id      UUID REFERENCES categories(id),
  name             TEXT NOT NULL,
  slug             TEXT NOT NULL,
  description      TEXT,
  price            DECIMAL(10,2) NOT NULL,
  compare_price    DECIMAL(10,2),
  cost_price       DECIMAL(10,2),
  currency         TEXT NOT NULL DEFAULT 'XOF',
  weight_kg        DECIMAL(8,3),
  status           TEXT NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','active','archived')),
  moderation_status TEXT DEFAULT 'pending'
                   CHECK (moderation_status IN ('pending','approved','rejected')),
  rejection_reason TEXT,
  is_featured      BOOLEAN DEFAULT FALSE,
  tags             TEXT[],
  metadata         JSONB,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, slug)
);

CREATE TABLE product_variants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  store_id   UUID NOT NULL REFERENCES stores(id),
  sku        TEXT NOT NULL,
  label      TEXT NOT NULL,
  price      DECIMAL(10,2),
  stock      INTEGER NOT NULL DEFAULT 0,
  weight_kg  DECIMAL(8,3),
  image_url  TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, sku)
);

CREATE TABLE product_images (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  alt        TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### customers

```sql
CREATE TABLE customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES stores(id),
  email           TEXT NOT NULL,
  phone           TEXT,
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  password_hash   TEXT,
  is_guest        BOOLEAN DEFAULT FALSE,
  total_orders    INTEGER DEFAULT 0,
  total_spent     DECIMAL(12,2) DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, email)
);

CREATE TABLE addresses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id    UUID NOT NULL REFERENCES customers(id),
  store_id       UUID NOT NULL REFERENCES stores(id),
  label          TEXT,
  contact_name   TEXT NOT NULL,
  phone          TEXT NOT NULL,
  street         TEXT NOT NULL,
  apartment      TEXT,
  city           TEXT NOT NULL,
  province       TEXT,
  postal_code    TEXT,
  country_code   TEXT NOT NULL,
  is_default     BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
```

#### cart

```sql
CREATE TABLE carts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES stores(id),
  customer_id     UUID REFERENCES customers(id),
  session_id      TEXT,
  coupon_id       UUID REFERENCES coupons(id),
  discount_amount DECIMAL(10,2) DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','checked_out','abandoned')),
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cart_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id         UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id),
  variant_id      UUID REFERENCES product_variants(id),
  store_id        UUID NOT NULL REFERENCES stores(id),
  quantity        INTEGER NOT NULL CHECK (quantity > 0),
  unit_price      DECIMAL(10,2) NOT NULL,
  snapshot_name   TEXT NOT NULL,
  snapshot_image  TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### orders

```sql
CREATE TABLE orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id          UUID NOT NULL REFERENCES stores(id),
  customer_id       UUID REFERENCES customers(id),
  order_number      TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN (
                      'pending','confirmed','processing',
                      'shipped','delivered','cancelled','refunded'
                    )),
  subtotal          DECIMAL(12,2) NOT NULL,
  shipping_cost     DECIMAL(10,2) DEFAULT 0,
  tax_amount        DECIMAL(10,2) DEFAULT 0,
  discount_amount   DECIMAL(10,2) DEFAULT 0,
  total             DECIMAL(12,2) NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'XOF',
  coupon_id         UUID REFERENCES coupons(id),
  coupon_code       TEXT,
  shipping_address  JSONB,
  billing_address   JSONB,
  tracking_number   TEXT,
  tracking_url      TEXT,
  notes             TEXT,
  shipped_at        TIMESTAMPTZ,
  delivered_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, order_number)
);

CREATE TABLE order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id),
  variant_id      UUID REFERENCES product_variants(id),
  store_id        UUID NOT NULL REFERENCES stores(id),
  sku             TEXT,
  label           TEXT NOT NULL,
  image_url       TEXT,
  quantity        INTEGER NOT NULL CHECK (quantity > 0),
  unit_price      DECIMAL(10,2) NOT NULL,
  total_price     DECIMAL(12,2) NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_status_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID NOT NULL REFERENCES orders(id),
  store_id   UUID NOT NULL REFERENCES stores(id),
  from_status TEXT,
  to_status  TEXT NOT NULL,
  changed_by UUID REFERENCES admins(id),
  reason     TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### payments

```sql
CREATE TABLE payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID NOT NULL REFERENCES orders(id),
  store_id          UUID NOT NULL REFERENCES stores(id),
  method            TEXT NOT NULL
                    CHECK (method IN (
                      'orange_money','wave','mobile_money',
                      'bank_transfer','card'
                    )),
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN (
                      'pending','authorized','captured',
                      'failed','refunded','partially_refunded'
                    )),
  amount            DECIMAL(12,2) NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'XOF',
  transaction_id    TEXT,
  gateway_response  JSONB,
  idempotency_key   TEXT UNIQUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE refunds (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id      UUID NOT NULL REFERENCES payments(id),
  order_id        UUID NOT NULL REFERENCES orders(id),
  store_id        UUID NOT NULL REFERENCES stores(id),
  amount          DECIMAL(12,2) NOT NULL,
  reason          TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','completed','failed')),
  gateway_refund_id TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### coupons

```sql
CREATE TABLE coupons (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id              UUID NOT NULL REFERENCES stores(id),
  code                  TEXT NOT NULL,
  name                  TEXT NOT NULL,
  description           TEXT,
  type                  TEXT NOT NULL
                        CHECK (type IN ('percentage','fixed','free_shipping')),
  value                 DECIMAL(10,2) NOT NULL,
  min_purchase          DECIMAL(10,2),
  max_discount          DECIMAL(10,2),
  start_date            TIMESTAMPTZ NOT NULL,
  end_date              TIMESTAMPTZ NOT NULL,
  is_active             BOOLEAN DEFAULT TRUE,
  usage_limit_per_user  INTEGER,
  usage_limit_total     INTEGER,
  used_count            INTEGER DEFAULT 0,
  first_time_only       BOOLEAN DEFAULT FALSE,
  applicable_to         TEXT NOT NULL DEFAULT 'all'
                        CHECK (applicable_to IN ('all','category','store','product')),
  applicable_id         UUID,
  applicable_name       TEXT,
  affiliate_id          UUID REFERENCES affiliates(id),
  affiliate_name        TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, code)
);

CREATE TABLE coupon_usage (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id       UUID NOT NULL REFERENCES coupons(id),
  order_id        UUID NOT NULL REFERENCES orders(id),
  customer_id     UUID REFERENCES customers(id),
  customer_email  TEXT,
  discount_amount DECIMAL(10,2) NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### affiliates

```sql
CREATE TABLE affiliates (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id              UUID NOT NULL REFERENCES stores(id),
  name                  TEXT NOT NULL,
  email                 TEXT NOT NULL,
  phone                 TEXT,
  country               TEXT NOT NULL DEFAULT 'Niger',
  status                TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','active','suspended','banned')),
  default_commission_rate DECIMAL(5,2) NOT NULL DEFAULT 5,
  payment_method        TEXT NOT NULL DEFAULT 'orange_money',
  payment_details       TEXT,
  total_earned          DECIMAL(12,2) DEFAULT 0,
  total_paid            DECIMAL(12,2) DEFAULT 0,
  total_pending         DECIMAL(12,2) DEFAULT 0,
  total_referrals       INTEGER DEFAULT 0,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, email)
);

CREATE TABLE affiliate_commissions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id          UUID NOT NULL REFERENCES stores(id),
  affiliate_id      UUID NOT NULL REFERENCES affiliates(id),
  order_id          UUID NOT NULL REFERENCES orders(id),
  coupon_id         UUID REFERENCES coupons(id),
  coupon_code       TEXT,
  customer_name     TEXT,
  order_amount      DECIMAL(12,2) NOT NULL,
  commission_rate   DECIMAL(5,2) NOT NULL,
  commission_amount DECIMAL(12,2) NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','paid','reversed')),
  paid_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
```

#### payouts

```sql
CREATE TABLE payouts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES stores(id),
  type            TEXT NOT NULL CHECK (type IN ('seller','affiliate')),
  recipient_id    UUID NOT NULL,
  recipient_name  TEXT NOT NULL,
  recipient_email TEXT,
  amount          DECIMAL(12,2) NOT NULL,
  fee             DECIMAL(10,2) DEFAULT 0,
  total           DECIMAL(12,2) NOT NULL,
  method          TEXT NOT NULL,
  account_details TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','processing','completed','failed')),
  notes           TEXT,
  processed_by    UUID REFERENCES admins(id),
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### returns

```sql
CREATE TABLE returns (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id          UUID NOT NULL REFERENCES stores(id),
  order_id          UUID NOT NULL REFERENCES orders(id),
  customer_id       UUID REFERENCES customers(id),
  reason            TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN (
                      'pending','approved','received',
                      'refunded','rejected','cancelled'
                    )),
  refund_amount     DECIMAL(12,2),
  refund_method     TEXT,
  notes             TEXT,
  reviewed_by       UUID REFERENCES admins(id),
  reviewed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE return_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id  UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  quantity   INTEGER NOT NULL CHECK (quantity > 0),
  condition  TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### notifications

```sql
CREATE TABLE notification_templates (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   UUID NOT NULL REFERENCES stores(id),
  key        TEXT NOT NULL,
  label      TEXT NOT NULL,
  channel    TEXT NOT NULL CHECK (channel IN ('email','sms','push')),
  subject    TEXT,
  body       TEXT NOT NULL,
  variables  TEXT[] DEFAULT '{}',
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, key)
);

CREATE TABLE notification_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      UUID NOT NULL REFERENCES stores(id),
  template_id   UUID REFERENCES notification_templates(id),
  channel       TEXT NOT NULL,
  recipient     TEXT NOT NULL,
  subject       TEXT,
  body          TEXT,
  status        TEXT NOT NULL DEFAULT 'sent'
                CHECK (status IN ('sent','failed','read')),
  error_message TEXT,
  sent_at       TIMESTAMPTZ DEFAULT NOW(),
  read_at       TIMESTAMPTZ
);
```

#### loyalty

```sql
CREATE TABLE loyalty_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES stores(id),
  name            TEXT NOT NULL,
  type            TEXT NOT NULL
                  CHECK (type IN (
                    'points_per_purchase','points_per_referral',
                    'points_per_review','birthday_bonus'
                  )),
  points          INTEGER NOT NULL,
  conditions      JSONB,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE loyalty_rewards (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID NOT NULL REFERENCES stores(id),
  name        TEXT NOT NULL,
  description TEXT,
  points_cost INTEGER NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('coupon','free_shipping','product')),
  value       JSONB,
  stock       INTEGER,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE loyalty_points (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID NOT NULL REFERENCES stores(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  balance     INTEGER NOT NULL DEFAULT 0,
  lifetime    INTEGER NOT NULL DEFAULT 0,
  tier        TEXT NOT NULL DEFAULT 'bronze'
              CHECK (tier IN ('bronze','silver','gold','platinum')),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, customer_id)
);
```

#### reviews

```sql
CREATE TABLE product_reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID NOT NULL REFERENCES stores(id),
  product_id  UUID NOT NULL REFERENCES products(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title       TEXT,
  content     TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, product_id, customer_id)
);
```

#### content

```sql
CREATE TABLE content_blocks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   UUID NOT NULL REFERENCES stores(id),
  key        TEXT NOT NULL,
  value      TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'text'
             CHECK (type IN ('text','html','image','json')),
  group_name TEXT,
  screen     TEXT,
  label      TEXT,
  is_active  BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, key)
);
```

#### analytics

```sql
CREATE TABLE analytics_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID NOT NULL REFERENCES stores(id),
  event_type  TEXT NOT NULL,
  customer_id UUID,
  session_id  TEXT,
  payload     JSONB,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE analytics_funnels (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   UUID NOT NULL REFERENCES stores(id),
  name       TEXT NOT NULL,
  step       INTEGER NOT NULL,
  step_name  TEXT NOT NULL,
  count      INTEGER NOT NULL DEFAULT 0,
  date       DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, name, step, date)
);
```

---

#### receipts

```sql
CREATE TABLE receipts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID NOT NULL REFERENCES orders(id),
  store_id          UUID NOT NULL REFERENCES stores(id),
  order_number      TEXT NOT NULL,
  customer_name     TEXT NOT NULL,
  customer_email    TEXT,
  customer_phone    TEXT,
  amount            DECIMAL(12,2) NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'XOF',
  status            TEXT NOT NULL DEFAULT 'unsent',
  type              TEXT NOT NULL DEFAULT 'email',
  sent_at           TIMESTAMPTZ,
  download_url      TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE receipt_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES stores(id) UNIQUE,
  auto_send       BOOLEAN DEFAULT FALSE,
  default_type    TEXT NOT NULL DEFAULT 'email',
  prefix          TEXT DEFAULT 'REC-',
  footer_text     TEXT,
  email_subject   TEXT,
  email_template  TEXT,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### reports

```sql
CREATE TABLE reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type          TEXT NOT NULL DEFAULT 'other',
  reporter_id   TEXT,
  reporter_name TEXT,
  reporter_email TEXT,
  target_id     TEXT,
  target_name   TEXT,
  reason        TEXT NOT NULL,
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'pending',
  assigned_to   TEXT,
  resolution    TEXT,
  evidence      JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

#### disputes

```sql
CREATE TABLE disputes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id          UUID NOT NULL REFERENCES stores(id),
  order_id          UUID NOT NULL REFERENCES orders(id),
  customer_id       TEXT,
  customer_name     TEXT,
  customer_email    TEXT,
  seller_id         TEXT,
  seller_name       TEXT,
  store_name        TEXT,
  product_id        TEXT,
  product_name      TEXT,
  product_image     TEXT,
  amount            DECIMAL(12,2),
  reason            TEXT NOT NULL DEFAULT 'other',
  status            TEXT NOT NULL DEFAULT 'open',
  resolution        TEXT,
  resolution_amount DECIMAL(12,2),
  resolution_note   TEXT,
  description       TEXT NOT NULL,
  evidence          JSONB,
  assigned_admin_id TEXT,
  due_date          TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE dispute_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id  UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  author_id   TEXT,
  author_name TEXT,
  author_role TEXT NOT NULL DEFAULT 'customer',
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE dispute_timeline (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  status     TEXT NOT NULL,
  note       TEXT,
  actor_id   TEXT,
  actor_name TEXT,
  actor_role TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### audit

```sql
CREATE TABLE audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      TEXT,
  actor_email   TEXT,
  actor_role    TEXT,
  action        TEXT NOT NULL,
  resource      TEXT NOT NULL,
  resource_id   TEXT,
  details       JSONB,
  ip_address    TEXT,
  user_agent    TEXT,
  status        TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
-- Note : pas de FK, pour logger avant même que l'admin existe
```

#### delivery

```sql
CREATE TABLE delivery_persons (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id         UUID NOT NULL REFERENCES stores(id),
  name             TEXT NOT NULL,
  phone            TEXT NOT NULL,
  email            TEXT,
  vehicle_type     TEXT NOT NULL DEFAULT 'bike',
  country_code     TEXT,
  country_name     TEXT,
  region           TEXT,
  address          TEXT,
  id_card_number   TEXT,
  license_plate    TEXT,
  profile_photo    TEXT,
  is_active        BOOLEAN DEFAULT TRUE,
  is_verified      BOOLEAN DEFAULT FALSE,
  rating           DECIMAL(3,2) DEFAULT 0,
  rating_count     INTEGER DEFAULT 0,
  total_deliveries INTEGER DEFAULT 0,
  joined_at        TIMESTAMPTZ DEFAULT NOW(),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE delivery_assignments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_person_id  UUID NOT NULL REFERENCES delivery_persons(id),
  order_id            UUID NOT NULL REFERENCES orders(id),
  store_id            UUID NOT NULL REFERENCES stores(id),
  status              TEXT NOT NULL DEFAULT 'assigned',
  notes               TEXT,
  rating              INTEGER,
  assigned_at         TIMESTAMPTZ DEFAULT NOW(),
  picked_up_at        TIMESTAMPTZ,
  delivered_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
```

#### shipping

```sql
CREATE TABLE shipping_zones (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   UUID NOT NULL REFERENCES stores(id),
  name       TEXT NOT NULL,
  countries  JSONB NOT NULL DEFAULT '[]',
  is_active  BOOLEAN DEFAULT TRUE,
  priority   INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE shipping_methods (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id             UUID NOT NULL REFERENCES shipping_zones(id),
  store_id            UUID NOT NULL REFERENCES stores(id),
  name                TEXT NOT NULL,
  description         TEXT,
  base_rate           DECIMAL(10,2) NOT NULL DEFAULT 0,
  free_threshold      DECIMAL(10,2),
  estimated_days_min  INTEGER DEFAULT 1,
  estimated_days_max  INTEGER DEFAULT 7,
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE shipping_rules (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id    UUID NOT NULL REFERENCES shipping_zones(id),
  store_id   UUID NOT NULL REFERENCES stores(id),
  name       TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'weight',
  min_value  DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_value  DECIMAL(10,2),
  rate       DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## API REST — Endpoints principaux

### Auth
```
POST   /api/auth/login              # Connexion admin
POST   /api/auth/register           # Inscription admin
POST   /api/auth/forgot-password    # Mot de passe oublié
GET    /api/auth/me                 # Profil connecté
```

### Stores
```
GET    /api/stores                  # Liste des boutiques
GET    /api/stores/:id              # Détail boutique
POST   /api/stores                  # Créer boutique
PUT    /api/stores/:id              # Modifier boutique
GET    /api/stores/:id/kyc          # Documents KYC
PUT    /api/stores/:id/kyc          # Approuver/rejeter KYC
```

### Produits
```
GET    /api/products                # Liste produits (filtré: store, catégorie, status, q)
GET    /api/products/:id            # Détail produit
POST   /api/products                # Créer produit
PUT    /api/products/:id            # Modifier produit
DELETE /api/products/:id            # Supprimer produit
POST   /api/products/:id/moderate   # Approuver/rejeter modération
```

### Coupons
```
GET    /api/coupons                 # Liste coupons (filtré: status, type, affiliateId, q)
GET    /api/coupons/:id             # Détail coupon
GET    /api/coupons/by-code/:code   # Trouver par code (mobile)
POST   /api/coupons                 # Créer coupon
PUT    /api/coupons/:id             # Modifier coupon
DELETE /api/coupons/:id             # Supprimer coupon
POST   /api/coupons/:id/validate    # Valider un code (checkout)
```

### Affiliés
```
GET    /api/affiliates              # Liste affiliés (filtré: status, q)
GET    /api/affiliates/:id          # Détail affilié
POST   /api/affiliates              # Créer affilié
PUT    /api/affiliates/:id          # Modifier affilié
PUT    /api/affiliates/:id/status   # Changer statut
GET    /api/affiliates/:id/coupons  # Coupons liés à l'affilié

GET    /api/affiliate-commissions          # Liste commissions
GET    /api/affiliate-commissions/:id
PUT    /api/affiliate-commissions/:id/approve
PUT    /api/affiliate-commissions/:id/reject
GET    /api/affiliates/summary             # Résumé global (admin)
```

### Commandes
```
GET    /api/orders                  # Liste commandes (filtré: store, status, customer, dates)
GET    /api/orders/:id              # Détail commande
PUT    /api/orders/:id/status       # Changer statut
```

### Paiements
```
GET    /api/payments                # Liste transactions
GET    /api/payments/:id
POST   /api/payments/:id/refund     # Rembourser
```

### Versements
```
GET    /api/payouts                 # Liste versements
GET    /api/payouts/:id
POST   /api/payouts                 # Créer (paiement manuel)
PUT    /api/payouts/:id/process     # Marquer comme traité
```

### Retours
```
GET    /api/returns                 # Liste retours
GET    /api/returns/:id
PUT    /api/returns/:id/status      # Changer statut workflow
```

### Notifications
```
GET    /api/notification-templates              # Templates
POST   /api/notification-templates              # Créer template
PUT    /api/notification-templates/:id          # Modifier
DELETE /api/notification-templates/:id
POST   /api/notification-templates/:id/test     # Envoyer test
GET    /api/notification-logs                   # Logs d'envoi
```

### Fidélité
```
GET    /api/loyalty/rules
POST   /api/loyalty/rules
PUT    /api/loyalty/rules/:id
GET    /api/loyalty/rewards
POST   /api/loyalty/rewards
PUT    /api/loyalty/rewards/:id
GET    /api/loyalty/customers            # Clients avec points
PUT    /api/loyalty/customers/:id/points # Ajuster points
```

### Analytics
```
GET    /api/analytics/dashboard      # KPIs (CA, commandes, clients)
GET    /api/analytics/revenue        # Revenus par période
GET    /api/analytics/funnel         # Entonnoir de conversion
GET    /api/analytics/cohorts        # Rétention cohortes
GET    /api/analytics/abandonment    # Paniers abandonnés
```

### Reçus
```
GET    /api/receipts                      # Liste reçus
GET    /api/receipts/:id                  # Détail reçu
POST   /api/receipts                      # Créer reçu (depuis commande)
POST   /api/receipts/:id/send             # Envoyer reçu
POST   /api/receipts/bulk-send            # Envoi groupé

GET    /api/receipts/settings             # Paramètres reçus
PUT    /api/receipts/settings             # Modifier paramètres
```

### Signalements
```
GET    /api/reports                       # Liste signalements
GET    /api/reports/:id
POST   /api/reports                       # Créer signalement
PUT    /api/reports/:id/status            # Changer statut
PUT    /api/reports/:id/assign            # Assigner à un admin
```

### Litiges
```
GET    /api/disputes                      # Liste litiges (filtré: store, status, orderId)
GET    /api/disputes/:id
POST   /api/disputes                      # Créer litige
PUT    /api/disputes/:id/status           # Changer statut
PUT    /api/disputes/:id/resolve          # Résoudre (montant, note)
POST   /api/disputes/:id/messages         # Ajouter message
PUT    /api/disputes/:id/assign           # Assigner admin
DELETE /api/disputes/:id
```

### Audit
```
GET    /api/audit                         # Journal d'audit (filtré: actor, resource, dates)
```

### Livraison
```
GET    /api/delivery/persons              # Liste livreurs
GET    /api/delivery/persons/:id
POST   /api/delivery/persons              # Ajouter livreur
PUT    /api/delivery/persons/:id          # Modifier livreur
DELETE /api/delivery/persons/:id

GET    /api/delivery/assignments          # Liste affectations
POST   /api/delivery/assignments          # Affecter livreur
PUT    /api/delivery/assignments/:id/status  # Changer statut
POST   /api/delivery/assignments/:id/rate    # Noter livreur

GET    /api/delivery/available-orders     # Commandes disponibles (mobile livreur)
```

### Expédition
```
GET    /api/shipping/zones                # Zones d'expédition
GET    /api/shipping/zones/:id
POST   /api/shipping/zones
PUT    /api/shipping/zones/:id
DELETE /api/shipping/zones/:id
PUT    /api/shipping/zones/:id/toggle     # Activer/désactiver

GET    /api/shipping/methods              # Méthodes
POST   /api/shipping/methods
PUT    /api/shipping/methods/:id
DELETE /api/shipping/methods/:id

GET    /api/shipping/rules                # Règles de tarification
POST   /api/shipping/rules
PUT    /api/shipping/rules/:id
DELETE /api/shipping/rules/:id
```

---

### Mobile (Phase 3 — API client)
```
# Auth client (public)
POST   /api/mobile/auth/register           # Inscription
POST   /api/mobile/auth/login              # Connexion email/password
POST   /api/mobile/auth/otp-request        # Demander code OTP
POST   /api/mobile/auth/otp-verify         # Vérifier OTP → JWT
POST   /api/mobile/auth/refresh            # Rafraîchir token
POST   /api/mobile/auth/social             # Connexion Google/Apple/Facebook
POST   /api/mobile/auth/password-reset     # Réinitialisation mot de passe

# Profil client (auth required)
GET    /api/mobile/profile                 # Profil connecté
PUT    /api/mobile/profile                 # Modifier profil

# Catalogue (public)
GET    /api/mobile/products                # Produits (format mobile)
GET    /api/mobile/products/:id            # Détail produit
GET    /api/mobile/categories              # Catégories
GET    /api/mobile/categories/:id/products # Produits par catégorie

# Contenu (public)
GET    /api/mobile/banners                 # Bannières promotionnelles
GET    /api/mobile/feed                    # Posts du feed
GET    /api/mobile/shortcuts               # Raccourcis accueil
GET    /api/mobile/suggested-people        # Personnes suggérées

# Paiement (public)
GET    /api/mobile/payment/methods         # Méthodes de paiement
GET    /api/mobile/payment/card-brands     # Marques de cartes acceptées

# Commandes client (auth required)
GET    /api/orders/mobile/list             # Liste commandes client (filtré: status)
POST   /api/orders                         # Créer commande (checkout)
GET    /api/orders/:id                     # Détail commande
```

---

## Flux clés

### Checkout (commande)

```
1. Client ajoute au panier       → POST /cart/items
2. Client applique code promo     → POST /coupons/:id/validate
3. Client passe commande           → POST /orders
   ├── Valider stock               → UPDATE products SET stock
   ├── Valider coupon              → UPDATE coupons SET used_count++
   ├── Créer order + items         → INSERT orders + order_items
   ├── Créer payment               → INSERT payments
   ├── Si coupon affilié           → INSERT affiliate_commissions
   ├── Vider panier                → DELETE cart_items
   └── Publier événement           → order.confirmed
4. Paiement confirmé               → PUT /payments/:id/capture
5. Notification client             → Notification service (async)
```

### Paiement affilié

```
1. Commande confirmée avec coupon affilié
2. Calcul commission = order.total × affiliate.commission_rate
3. INSERT affiliate_commissions (status: pending)
4. Admin approuve → PUT /affiliate-commissions/:id/approve
5. Admin paie → POST /payouts (type: affiliate)
6. Commission marquée paid → PUT /affiliate-commissions/:id
```

---

## Plan de migration (4 phases)

### Phase 1 — Backend core (semaines 1-3) ✅

- [x] Initialiser le projet NestJS dans `apps/api/`
- [x] Configurer PostgreSQL + Drizzle ORM + Redis
- [x] Module **Auth** (JWT, rôles, permissions)
- [x] Module **Stores** (CRUD + KYC)
- [x] Module **Products** (CRUD, variantes, images)
- [x] Module **Coupons** (CRUD + validation)
- [x] Module **Affiliates** (affiliés + commissions)
- [x] Module **Orders** (commandes + panier)
- [x] Seed script avec données de démo

### Phase 2 — Modules avancés & Admin connecté (semaines 4-6) ✅

- [x] **Payments** — paiements, remboursements, idempotency
- [x] **Returns** — retours, remboursement workflow
- [x] **Payouts** — versements vendeurs + affiliés
- [x] **Customers** — CRUD clients, adresses, stats
- [x] **Notifications** — templates + logs d'envoi
- [x] **Loyalty** — règles, récompenses, points clients
- [x] **Content** — CMS (bannières, pages, blocs)
- [x] **Reviews** — avis produits, modération
- [x] **Promotions / Campaigns** — blocs groupés
- [x] **Receipts** — reçus, paramètres, envoi
- [x] **Reports** — signalements, assignation
- [x] **Disputes** — litiges, messages, timeline
- [x] **Audit** — journal de traçabilité
- [x] **Delivery** — livreurs, affectations, notation
- [x] **Shipping** — zones, méthodes, règles
- [x] **Admin Auth** — CRUD admins + rôles + permissions
- [x] Créer `ApiDataSource` pour chaque domaine dans l'admin
- [x] Remplacer les `MockDataSource` (23/25 connectés)
- [x] 0 erreurs TypeScript (API + Admin)

### Phase 3 — Mobile connecté ✅

- [x] **MobileModule** — module dédié avec CustomerJWT (séparé de l'admin)
- [x] **Auth client** — register, login, OTP (request + verify), refresh, social, password-reset
- [x] **Catalogue mobile** — produits, catégories, recherche (format mobile)
- [x] **Contenu mobile** — bannières, feed, shortcuts, personnes suggérées
- [x] **Paiement mobile** — méthodes de paiement, marques de cartes
- [x] **Profil client** — GET/PUT profil connecté
- [x] **Commandes checkout** — POST /api/orders (création depuis panier)
- [x] **Liste commandes mobile** — GET /api/orders/mobile/list avec mapping de statuts
- [x] **6 Api*DataSource mobile** réécrits (appels vers /api/mobile/*)
- [x] **DataSources mobile** basculés Mock → API dans `index.ts`
- [x] 0 erreurs TypeScript dans `src/` (mobile)
- [ ] Wishlist, adresses, messagerie — encore en local (Zustand / AsyncStorage)

### Phase 4 — Production & scaling (à venir)

- [ ] Tâches cron (expiration coupons, relances paniers)
- [ ] Monitoring (OpenTelemetry, logs structurés)
- [ ] Rate limiting, cache Redis avancé
- [ ] Tests e2e et unitaires
- [ ] Déploiement CI/CD
- [ ] Documentation API (Swagger déjà en place)

---

## Diagramme des flux (texte)

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  Admin App   │      │  Mobile App  │      │   Frontend   │
│ (apps/admin/)│      │   (app/)     │      │  (externe)   │
└──────┬───────┘      └──────┬───────┘      └──────┬───────┘
       │                     │                     │
       │     REST API        │      REST API       │
       ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────┐
│                  API Gateway (NestJS)                    │
│  Auth │ Rate Limiting │ Validation │ Logging            │
└───────────────────────┬─────────────────────────────────┘
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   Auth Module   │ │  Products Mod.  │ │  Orders Module  │
│ ─────────────── │ │ ─────────────── │ │ ─────────────── │
│ JWT │ RBAC │    │ │ CRUD │ Variants│ │ Saga │ FSM      │
│ Permissions     │ │ Categories      │ │ Checkout        │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────┐
│                    PostgreSQL + Redis                     │
│  Multi-tenant (store_id) │ RLS │ Cache                  │
└─────────────────────────────────────────────────────────┘
```

---

## Décisions d'architecture

| Décision | Choix | Raison |
|---|---|---|
| Monolithe modulaire vs microservices | Monolithe modulaire | Petite équipe, déploiement simple, extractible plus tard |
| ORM | Drizzle | Type-safe, SQL-like, léger, migrations performantes |
| Multi-tenant | Shared schema + store_id | Simple, RLS pour l'isolation, pas de duplication |
| Auth admin | JWT (RS256) + 7d expiry | Stateless, scalable, pas de session DB |
| Auth client | CustomerJWT (stratégie séparée) + 30d expiry | Séparé de l'admin, OTP + social login |
| API mobile | Module dédié (`/api/mobile/*`) | Format spécifique mobile, pas de conflit avec l'admin |
| Checkout | Client-side cart (Zustand) → POST /api/orders | Panier local persistant, commande créée au paiement |
| Paiements | Idempotency key | Évite les doubles paiements sur retry |
| Commissions | Table séparée | Traçabilité complète, audit |
| Cache | Redis (TTL) | Catalogue, sessions, rate limiting |
| Notifications | Outbox pattern | Garantie que l'event est envoyé même si le broker est down |
| Audit logs | Table sans FK (texte) | Logger avant même que l'admin existe |
| Disputes | Sous-tables avec ON DELETE CASCADE | Messages + timeline nettoyés automatiquement |
| Receipts | Settings table avec upsert | Un seul settings row par store |
| Shipping | Zones → Methods → Rules | Hiérarchie réutilisable, règles par poids/valeur |
| Delivery | Recalcul de rating dynamique | Moyenne mise à jour à chaque notation |
| Promotions/Campaigns | Stockés dans content_blocks | Pas de tables dédiées, filtrés par group_name |
| Variants | insert + delete on update | Pas de UPDATE partiel, atomicité garantie |

---

## Tags de statut (convention)

Tous les champs `status` suivent un pattern :

- **Entité en attente** : `pending`
- **Actif / approuvé** : `active`, `approved`, `confirmed`
- **Suspendu / rejeté** : `suspended`, `rejected`, `cancelled`
- **Terminé** : `completed`, `paid`, `delivered`, `refunded`

Les transitions sont gérées par la couche service (pas de `UPDATE status` libre).
