# Audit Complet du Projet ExpressAfri

## Contexte
Audit réalisé le 2026-07-15 afin d'identifier tous les manquants, incohérences et points à corriger avant la connexion à Supabase et le passage en production.

---

## 1. Inventaire des Écrans

### ✅ Écrans Existants (Partiellement Fonctionnels)
| Chemin                                 | Description                                 | État                              |
|----------------------------------------|---------------------------------------------|-----------------------------------|
| `app/auth/login.tsx`                   | Connexion (email/phone + OTP)               | Fonctionnel (mock)                |
| `app/auth/register.tsx`                | Inscription                                 | Fonctionnel (mock)                |
| `app/auth/otp.tsx`                     | Vérification OTP                            | Fonctionnel (mock)                |
| `app/auth/forgot-password.tsx`         | Mot de passe oublié                         | Présent (à vérifier)              |
| `app/(tabs)/index.tsx`                 | Accueil (home)                              | Présent                           |
| `app/(tabs)/feed.tsx`                  | Feed social                                 | Présent (dimensions incohérentes) |
| `app/(tabs)/store.tsx`                 | Liste des boutiques                         | Présent                           |
| `app/(tabs)/cart.tsx`                  | Panier                                      | Présent                           |
| `app/product/[id].tsx`                 | Fiche produit                               | Présent                           |
| `app/checkout/index.tsx`               | Checkout (sélection adresse)                | Présent                           |
| `app/checkout/payment.tsx`             | Sélection méthode de paiement               | Présent (mais pas de saisie CB)   |
| `app/checkout/success.tsx`             | Page succès commande                        | Présent                           |
| `app/orders/index.tsx`                 | Historique commandes                        | Présent                           |
| `app/orders/[id].tsx`                  | Détail d'une commande                       | Présent                           |
| `app/profile/index.tsx`                | Profil utilisateur                          | Présent (limité)                  |
| `app/settings/index.tsx`               | Paramètres                                  | Présent                           |
| `app/address/form.tsx` & `index.tsx`   | Gestion adresse                             | Présent                           |
| `app/wallet/*`                         | Portefeuille (bonus, épargne)               | Présent                           |
| `app/messages/index.tsx`               | Messagerie                                  | Présent                           |
| `app/coupons/index.tsx`                | Coupons                                     | Présent                           |
| `app/suggestions/index.tsx`            | Suggestions                                 | Présent                           |
| `app/onboarding.tsx`                   | Onboarding                                  | Présent                           |
| `app/camera/index.tsx`                 | Recherche visuelle                          | Présent                           |

### ❌ Écrans Manquants / Incomplets
| Écran Manquant                     | Description                                      | Impact | Priorité |
|------------------------------------|--------------------------------------------------|--------|----------|
| **Paiement bancaire**              | Saisie coordonnées carte (numero, date, CVV)      | Bloquant pour flux paiement réel | **Critique** |
| **Suivi de commande détaillé**     | Page montrant statut livraison, tracking, historique | Essentiel UX post-achat | **Élevée** |
| **Profil éditable**                | Modification nom, email, téléphone, avatar        | Nécessaire pour personnalisation | **Moyenne** |
| **Gestion méthodes de paiement**   | Ajout/suppression de cartes, mobile money, etc.   | Complémentaire au paiement | **Moyenne** |
| **Historique détaillé wallet**     | Transactions bonus/épargne                       | Optionnel mais utile | **Faible** |
| **Page aide / FAQ**                | Support utilisateur                              | Optionnel | **Faible** |

---

## 2. Problèmes Techniques Identifiés

### 2.1 Authentification & Social Login
- **Icônes sociales** : Utilisation d'icônes génériques (`globe`, `phone`, `message`) au lieu des logos officiels (Google, Apple, Facebook) en couleur.
- **Flux social** : Les fonctions `socialSignIn` créent un utilisateur factuel (`user@provider.com`) sans appel réel au provider OAuth.
- **Sécurité tokens** : Tokens stockés en AsyncStorage via `apiAdapter`; pas d'intégration réelle avec Supabase Auth.

### 2.2 Gestion des Données (Mock)
- **Toutes les données** (produits, catégories, bannières, commandes) proviennent de `src/features/mock/mockData.ts`.
- **Pas de pagination** : Les listes chargent tout en mémoire.
- **Pas de filtrage serveur** : Recherche effectuée côté client sur dataset mock.
- **Types statiques** : Les types TypeScript (`src/types/*`) ne reflètent pas forcément le schéma Supabase futur.

### 2.3 Flux de Paiement
- **`payment.tsx`** ne collecte aucune information de carte bancaire ; il ne fait que sélectionner une méthode préexistante.
- **Aucun formulaire de saisie CB** : numéro, date d'expiration, CVV, titulaire.
- **Pas de intégration avec un provider de paiement réel** (Stripe, PayPal, Mobile Money API).
- **Confirmation de commande** : Redirige directement vers `/checkout/success` sans appel backend de validation.

### 2.4 Incohérences UI/UX
- **Feed item dimensions** : Les cartes du feed ont des hauteurs variables (`FeedPost.height`), provoquant un affichage irrégulier.
- **Espacements incohérents** : Certains écrans utilisent des paddings marginaux différents (ex: `spacing.lg` vs `spacing.md`).
- **Typographie non uniforme** : Certaines tailles de police utilisent des valeurs absolues au lieu des échelles du design system (`fontSize`).
- **Accessibilité** : Peu de `accessibilityLabel` sur les icônes décoratives ; certains champs manquent de labels explicites.

### 2.5 Navigation & Routing
- **Redirections après actions** : Plusieurs flux utilisent `router.replace("/")` au lieu d'une navigation plus précise (ex: après OTP succès, on devrait aller vers le profil ou home selon contexte).
- **Gestion des états de chargement** : Inconsistante ; certains écrans montrent un `ActivityIndicator`, d'autres un `StatusState`, d'autres rien.

---

## 3. Analyse des Données Mock vs Besoins Réels Supabase

| Donnée Mock         | Champs Principaux                           | Nécessaire Supabase                               | Action                                      |
|---------------------|---------------------------------------------|---------------------------------------------------|---------------------------------------------|
| `products.ts`       | id, title, images, priceUsd, rating, etc.   | Table `products` avec mêmes champs + `stock`, `sku`, `created_at` | Créer migration SQL, remplacer mock par service Supabase |
| `categories.ts`     | id, name, icon, image, children             | Table `categories` (self-referencing)             | Idem                                        |
| `banners.ts`        | id, title, subtitle, discount, gradient, image | Table `banners`                                   | Idem                                        |
| `orders.ts` (mock)  | id, items[], status, totalUsd, etc.         | Table `orders` + `order_items` (relation)         | Normaliser schéma, créer foreign keys        |
| `users` (auth)      | name, email, phone, avatar, etc.            | Supabase Auth + table `profiles` étendue          | Utiliser Supabase Auth, stocker métadonnées dans `profiles` |
| `payment methods`   | liste statique dans `usePaymentMethods`     | Table `payment_methods` liée à `users`            | Créer table, permettre ajout/suppression    |
| `cart`              | Zustand store local                         | Optionnel : sauvegarder en DB pour récup cross-device | Peut rester local avec sync périodique       |

**Remarque** : Le fichier `src/services/supabase.ts` existe apparemment mais n’a pas été lu (peut être vide ou non utilisé). Il faudra l’implémenter réellement.

---

## 4. Plan de Correction Priorisé (Étapes)

### 🚀 Étape 1 – Corrections Rapides (< 1 jour)
| Action                                 | Fichiers concernés                     | Détails |
|----------------------------------------|----------------------------------------|---------|
| Remplacer icônes sociales génériques   | `app/auth/login.tsx` (SocialButton)    | Importer SVG officiels ou utiliser `react-native-vector-icons` avec noms corrects (`logo-google`, `logo-apple`, `logo-facebook`). |
| Uniformiser accessibilité labels       | Tous les écrans                        | Ajouter `accessibilityLabel` descriptif sur icônes, champs, boutons. |
| Harmoniser espacements & paddings      | Design system (`src/design-system/spacing.ts`) + usage | S’assurer que tous les écrans utilisent les mêmes valeurs (`spacing.lg`, `spacing.md`, etc.). |
| Corriger dimensions feed               | `app/(tabs)/feed.tsx` + composant `PostCard` | Fixer hauteur minimale (ex: 200px) ou utiliser ratio d’image constant (16:9). |
| Ajouter placeholder de saisie CB       | Nouveau écran `app/checkout/bank-card.tsx` | Créer formulaire avec champs : numéro, date, CVV, titulaire ; intégrer validation Luge. |

### 🛠️ Étape 2 – Intégration Supabase (1-2 semaines)
| Action                                 | Fichiers concernés                     | Détails |
|----------------------------------------|----------------------------------------|---------|
| Mettre en place Supabase client        | `src/services/supabase.ts`             | Initialiser avec URL/KEY anon, créer fonctions helper (`fetchProducts`, `createOrder`, etc.). |
| Migrer produits/categories/bannières   | Services `catalogService.ts`, `contentService.ts` | Remplacer appels mock par requêtes Supabase (`select * from products`). |
| Authentification Supabase              | `src/services/authService.ts` + stores | Utiliser `supabase.auth.signInWithOAuth`, `signUp`, `signOut`. Stocker session dans Supabase, pas uniquement AsyncStorage. |
| Gestion des commandes                  | `src/services/orderService.ts`         | Créer endpoint (fonction Edge) ou appeler directement Supabase `insert into orders`. |
| Paiement réel                          | Nouvelle integration (Stripe/Mobile Money) | Créer service paiement, webhook pour confirmation, mise à jour statut commande. |
| Synchronisation panier                 | `src/store/cartStore.ts`               | Optionnel : sauvegarder panier en DB (`user_id`, `items`) pour récupération cross-device. |

### 🎨 Étape 3 – Améliorations UX & Fonctionnalités (1 semaine)
| Action                                 | Fichiers concernés                     | Détails |
|----------------------------------------|----------------------------------------|---------|
| Écran paiement bancaire complet        | `app/checkout/bank-card.tsx` + validation | Ajouter logique d’envoi au provider, gestion erreurs, affichage succès/échec. |
| Écran suivi de commande détaillé       | `app/tracking/order.tsx` (à créer)     | Afficher statut, localisation (map si disponible), historique événements, bouton "Contacter support". |
| Profil éditable                        | `app/profile/edit.tsx`                 | Formulaire pour mettre à jour nom, email, téléphone, avatar (upload image via Supabase Storage). |
| Gestion méthodes de paiement           | `app/wallet/payment-methods.tsx`       | Liste, ajout (via formulaire similaire à CB ou mobile money), suppression. |
| Page aide / FAQ                        | `app/help/index.tsx`                   | Statique ou tiré depuis Supabase table `faq`. |
| Améliorer animations & transitions     | `app/_layout.tsx` + screens            | Harmoniser animations (`slide_from_right`, `fade`), éviter sauts de layout. |

### 🧪 Étape 4 – Tests & Qualité (en continu)
| Action                                 | Détails |
|----------------------------------------|---------|
| Écrire tests unitaires pour services Supabase | Utiliser Vitest + mock Supabase. |
| Tests e2e (Cypress/Detox)             | Flux authentification → achat → suivi. |
| Audit accessibilité (axe core)        | Vérifier contraste, tailles tactiles, lecteur d’écran. |
| Mesure performance (Flipper)          | Temps de rendu, nombre de requêtes, taille bundle. |
| Revue de sécurité                     | Stockage tokens, validation inputs, CORS, rate limiting. |

---

## 5. Livrables à Générer dans le Dossier Doc

1. **`audit_expressafri.md`** ← ce fichier (récapitulatif complet).  
2. **`plan_correction_etape1.md`** – Détails étape 1 avec sous-tâches et estimations.  
3. **`modele_donnees_supabase.sql`** – Schéma proposé (tables, clés étrangères, index).  
4. **`guide_integration_supabase.md** – Étapes pour configurer le client, migrer les mocks, gérer l’auth.  
5. **`maquette_ecrans_manquants.md** – Wireframes ou description des écrans à créer (paiement CB, suivi commande, profil éditable).  
6. **`checklist_preprod.md** – Liste de vérifications avant déploiement (tests, performance, sécurité).

---

## 6. Prochaine Action Immédiate

**Lancer l’étape 1** :  
- Créer la branche `fix/social-login-icons`.  
- Mettre à jour `SocialButton` dans `login.tsx` avec les icônes officielles.  
- Ajouter `accessibilityLabel` sur tous les icônes et champs du formulaire de connexion.  
- Uniformiser les paddings dans le fichier en utilisant les constantes du design system.  

Une fois cette première correction revue et validée, nous passerons à la suivante.

---

> **Note** : Cet audit doit être considéré comme un document vivant. À mesure que nous avançons dans les corrections, nous mettrons à jour les sections complétées et ajouterons de nouvelles découvertes.

--- 

*Fin du document.*