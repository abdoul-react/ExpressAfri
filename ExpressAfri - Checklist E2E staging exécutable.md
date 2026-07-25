# ExpressAfri - Checklist E2E staging exécutable

# ExpressAfri - Checklist E2E staging exécutable

**Objectif :** valider la synchronisation Admin → API → PostgreSQL → Mobile sur un environnement staging réel.

**Révisions ciblées :** `bf7f5d2`, `886a204`, `db32e61` et la branche `main`.

**Règle :** chaque test doit être exécuté avec un identifiant de test unique, un horodatage et une preuve: log API, réponse HTTP, capture écran ou ID BDD.

## 0\. Variables et préparation

```bash
export API_BASE="https://staging-api.expressafri.com/api"
export ADMIN_URL="https://staging-admin.expressafri.com"
export MOBILE_API_URL="$API_BASE"
export TEST_EMAIL="e2e+$(date +%s)@example.com"
```

Préparer PostgreSQL staging, Redis, stockage `uploads`, un compte super-admin, un compte admin limité, un compte boutique, un client test et un PSP sandbox. Vérifier que les builds utilisent `VITE_USE_MOCK=false` et `EXPO_PUBLIC_USE_MOCK=false`.

## 1\. Smoke API et sécurité

- [ ] `GET $API_BASE/health` renvoie 200.
- [ ] Swagger est disponible uniquement selon la politique staging prévue.
- [ ] Une route protégée sans token renvoie 401.
- [ ] Un token admin sans permission renvoie 403.
- [ ] Un token boutique ne peut pas lire ou modifier une autre boutique.
- [ ] Les réponses ne renvoient jamais `passwordHash`, tokens, CVV ou secrets PSP.
- [ ] Les logs redigent Authorization, password, token, cardNumber, cvv et données sensibles.

## 2\. Auth Admin et TOTP

- [ ] Login email/mot de passe admin.
- [ ] Login avec identifiants invalides.
- [ ] Activation TOTP: setup → QR/secret → enable.
- [ ] Login avec `requiresTotp` puis code valide.
- [ ] Code TOTP invalide, expiré et réutilisé.
- [ ] Désactivation TOTP avec code valide.
- [ ] Expiration access token puis `POST /auth/refresh` avec refresh token admin.
- [ ] Vérifier que le refresh accepte un token `type: admin` et rejette un token client.
- [ ] Logout et vérification que le token révoqué ne fonctionne plus.

## 3\. Admin: chargement, cache et réactivité

Pour chaque module Admin, exécuter: chargement initial, refresh navigateur, erreur API, liste vide, pagination, recherche, mutation, annulation, toast succès, toast erreur et permissions.

- [ ] Dashboard/analytics: périodes, funnel, cohortes, paniers abandonnés.
- [ ] Produits: liste, détail, création, édition, variantes, stock, images, suppression, modération.
- [ ] Catégories: création racine, création enfant, édition parent, image, suppression parent avec enfants.
- [ ] Boutiques/KYC: statut, managers, approve/reject KYC, cloisonnement `storeId`.
- [ ] Commandes: filtres, statut, annulation, expédition partielle, statut item, remboursement.
- [ ] Paiements: liste, détail, remboursement complet/partiel, statut webhook.
- [ ] Clients: détail, adresse, commandes paginées, ban/unban, suppression logique.
- [ ] CMS: bannières, feed posts, sections, raccourcis, logos, pages, SEO, settings, flags.
- [ ] Coupons/campagnes: dates, limites, création, édition, launch, pause, suppression.
- [ ] Livraison: livreurs, assignation, statuts hyphen/underscore, notation.
- [ ] Support: tickets, messages internes, chat, réponse texte, pièces jointes, unread counts.
- [ ] Retours/litiges/rapports: détail, assignation, message, résolution, statut.
- [ ] Notifications: template, send-test, send-batch, logs, échec provider.
- [ ] Reçus/payouts/fidélité/affiliés: création, statut, génération et cohérence des montants.

Après chaque mutation Admin:

- [ ] Le GET détail renvoie la nouvelle valeur.
- [ ] La liste et les compteurs sont rafraîchis.
- [ ] Le Mobile voit la modification après refetch.
- [ ] Un autre compte sans permission ne voit pas l’action.

## 4\. Mobile: auth, catalogue et catégories

- [ ] Onboarding, redirection login, invité et persistance.
- [ ] Login email, inscription, OTP 6 chiffres, reset mot de passe.
- [ ] Social login Google/Apple/Facebook si les providers sont configurés.
- [ ] Accueil: bannières, sections CMS, raccourcis, logos et feature flags.
- [ ] Catégories racine et sous-catégories: Admin crée enfant, Mobile recharge, ouvre l’ID enfant et affiche les bons produits.
- [ ] Suppression parent avec enfants: comportement attendu confirmé, enfants visibles selon la décision métier.
- [ ] Aucun cycle parent/enfant possible.
- [ ] Images catégories uploadées par Admin visibles sur Mobile via URL absolue.

## 5\. Recherche texte et filtres

- [ ] Recherche par mot-clé avec zéro, un et plusieurs mots.
- [ ] Recherche accentuée et insensible à la casse.
- [ ] Tendances chargées depuis `GET /mobile/search/trending`.
- [ ] Catégorie, prix min/max, promotion, tri featured/price/rating/newest.
- [ ] Note minimale et livraison gratuite vérifiées sur un catalogue de plus de 100 produits.
- [ ] Pagination/infinite scroll: aucun résultat au-delà de la première page ne disparaît.
- [ ] Reset filtre remet aussi le compteur et la query cache.
- [ ] Erreur API, timeout et état vide affichent des messages distincts.

## 6\. Recherche visuelle photo/caméra

```bash
curl -i -X POST "$API_BASE/mobile/search/by-image" \
  -F "image=@tests/fixtures/product.jpg"
```

- [ ] JPEG valide renvoie 2xx et un tableau `Product[]`.
- [ ] PNG, WebP et GIF selon la politique acceptée.
- [ ] Champ incorrect `file` renvoie une erreur explicite.
- [ ] Fichier trop volumineux renvoie 413 ou 400 contrôlé.
- [ ] Photo caméra Android.
- [ ] Photo caméra iOS.
- [ ] Photo album Web.
- [ ] Permission refusée, annulation album et caméra indisponible.
- [ ] Résultat vide distinct d’une erreur serveur.
- [ ] Retry renvoie la même photo sans conserver l’état précédent.
- [ ] Vérifier que les résultats sont réellement similaires, pas seulement des suggestions locales.
- [ ] Vérifier que l’URL finale contient exactement un seul préfixe `/api`.

## 7\. Checkout, stock et PSP

### COD

- [ ] Adresse obligatoire et adresse par défaut.
- [ ] Création commande COD.
- [ ] Statut commande confirmé.
- [ ] Panier vidé uniquement après succès.
- [ ] Commande visible dans Mobile et Admin.

### PSP sandbox

- [ ] Création commande non-COD.
- [ ] `POST /payments/:orderId/initialize` renvoie `pending`, `processing` ou `paid` accepté.
- [ ] Réponse `failed`: panier conservé, écran erreur, aucun écran succès.
- [ ] Timeout PSP: panier conservé, retry possible sans doublon.
- [ ] Webhook signé accepté et idempotent.
- [ ] Webhook signature invalide rejeté.
- [ ] Paiement confirmé: commande et paiement passent aux statuts attendus.
- [ ] Remboursement complet/partiel visible dans Admin.
- [ ] Deux clics rapides checkout ne créent pas deux commandes grâce à l’idempotency key.
- [ ] Deux clients tentant le dernier stock: un seul succès, l’autre reçoit stock insuffisant.

## 8\. Panier, wishlist, avis et feed

- [ ] Panier local persiste après redémarrage.
- [ ] Prix, quantité, devise et total restent cohérents avec le backend.
- [ ] Wishlist add/remove/has est idempotente et respecte la contrainte unique.
- [ ] Avis: lecture, création/modification, modération Admin et visibilité Mobile.
- [ ] Like feed: optimistic update, réponse serveur, rollback sur erreur et compteur correct.
- [ ] Follow/unfollow boutique et onglet abonnements.

## 9\. Chat, fichiers et notifications

- [ ] Conversation créée depuis boutique et commande.
- [ ] Message texte Mobile → Admin → Mobile.
- [ ] Marquer lu, fermer, archiver, supprimer son message.
- [ ] Image, vidéo, PDF et audio sur Android, iOS, Web.
- [ ] URLs `/uploads` accessibles avec la bonne origine.
- [ ] Blocage client côté Admin empêche l’écriture Mobile.
- [ ] Push token register/remove, tap notification et navigation.

## 10\. Performance et synchronisation

- [ ] Admin démarre sans mock et affiche un état loading correct.
- [ ] Les mutations critiques utilisent un refetch/invalidation ciblé.
- [ ] Commande/paiement/livraison affichent les données fraîches, pas un cache de 2 minutes.
- [ ] Aucune fuite de données entre deux comptes après logout/login.
- [ ] Les écrans hors ligne affichent une erreur exploitable et ne confirment aucune mutation.
- [ ] Les uploads ne bloquent pas le thread UI et affichent progression/erreur.
- [ ] Aucun bouton visible ne reste sans action valide.
- [ ] Aucun export visible ne déclenche `Export not yet available via API`.

## 11\. Critères de sortie

Le staging est validé seulement si:

- tous les P0 passent;
- aucun test critique ne confirme une commande ou un paiement sans résultat serveur accepté;
- Admin, API, PostgreSQL et Mobile affichent la même donnée après mutation;
- recherche texte, filtres et photo passent sur Web/Android/iOS;
- permissions et cloisonnement sont validés avec au moins trois rôles;
- les logs et captures de preuves sont archivés;
- les checks CI du SHA testé sont verts;
- les variables `VITE_API_URL`, `VITE_USE_MOCK=false`, `EXPO_PUBLIC_API_URL` et `EXPO_PUBLIC_USE_MOCK=false` sont vérifiées sur staging.

**Verdict final à renseigner après exécution :** `GO`, `GO avec réserves` ou `NO-GO`.
