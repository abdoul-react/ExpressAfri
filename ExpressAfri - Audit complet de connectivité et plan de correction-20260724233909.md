# ExpressAfri - Audit complet de connectivité et plan de correction

# ExpressAfri - Audit complet de connectivité et plan de correction
**Commit audité :** `9ecda19b8aac2b4d7734e85b1083ab3f0ce94569`

**Branche :** `main`

**Date :** 24 juillet 2026

**Périmètre :** Mobile Expo, Admin React/Vite, API NestJS, DataSources, écrans, recherche texte et visuelle, filtres, modales, catégories/sous-catégories, schémas Drizzle et migrations.

**Méthode :** audit statique du code réel et comparaison des routes déclarées aux appels frontend. Les checks CI du commit sont verts, mais cela prouve seulement que le build, le lint/typecheck et les tests configurés passent. Cela ne remplace pas un test E2E avec API, base et fichiers réellement démarrés.

* * *
## 1\. Résumé exécutif
Le commit `9ecda19` corrige plusieurs contrats, mais il ne rend pas encore tout le système synchrone. Les principales corrections ont ajouté des méthodes d’interface, alors que certains écrans continuent à appeler directement `apiAdapter` ou à utiliser des comportements locaux.
### Priorités immédiates

| Priorité | Sujet | État actuel |
| ---| ---| --- |
| P0 | Paiement mobile | La commande est créée, mais `initializePayment()` n’est toujours pas appelé dans `app/checkout/payment.tsx`. |
| P0 | Recherche visuelle | Le flux existe, mais l’URL doit être validée avec le préfixe global `/api`, l’algorithme backend est documenté comme heuristique/MVP et le fallback local masque les erreurs. |
| P0 | Synchronisation API mobile | `.env.example` indique `https://api.expressafri.com`, tandis que NestJS expose `setGlobalPrefix('api')`. Il faut confirmer si le reverse proxy ajoute `/api`. |
| P1 | Social login | `ApiAuthDataSource.socialLogin()` existe, mais `useAuth` ne l’expose pas et `login.tsx` affiche encore « bientôt disponible ». |
| P1 | Pays de livraison | `getShippingCountries()` existe, mais `app/address/form.tsx` utilise encore `COUNTRIES` localement. |
| P1 | Contrat DataSource | Like feed et suggestions ont des appels directs à `apiAdapter`; les nouvelles méthodes DataSource ne sont pas la source unique de vérité. |
| P1 | Catégories | L’Admin gère `parentId`, mais le message de suppression annonce que les sous-catégories seront supprimées alors que le backend les remet à la racine. |
| P2 | Données et UX | Plusieurs écrans gardent des mocks, placeholders, textes codés en dur, no-op et états incomplets. |

* * *
## 2\. Architecture et connectivité globale

```plain
flowchart LR
  M[Mobile Expo<br/>app/ + src/] --> MDS[DataSources API<br/>src/infrastructure/data-source/api]
  A[Admin React/Vite<br/>apps/admin/] --> ADS[DataSources API<br/>apps/admin/src/infrastructure/data-source/api]
  MDS --> BASE[API base URL]
  ADS --> BASE
  BASE --> PREFIX[/api global prefix]
  PREFIX --> C[NestJS Controllers]
  C --> S[Services métier]
  S --> D[Drizzle]
  D --> DB[(PostgreSQL)]
  S --> U[uploads]
  S --> PSP[PSP paiement]
  S --> P[Expo Push]
```

### Problèmes transverses
**CON-01, P0, préfixe API non confirmé**
*   `apps/api/src/main.ts` expose `app.setGlobalPrefix('api')`.
*   `.env.example` mobile expose `EXPO_PUBLIC_API_URL=https://api.expressafri.com`.
*   Le client mobile appelle des chemins comme `/mobile/products`, `/mobile/search/by-image` et `/payments/...`.
*   Sauf reverse proxy qui ajoute `/api`, les appels mobiles ciblent une URL différente des routes NestJS réelles.
*   Action : choisir une convention unique, idéalement `EXPO_PUBLIC_API_URL=https://api.expressafri.com/api`, puis tester toutes les routes depuis Android, iOS et Web.

**CON-02, P1, DataSources contournées**
*   `useToggleFeedLike()` appelle directement `apiAdapter` au lieu de `contentDataSource.toggleFeedLike()`.
*   `app/suggestions/index.tsx` appelle directement `apiAdapter.post()` au lieu de `submitSuggestion()` dans `checkoutApiService.ts`.
*   `app/checkout/payment.tsx` n’utilise pas `paymentDataSource.initializePayment()` malgré son ajout au commit.
*   Action : interdire les appels directs hors infrastructure via une règle ESLint ou un test d’architecture.

**CON-03, P1, absence de vraie validation runtime**
*   Les checks CI verts ne testent pas le parcours complet Mobile → API → PostgreSQL → PSP.
*   Action : ajouter une suite E2E avec API démarrée, base de test, seed, upload multipart et assertions de statut.

* * *
## 3\. Inventaire des écrans Mobile

| Écran | Fichier | Connexion observée | Problèmes à corriger |
| ---| ---| ---| --- |
| Onboarding | `app/onboarding.tsx` | Zustand local | Vérifier redirection, persistance et traduction de toutes les slides. |
| Accueil | `app/(tabs)/index.tsx` | produits, catégories, bannières, sections | Plusieurs liens peuvent aller vers `placeholder`; vérifier pagination et sections admin. |
| Boutique | `app/(tabs)/store.tsx` | catégories, sous-catégories, produits, settings CMS | Sous-catégories normalisées en simples chaînes; impossible d’ouvrir une sous-catégorie précise. |
| Feed | `app/(tabs)/feed.tsx` | feed, follows, messages, like | Like fonctionnel via hook direct, méthode DataSource inutilisée; vérifier rollback et compteur. |
| Panier | `app/(tabs)/cart.tsx` | Zustand/AsyncStorage | Aucun panier serveur; panier différent selon appareil, pas de verrouillage stock avant checkout. |
| Compte | `app/(tabs)/account.tsx` | profil, commandes, wallet, contenu | Badge et certaines données historiques encore potentiellement statiques; vérifier chaque raccourci. |
| Connexion | `app/auth/login.tsx` | login email, OTP | Social buttons toujours no-op fonctionnel: message « bientôt disponible ». |
| Inscription | `app/auth/register.tsx` | register client | Vérifier absence de social login et validation téléphone/email. |
| OTP | `app/auth/otp.tsx` | OTP verify | Longueur du code et gestion renvoi à vérifier; backend génère 6 chiffres, ancien écran documenté à 4. |
| OTP envoyé | `app/auth/otp-sent.tsx` | navigation | Vérifier déclaration Stack.Screen et retour vers OTP. |
| Mot de passe oublié | `app/auth/forgot-password.tsx` | password reset email | Pas de reset téléphone; vérifier écran de confirmation. |
| Reset envoyé | `app/auth/forgot-password-sent.tsx` | navigation | Vérifier déclaration Stack.Screen et traduction. |
| Recherche | `app/search/index.tsx` | produits + `useSearchTrending` + filtres | Recherche locale sur catalogue chargé; vérifier pagination, tri, prix, note et livraison. |
| Recherche visuelle | `app/camera/index.tsx` | POST multipart image | Fallback local masque les erreurs; URL API/préfixe à valider; backend MVP heuristique, pas reconnaissance visuelle robuste. |
| Catégorie | `app/category/[id].tsx` | produits par catégorie | Pas de pagination; catégorie inconnue et vide à tester. |
| Section | `app/section/[id].tsx` | vérifier route/API | Route présente, mais consommation `feed-sections/:id/products` à confirmer. |
| Produit | `app/product/[id].tsx` | détail produit | Avis encore à relier complètement côté Mobile; partage et variantes à tester. |
| Checkout récapitulatif | `app/checkout/index.tsx` | devis livraison, panier local | Promo et total serveur/local doivent être comparés; vérifier adresse obligatoire. |
| Paiement | `app/checkout/payment.tsx` | méthodes et création commande | `initializePayment()` non appelé; panier vidé après création et avant confirmation PSP. |
| Succès | `app/checkout/success.tsx` | navigation | Vérifier redirection vers le tracking et statut de paiement réel. |
| Adresses liste | `app/address/index.tsx` | `/mobile/addresses` | Vérifier suppression, défaut et états réseau. |
| Adresse formulaire | `app/address/form.tsx` | `/mobile/addresses` | Pays codés dans `COUNTRIES`; ne consomme pas `shipping-countries`; validation téléphone/postal faible. |
| Commandes liste | `app/orders/index.tsx` | `/orders/mobile/list` | Pagination et statuts à vérifier; pluralisation/traductions. |
| Commande détail | `app/orders/[id].tsx` | `/orders/mobile/:id` | Vérifier prix/devise, tracking et retour. |
| Tracking | `app/orders/tracking.tsx` | `/orders/mobile/:id/tracking` | Polling 15 s, mais test réel livreur/événements à faire. |
| Retour | `app/orders/return.tsx` | `/returns/mobile` | Fonctionnel statiquement; vérifier statut commande, quantité et idempotence. |
| Messagerie liste | `app/messages/index.tsx` | conversations | Vérifier doublon `/mobile/conversations` et `/chat/conversations`. |
| Chat détail | `app/messages/[id].tsx` | messages, read, close, upload | Vérifier multipart sur Android/iOS/Web, audio, vidéo, PDF et suppression. |
| Médias chat | `app/messages/media.tsx` | médias conversation | Vérifier route backend et URLs `/uploads`. |
| Wallet bonus | `app/wallet/bonus.tsx` | wallet | Vérifier que les valeurs ne restent pas à zéro et que le header n’a pas de no-op. |
| Wallet épargne | `app/wallet/savings.tsx` | wallet | Même vérification données/table/format devise. |
| Coupons | `app/coupons/index.tsx` | coupons actifs/historique | Vérifier validation code dans checkout et cohérence usage\_limit. |
| Boutiques | `app/stores/index.tsx` | stores/follow | Vérifier recommandations et données non statiques. |
| Réglages | `app/settings/index.tsx` | settings/local storage | Nettoyage cache, privacy, legal et notifications à vérifier. |
| Profil | `app/profile/index.tsx` | `/mobile/profile`, avatar | Upload réel à tester sur Web et natif; valeurs locales et serveur doivent converger. |
| Paiements enregistrés | `app/payment/index.tsx` | méthodes de paiement | Add card et gestion de méthodes à vérifier, le backend expose surtout les moyens de checkout. |
| Suggestions | `app/suggestions/index.tsx` | `/mobile/suggestions` | Appel direct API, pas `submitSuggestion`; backend retourne `{ ok: true }` sans persistance visible. |
| Page légale | `app/legal/index.tsx` | contenu statique | Vérifier cohérence avec `/mobile/static-pages/:slug`. |
| Page statique | `app/static-page/[slug].tsx` | static pages | Tester slug absent, HTML et sécurité de rendu. |
| Placeholder | `app/placeholder.tsx` | aucune donnée métier | Plusieurs CTA y aboutissent encore, ce qui indique des fonctionnalités incomplètes. |

* * *
## 4\. Recherche texte, filtres et recherche visuelle
### 4.1 Recherche texte
Le Mobile utilise `useSearchTrending()` depuis `src/features/search/useSearchTrending.ts`, qui appelle désormais `GET /mobile/search/trending`. C’est une correction réelle du commit.

Problèmes restants :
*   la recherche catalogue utilise une liste chargée avec une limite par défaut de 50 produits côté backend ;
*   aucun `useInfiniteQuery` ou pagination de résultats n’est visible ;
*   les filtres semblent être appliqués au catalogue déjà chargé, pas à une requête backend paginée ;
*   il faut vérifier que catégorie, prix minimum/maximum, note et livraison gratuite ne produisent pas de résultats incomplets ;
*   il faut ajouter des tests unitaires pour chaque combinaison de filtres et des tests E2E pour la réponse API.
### 4.2 Recherche visuelle
Flux actuel :

```plain
sequenceDiagram
  participant U as Utilisateur
  participant C as app/camera/index.tsx
  participant API as POST /api/mobile/search/by-image
  participant S as MobileService
  participant DB as PostgreSQL

  U->>C: Photo caméra ou album
  C->>API: multipart field image
  API->>S: searchByImage(path)
  S->>DB: recherche heuristique/MVP
  DB-->>S: produits candidats
  S-->>C: Product[]
  C-->>U: résultats similaires
```

### Problèmes trouvés
**VIS-01, P0, résultat non garanti**

`app/camera/index.tsx` bascule silencieusement vers `useSuggestions()` si l’upload échoue. L’utilisateur voit donc des produits locaux qui ne correspondent pas forcément à sa photo. En production, il faut distinguer clairement « aucun résultat », « erreur serveur » et « mode hors ligne ».

**VIS-02, P0, URL et préfixe à valider**

Le composant construit son URL avec `EXPO_PUBLIC_API_URL + /mobile/search/by-image`, alors que NestJS utilise le préfixe `/api`. Il faut tester l’URL finale sur chaque plateforme et corriger la configuration, pas seulement le composant.

**VIS-03, P1, recherche qualifiée de visuelle mais backend MVP**

Le contrôleur décrit la fonction comme « MVP heuristique ». Ce n’est pas une recherche visuelle robuste par embeddings, vision ou index image. Il faut décider si le comportement attendu est une heuristique temporaire ou une vraie recherche par similarité.

**VIS-04, P1, upload non couvert par tests E2E**

Aucun test trouvé garantissant : champ multipart `image`, types JPEG/PNG/WebP/GIF, taille maximale, nom de fichier, réponse `Product[]`, erreur 4xx/5xx et compatibilité Android/iOS/Web.

**VIS-05, P2, permissions caméra et album**

Tester permission refusée, permission révoquée dans les réglages, album sans image, annulation, rotation EXIF, photo volumineuse et absence d’URL API.
### Critères d’acceptation
*   Une photo valide produit une requête multipart qui atteint l’API.
*   L’API renvoie une réponse typée et non une liste de suggestions mockées.
*   Une erreur serveur affiche une erreur explicite avec bouton réessayer.
*   Un résultat vide affiche « aucun produit similaire ».
*   Le bouton « reprendre » réinitialise complètement la requête précédente.
*   Le même flux fonctionne sur Android, iOS et Web.

* * *
## 5\. Catégories et sous-catégories
### Ce qui fonctionne
*   Admin : `apps/admin/src/features/categories/pages/AdminCategoryListPage.tsx` affiche les catégories racine et enfants via `parentId`.
*   Création enfant : le bouton ajoute une catégorie avec `parentId`.
*   Backend : `POST /api/categories`, `PUT /api/categories/:id`, `DELETE /api/categories/:id`.
*   Base : `categories.parentId` permet la hiérarchie.
*   Mobile : `GET /mobile/categories/:id/children` et le hook `useStoreCatalog()` chargent les enfants.
### Problèmes
**CAT-01, P1, message de suppression faux**

L’Admin affiche « les sous-catégories seront également supprimées ». Le backend fait l’inverse : il exécute `UPDATE categories SET parentId = null` avant de supprimer le parent. Le comportement et le message doivent être alignés.

**CAT-02, P1, suppression du parent sans décision métier**

Il faut choisir entre : interdire la suppression si des enfants existent, supprimer en cascade, ou remonter les enfants à la racine. Le comportement actuel peut casser la navigation attendue.

**CAT-03, P1, catégorie mobile et sous-catégorie mobile perdent l’identité**

`useStoreCatalog()` convertit les enfants en `string[]`, puis `store.tsx` navigue vers `/search` avec le nom. Cela empêche d’ouvrir précisément `/mobile/categories/:id/products` pour une sous-catégorie.

**CAT-04, P1, slug et accents**

Le slug backend est généré avec une regex ASCII. Les noms accentués et arabes peuvent produire des slugs incomplets. Ajouter une normalisation explicite et un test d’unicité.

**CAT-05, P2, catégories globales et boutiques**

Le backend injecte un `SYSTEM_STORE_ID`, tandis que le schéma exige un `storeId`. Il faut documenter la règle et vérifier que les requêtes mobile filtrent correctement les catégories globales.

**CAT-06, P2, upload image catégorie**

L’Admin envoie du base64 et le backend écrit le fichier, mais il faut tester suppression/remplacement des anciennes images, taille réelle décodée, extensions et URL absolues côté Mobile.

* * *
## 6\. Admin: inventaire des modules à auditer
L’Admin contient les modules suivants :
*   Auth, admins, rôles, permissions, audit.
*   Dashboard, analytics, rapports.
*   Produits, catégories, boutiques, KYC.
*   Commandes, paiements, remboursements, reçus.
*   Clients, adresses, retours, litiges.
*   Livraison, livreurs, assignations.
*   Contenu, bannières, feed posts, sections, raccourcis, logos, SEO, pages statiques, feature flags.
*   Coupons, campagnes, affiliés, payouts, fidélité.
*   Messages, chat support, notifications.
### Points de contrôle Admin

| Sujet | Risque |
| ---| --- |
| Permissions | Vérifier que chaque bouton est masqué côté UI et refusé côté API. |
| Pagination | Vérifier `page`, `limit`, `totalPages` pour produits, commandes, clients, paiements et logs. |
| Uploads | Vérifier URL relative `/uploads` versus `VITE_API_URL`, types et erreurs. |
| Modales | Vérifier fermeture Escape, clic extérieur, focus, validation, loading et rollback. |
| Tables | Vérifier tri, recherche, filtres, état vide, état erreur et refresh. |
| Actions destructives | Vérifier confirmation, message réel et invalidation des caches. |
| DTO | Plusieurs interfaces utilisent des types incomplets ou `any`; ajouter validation Zod cohérente avec les DTO NestJS. |
| Exports | Produits et analytics déclarent encore des exports non implémentés. |

* * *
## 7\. Backend et base de données
### Modules backend présents
Auth, stores, products, coupons, affiliates, orders, analytics, payments, returns, payouts, customers, notifications, loyalty, content, reviews, campaigns, receipts, reports, disputes, audit, delivery, shipping, settings, wishlist, chat, mobile, admin-messages, health.
### Risques base de données
**DB-01, P0, paiement/commande non atomique au niveau métier**

La création de commande crée aussi un paiement `pending`, mais le Mobile redirige après la création de commande. Il faut définir les transitions exactes : `pending`, `processing`, `paid`, `failed`, `cancelled`, `refunded`, et les déclencher uniquement via le PSP/webhook.

**DB-02, stock**

Le stock est décrémenté pour les variantes, mais le produit simple et les cas de concurrence doivent être testés. Ajouter des tests de double checkout et de retry idempotent.

**DB-03, suggestions non persistées**

`POST /mobile/suggestions` retourne `{ ok: true }`, mais aucune table ou service de persistance n’est visible dans le contrôleur inspecté. La fonctionnalité peut donc confirmer un envoi sans conserver la suggestion.

**DB-04, avis**

Le backend possède `productReviews`, mais le Mobile n’a pas encore de DataSource dédiée pour charger et créer les avis. La fiche produit doit être comparée à la réponse API réelle.

**DB-05, wishlist**

`wishlist_items` n’est pas montré avec une contrainte unique client/produit dans les extraits de migration. Ajouter une contrainte unique pour empêcher les doublons sous concurrence.

**DB-06, intégrité hiérarchique**

`categories.parentId` n’a pas de foreign key auto-référente visible dans le schéma TypeScript. Ajouter la contrainte et empêcher les cycles parent/enfant.

**DB-07, idempotence**

La commande possède une clé d’idempotence, mais chaque parcours frontend doit l’envoyer et la réutiliser en cas de retry. Le paiement utilise une clé dérivée, à vérifier sur chaque provider.

**DB-08, données de démonstration**

Les mocks et URLs Picsum subsistent. Il faut vérifier que `EXPO_PUBLIC_USE_MOCK=false` est effectivement utilisé partout en build de production.

* * *
## 8\. Modales, filtres et états d’affichage
### Modales / sheets repérés
*   `SearchFiltersSheet.tsx` : filtres recherche.
*   Drawer catégories dans `app/(tabs)/store.tsx`.
*   Modal promotion accueil.
*   Modal pays dans `app/address/form.tsx`.
*   Modal édition profil.
*   Sheets checkout/paiement.
*   Viewer média du feed et du chat.
*   Modales Admin pour catégories et confirmations.
### Checklist d’audit à appliquer partout
*   Ouverture sur clic et deep-link.
*   Fermeture par bouton, backdrop, Escape/Back Android.
*   Safe area et clavier.
*   Scroll interne sans bloquer le parent.
*   Loading pendant mutation.
*   Erreur visible et réessayable.
*   Succès avec invalidation query.
*   Annulation sans mutation partielle.
*   Focus/accessibilité.
*   RTL arabe.
### Défauts déjà identifiés
*   Plusieurs actions historiques sont no-op ou redirigent vers `placeholder`.
*   Des paddings fixes sont utilisés au lieu des insets dans certains écrans.
*   Plusieurs textes restent codés en français malgré i18n FR/EN/AR.
*   Le feed et les recommandations doivent gérer image absente, image invalide et vidéo indisponible.
*   Les badges de notification et états wallet doivent venir d’une donnée serveur, pas d’une constante.

* * *
## 9\. Plan d’exécution recommandé
### Phase 0, verrouillage des contrats
1. Fixer `EXPO_PUBLIC_API_URL` et le préfixe `/api`.
2. Ajouter un fichier de contrats d’URL partagé ou générer depuis Swagger.
3. Interdire les appels `apiAdapter` directs dans les écrans/hooks non infrastructure.
4. Ajouter un test qui compare les méthodes DataSource et les routes backend.
### Phase 1, parcours critiques
1. Auth email, OTP, social login.
2. Catalogue, catégories et sous-catégories.
3. Recherche texte et pagination.
4. Recherche photo sans fallback silencieux.
5. Checkout, création commande, initialisation PSP, webhook et confirmation.
6. Commandes, tracking et retours.
### Phase 2, synchronisation Admin/Mobile
1. Produits et variantes.
2. Catégories et images.
3. CMS, bannières, feed, logos, settings.
4. Paiements et méthodes.
5. Clients, adresses et wallet.
6. Chat, support et notifications.
### Phase 3, finition UI et données
1. Supprimer les placeholders métier.
2. Remplacer les mocks restants.
3. Compléter i18n et RTL.
4. Corriger les modales et états loading/error/empty.
5. Tester les uploads sur les trois plateformes.
### Phase 4, validation
*   `npm run lint`
*   `npm run check:arch`
*   typecheck Mobile
*   build Admin
*   build API
*   tests unitaires
*   tests migration/DB
*   tests E2E authentifiés et non authentifiés
*   test paiement avec webhook signé
*   test recherche photo multipart
*   test synchronisation Admin → DB → Mobile

* * *
## 10\. Verdict
Le commit `9ecda19` améliore nettement les contrats, mais le système n’est pas encore « parfaitement synchronisé ». Les points les plus dangereux sont le **préfixe API**, le **paiement PSP non déclenché**, la **recherche visuelle qui masque les erreurs**, les **pays et sous-catégories encore locaux**, et les **fonctionnalités ajoutées dans les DataSources mais pas toujours branchées aux écrans**.

Le bon ordre est de corriger d’abord les flux P0, puis d’automatiser la vérification de connectivité afin que chaque nouvelle route backend ait un consommateur réel et que chaque action UI ait un endpoint et un test.