# Audit Complet — ExpressAfri

**Date** : 15/07/2026
**Objectif** : Audit exhaustif avant connexion Supabase et mise en production
**Périmètre** : 36 écrans, 19 composants, 5 stores, 6 services, 12 features, 3 locales

---

## Table des Matières

1. [Problèmes Bloquants (Critiques)](#1-problèmes-bloquants-critiques)
2. [Écrans Manquants](#2-écrans-manquants)
3. [Problèmes Auth & Social Login](#3-problèmes-auth--social-login)
4. [Problèmes Flux Checkout & Paiement](#4-problèmes-flux-checkout--paiement)
5. [Problèmes Flux Commandes & Suivi](#5-problèmes-flux-commandes--suivi)
6. [Problèmes d'Internationalisation (i18n)](#6-problèmes-dinternationalisation-i18n)
7. [Problèmes de Mock & Données](#7-problèmes-de-mock--données)
8. [Problèmes UI & Design](#8-problèmes-ui--design)
9. [Problèmes Techniques](#9-problèmes-techniques)
10. [Boutons sans Action (no-op)](#10-boutons-sans-action-no-op)
11. [Routes vers Placeholder](#11-routes-vers-placeholder)
12. [Recommandations Supabase](#12-recommandations-supabase)
13. [Plan de Correction par Étapes](#13-plan-de-correction-par-étapes)

---

## 1. Problèmes Bloquants (Critiques)

| # | Problème | Fichier | Impact |
|---|----------|---------|--------|
| **C1** | **Aucun traitement de paiement réel** — `handlePay()` vide le panier et redirige vers success sans appeler d'API | `app/checkout/payment.tsx:44-47` | Impossible de payer |
| **C2** | **Pas d'écran de saisie des coordonnées bancaires** (carte) | Manquant | Impossible de payer par carte |
| **C3** | **"Suivre votre commande" → /account** au lieu d'un vrai suivi | `app/checkout/success.tsx:30` | UX cassée |
| **C4** | **Bouton "Track package" sans action** `onPress={() => {}}` | `app/orders/[id].tsx:84` | Impossible de suivre |
| **C5** | **Register n'a pas de social login** contrairement à Login | `app/auth/register.tsx` | Incohérence UX |
| **C6** | **Icônes sociales génériques** au lieu des vraies marques (Google, Apple, Facebook en couleur) | `app/auth/login.tsx:229-244` | Design non-premium |
| **C7** | **Toutes les données sont mockées** — 19+ URLs picsum, 20 produits fictifs, commandes mockées | Multiples fichiers | Aucune donnée réelle |
| **C8** | **7 clés i18n manquantes** : `auth.backToLogin`, `auth.checkInbox`, `auth.enterCode`, `auth.resetLinkSent`, `auth.returnToLogin`, `auth.sendResetLink`, `wallet.total` | Locales | Textes absents en production |

---

## 2. Écrans Manquants

| # | Écran manquant | Justification |
|---|----------------|---------------|
| **M1** | **Formulaire coordonnées bancaires** (card details) | Quand l'utilisateur choisit "Carte" au paiement, il doit entrer numéro, date d'expiration, CVV, nom. Aucun écran ni bottom-sheet n'existe. |
| **M2** | **Écran de suivi de commande en temps réel** (tracking) | Le bouton "Track package" dans `orders/[id].tsx` est vide. Il faudrait une carte avec étapes : commande → préparée → expédiée → en transit → livrée. |
| **M3** | **Écran de sélection d'opérateur Mobile Money avec numéro** | Le paiement Mobile Money demande non seulement l'opérateur mais aussi le numéro de téléphone pour recevoir la demande de paiement. |
| **M4** | **Écran d'édition/suppression de méthode de paiement** | `payment/index.tsx` a un bouton "Add card" vide et ne permet pas de gérer les méthodes existantes. |
| **M5** | **Écran liste de souhaits détaillé** | `wishlist/index.tsx` existe mais très basique (juste grille produits), manque de fonctionnalités (partage, ajout au panier groupé). |
| **M6** | **Chat / messagerie temps réel** | `messages/index.tsx` est statique (canaux + anciennes notifications). Pas de vrai chat. |

---

## 3. Problèmes Auth & Social Login

| # | Problème | Détail |
|---|----------|--------|
| A1 | **Register sans social login** | `app/auth/login.tsx` a 3 boutons sociaux (Google, Apple, Facebook). `app/auth/register.tsx` n'en a aucun. |
| A2 | **Icônes sociales génériques** | Les boutons sociaux utilisent `globe`, `phone`, `message` au lieu des vrais logos Google, Apple, Facebook en couleur. |
| A3 | **Aucune connexion OAuth réelle** | Les handlers `socialSignIn` créent un utilisateur mock sans appeler d'API OAuth. |
| A4 | **3 écrans auth non déclarés dans Stack.Screen** | `otp-sent.tsx`, `forgot-password.tsx`, `forgot-password-sent.tsx` existent mais ne sont pas dans `_layout.tsx`. |
| A5 | **Forgot password sans OTP phone** | `forgot-password.tsx` ne gère que l'email, pas le téléphone. |
| A6 | **OTP toujours 4 chiffres** | `LENGTH = 4` hardcodé dans `otp.tsx`, devrait être paramétrable. |

---

## 4. Problèmes Flux Checkout & Paiement

| # | Problème | Fichier | Détail |
|---|----------|---------|--------|
| P1 | **Aucun traitement de paiement** | `checkout/payment.tsx:44-47` | `handlePay()` appelle `clear()` puis `router.replace("/checkout/success")` sans API. |
| P2 | **Panier vidé avant la redirection** | `checkout/payment.tsx:45` | `clear()` est appelé avant `router.replace()`, perte de données si la navigation échoue. |
| P3 | **Pas de formulaire carte bancaire** | Manquant | Aucun écran pour numéro de carte, date, CVV, nom. |
| P4 | **Operator Mobile Money sans saisie numéro** | `checkout/payment.tsx:33-34` | On sélectionne "Orange Money" mais on ne demande pas le numéro de téléphone du payeur. |
| P5 | **Bouton "Add card" sans action** | `payment/index.tsx:86` | `onPress={() => {}}` |
| P6 | **CARD_BRANDS statique** | `checkout/index.tsx:27` | `["VISA", "Mastercard", "UnionPay", "Amex", "JCB"]` — devrait venir du backend. |
| P7 | **Aucune gestion d'erreur paiement** | `checkout/payment.tsx` | Pas d'état `error`, pas de retry, pas de annulation. |
| P8 | **Succès → redirection vers /account** | `checkout/success.tsx:30` | "Suivre votre commande" va vers `/account` au lieu d'un vrai suivi. |

---

## 5. Problèmes Flux Commandes & Suivi

| # | Problème | Fichier | Détail |
|---|----------|---------|--------|
| O1 | **"Track package" sans action** | `orders/[id].tsx:84` | `onPress(() => {})` |
| O2 | **"Return request" sans action** | `orders/[id].tsx:145` | `onPress(() => {})` |
| O3 | **Pas d'écran de suivi en temps réel** | Manquant | Aucune interface avec timeline/étapes de livraison. |
| O4 | **Date formatée en dur en 'fr-FR'** | `orders/[id].tsx:63` | `toLocaleDateString('fr-FR')` devrait utiliser la langue courante. |
| O5 | **Pluralisation française hardcodée** | `orders/index.tsx:123` | `+{order.items.length - 1} {t("order.otherItems")}{order.items.length > 2 ? "s" : ""}` — ne marche qu'en français. |
| O6 | **Prix en $ hardcodés** | `orders/[id].tsx:112-127` | `$(value).toFixed(2)` au lieu de `price(value)`. |
| O7 | **Ordres statiques mockés** | `services/orderService.ts:17-68` | 3 commandes mock, pas de CRUD réel. |

---

## 6. Problèmes d'Internationalisation (i18n)

| # | Problème | Détail |
|---|----------|--------|
| I1 | **7 clés manquantes** | `auth.backToLogin`, `auth.checkInbox`, `auth.enterCode`, `auth.resetLinkSent`, `auth.returnToLogin`, `auth.sendResetLink`, `wallet.total` |
| I2 | **Hardcoded French partout** | `login.tsx` (12+), `otp.tsx` (6), `address/index.tsx` (6), `address/form.tsx` (15), `account.tsx` (6), `orders/[id].tsx` (4), etc. |
| I3 | **Sous-catégories en français dur** | `data/categories.ts` : "Accessoires", "Pièces", "Outils", "Cuisine", etc. (40+ strings) |
| I4 | **ar.json footer incomplet** | Manque "China at your door" / "La Chine à votre porte" |
| I5 | **Guillemets français dans en.json** | `search.resultsCount` utilise « et » au lieu de " en anglais |
| I6 | **Aucun test i18n automatisé** | Pas de vérification que toutes les clés existent dans toutes les locales |
| I7 | **Adresse entièrement hardcodée** | `address/index.tsx` et `address/form.tsx` — 0 appel à `t()` |

---

## 7. Problèmes de Mock & Données

| # | Problème | Fichiers |
|---|----------|----------|
| D1 | **20 produits mock picsum** | `data/products.ts` |
| D2 | **10 catégories avec images picsum** | `data/categories.ts` (10 URLs) |
| D3 | **16 feed posts picsum** | `data/banners.ts` |
| D4 | **Bannières statiques** | `data/banners.ts` — 3 bannières |
| D5 | **Commandes mock** | `services/orderService.ts` — 3 commandes |
| D6 | **Auth mock (mock-user, mock tokens)** | `services/authService.ts` |
| D7 | **Avatar utilisateur picsum** | `services/authService.ts:28`, `auth/register.tsx:45` |
| D8 | **TRENDING et HISTORY hardcodés** | `app/search/index.tsx:28-36` |
| D9 | **DISCOVER et RECO hardcodés** | `app/stores/index.tsx:9-19` |
| D10 | **OLDER messages hardcodés** | `app/messages/index.tsx:14-17` |
| D11 | **AVATARS hardcodés** | `app/profile/index.tsx:12-18` |
| D12 | **TABS et FOOTER hardcodés** | `app/coupons/index.tsx:9-13` |
| D13 | **Avis produits hardcodés** | `app/product/[id].tsx:234-259` |
| D14 | **Badge notifications "13" hardcodé** | `app/(tabs)/feed.tsx:50`, `app/(tabs)/account.tsx:180` |
| D15 | **Wallet toujours à zéro** | `app/wallet/bonus.tsx:28`, `app/wallet/savings.tsx:35` |

---

## 8. Problèmes UI & Design

| # | Problème | Fichier | Détail |
|---|----------|---------|--------|
| U1 | **Cartes feed de hauteurs variables** | `feed.tsx` utilisant `post.height` depuis `data/banners.ts` | Les hauteurs différentes créent un déséquilibre visuel dans la grille masonry. Les colonnes ne s'alignent pas bien entre elles. |
| U2 | **paddingBottom fixe dans les ScrollView** | `checkout/index.tsx:107` (120), `product/[id].tsx:99` (90), `cart.tsx` (140) | Les valeurs en pixels ne tiennent pas compte des safe area insets variables. |
| U3 | **Icônes sociales non-brandées** | `login.tsx:229-244` | `globe` pour Google, `phone` pour Apple, `message` pour Facebook. Pas de couleur réelle des marques. |
| U4 | **Bouton Feed central "+"** | `(tabs)/_layout.tsx:41-45` | Mène à l'onglet feed, pas à un vrai bouton d'action "créer". |
| U5 | **Couleur "sale" utilisée pour le bouton Follow** | `feed.tsx:284` | `backgroundColor: colors.sale` pour un bouton "Suivre" n'est pas cohérent (le rouge est pour les soldes/urgences). |
| U6 | **Header "Promos" tab en rouge** | `HomeHeader.tsx:64` | `color: colors.sale` pour l'onglet "Promos" alors que la couleur de marque est l'orange. |
| U7 | **Flag CDN externe** | `account.tsx:162`, `address/form.tsx:35` | `https://flagcdn.com/w80/` — dépendance réseau externe pour les drapeaux, pas de fallback offline. |

---

## 9. Problèmes Techniques

| # | Problème | Détail |
|---|----------|--------|
| T1 | **30+ usages de `any`** | Dans 16 fichiers — `_layout.tsx`, `login.tsx`, `otp.tsx`, `apiAdapter.ts`, `useCartData.ts`, `orderMachine.ts`, etc. |
| T2 | **Pas de pagination** | Les listes produits chargent tout d'un coup, pas de `useInfiniteQuery`. |
| T3 | **Pas de gestion d'images offline** | `expo-image` est utilisé mais sans fallback ni blurhash dans les listes. |
| T4 | **Pas de tests (1 seul fichier)** | Seul `checkoutService.test.ts` existe avec 4 tests. |
| T5 | **Pas de CI/CD** | Aucun fichier `.github/workflows` ou configuration CI. |
| T6 | **Pas de configuration Sentry/Monitoring** | `logger.ts` a `MONITORING_URL` mais pas de Sentry configuré. |
| T7 | **Catch vide dans la caméra** | `camera/index.tsx:42-43` — `catch { /* ignore */ }` |
| T8 | **Expo constants require non-optimal** | `mockData.ts:38` — `require("expo-constants")` devrait être un import statique. |
| T9 | **Pas de validation de formulaire avancée** | `address/form.tsx` a une validation basique (champs non vides), pas de validation de numéro de téléphone, code postal, etc. |
| T10 | **Pas de sécurité : tokens en clair dans AsyncStorage** | `apiAdapter.ts` stocke `auth.access` et `auth.refresh` sans chiffrement. |

---

## 10. Boutons sans Action (no-op)

| # | Écran | Élément | Ligne |
|---|-------|---------|-------|
| N1 | `payment/index.tsx` | Headset icon (actions) | 28, 44, 61 |
| N2 | `payment/index.tsx` | "Add card" button | 86 |
| N3 | `orders/[id].tsx` | "Track package" button | 84 |
| N4 | `orders/[id].tsx` | "Return request" button | 145 |
| N5 | `settings/index.tsx` | Clear cache row | 61 |
| N6 | `settings/index.tsx` | Privacy row | 62 |
| N7 | `settings/index.tsx` | Legal row | 63 |
| N8 | `messages/index.tsx` | Settings icon in header | 28 |
| N9 | `wallet/bonus.tsx` | Headset icon in header | 19 |
| N10 | `suggestions/index.tsx` | "Send suggestion" button | 29 |
| N11 | `product/[id].tsx` | Share icon | 89 |

---

## 11. Routes vers Placeholder

| # | Source | Route placeholder | Contexte |
|---|--------|-------------------|----------|
| H1 | `app/(tabs)/index.tsx:96` | `/placeholder?title=Offres%20group%C3%A9es&icon=gift` | "Voir tout" des offres groupées |
| H2 | `app/(tabs)/store.tsx:70` | `/placeholder?title=Économies%20de%20l%27été&icon=tag` | Bannière promo boutique |
| H3 | `app/(tabs)/account.tsx:188,261,287` | `/placeholder?title=...` | 3 bannières promo compte |
| H4 | `src/features/home/BannerCarousel.tsx:36` | `/placeholder?title=...` | Bannière carrousel accueil |
| H5 | `app/(tabs)/account.tsx:112` | `/placeholder?title=Avantages&icon=star` | Lien "Avantages" du wallet |

---

## 12. Recommandations Supabase

### Tables à créer

```sql
-- Authentication (géré par Supabase Auth)
-- users (géré par Supabase Auth)

-- Products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  images TEXT[],
  price_usd DECIMAL(10,2) NOT NULL,
  original_price_usd DECIMAL(10,2),
  rating DECIMAL(2,1) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  sold_count INTEGER DEFAULT 0,
  category_id UUID REFERENCES categories(id),
  discount_percent INTEGER,
  free_shipping BOOLEAN DEFAULT false,
  is_new_buyer_deal BOOLEAN DEFAULT false,
  is_choice BOOLEAN DEFAULT false,
  badges TEXT[],
  variants JSONB,
  specs JSONB,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name JSONB NOT NULL, -- { fr: "Automobile", en: "Automotive", ar: "..." }
  icon TEXT,
  image TEXT,
  parent_id UUID REFERENCES categories(id),
  sort_order INTEGER DEFAULT 0
);

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'unpaid',
  total_usd DECIMAL(10,2),
  shipping_usd DECIMAL(10,2),
  tax_usd DECIMAL(10,2),
  address_id UUID REFERENCES addresses(id),
  tracking_number TEXT,
  estimated_delivery DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Order Items
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) NOT NULL,
  product_id UUID REFERENCES products(id) NOT NULL,
  quantity INTEGER NOT NULL,
  price_usd DECIMAL(10,2) NOT NULL,
  variant_label TEXT
);

-- Addresses
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  country_code TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  dial_code TEXT,
  phone TEXT NOT NULL,
  street TEXT NOT NULL,
  apartment TEXT,
  province TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Payments Methods
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  type TEXT NOT NULL, -- 'card', 'mobile_money'
  provider TEXT, -- 'visa', 'mastercard', 'orange_money', etc.
  last_four TEXT,
  expiry_date TEXT,
  card_holder_name TEXT,
  phone_number TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Banners
CREATE TABLE banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title JSONB NOT NULL,
  subtitle JSONB,
  discount TEXT,
  gradient TEXT DEFAULT 'sun',
  image TEXT,
  link TEXT,
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
);

-- Feed Posts
CREATE TABLE feed_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image TEXT NOT NULL,
  title JSONB NOT NULL,
  author TEXT,
  author_avatar TEXT,
  likes INTEGER DEFAULT 0,
  duration TEXT,
  height INTEGER DEFAULT 300,
  active BOOLEAN DEFAULT true
);

-- RLS Policies
-- Chaque table doit avoir des politiques RLS :
-- - SELECT : tout le monde (produits, catégories, bannières) OU l'utilisateur (commandes, adresses)
-- - INSERT/UPDATE/DELETE : authentifié + propriétaire
```

---

## 13. Plan de Correction par Étapes

> **Note** : Chaque étape est indépendante et peut être réalisée séquentiellement.
> On commence par les fondations, puis on monte en complexité.

### Étape 1 — Fondations Supabase

**Objectif** : Installer Supabase et remplacer l'auth mockée par une vraie connexion.

| Tâche | Problèmes résolus |
|-------|-------------------|
| 1.1 Installer `@supabase/supabase-js` | — |
| 1.2 Créer `src/services/supabaseClient.ts` | — |
| 1.3 Créer les tables dans Supabase dashboard (SQL ci-dessus) | — |
| 1.4 Ajouter les clés API dans `.env` | — |
| 1.5 Remplacer `authStore` mock par Supabase Auth | C7, D6 |
| 1.6 Implémenter OAuth social (Google, Apple, Facebook) | A3, C5 |
| 1.7 Ajouter les icônes SVG Google, Apple, Facebook en couleur | C6, A2, U3 |
| 1.8 Ajouter social login sur Register | C5, A1 |
| 1.9 Remplacer forgot-password par Supabase Auth | A4, A5 |
| 1.10 Rendre OTP paramétrable | A6 |

**Fichiers impactés** : `src/services/authService.ts`, `src/stores/authStore.ts`, `app/auth/login.tsx`, `app/auth/register.tsx`, `app/auth/otp.tsx`, `app/auth/forgot-password.tsx`, `app/auth/forgot-password-sent.tsx`, `app/auth/otp-sent.tsx`

---

### Étape 2 — Paiement & Checkout

**Objectif** : Rendre le flux de paiement fonctionnel avec formulaire carte + mobile money.

| Tâche | Problèmes résolus |
|-------|-------------------|
| 2.1 Créer l'écran formulaire coordonnées bancaires | C2, M1, P3 |
| 2.2 Ajouter saisie numéro téléphone pour Mobile Money | M3, P4 |
| 2.3 Implémenter vrai traitement paiement (Flutterwave/Paystack/Stripe) | C1, P1 |
| 2.4 Déplacer `clear()` après confirmation de paiement réussi | P2 |
| 2.5 Corriger `card brands` pour venir du backend | P6 |
| 2.6 Ajouter gestion d'erreur paiement (error, retry, cancel) | P7 |

**Fichiers impactés** : `app/checkout/payment.tsx`, `app/checkout/index.tsx`, `app/checkout/success.tsx`, `app/payment/index.tsx`, `src/data/payments.ts`

---

### Étape 3 — Commandes & Suivi

**Objectif** : Créer l'écran de suivi commande et connecter les boutons.

| Tâche | Problèmes résolus |
|-------|-------------------|
| 3.1 Créer l'écran de suivi commande avec timeline | C3, C4, M2, O1, O3 |
| 3.2 Implémenter "Return request" | O2 |
| 3.3 Remplacer `ordersService` mock par Supabase | O7, D5 |
| 3.4 Remplacer `toLocaleDateString('fr-FR')` par i18n | O4 |
| 3.5 Remplacer pluralisation française par i18n | O5 |
| 3.6 Remplacer `$(value)` par `price(value)` | O6 |

**Fichiers impactés** : `app/orders/[id].tsx`, `app/orders/index.tsx`, `app/checkout/success.tsx`, `src/services/orderService.ts`

---

### Étape 4 — Données Réelles (Produits, Catégories, Bannières)

**Objectif** : Migrer toutes les données mockées vers Supabase.

| Tâche | Problèmes résolus |
|-------|-------------------|
| 4.1 Créer les produits dans Supabase + remplacer `data/products.ts` | D1 |
| 4.2 Créer les catégories dans Supabase + remplacer `data/categories.ts` | D2 |
| 4.3 Créer les bannières dans Supabase + remplacer `data/banners.ts` | D4 |
| 4.4 Créer les feed posts dans Supabase + remplacer `data/banners.ts` | D3 |
| 4.5 Migrer les images picsum vers Supabase Storage | D7 |
| 4.6 Remplacer TRENDING/HISTORY hardcodés par des vraies données | D8 |
| 4.7 Remplacer DISCOVER/RECO hardcodés | D9 |
| 4.8 Remplacer OLDER messages | D10 |
| 4.9 Remplacer AVATARS hardcodés | D11 |
| 4.10 Remplacer TABS/FOOTER hardcodés | D12 |
| 4.11 Remplacer avis produits hardcodés | D13 |
| 4.12 Remplacer badge notification "13" hardcodé | D14 |
| 4.13 Remplacer wallet à zéro | D15 |

**Fichiers impactés** : `src/data/products.ts`, `src/data/categories.ts`, `src/data/banners.ts`, `src/services/catalogService.ts`, `src/services/contentService.ts`, `app/search/index.tsx`, `app/stores/index.tsx`, `app/messages/index.tsx`, `app/profile/index.tsx`, `app/coupons/index.tsx`, `app/product/[id].tsx`, `app/(tabs)/feed.tsx`, `app/(tabs)/account.tsx`, `app/wallet/bonus.tsx`, `app/wallet/savings.tsx`

---

### Étape 5 — Internationalisation (i18n)

**Objectif** : Couvrir 100% des textes avec `t()` et corriger les locales.

| Tâche | Problèmes résolus |
|-------|-------------------|
| 5.1 Ajouter les 7 clés i18n manquantes dans les 3 locales | I1, C8 |
| 5.2 Remplacer les hardcoded French dans `login.tsx` (12+) | I2 |
| 5.3 Remplacer les hardcoded French dans `otp.tsx` (6) | I2 |
| 5.4 Remplacer les hardcoded French dans `address/index.tsx` (6) | I2, I7 |
| 5.5 Remplacer les hardcoded French dans `address/form.tsx` (15) | I2, I7 |
| 5.6 Remplacer les hardcoded French dans `account.tsx` (6) | I2 |
| 5.7 Remplacer les hardcoded French dans `orders/[id].tsx` (4) | I2 |
| 5.8 Internationaliser les sous-catégories | I3 |
| 5.9 Compléter ar.json (footer manquant) | I4 |
| 5.10 Corriger guillemets dans en.json | I5 |
| 5.11 Ajouter test automatisé i18n | I6 |

**Fichiers impactés** : `src/locales/fr.json`, `src/locales/en.json`, `src/locales/ar.json`, `app/auth/login.tsx`, `app/auth/otp.tsx`, `app/address/index.tsx`, `app/address/form.tsx`, `app/(tabs)/account.tsx`, `app/orders/[id].tsx`, `app/orders/index.tsx`, `src/data/categories.ts`

---

### Étape 6 — UI Fixes & Design

**Objectif** : Corriger les incohérences visuelles et améliorer le polish.

| Tâche | Problèmes résolus |
|-------|-------------------|
| 6.1 Fixer le rendu masonry du feed (hauteurs cohérentes) | U1 |
| 6.2 Remplacer paddingBottom fixe par safe area insets | U2 |
| 6.3 Remplacer les icônes sociales génériques par SVG marques | C6, U3, A2 |
| 6.4 Corriger la couleur du bouton Follow | U5 |
| 6.5 Corriger la couleur du tab Promos | U6 |
| 6.6 Remplacer les flag CDN par SVG inline ou Supabase Storage | U7 |
| 6.7 Améliorer l'écran liste de souhaits (fonctionnalités manquantes) | M5 |

**Fichiers impactés** : `app/(tabs)/feed.tsx`, `src/features/home/HomeHeader.tsx`, `app/(tabs)/account.tsx`, `app/address/form.tsx`, `app/wishlist/index.tsx`, `app/auth/login.tsx`, `app/checkout/index.tsx`, `app/product/[id].tsx`, `app/(tabs)/cart.tsx`

---

### Étape 7 — Technical Debt

**Objectif** : Assainir le code, ajouter les tests, sécuriser les données.

| Tâche | Problèmes résolus |
|-------|-------------------|
| 7.1 Remplacer tous les `any` par des types stricts (30+ dans 16 fichiers) | T1 |
| 7.2 Ajouter la pagination (useInfiniteQuery) | T2 |
| 7.3 Ajouter fallback images offline (blurhash) | T3 |
| 7.4 Implémenter les 11 boutons no-op | N1-N11 |
| 7.5 Ajouter Sentry pour le monitoring | T6 |
| 7.6 Sécuriser AsyncStorage (expo-secure-store) | T10 |
| 7.7 Corriger le catch vide de la caméra | T7 |
| 7.8 Remplacer `require()` par import statique | T8 |
| 7.9 Ajouter validation avancée des formulaires (phone, postal code) | T9 |
| 7.10 Remplacer les 5 routes placeholder par de vraies pages | H1-H5 |

**Fichiers impactés** : Multiples fichiers (16+ pour les `any`, 11 pour les no-op, 5 pour les placeholders)

---

### Étape 8 — Tests & CI/CD

**Objectif** : Mettre en place une pipeline de qualité.

| Tâche | Problèmes résolus |
|-------|-------------------|
| 8.1 Ajouter des tests Vitest pour tous les services | T4 |
| 8.2 Ajouter un test i18n cross-locale | I6 |
| 8.3 Configurer GitHub Actions (lint, typecheck, test) | T5 |
| 8.4 Configurer EAS Build pour les déploiements | — |

**Fichiers impactés** : `.github/workflows/ci.yml`, `vitest.config.ts`, fichiers de test

---

### Résumé des Métriques d'Audit

| Catégorie | Nombre | Détail |
|-----------|--------|--------|
| Problèmes critiques | 8 | C1-C8 |
| Écrans manquants | 6 | M1-M6 |
| Problèmes auth | 6 | A1-A6 |
| Problèmes checkout/paiement | 8 | P1-P8 |
| Problèmes commandes/suivi | 7 | O1-O7 |
| Problèmes i18n | 7 | I1-I7 |
| Problèmes mock/data | 15 | D1-D15 |
| Problèmes UI/design | 7 | U1-U7 |
| Problèmes techniques | 10 | T1-T10 |
| Boutons no-op | 11 | N1-N11 |
| Routes vers placeholder | 5 | H1-H5 |
| Usages de `any` | 30+ | 16 fichiers |
| Hardcoded French strings | 80+ | 20+ fichiers |
| URLs picsum | 19+ | 7+ fichiers |
| Fichiers de test | 1 | checkoutService (4 tests) |
