# PLAN DE CORRECTIONS N°4 — ExpressAfri
> Rédigé le 18 juillet 2026 · Basé sur audit multi-agents (mobile + admin + API)

---

## Diagnostic — causes racines identifiées

| Problème constaté | Cause racine réelle |
|---|---|
| Changements/suppressions produits pas instantanés dans l'app | React Query : `staleTime` 5 min + prefetch unique au démarrage + **aucun** mécanisme de refetch (pas de pull-to-refresh, pas de focus-refetch, écrans jamais démontés) → les produits ne sont chargés qu'une fois par lancement d'app (`app/_layout.tsx:18-26,61-65`) |
| Produits supprimés dans l'admin qui reviennent au rechargement | La suppression **échoue en base** (contrainte FK : produit lié à `order_items`/`reviews`/`wishlist_items` sans cascade → Postgres refuse → API 500) mais l'admin **avale l'erreur** (pas de `onError` dans `useDeleteProduct.ts`) → illusion de succès |
| Images des méthodes de paiement absentes au checkout | L'API renvoie bien `logoUrl` (`mobile.service.ts:420`) mais le type mobile `PaymentMethod` **supprime le champ** et les écrans affichent des icônes génériques au lieu des images. En plus, l'admin stocke les logos en base64 data-URI (pas d'endpoint d'upload) |
| API 401 à la confirmation de commande | Le guard JWT **admin** est enregistré globalement (`app.module.ts:70-72`) et intercepte `POST /orders` : il valide le token contre la table **admins**, donc tout token client est rejeté avant même que le guard client s'exécute |
| Cartes produits de hauteurs inégales à l'accueil | `ProductCard.tsx` : titre sur 2 lignes sans `minHeight`, 3 éléments conditionnels (badge Choice, livraison gratuite, ligne nouveau client) → chaque carte a une hauteur différente |
| Bannières du compte non gérables par l'admin | Hardcodées dans `app/(tabs)/account.tsx:191-325`. Or un CMS bannières complet existe déjà (table + CRUD `/content/banners` + admin BannersTab + endpoint `/mobile/banners`) — il manque juste le screen `'account'` et le filtre par écran |
| Recherche photo factice | `setTimeout` 1,7 s, la photo n'est jamais envoyée (`app/camera/index.tsx:36-40`), aucun endpoint API |

**Décisions utilisateur** : suppression = archivage intelligent · recherche photo = MVP réel (endpoint backend, architecture prête pour un service de vision plus tard).

---

## PHASE 1 — Fraîcheur des données (le « instantané »)

### 1.1 Focus refetch (mobile)
`app/_layout.tsx` : brancher `focusManager` de React Query sur `AppState` → dès que l'app revient au premier plan, toutes les requêtes périmées se rafraîchissent automatiquement.

### 1.2 staleTime adapté par type de donnée
- Global : baisser à 60 s.
- `['products']`, `['product', id]`, `['banners']`, `['payment-methods']` : `staleTime: 30_000`.
- Supprimer le `staleTime: 5 min` du prefetch de démarrage.

### 1.3 Pull-to-refresh
Ajouter `RefreshControl` (tirer pour rafraîchir) sur : Accueil, Store, Compte, Commandes → `queryClient.invalidateQueries()` ciblé.

### 1.4 Refetch au focus des écrans
Sur les écrans produit/accueil : `useFocusEffect` → invalider `['products']` si périmé (les écrans Expo Router restent montés, sans ça ils ne se rafraîchissent jamais).

---

## PHASE 2 — Suppression produits fiable (admin + API)

### 2.1 API — archivage intelligent (`products.service.ts:110-116`)
- Le produit est référencé par des commandes/avis/retours → `status = 'archived'` (soft delete) et réponse `{ archived: true }`.
- Aucune référence → suppression définitive réelle (variants, images, wishlist_items, puis produit).
- Les endpoints mobiles filtrent déjà `status = 'active'` → un produit archivé disparaît de l'app.

### 2.2 Admin — visibilité des erreurs
- `useDeleteProduct.ts` : ajouter `onError` → toast/alerte visible.
- `AdminProductListPage.tsx` : message différencié « supprimé » vs « archivé (lié à des commandes) ».
- Liste admin : montrer les produits archivés avec un badge (filtre statut).

### 2.3 Seed protégé
`apps/api/src/seed.ts` : ajouter une confirmation (`--force` requis) pour éviter de réécraser la base par erreur — c'est lui qui réinsère les 12 produits démo.

---

## PHASE 3 — Checkout : images de paiement + erreur 401

### 3.1 Corriger le 401 (bloquant)
- `app.module.ts:70-72` : retirer le guard JWT admin global ; l'appliquer uniquement aux contrôleurs admin.
- `POST /orders` : protégé par `CustomerAuthGuard` (token client).
- Mobile : vérifier l'injection du header `Authorization` + refresh token sur 401 dans `apiAdapter`.

### 3.2 Images des méthodes de paiement
- Type mobile `PaymentMethod` : ajouter `logoUrl`.
- `app/checkout/payment.tsx` + `app/payment/index.tsx` : afficher `<Image source={{uri: logoUrl}}>` avec fallback icône si absent.
- Résolution d'URL : helper qui préfixe les chemins relatifs `/uploads/...` avec l'origine de l'API (sans `/api`).
- Admin : endpoint d'upload réel `POST /content/payment-methods/:id/logo` (FileInterceptor → `/uploads`), remplacer le stockage base64.

### 3.3 Bonus bug
`app/checkout/payment.tsx:59` : `method` hardcodé `"mobileMoney"` ne correspond à aucun code API → bouton Payer parfois inactif. Initialiser depuis la liste réelle.

---

## PHASE 4 — Cartes produits uniformes (accueil)

`src/components/ProductCard.tsx` :
- Titre : `numberOfLines={2}` **+ `minHeight` fixe équivalent à 2 lignes** → « Poulet » occupe la même hauteur qu'un nom long.
- Zones conditionnelles (badge, livraison gratuite, nouveau client) : hauteur réservée fixe ou suppression du décalage.
- Image : `aspectRatio` fixe.
- Résultat : toutes les cartes d'une rangée ont exactement la même hauteur ; vérifier « Deal du jour », « Recommandé pour vous », « Offre groupée ».

---

## PHASE 5 — Bannières du Compte pilotées par l'admin (CMS)

Le CMS bannières existe déjà — on l'étend au lieu de créer un nouveau système :
1. **API** : ajouter `'account'` (et un champ `screen`/`slot` si besoin) à l'enum du schéma bannières + migration ; `GET /mobile/banners?screen=account`.
2. **Admin** : dans BannersTab, sélecteur d'écran cible (Accueil / Compte / Store).
3. **Mobile** : `app/(tabs)/account.tsx` — remplacer les bannières hardcodées (« Économie de l'été », « S'épanouir », « Offre groupée bonus »...) par les données du CMS, avec fallback discret si vide.
4. **Seed** : insérer les bannières actuelles comme données CMS pour ne rien perdre visuellement.

---

## PHASE 6 — Recherche photo : MVP réel

1. **API** : `POST /mobile/search/by-image` (FileInterceptor) — reçoit la photo, la sauvegarde, renvoie des produits pertinents (heuristique : produits populaires/catégories principales). Interface `ImageSearchProvider` pour brancher un vrai service de vision plus tard.
2. **Mobile** : `app/camera/index.tsx` — remplacer le `setTimeout` par l'upload réel (multipart) + états chargement/erreur, afficher les résultats renvoyés.

---

## PHASE 7 — Vérification finale

- API : `npm run build` + démarrage sans erreur.
- Admin : build Vite OK.
- Mobile : `npx tsc --noEmit` + `npm run lint`.
- Tests manuels ciblés : modification produit admin → visible dans l'app après pull-to-refresh/retour au premier plan ; suppression produit lié à une commande → archivé + message admin ; checkout complet jusqu'à la confirmation de commande sans 401 ; images de paiement visibles ; bannières compte modifiables depuis l'admin.

---

## Ordre d'exécution

| # | Phase | Impact |
|---|---|---|
| 1 | Phase 3.1 — Fix 401 | Débloque les commandes (critique) |
| 2 | Phase 1 — Fraîcheur données | Le « instantané » demandé |
| 3 | Phase 2 — Suppression fiable | Fin des produits fantômes |
| 4 | Phase 3.2/3.3 — Images paiement | Checkout complet |
| 5 | Phase 4 — Cartes uniformes | Accueil propre |
| 6 | Phase 5 — Bannières CMS | Contrôle admin |
| 7 | Phase 6 — Recherche photo | MVP réel |
| 8 | Phase 7 — Vérifications | Qualité |
