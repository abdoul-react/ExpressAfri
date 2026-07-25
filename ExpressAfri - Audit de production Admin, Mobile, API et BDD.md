# ExpressAfri - Audit de production Admin, Mobile, API et BDD

# ExpressAfri - Audit de production Admin, Mobile, API et BDD
**Révision auditée :** `3976bdda14160edd34348bbf4d47a0de0c17ea7c`

**Base de comparaison :** `9ecda19b8aac2b4d7734e85b1083ab3f0ce94569`

**Périmètre :** Admin React/Vite, Mobile Expo, API NestJS, DataSources, écrans, boutons, recherche texte/photo, filtres, modales, catégories, migrations Drizzle, sécurité, cache et connectivité.

**Nature de l’audit :** revue statique du dépôt et des contrats. Les checks CI sont verts, mais aucun environnement de production avec API, PostgreSQL, uploads et PSP n’est démarré ici. Le verdict « prêt production » exige donc encore une recette E2E réelle.

* * *
## 1\. Verdict direct
**Le dépôt compile, mais je ne le qualifierais pas encore de 100% prêt production.** Les derniers commits ont fermé beaucoup d’écarts de câblage, notamment le préfixe `/api`, les appels directs `apiAdapter`, la recherche photo, les suggestions persistées, la contrainte wishlist et la hiérarchie des catégories.

Il reste toutefois des risques fonctionnels sérieux :

1. **Le refresh Admin est branché sur** **`MobileService.refreshToken()`**, alors que ce service vérifie un token de type `customer`. Le endpoint `/api/auth/refresh` existe donc, mais son contrat est probablement incorrect pour un JWT Admin.
2. **Le paiement mobile initialise le PSP mais ignore son échec**, puis vide le panier et affiche le succès. C’est dangereux: une commande peut être montrée comme réussie sans paiement confirmé.
3. **La recherche photo reste heuristique/MVP côté backend**. Le client ne masque plus l’erreur, ce qui est mieux, mais cela ne garantit pas une vraie similarité visuelle.
4. **Les exports produits et analytics lèvent toujours** **`Export not yet available via API`****.**
5. **Plusieurs modules Admin ont des contrats incomplets ou des réponses insuffisamment normalisées**, notamment messages, campagnes, 2FA, exports et certaines actions opérationnelles.

* * *
## 2\. Statut des corrections depuis `9ecda19`

| Sujet | Statut | Vérification |
| ---| ---| --- |
| Préfixe API Mobile `/api` | Corrigé | `.env.example` pointe maintenant vers `https://api.expressafri.com/api`. |
| Appels directs `apiAdapter` | Largement corrigé | Les écrans/hooks audités passent par services/DataSources. |
| Recherche photo erreur silencieuse | Corrigé partiellement | Erreur explicite + bouton retry, mais backend toujours heuristique. |
| Social login | Partiellement corrigé | DataSource API ajoutée; vérifier que `useAuth` et les boutons appellent réellement le service dans la révision finale. |
| Initialisation PSP | Corrigé techniquement, pas fonctionnellement | Appel présent, mais erreur PSP avalée et panier vidé quand même. |
| Suggestions | Corrigé | Persistance dans `contentBlocks` avec `storeId` système. |
| Wishlist | Corrigé base | Contrainte unique ajoutée dans les migrations. |
| ParentId catégories | Corrigé base | Foreign key auto-référente ajoutée. |
| Navigation sous-catégories | Corrigée côté modèle | `useStoreCatalog()` retourne désormais `{ id, name, image }`. Recette UI encore nécessaire. |
| CI | Vert | Build, migration/tests, mobile typecheck, lint/typecheck et secrets scan sont verts sur `3976bdd`. |

* * *
## 3\. Matrice Admin: module par module

| Module Admin | Frontend | DataSource API | Backend attendu | Verdict | Problèmes / tests restants |
| ---| ---| ---| ---| ---| --- |
| Auth | Login, reset, guards | `ApiAdminAuthDataSource` | `AuthController` | Orange | Refresh Admin délègue au service Mobile; TOTP backend sans écran Admin clair. Tester login, expiration, refresh, logout et 2FA. |
| Dashboard | `features/dashboard` | Analytics source | `AnalyticsController` | Orange | Données et cache à vérifier; export analytics non implémenté. |
| Produits | Liste, formulaire, import, modération | `ApiAdminProductDataSource` | `ProductsController` | Orange | CRUD et modération présents; export explicitement non implémenté. Vérifier images, variantes, stock et cache Mobile après mutation. |
| Catégories | Liste + modale parent/enfant | `ApiAdminCategoryDataSource` | `CategoriesController` | Orange | Hiérarchie fonctionnelle; suppression remonte les enfants à la racine, il faut tester ce choix métier et le refresh Mobile. |
| Boutiques/KYC | Liste + détail | `ApiAdminStoreDataSource` | `StoresController` | À tester | Vérifier managers, KYC approve/reject, statut, cloisonnement `storeId` et permissions super-admin. |
| Commandes | Liste + détail | `ApiAdminOrderDataSource` | `OrdersController` | Orange | Statuts, expéditions et remboursements présents; remboursement dépend d’un `paymentId` récupérable dans le détail. Tester commande sans paiement associé. |
| Paiements | Liste + détail | `ApiAdminPaymentDataSource` | `PaymentsController` | Orange | Liste/détail/refund présents; création générique de paiement non exposée par la DataSource. Tester idempotence, montant partiel et statut PSP. |
| Clients | Liste + détail | `ApiAdminUserDataSource` | `CustomersController` | Vert sous réserve | CRUD, ban/unban et commandes présents; liste des commandes limitée à 50 et pagination non propagée. |
| Contenu/CMS | Bannières, pages, feed, logos, SEO, settings | `ApiAdminContentDataSource` | `ContentController` | Orange | Couverture large; tester uploads, URLs relatives `/uploads`, invalidation mobile et droits par sous-module. |
| Coupons | Liste/formulaire | `ApiAdminCouponDataSource` | `CouponsController` | À tester | Valider dates, limite d’usage, montant minimum, coupon mobile et commande finale. |
| Campagnes | Liste/formulaire/détail | `ApiAdminCampaignDataSource` | `CampaignsController` | Orange | DataSource couvre CRUD mais pas clairement `summary`, `launch`, `pause`; boutons correspondants peuvent être non branchés. |
| Analytics | Dashboard, funnel, cohorts, abandoned carts | `ApiAdminAnalyticsDataSource` | `AnalyticsController` | Orange | Lectures présentes; export explicitement non implémenté. Tester périodes, fuseau et permissions. |
| Admins | Liste admin | `ApiAdminAdminDataSource` | `AuthController` | À tester | Tester création/suppression, changement mot de passe, impossibilité de mass-assign `isSuperAdmin` et cloisonnement. |
| Rôles/permissions | Liste rôles | `ApiAdminRoleDataSource`, permission source | `AuthController` | Orange | Vérifier que les permissions UI correspondent aux permissions backend, notamment `manage` vs `create/update/delete`. |
| Audit | Page audit | `ApiAdminAuditDataSource` | `AuditController` | À tester | Vérifier que toutes les mutations sensibles écrivent réellement un log et que l’export éventuel n’est pas faux. |
| Messages/support | Tickets, chat, interne | `ApiAdminMessageDataSource` | `AdminMessagesController` | Rouge/orange | `getUnreadCount()` caste la réponse en nombre alors que le backend renvoie `{ count }`; risque de badge cassé. Upload multipart à tester avec boundary navigateur. |
| Livraison | Livreurs, assignations | `ApiAdminDeliveryDataSource` | `DeliveryController` | Orange | Conversion statuts hyphen/underscore correcte; pagination Admin des assignations non réellement portée par la méthode. |
| Retours | Liste | `ApiAdminReturnDataSource` | `ReturnsController` | À tester | Vérifier transition status, permissions et concordance avec `POST /returns/mobile`. |
| Litiges | Liste/détail | `ApiAdminDisputeDataSource` | `DisputesController` | À tester | Vérifier resolve, assign, messages et suppression, plus cohérence des permissions. |
| Notifications | Templates/logs/envoi | `ApiAdminNotificationDataSource` | `NotificationsController` | À tester | Tester envoi test/batch, logs, erreurs provider et outbox. |
| Fidélité | Wallet/points | `ApiAdminLoyaltyDataSource` | `LoyaltyController` | À tester | Vérifier que les valeurs Mobile ne restent pas à zéro et que les écritures sont idempotentes. |
| Affiliés/payouts | Pages dédiées | DataSources API | contrôleurs affiliés/payouts | À tester | Vérifier statuts, commissions, paiement et filtres par boutique. |
| Reçus | Liste/settings | DataSource API | `ReceiptsController` | À tester | Vérifier génération PDF, URL de téléchargement et réglages de branding. |
| Rapports | Liste | DataSource API | `ReportsController` | À tester | La route de création existe, mais aucun formulaire Mobile clairement identifié. Vérifier sécurité de création publique. |
| Settings/features | Settings + flags | DataSources API | `SettingsController`, Content | Orange | Deux familles de settings existent, `settings/*` et `content/settings/*`; documenter la source de vérité. |

* * *
## 4\. Sécurité et cloisonnement Admin
### Points positifs
*   `ProtectedRoute` contrôle authentification et permissions côté interface.
*   `PermissionGuard` masque les actions non autorisées.
*   Les contrôleurs backend utilisent `JwtAuthGuard` et `PermissionsGuard` globalement.
*   Les boutiques gérées par un utilisateur avec `storeId` sont filtrées côté backend.
*   Les champs sensibles `passwordHash` et `isSuperAdmin` sont filtrés dans certaines mutations Admin.
*   Les logs Pino redigent authorization, mots de passe, tokens, cartes, CVV, téléphone et email.
### Risques à corriger
**SEC-01, critique : refresh Admin de mauvais type**

`AuthController.refresh()` appelle `MobileService.refreshToken()`. Or `MobileService.refreshToken()` rejette tout payload dont `type !== 'customer'`. Le client Admin envoie pourtant un `admin_refresh_token`. Il faut créer `AuthService.refreshAdminToken()` avec vérification d’un payload `type: 'admin'`, rotation et révocation adaptées.

**SEC-02, haute : autorisation UI ≠ sécurité suffisante**

Le masquage des boutons ne suffit pas. Chaque action doit être testée par API avec un token sans permission, un token boutique et un super-admin.

**SEC-03, haute : TOTP incomplet côté Admin**

Le backend expose setup, enable, disable et login TOTP. Le parcours Admin visible doit être vérifié: écran de saisie après `requiresTotp`, écran de configuration QR, désactivation et récupération.

**SEC-04, moyenne : permissions incohérentes**

Le code mélange des noms comme `categories.manage`, `customers.create`, `delivery.manage`, `campaigns.manage` et les permissions documentées `categories.create`, `products.update`, etc. Il faut une matrice unique de permissions générée ou testée.

* * *
## 5\. Cache, chargement et réactivité Admin
### Ce qui est en place
*   TanStack Query est utilisé dans les listes et détails.
*   `staleTime` global de 2 minutes côté Admin.
*   `placeholderData` conserve l’ancienne page pendant le changement de filtres.
*   Les mutations produits et catégories invalident leurs listes.
### Problèmes
**CACHE-01, moyenne : « instantané » n’est pas garanti**

Le `staleTime` de 2 minutes peut afficher une donnée ancienne après navigation. C’est acceptable pour réduire les appels, mais pas pour une console opérationnelle qui doit refléter immédiatement les statuts de paiement, commandes et livraison.

Action : après chaque mutation, invalider liste, détail, compteurs et dashboards dépendants. Pour les statuts opérationnels, utiliser `staleTime: 0` ou un refetch ciblé.

**CACHE-02, moyenne : invalidation inégale**

Les exemples produits/catégories invalident bien leurs listes, mais il faut vérifier toutes les mutations des modules Admin. Un audit de code doit rechercher chaque `useMutation` et confirmer `invalidateQueries` ou mise à jour optimiste.

**CACHE-03, moyenne : absence de synchronisation push/live Admin**

Aucun mécanisme temps réel général n’a été confirmé pour faire apparaître instantanément une nouvelle commande, un nouveau ticket ou une mise à jour de paiement. Le rafraîchissement dépend principalement du cache et des navigations.

* * *
## 6\. Recherche texte et filtres Mobile
### Flux actuel

```plain
flowchart LR
  Q[SearchBar] --> H[useSearchTrending + useFilteredProducts]
  H --> P[GET /api/mobile/products]
  P --> F[Filtres locaux]
  F --> R[Résultats affichés]
  T[GET /api/mobile/search/trending] --> H
```

### Problèmes
*   Le backend limite la liste par défaut à 50 produits, tandis que les filtres sont appliqués au catalogue chargé côté client.
*   Aucun flux de pagination/infinite query complet n’est confirmé.
*   Les filtres prix, note, livraison gratuite et catégories peuvent donc produire des résultats incomplets au-delà des 50 premiers produits.
*   La recherche tendance est maintenant dynamique, mais il faut tester son état vide, erreur et cache.
*   Il faut ajouter des tests unitaires pour chaque combinaison de filtres et un E2E avec plus de 50 produits.

**Décision recommandée :** envoyer les paramètres `search`, `categoryId`, `minPrice`, `maxPrice`, `rating`, `freeShipping`, `sort`, `limit`, `offset` à l’API et faire filtrer côté serveur. Le client ne doit garder que le tri visuel et l’état de la feuille de filtres.

* * *
## 7\. Recherche visuelle par photo/caméra
### Flux actuel

```plain
sequenceDiagram
  participant U as Utilisateur
  participant M as app/camera/index.tsx
  participant API as POST /api/mobile/search/by-image
  participant S as MobileService
  participant DB as PostgreSQL

  U->>M: caméra ou album
  M->>API: multipart field image
  API->>S: searchByImage(path)
  S->>DB: recherche MVP heuristique
  DB-->>S: Product[]
  S-->>M: résultats ou erreur
  M-->>U: résultats, vide ou retry
```

### Verdict
Le commit final a correctement supprimé le fallback silencieux vers des suggestions locales et affiche maintenant l’erreur avec un bouton de nouvelle tentative. Le préfixe API est aussi documenté dans `.env.example`.
### Ce qui manque avant production
*   Test réel Android, iOS et Web avec caméra et album.
*   Test multipart avec JPEG, PNG, WebP, GIF, extension absente et photo de plus de 10 Mo.
*   Test API avec champ incorrect (`file` au lieu de `image`) et réponse 400.
*   Test d’image tournée par EXIF.
*   Test réseau lent, timeout, 401, 413 et 500.
*   Test « aucun résultat » distinct de l’erreur serveur.
*   Validation que le backend renvoie des produits réellement similaires.
*   Le backend est explicitement décrit comme **MVP heuristique**: ce n’est pas encore une recherche visuelle par embeddings ou similarité d’images robuste.

**Conclusion photo :** le flux technique est branché, mais la qualité métier de la recherche n’est pas démontrée.

* * *
## 8\. Catégories et sous-catégories
### Flux Admin → BDD → Mobile

```plain
flowchart LR
  A[AdminCategoryListPage] --> CAPI[/api/categories]
  CAPI --> CC[CategoriesController]
  CC --> CAT[(categories.parentId)]
  CAT --> MAPI[/api/mobile/categories/:id/children]
  MAPI --> H[useStoreCatalog]
  H --> S[store.tsx]
  S --> NAV[/category/:id/products]
```

### État actuel
*   L’Admin crée et modifie `parentId`.
*   La base contient une foreign key auto-référente après le correctif DB-06.
*   Le backend remonte les enfants à la racine lors de la suppression du parent.
*   Le Mobile retourne désormais des sous-catégories avec `id`, `name`, `image`.
### Problèmes restants
*   Tester qu’un clic sur une sous-catégorie utilise réellement son `id`, pas uniquement son libellé.
*   Tester la suppression d’un parent avec enfants et la mise à jour immédiate du drawer Mobile.
*   Empêcher les cycles parent/enfant dans le backend, par exemple catégorie A → B → A.
*   Normaliser les slugs accentués et arabes; la génération actuelle est principalement ASCII.
*   Tester les images base64 de catégories: remplacement, taille maximale, URL relative et affichage Mobile.
*   Vérifier que les catégories globales utilisant `SYSTEM_STORE_ID` ne sont pas invisibles pour une boutique ou un client.

* * *
## 9\. Base de données et flux métiers critiques
### Commandes/paiements
Le Mobile crée une commande, le backend crée un paiement `pending`, puis le Mobile appelle `initializePayment()` pour les méthodes non-COD.

**Bug fonctionnel restant :** `app/checkout/payment.tsx` attrape l’erreur PSP, la ignore, puis continue vers `clearSelected()` et l’écran succès. Le panier ne doit être vidé et l’écran succès ne doit être affiché qu’après un résultat PSP accepté ou une confirmation métier explicite.
### Suggestions
Le backend persiste maintenant les suggestions dans `contentBlocks` avec `groupName: 'suggestions'` et `storeId`. À vérifier :
*   lecture Admin des suggestions;
*   pagination/modération;
*   séparation entre contenu CMS et messages utilisateurs;
*   index sur `groupName` et date;
*   validation longueur/rate limiting.
### Wishlist
La contrainte unique client/produit est un bon correctif. Tester les retries simultanés et le comportement de `has` après suppression.
### Catégories
La foreign key `parentId` est nécessaire mais doit être accompagnée d’une validation anti-cycle et d’un comportement transactionnel lors de suppression.
### Stock
Les variantes décrémentent leur stock avec une condition de quantité. Il faut tester le produit sans variante, deux checkouts simultanés, retry après timeout et idempotency key.

* * *
## 10\. Mocks, hardcodes et éléments non administrables
### Mocks encore présents à supprimer ou isoler
*   DataSources Mock encore présentes dans `apps/admin/src/infrastructure/data-source/mock/`.
*   Données et URLs de démonstration dans les anciens fichiers `src/data/` et les services mock historiques.
*   Fallbacks de mock contrôlés par `EXPO_PUBLIC_USE_MOCK`; vérifier que la CI de production force `false`.
*   Avatars Picsum et autres médias de démonstration.
### Hardcodes visibles à auditer
*   Limite catalogue 50.
*   Compteurs ou badges de notification historiques.
*   Pays locaux dans `settingsStore` et `address/form` malgré l’endpoint backend de pays couverts.
*   Textes français hors i18n.
*   États wallet par défaut à zéro quand la requête échoue.
*   Routes vers `placeholder` pour des bannières et raccourcis sans écran métier.
*   Carte/checkout: règles de montant, méthodes et validation à comparer avec le backend.
### Fonctionnalités non entièrement administrables
*   Recherche visuelle: le backend n’offre pas de configuration de modèle ou de seuil de similarité.
*   Recherche: filtres majoritairement locaux, pas de configuration Admin claire des règles de ranking.
*   Exports produits/analytics absents.
*   2FA Admin sans parcours UI complet confirmé.
*   Suggestions persistées mais pas encore exploitées dans une vraie boîte Admin.
*   Social links, SEO et settings existent côté CMS, mais leur consommation Mobile doit être vérifiée écran par écran.

* * *
## 11\. Boutons, écrans et modales à tester en recette
### Admin
Pour chaque page: chargement, erreur API, liste vide, pagination, recherche, tri, mutation, confirmation, annulation, toast succès, toast erreur, rafraîchissement et permissions.

Priorité boutons:
*   création/modification/suppression produit;
*   variantes, stock et images;
*   catégorie parent/enfant;
*   statut commande, expédition, remboursement;
*   upload bannière/logo/feed;
*   réponse ticket et chat avec pièce jointe;
*   assignation livreur;
*   approve/reject KYC, retour, litige et modération produit/avis;
*   envoi notification test/batch;
*   launch/pause campagne;
*   export produit/analytics, qui doit actuellement afficher une capacité non disponible ou être masqué.
### Mobile
*   SearchBar, suggestions tendance, filtres et reset.
*   Caméra, album, permission, retry et aucun résultat.
*   Drawer catégories, clic catégorie et sous-catégorie.
*   Checkout, coupon, adresse, méthode de paiement, PSP, succès/échec.
*   Feed like/follow, optimistic update et rollback.
*   Produit, variantes, avis, ajout panier et wishlist.
*   Commande, tracking, retour et messages.
*   Profil/avatar, wallet, coupons, notifications push et réglages.
### Modales/sheets
Chaque modal doit fonctionner avec: fermeture bouton, Android back, clic extérieur, clavier, safe area, scroll interne, loading, erreur, succès, annulation et RTL arabe.

* * *
## 12\. Plan de correction P0/P1/P2
### P0, bloquant production
1. Implémenter un vrai `AuthService.refreshAdminToken()` et ne plus déléguer le refresh Admin au Mobile.
2. Bloquer le succès checkout et le vidage du panier tant que l’initialisation PSP n’est pas acceptée.
3. Ajouter une recette E2E recherche photo multipart sur Android/iOS/Web.
4. Tester la configuration finale `VITE_API_URL` et `EXPO_PUBLIC_API_URL` avec `/api` sur un environnement réel.
5. Corriger le contrat de réponse des compteurs de messages Admin.
### P1, avant bêta ouverte
1. Finaliser social login via `useAuth`, boutons et stockage token.
2. Brancher pays de livraison dynamiques dans l’adresse et le checkout.
3. Passer la recherche et les filtres côté serveur avec pagination.
4. Tester et verrouiller la navigation des sous-catégories par ID.
5. Ajouter les actions campagne `summary`, `launch`, `pause` si les boutons existent.
6. Compléter le parcours 2FA Admin.
7. Ajouter tests de permissions par rôle et par boutique.
8. Ajouter une vraie vue Admin pour les suggestions persistées.
### P2, durcissement
1. Implémenter ou retirer les exports produits/analytics.
2. Supprimer les placeholders métier.
3. Éliminer les mocks/hardcodes de production et imposer `USE_MOCK=false`.
4. Ajouter anti-cycle catégories, index et tests d’intégrité.
5. Ajouter E2E checkout, stock concurrent, webhooks signés, uploads et chat médias.
6. Ajouter métriques de performance et monitoring d’erreurs côté Admin/Mobile/API.

* * *
## 13\. Critères de sortie production
Le projet pourra être déclaré prêt quand ces tests passent dans un environnement réel de staging:
*   Admin login, TOTP, refresh, logout et permissions.
*   Admin CRUD produit/catégorie/boutique/client/commande/contenu.
*   Admin mutation → PostgreSQL → Mobile visible après invalidation/refetch.
*   Mobile catalogue, sous-catégorie, recherche paginée et filtres serveur.
*   Recherche photo réussie, vide, erreur, retry et limites fichiers.
*   Checkout COD confirmé; checkout PSP refusé, pending, paid et webhook confirmé.
*   Stock concurrent et idempotency key.
*   Chat texte et fichiers sur Web/Android/iOS.
*   Uploads Admin visibles sur Mobile avec URLs correctes.
*   Retours, litiges, livraison, notifications et audit logs.
*   Aucun bouton visible sans action valide.
*   Aucun export visible sans implémentation réelle.
*   Aucun écran métier ne dépend de données mockées en build production.
## Conclusion
Le dernier lot est solide côté architecture et CI, mais **la synchronisation structurelle n’est pas la même chose que la fiabilité runtime**. Le prochain chantier n’est plus d’ajouter des interfaces: c’est d’exécuter les parcours E2E, de corriger le refresh Admin et le paiement PSP, puis de verrouiller les contrats de recherche, catégories, messages, permissions et cache.