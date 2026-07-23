# AfriExpress — Feuille de route & Mémoire du projet

> **Application e-commerce mono-vendeur** — Vente de produits de Chine vers l'Afrique.
> Multi-devise · Multi-langue · Design premium inspiré d'AliExpress, amélioré et personnalisé.
> Stack : **Expo SDK 57 + React Native + TypeScript + expo-router**.

Ce document est la **source de vérité** du projet. Il est mis à jour à chaque étape.
On travaille **frontend d'abord** (le backend viendra ensuite ; la couche `services/` est mockée mais prête à être branchée).

---

## 1. Identité de marque

| Élément | Valeur |
|---|---|
| **Nom** | **AfriExpress** |
| **Baseline** | « La Chine à votre porte » / « China to your door » |
| **Logo** | Wordmark + étoile/soleil du Niger (SVG) |
| **Positionnement** | AliExpress africanisé, premium, épuré, mono-vendeur |

### Couleurs — Drapeau du Niger
Le drapeau du Niger : **Orange** (haut), **Blanc** (milieu), **Vert** (bas), **soleil orange** au centre.

| Token | Hex | Usage |
|---|---|---|
| `brand.orange` (primaire) | `#E8590C` | CTA, prix, onglet actif, accents |
| `brand.orangeSun` | `#FF8A00` | Dégradés, badges promo, halo soleil |
| `brand.green` (secondaire) | `#0DB02B` | Succès, livraison gratuite, validations |
| `brand.greenDark` | `#0A8F22` | États pressés du vert |
| `neutral.ink` | `#1A1A1A` | Texte principal |
| `neutral.slate` | `#6B7280` | Texte secondaire |
| `neutral.line` | `#EEEEEE` | Séparateurs |
| `neutral.bg` | `#F5F5F5` | Fond des sections |
| `surface` | `#FFFFFF` | Cartes, fonds |
| `sale.red` | `#FA2A2D` | Prix barrés / urgence (usage limité) |

Dégradé signature : `#FF8A00 → #E8590C` (soleil du Niger).

### Typographie
- **Titres** : Inter / SF Pro (bold, tight). Grands titres de section à la AliExpress.
- **Corps** : Inter Regular/Medium.
- **Prix** : Inter ExtraBold, couleur `brand.orange`.
- Échelle : 11 / 12 / 14 / 16 / 18 / 22 / 28 / 34.

### Principes de design
Épuré, aéré, premium. Coins arrondis (12–16px cartes, 24px pilules). Ombres douces.
**Icônes SVG professionnelles uniquement — AUCUN emoji.** Micro-animations (Reanimated).

---

## 2. Stack technique

| Domaine | Choix | Raison |
|---|---|---|
| Framework | Expo SDK 57, RN, TypeScript | Demandé |
| Navigation | **expo-router** (file-based) | Scalabilité, deep-linking, modularité |
| État global | **Zustand** | Léger, simple, performant (cart, auth, settings, wallet) |
| Data / cache | **@tanstack/react-query** | Couche data prête pour backend, cache, retries |
| i18n | **i18next + react-i18next + expo-localization** | FR/EN/AR + RTL |
| Icônes | **react-native-svg** (set maison) | SVG pro, zéro emoji |
| Listes | **@shopify/flash-list** | Grilles produits performantes |
| Images | **expo-image** | Cache, blur-hash, perf |
| Animations | **react-native-reanimated** + gesture-handler | Transitions premium |
| Stockage | **@react-native-async-storage/async-storage** | Persistance panier/langue/devise |
| Bottom sheets | **@gorhom/bottom-sheet** | Modals variantes, filtres, sélecteurs |

---

## 3. Architecture des dossiers (modulaire, feature-based)

```
AfriExpress/
├── app/                        # Routes expo-router
│   ├── _layout.tsx             # Root: providers (i18n, query, theme, gesture)
│   ├── (tabs)/
│   │   ├── _layout.tsx         # Barre d'onglets custom (SVG)
│   │   ├── index.tsx           # Accueil
│   │   ├── store.tsx           # Boutique (catégories)
│   │   ├── feed.tsx            # Fil d'actualité
│   │   ├── cart.tsx            # Panier
│   │   └── account.tsx         # Compte
│   ├── product/[id].tsx        # Fiche produit
│   ├── category/[id].tsx       # Résultats catégorie
│   ├── search/
│   │   ├── index.tsx           # Recherche + suggestions
│   │   └── results.tsx         # Résultats + filtres
│   ├── checkout/
│   │   ├── index.tsx           # Récap commande + adresse
│   │   ├── payment.tsx         # Choix paiement
│   │   └── success.tsx         # Confirmation
│   ├── orders/                 # Mes commandes (statuts)
│   ├── wallet/                 # Portefeuille, cagnotte, coupons
│   ├── messages/               # Messagerie (Commandes/Promos)
│   ├── auth/                   # Login / register / OTP
│   └── settings/               # Langue, devise, pays, thème
├── src/
│   ├── design-system/          # tokens.ts, theme.ts, typography.ts, spacing.ts
│   ├── components/             # UI partagé (Button, ProductCard, Price, Rating, Badge, Chip, Header, SearchBar, SectionHeader, CountdownTimer, QuantityStepper, EmptyState, Skeleton...)
│   ├── icons/                  # Icônes SVG (index.tsx + <Icon name=.../>)
│   ├── features/
│   │   ├── home/               # bannière, rail catégories, offres groupées, deal du jour
│   │   ├── product/            # galerie, variantes, avis, specs
│   │   ├── cart/               # ligne panier, résumé, livraison gratuite
│   │   ├── checkout/           # adresse, paiement, récap
│   │   ├── feed/               # masonry, carte vidéo/produit
│   │   ├── account/            # grille actions, commandes
│   │   └── search/             # barre, suggestions, filtres
│   ├── i18n/                   # index.ts + locales/{fr,en,ar}.json
│   ├── store/                  # cartStore, authStore, settingsStore, walletStore, wishlistStore
│   ├── services/               # api mock (products, categories, orders, feed) — remplaçable par backend
│   ├── data/                   # mocks JSON (produits, catégories, bannières)
│   ├── hooks/                  # useCurrency, useTranslation wrap, useProducts...
│   ├── utils/                  # format prix/devise, dates, rtl
│   └── types/                  # Product, Category, CartItem, Order, User...
├── assets/                     # images, fonts, lottie
├── app.json / app.config.ts
├── package.json
├── tsconfig.json
└── ROADMAP.md                  # ← ce fichier
```

---

## 4. Écrans & fonctionnalités (parité AliExpress + améliorations)

### 4.1 Accueil (`index`)
- Header : logo AfriExpress + cloche notifications (badge).
- **SearchBar** avec icône caméra (recherche visuelle) + bouton recherche.
- Onglets sous-barre : « Accueil » / « Promos ».
- **Bannière carrousel** (auto-play, dégradé soleil) + countdown promo.
- **Rail catégories rondes** scrollable (Jetons→Bonus, Match, Marque+, Déstockage, Boutiques…).
- **Offres groupées** (bundle, badge « -X sur 3 articles »).
- **Deal du Jour** avec bandeau « % réduction à durée limitée » + timer.
- **Grille produits infinie** (FlashList) : image, prix orange, ventes, note, badges.
- Pull-to-refresh, skeletons.

### 4.2 Boutique (`store`)
- Sidebar verticale des catégories (Auto, Électroménager, Vêtements F/H, Meubles, Jouets, Chaussures, Beauté, Bijoux…).
- Panneau droit : sous-catégories en grille avec vignettes.
- Onglet « Pour vous » / « Recommandé ».

### 4.3 Fil d'actualité (`feed`)
- Onglets « Inspiration » / « Abonnements ».
- **Masonry** (2 colonnes) vidéos/produits, durée, auteur, likes.
- Bouton central « + » (créer/partager) dans la tabbar.
- Suggestions à suivre, bouton « Plus d'inspiration ».

### 4.4 Fiche produit (`product/[id]`)
- Galerie swipe + vidéo, indicateur.
- Prix, prix barré, badge réduction, ventes, note + nb avis.
- Sélecteur **variantes** (couleur, taille) en bottom sheet.
- Livraison (pays, délai, gratuité), garanties (retour, protection acheteur).
- Avis clients (photos, notes, filtres).
- Specs, description, produits liés.
- Barre d'action fixe : Favori · Panier · **Acheter maintenant**.

### 4.5 Recherche (`search`)
- Historique, tendances, suggestions instantanées.
- Recherche visuelle (caméra) — UI.
- Résultats + **filtres** (prix, note, livraison, catégorie, tri) en bottom sheet.

### 4.6 Panier (`cart`)
- Lignes produit (image, variante, quantité stepper, prix).
- Sélection multiple, favoris, suppression (swipe).
- Barre progression **livraison gratuite**.
- Coupons applicables, sous-total, bouton paiement collant.
- Section « Vous aimerez aussi ».

### 4.7 Checkout (`checkout`)
- Adresse de livraison (pays africain, sélecteur).
- Récap articles + frais + taxes + total dans la devise choisie.
- **Choix paiement** : Mobile Money (Orange Money, MTN MoMo, Moov, Wave), Carte (Visa/MC), Paiement à la livraison, Portefeuille AfriExpress.
- Écran succès + suivi commande.

### 4.8 Compte (`account`)
- En-tête profil (avatar, nom, drapeau pays, réglages, notifications badge).
- **Mes commandes** : Non-payées, En attente d'expédition, Expédiées, Avis, Retour.
- Grille : Historique, Favoris, Coupons, Boutiques suivies.
- Bloc promo + Offres groupées + Pièces/bonus.
- Portefeuille : Paiement, Bonus, Cagnotte, Avantages, Service client.
- « Vous aimerez aussi ».

### 4.9 Messages (`messages`)
- Catégories : Commandes, Promos.
- Anciens messages (notifications système).

### 4.10 Auth (`auth`)
- Connexion téléphone + OTP, e-mail, social (UI).
- Inscription, mot de passe oublié.

### 4.11 Réglages (`settings`)
- **Langue** (FR/EN/AR + bascule RTL à chaud).
- **Devise** (XOF/USD/NGN/EUR).
- Pays/région, thème, notifications, confidentialité.

### 4.12 Modals & bottom sheets transverses
- **Modal promo d'accueil** (pop-up « Nouvel acheteur », comme les captures).
- Sélecteur variantes, filtres, sélecteur langue/devise/pays.
- Coupon appliqué, confirmation suppression, partage, avis photo.

---

## 5. Systèmes transverses

### Multi-langue (i18n)
- FR (défaut), EN, AR. Namespaces par feature. Détection `expo-localization`.
- **RTL** : bascule `I18nManager` + styles logiques (start/end). Persistée.

### Multi-devise
- Devise par défaut **XOF (FCFA)**. Table de taux (mock, backend plus tard).
- `formatCurrency(amount, currency, locale)` — FCFA sans décimales, symbole selon locale.
- Sélecteur global, persistance, recalcul de tous les prix.

### Paiement (UI d'abord)
- Composants de méthode réutilisables, logos SVG, formulaires validés.
- Abstraction `PaymentProvider` prête pour Flutterwave/Paystack/Stripe/Mobile Money APIs.

### État & persistance
- Zustand + AsyncStorage : panier, favoris, langue, devise, pays, auth token, wallet.

### Performance & scalabilité
- FlashList partout, expo-image, memoization, lazy routes, code-splitting par feature.
- Couche `services/` isolée → branchement backend sans toucher l'UI.

---

## 6. Phases de livraison

- [x] **P0 — Fondations** : scaffold Expo SDK 57, expo-router, TS, design-system (couleurs Niger), tokens, thème, providers. ✅
- [x] **P1 — Icônes & UI kit** : set d'icônes SVG (60+), composants partagés (Button, ProductCard, Price, Rating, SearchBar, ScreenHeader, Badge, Countdown, QuantityStepper, EmptyState, SectionHeader). ✅
- [x] **P2 — i18n & devise** : FR/EN/AR + RTL, sélecteurs langue/devise/pays (écran Réglages), formatage `formatPrice`. ✅
- [x] **P3 — Navigation & Accueil** : tabbar custom SVG + écran Accueil complet (bannière carrousel, rail raccourcis, offres groupées, deal du jour + countdown, grille FlashList, modal promo). ✅
- [x] **P4 — Boutique & Recherche** : sidebar catégories + panneau, recherche (historique/tendances/résultats). ✅ *(filtres avancés à venir)*
- [x] **P5 — Fiche produit** : galerie swipe, variantes, garanties, specs, avis, similaires, barre d'action. ✅
- [x] **P6 — Panier & Checkout** : panier (sélection, quantités, livraison gratuite), adresse, paiements (Mobile Money + opérateurs, Carte, COD, Wallet), écran succès. ✅
- [x] **P7 — Compte** : profil, statuts commandes, grille raccourcis, wallet, suggestions. ✅ *(détail commandes à venir)*
- [x] **P8 — Fil d'actualité** : masonry 2 colonnes, Inspiration/Abonnements. ✅
- [x] **P9 — Messages & Réglages** : messagerie (canaux Commandes/Promos), réglages langue/devise/pays. ✅
- [x] **P10 — Auth & flux d'entrée** : Splash → **Onboarding** (3 slides) → **Login** (téléphone/email + OTP + social + invité) → **Inscription** → Accueil. Gate de redirection dans `app/_layout.tsx` (store `authStore` persisté). ✅
- [x] **P11 — Écrans commandes & favoris + branchement** : `/orders` (onglets par statut), `/wishlist`, `/placeholder` générique. Tous les boutons du Compte, « Voir tout », bannières et raccourcis pointent vers de vrais écrans. ✅
- [x] **P12 — Corrections retours utilisateur (test Expo Go)** : barre de recherche (flex), icône Paramètres redessinée, écran Réglages en liste + modales (langue/devise/pays/thème/notifs/déconnexion), Boutique refaite (bande d'accent fine, header sans chevauchement, panneau droit rempli). ✅
- [x] **P13 — Fondations avancées** : skeletons (Skeleton, SkeletonCard, SkeletonHome…), bottom sheets (@gorhom/bottom-sheet + wrapper `Sheet`), filtres recherche avancés (tri, catégorie, prix, note, livraison gratuite, promo), écran détail commandes (`app/orders/[id].tsx`), animations Reanimated (skeleton pulse + entrée cartes ProductCard), branchement backend préparé (`.env.example`, `EXPO_PUBLIC_*` vars, `app.json extra`). ✅
- [ ] **P14 — À venir** : QA multi-appareils, tests supplémentaires, dark mode automatique (système), animations complémentaires, pagination, notifications push.

**Statut courant : P0→P13 livrés et validés** (0 erreur TypeScript, architecture check OK, bundle Metro OK).

### Flux d'authentification
`authStore` (persisté) gère `hasOnboarded`, `isAuthenticated`, `isGuest`, `user`.
1er lancement → onboarding → login. L'utilisateur peut **continuer en invité** (browse libre) ; la connexion est proposée dans le Compte et requise plus tard pour finaliser. Déconnexion depuis Réglages.

### Comment lancer
```bash
npm install --legacy-peer-deps   # déjà fait
npx expo start                   # puis scanner le QR avec Expo Go, ou 'a' (Android) / 'i' (iOS) / 'w' (web)
```
> Note peer-deps : i18next demande TypeScript 5 alors que le projet est en TS 6 (sans impact) → toujours installer avec `--legacy-peer-deps`.

---

## 7. Conventions
- TypeScript strict, composants fonctionnels + hooks.
- Nommage : `PascalCase` composants, `camelCase` fonctions, `SCREAMING_SNAKE` constantes.
- Pas d'emoji dans l'UI — icônes SVG maison.
- Tout texte visible passe par i18n (`t('...')`).
- Tout prix passe par `formatCurrency`.
- Design tokens uniquement (jamais de hex en dur dans les écrans).
