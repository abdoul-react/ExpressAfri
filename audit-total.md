RAPPORT D'AUDIT TECHNIQUE — ExpressAfri Platform

Date : 24 juillet 2026 | Périmètre : Admin React + API NestJS + App Mobile React Native

---

RÉSUMÉ EXÉCUTIF

L'architecture générale est solide (pattern React Query + DataSource cohérent, design system homogène, CI/migrations présent).
Cependant, l'audit révèle un écart critique entre l'interface et le backend : plusieurs modules sont entièrement déconnectés de
l'API réelle ou s'appuient sur des données hardcodées (Analytics, Campaigns, Loyalty, Returns, Stores). Le module Campaigns repose
sur la mauvaise table SQL. Le module Shipping est entièrement absent. Des failles de sécurité notables : token JWT non révoqué à la
déconnexion, endpoints sans RBAC, route POST /reports publique sans rate limiting.

▎ La plateforme n'est pas prête pour la production en l'état.

---

TABLEAU DES SCORES PAR MODULE

┌─────┬──────────────────────────┬────────────────────┬──────────┬──────────────┬─────────────┐
│ # │ Module │ Groupe │ Score │ API │ Statut │
├─────┼──────────────────────────┼────────────────────┼──────────┼──────────────┼─────────────┤
│ 1 │ AUTH │ Core Admin │ 7.0 / 10 │ ✅ Connecté │ ⚠️ Moyen │
├─────┼──────────────────────────┼────────────────────┼──────────┼──────────────┼─────────────┤
│ 2 │ DASHBOARD │ Core Admin │ 6.0 / 10 │ ✅ Connecté │ ⚠️ Moyen │
├─────┼──────────────────────────┼────────────────────┼──────────┼──────────────┼─────────────┤
│ 3 │ ADMINS │ Core Admin │ 7.0 / 10 │ ✅ Connecté │ ⚠️ Moyen │
├─────┼──────────────────────────┼────────────────────┼──────────┼──────────────┼─────────────┤
│ 4 │ ROLES │ Core Admin │ 7.0 / 10 │ ✅ Connecté │ ⚠️ Moyen │
├─────┼──────────────────────────┼────────────────────┼──────────┼──────────────┼─────────────┤
│ 5 │ ORDERS │ Transactionnel │ 7.0 / 10 │ ✅ Connecté │ ⚠️ Moyen │
├─────┼──────────────────────────┼────────────────────┼──────────┼──────────────┼─────────────┤
│ 6 │ PAYMENTS │ Transactionnel │ 8.5 / 10 │ ✅ Connecté │ ✅ Bon │
├─────┼──────────────────────────┼────────────────────┼──────────┼──────────────┼─────────────┤
│ 7 │ PAYOUTS │ Transactionnel │ 4.0 / 10 │ ⚠️ Partiel │ ❌ Critique │
├─────┼──────────────────────────┼────────────────────┼──────────┼──────────────┼─────────────┤
│ 8 │ DISPUTES │ Transactionnel │ 7.5 / 10 │ ✅ Connecté │ ✅ Bon │
├─────┼──────────────────────────┼────────────────────┼──────────┼──────────────┼─────────────┤
│ 9 │ RETURNS │ Transactionnel │ 3.5 / 10 │ ❌ Débranché │ ❌ Critique │
├─────┼──────────────────────────┼────────────────────┼──────────┼──────────────┼─────────────┤
│ 10 │ RECEIPTS │ Transactionnel │ 7.0 / 10 │ ✅ Connecté │ ⚠️ Moyen │
├─────┼──────────────────────────┼────────────────────┼──────────┼──────────────┼─────────────┤
│ 11 │ PRODUCTS │ Catalogue │ 7.0 / 10 │ ✅ Connecté │ ⚠️ Moyen │
├─────┼──────────────────────────┼────────────────────┼──────────┼──────────────┼─────────────┤
│ 12 │ CATEGORIES │ Catalogue │ 6.0 / 10 │ ✅ Connecté │ ⚠️ Moyen │
├─────┼──────────────────────────┼────────────────────┼──────────┼──────────────┼─────────────┤
│ 13 │ STORES │ Catalogue │ 4.0 / 10 │ ❌ Débranché │ ❌ Critique │
├─────┼──────────────────────────┼────────────────────┼──────────┼──────────────┼─────────────┤
│ 14 │ DELIVERY │ Logistique │ 5.5 / 10 │ ❌ Débranché │ ❌ Critique │
├─────┼──────────────────────────┼────────────────────┼──────────┼──────────────┼─────────────┤
│ 15 │ SHIPPING │ Logistique │ N/A │ ❌ Absent │ ❌ Critique │
├─────┼──────────────────────────┼────────────────────┼──────────┼──────────────┼─────────────┤
│ 16 │ CUSTOMERS │ Clients & Insights │ 5.5 / 10 │ ⚠️ Partiel │ ❌ Critique │
├─────┼──────────────────────────┼────────────────────┼──────────┼──────────────┼─────────────┤
│ 17 │ ANALYTICS │ Clients & Insights │ 3.0 / 10 │ ❌ Débranché │ ❌ Critique │
├─────┼──────────────────────────┼────────────────────┼──────────┼──────────────┼─────────────┤
│ 18 │ REPORTS │ Clients & Insights │ 6.5 / 10 │ ✅ Connecté │ ⚠️ Moyen │
├─────┼──────────────────────────┼────────────────────┼──────────┼──────────────┼─────────────┤
│ 19 │ AUDIT │ Clients & Insights │ 6.5 / 10 │ ✅ Connecté │ ⚠️ Moyen │
├─────┼──────────────────────────┼────────────────────┼──────────┼──────────────┼─────────────┤
│ 20 │ CONTENT │ Marketing │ 7.0 / 10 │ ✅ Connecté │ ⚠️ Moyen │
├─────┼──────────────────────────┼────────────────────┼──────────┼──────────────┼─────────────┤
│ 21 │ CAMPAIGNS │ Marketing │ 2.0 / 10 │ ❌ Débranché │ ❌ Critique │
├─────┼──────────────────────────┼────────────────────┼──────────┼──────────────┼─────────────┤
│ 22 │ COUPONS │ Marketing │ 6.0 / 10 │ ✅ Connecté │ ⚠️ Moyen │
├─────┼──────────────────────────┼────────────────────┼──────────┼──────────────┼─────────────┤
│ 23 │ LOYALTY │ Marketing │ 3.0 / 10 │ ❌ Débranché │ ❌ Critique │
├─────┼──────────────────────────┼────────────────────┼──────────┼──────────────┼─────────────┤
│ 24 │ AFFILIATES │ Marketing │ 5.0 / 10 │ ⚠️ Partiel │ ⚠️ Moyen │
├─────┼──────────────────────────┼────────────────────┼──────────┼──────────────┼─────────────┤
│ 25 │ NOTIFICATIONS │ Marketing │ 4.0 / 10 │ ⚠️ Partiel │ ❌ Critique │
├─────┼──────────────────────────┼────────────────────┼──────────┼──────────────┼─────────────┤
│ 26 │ MESSAGES │ Marketing │ 6.0 / 10 │ ✅ Connecté │ ⚠️ Moyen │
├─────┼──────────────────────────┼────────────────────┼──────────┼──────────────┼─────────────┤
│ — │ Cohérence Admin → Mobile │ Transversal │ 6.5 / 10 │ — │ ⚠️ Moyen │
├─────┼──────────────────────────┼────────────────────┼──────────┼──────────────┼─────────────┤
│ — │ Qualité UI Admin globale │ Transversal │ 7.5 / 10 │ — │ ✅ Bon │
├─────┼──────────────────────────┼────────────────────┼──────────┼──────────────┼─────────────┤
│ — │ Ergonomie globale │ Transversal │ 7.0 / 10 │ — │ ⚠️ Moyen │
└─────┴──────────────────────────┴────────────────────┴──────────┴──────────────┴─────────────┘

Moyenne fonctionnelle (25 modules) : 5.7 / 10

---

AUDIT DÉTAILLÉ PAR MODULE (résumé)

MODULE 1 — AUTH | 7.0/10 | ✅ Connecté

Points forts : Token refresh avec file d'attente, hasPermission mémoïsé avec wildcard, architecture 3 couches stricte.

- ❌ logout() est un no-op — le token JWT n'est jamais révoqué côté serveur
- ❌ LoginPage.tsx expose les credentials de démo en dur (admin@expressafri.com / admin123) en production
- ❌ verifyPassword appelle /auth/login — crée un access token inutile côté serveur
- ⚠️ Flash de page de connexion au démarrage (admin=null avant résolution)
- Manque : 2FA, session timeout, page reset mot de passe admin

---

MODULE 2 — DASHBOARD | 6.0/10 | ✅ Connecté

Points forts : Skeleton loading granulaire, sélecteur de période, garde store manager.

- ❌ getRevenueChart() et getOrdersChart() retournent [] en dur — graphiques toujours vides
- ❌ Onglets Entonnoir, Cohortes, Paniers abandonnés : tous stubs retournant []
- ❌ exportReport() lève une exception non traduite
- ⚠️ Titres graphiques codés en dur quelle que soit la période sélectionnée

---

MODULE 3 — ADMINS | 7.0/10 | ✅ Connecté

- ❌ PasswordModal : pas de confirmation de mot de passe — une faute de frappe est irréversible
- ❌ Aucune validation de force du mot de passe (accepte "1")
- ❌ Aucun debounce sur la recherche — chaque frappe déclenche une requête API
- ⚠️ Filtre par rôle alimenté par une constante statique — les rôles personnalisés n'y apparaissent pas

---

MODULE 4 — ROLES | 7.0/10 | ✅ Connecté

Points forts : PermissionMatrix ressource×action, protection super admin, validation "≥1 permission".

- ⚠️ EditRoleModal ne réinitialise pas le formulaire à l'ouverture : valeurs non sauvegardées persistent
- ❌ Filtre admin par rôle alimente par ROLES statique — rôles personnalisés invisibles
- ⚠️ Aucun compteur d'admins par rôle avant suppression

---

MODULE 5 — ORDERS | 7.0/10 | ✅ Connecté

Points forts : Machine d'état exhaustive, idempotence checkout, auto-création reçu à delivered.

- ❌ toOrder() ne mappe pas statusLog → timeline toujours vide en production
- ❌ STATUS_FLOW manque confirmed→processing, processing→shipped, partially_shipped → commandes bloquées
- ❌ refund() appelle PUT /orders/:id/status sans jamais appeler POST /payments/:id/refund → aucun remboursement financier effectué

---

MODULE 6 — PAYMENTS | 8.5/10 | ✅ Connecté ✅

Points forts : Idempotence webhook HMAC SHA-256, validation Zod, MockPaymentProvider désactivé en prod.

- ⚠️ toPayment() ne mappe pas failedAt — chronologie incomplète
- ⚠️ Méthodes de paiement hardcodées dans les filtres, indépendantes du CMS

---

MODULE 7 — PAYOUTS | 4.0/10 | ⚠️ Partiel ❌

- ❌ process() positionne 'completed' au lieu de 'processing' → état intermédiaire jamais atteint
- ❌ getSummary() retourne des champs nommés différemment → 3 StatCards sur 4 affichent undefined
- ❌ Statut 'paid' (frontend) ≠ 'completed' (DB) → filtre 'paid' retourne toujours 0 résultats
- ❌ cancel() préfixe reason avec \_ → raison de refus jamais persistée
- ❌ processPayout() envoie { processedBy: '' } → ID admin jamais transmis

---

MODULE 8 — DISPUTES | 7.5/10 | ✅ Connecté ✅

Points forts : Cycle de vie complet, fil de messages avec types riches, mise à jour optimiste.

- ⚠️ Hook useAssignDispute non exposé → assignation inaccessible depuis l'UI
- ❌ Deux appels simultanés dont un à limit:200 pour calculer des compteurs → pas d'endpoint /disputes/summary

---

MODULE 9 — RETURNS | 3.5/10 | ❌ Débranché ❌

- ❌ GET /returns/summary n'existe pas → capturé par @Get(':id') avec id='summary' → 4 StatCards en erreur permanente
- ❌ Pas de JOIN customers → noms et emails toujours vides
- ❌ Pas de JOIN returnItems → colonne "Articles" affiche toujours "0"
- ❌ refundMethod et rejectionReason écrits dans notes au lieu des colonnes dédiées
- ❌ Aucun PermissionGuard sur les actions de mutation

---

MODULE 10 — RECEIPTS | 7.0/10 | ✅ Connecté

Points forts : Preview temps réel, invalidation granulaire, cycle de vie complet.

- ⚠️ Invalidation de préfixe ['admin','receipts'] déclenche refetch des settings à chaque opération
- ⚠️ orderId accepte n'importe quelle chaîne sans validation UUID

---

MODULE 11 — PRODUCTS | 7.0/10 | ✅ Connecté

Points forts : DTOs class-validator complets, suppression intelligente (soft/hard), ParseUUIDPipe.

- ❌ sortBy/sortOrder dans ProductQueryDto — ignorés silencieusement par list()
- ❌ moderate : tout utilisateur JWT sans storeId peut modérer des produits
- ❌ Export produits : lève une exception sans avertissement utilisateur
- ❌ N+1 systématique via assertOwnership() pour les gérants de boutique

---

MODULE 12 — CATEGORIES | 6.0/10 | ✅ Connecté

- ❌ DELETE /categories/:id : pas de cascade → sous-catégories orphelines ou erreur FK
- ❌ Aucun contrôle de rôle : un gérant de boutique peut créer/modifier/supprimer des catégories globales
- ❌ Upload image en base64 → peut dépasser la limite body NestJS (413)
- ❌ GET /categories sans pagination

---

MODULE 13 — STORES | 4.0/10 | ❌ Débranché ❌

- ❌ updateKyc() fait un GET au lieu d'un PUT → mise à jour KYC silencieusement ignorée
- ❌ reactivate() envoie { status: 'active' } → statut inexistant → boutiques restent suspendues
- ❌ approve() appelle le mauvais endpoint (/kyc/approve au lieu de changement de statut boutique)
- ❌ toStore() : ownerName contient le nom de la boutique (pas du propriétaire), city toujours vide
- ❌ GET /stores/:id/kyc accessible cross-tenant : gérant boutique A peut lire le KYC de la boutique B

---

MODULE 14 — DELIVERY | 5.5/10 | ❌ Débranché ❌

- ❌ rateAssignment retourne assignment mais la DataSource attend { assignment, person } → notation en échec silencieux
- ❌ Statuts 'picked-up'/'in-transit' (tirets, frontend) ≠ 'picked_up'/'in_transit' (underscores, API) → comparaisons toujours
  fausses
- ❌ deletePerson() sans vérification des assignations actives → commandes avec deliveryPersonId dangling
- ❌ Aucun RBAC dans DeliveryController → gérant de boutique peut gérer les livreurs

---

MODULE 15 — SHIPPING | N/A | ❌ Absent ❌

AdminShippingDataSource.ts existe côté admin mais aucun contrôleur, service ou module n'existe dans l'API. Entièrement non
implémenté.

---

MODULE 16 — CUSTOMERS | 5.5/10 | ⚠️ Partiel ❌

- ❌ Colonne isBanned absente du schéma Drizzle → bannissement est un no-op total en production
- ❌ getCustomerOrders lève une exception → AdminCustomerDetailPage crashe à chaque rendu
- ❌ Race condition dans setDefaultAddress : deux UPDATE séquentiels sans transaction
- ⚠️ totalOrders et totalSpent jamais incrémentés → toujours 0

---

MODULE 17 — ANALYTICS | 3.0/10 | ❌ Débranché ❌

- ❌ topProducts: [], topCategories: [], revenueByPayment: [], geographicData: [] hardcodés
- ❌ conversionRate: 2.4 hardcodé en dur — jamais calculé
- ❌ revenueChart utilise COUNT(\*) au lieu de SUM(total) → affiche le nombre de commandes, pas le CA
- ❌ 3 divisions par zéro non protégées → NaN affiché dans les StatCards
- ❌ getFunnelData(), getCohortData(), getAbandonedCartData() : tous stubs []

---

MODULE 18 — REPORTS | 6.5/10 | ✅ Connecté

- ❌ POST /reports est @Public() sans rate limiting → n'importe qui peut spammer depuis internet
- ❌ Aucun DTO de validation — tous body: any

---

MODULE 19 — AUDIT | 6.5/10 | ✅ Connecté

- ❌ AuditController.export() retourne du JSON mais la DataSource attend un blob CSV → fichier téléchargé contient du JSON
- ⚠️ AuditService ne capture pas l'acteur → logs d'audit entièrement anonymes

---

MODULE 20 — CONTENT | 7.0/10 | ✅ Connecté

Points forts : Upload throttlé, magic-byte validé, SVG rejeté, invalidation cache admin + mobile.

- ⚠️ useAdminReviews appelle l'API directement sans passer par la façade adminContentService
- ⚠️ 5 hooks non exportés depuis index.ts

---

MODULE 21 — CAMPAIGNS | 2.0/10 | ❌ Débranché ❌

- ❌ campaigns.service.ts utilise la table contentBlocks — la table campaigns n'existe pas dans le schéma DB
- ❌ contentBlocks n'a pas les champs attendus (startDate, endDate, budget, spent, impressions, clicks, conversions) → toutes les
  StatCards crashent sur undefined
- ❌ update() et delete() sans filtre groupName → peuvent écraser/supprimer n'importe quel content block
- ❌ Aucun DTO, aucun ParseUUIDPipe

---

MODULE 22 — COUPONS | 6.0/10 | ✅ Connecté

- ❌ firstTimeOnly stocké mais jamais vérifié dans validate() → utilisable par tout client
- ❌ applicableTo/applicableId non enforced → coupon restreint valide sur tout
- ❌ usedCount jamais incrémenté → la limite usageLimitTotal passe toujours

---

MODULE 23 — LOYALTY | 3.0/10 | ❌ Débranché ❌

- ❌ adjustPoints : WHERE loyaltyPoints.id = id mais reçoit le customerId → échec ou corruption
- ❌ Hook envoie { points } mais API attend body.balance → aucun ajustement ne prend jamais effet
- ❌ getTransactions() retourne [] (stub avec TODO explicite)
- ❌ loyaltyRules a FK storeId NOT NULL → création de règles sans storeId → erreur de contrainte DB

---

MODULE 24 — AFFILIATES | 5.0/10 | ⚠️ Partiel

- ❌ Endpoints gestion des codes affiliés absents du contrôleur → hooks useAffiliateCodes, useCreateCode → 404 en production
- ❌ rejectCommission() positionne 'reversed' au lieu de 'rejected' → filtre 'rejected' trouve toujours 0 résultats

---

MODULE 25 — NOTIFICATIONS | 4.0/10 | ⚠️ Partiel ❌

- ❌ sendTest et sendBatch : stubs retournant { sent: N, failed: 0 } sans aucun dispatch réel → aucune notification n'est jamais
  envoyée
- ❌ OutboxWorker ne traite que 3 types order.\* → tout événement marketing/campagne/fidélité perdu silencieusement

---

MODULE 26 — MESSAGES | 6.0/10 | ✅ Connecté

Points forts : Types de messages riches, enregistrement vocal, polling gradué.

- ❌ ADMIN_LIST hardcodé avec 4 admins fictifs → messages internes envoyés vers destinataires inexistants
- ⚠️ ChatWorkspace : composant de 822 lignes, impossible à tester unitairement

---

COHÉRENCE ADMIN ↔ MOBILE | 6.5/10 ⚠️

Désalignements critiques :

- ❌ Statuts commandes incompatibles : admin (confirmed, shipped, delivered) ↔ mobile (toShip, shipped, toReview) — bijection non
  documentée
- ❌ MOCK_METHODS ['Orange Money', 'Wave', 'Carte Visa', 'Mobile Money'] hardcodé dans les filtres — indépendant du CMS admin
- ❌ Notifications push sans champ deepLink → push "commande expédiée" ne peut pas ouvrir /orders/tracking
- ❌ Wallet client sans aucune interface admin (crédit manuel, historique bonus)
- ⚠️ TRACKING_STEPS mobile (transit) ≠ SHIPMENT_STATUS admin (in_transit) — format de clé différent
- ❌ Motif de rejet KYC hardcodé 'Documents non conformes' — l'admin ne peut pas saisir un motif libre

---

QUALITÉ UI/UX GLOBALE

┌───────────────┬───────────┐
│ Dimension │ Score │
├───────────────┼───────────┤
│ Design System │ 7.5/10 ✅ │
├───────────────┼───────────┤
│ Ergonomie │ 7.0/10 ⚠️ │
└───────────────┴───────────┘

Points forts : StatusBadge branché sur status.ts (17 maps), DataTable avec virtualisation >50 lignes, dark mode complet,
ConfirmDialog systématique, sidebar avec badge non-lus.

Problèmes :

- ❌ Sidebar non responsive — aucun overlay drawer sur mobile (<640px) → admin inutilisable sur tablette
- ❌ dateFrom === dateTo dans AdminOrderListPage → impossible de filtrer sur une plage de dates
- ❌ Aucun raccourci clavier, pas de command palette (Cmd+K)
- ⚠️ mobile/stores/index.tsx : textes hardcodés en français sans useTranslation()
- ⚠️ Icône Star dupliquée : "Avis clients" et "Fidélité" indistinguables en mode réduit

---

TOP 10 DES PROBLÈMES CRITIQUES (priorité absolue)

┌─────┬──────────────────────────────────────────────────────────────┬───────────────────────────────┬─────────────────────────┐
│ # │ Problème │ Fichier │ Impact │
├─────┼──────────────────────────────────────────────────────────────┼───────────────────────────────┼─────────────────────────┤
│ 1 │ CAMPAIGNS : feature sur la mauvaise table SQL │ campaigns.service.ts │ Données corrompues, │
│ │ │ │ crashs │
├─────┼──────────────────────────────────────────────────────────────┼───────────────────────────────┼─────────────────────────┤
│ 2 │ STORES : 4 bugs bloquants DataSource (GET au lieu de PUT, │ ApiAdminStoreDataSource.ts │ Toutes actions boutique │
│ │ mauvais endpoint approve, mapper incorrect) │ │ sans effet │
├─────┼──────────────────────────────────────────────────────────────┼───────────────────────────────┼─────────────────────────┤
│ 3 │ ANALYTICS : données entièrement hardcodées (CA=COUNT, │ analytics.service.ts │ Décisions sur fausses │
│ │ conversionRate=2.4, 4 sections vides) │ │ données │
├─────┼──────────────────────────────────────────────────────────────┼───────────────────────────────┼─────────────────────────┤
│ 4 │ LOYALTY : ajustement de points impossible (WHERE id vs │ loyalty.service.ts + hook │ Feature inutilisable │
│ │ customerId, field points vs balance) │ │ │
├─────┼──────────────────────────────────────────────────────────────┼───────────────────────────────┼─────────────────────────┤
│ 5 │ RETURNS : 5 bugs bloquants cumulés (/summary → 404, pas de │ returns.controller.ts + │ Module entièrement │
│ │ JOIN clients/items, champs mal mappés) │ service │ cassé │
├─────┼──────────────────────────────────────────────────────────────┼───────────────────────────────┼─────────────────────────┤
│ 6 │ CUSTOMERS : bannissement = no-op (colonne isBanned absente │ schema/customers.ts │ Sécurité plateforme │
│ │ du schéma Drizzle) │ │ │
├─────┼──────────────────────────────────────────────────────────────┼───────────────────────────────┼─────────────────────────┤
│ 7 │ PAYOUTS : triple désalignement API/frontend (statuts paid vs │ payouts.service.ts + │ 3 StatCards undefined │
│ │ completed, champs getSummary) │ DataSource │ │
├─────┼──────────────────────────────────────────────────────────────┼───────────────────────────────┼─────────────────────────┤
│ 8 │ DELIVERY : statuts tirets vs underscores + rateAssignment │ delivery.service.ts + │ Suivi livraison cassé │
│ │ retour incorrect │ DataSource │ │
├─────┼──────────────────────────────────────────────────────────────┼───────────────────────────────┼─────────────────────────┤
│ 9 │ AUTH : token JWT jamais révoqué à la déconnexion │ ApiAdminAuthDataSource.ts │ Faille sécurité │
│ │ │ │ critique │
├─────┼──────────────────────────────────────────────────────────────┼───────────────────────────────┼─────────────────────────┤
│ 10 │ ORDERS + PAYMENTS : remboursement ne rembourse rien (PUT │ ApiAdminOrderDataSource.ts │ Perte financière client │
│ │ /status sans appeler POST /payments/refund) │ │ │
└─────┴──────────────────────────────────────────────────────────────┴───────────────────────────────┴─────────────────────────┘

---

SCORE GLOBAL FINAL

┌──────────────────────────────────────────────────────────────────────────────────────────────┬───────┬───────┐
│ Catégorie │ Poids │ Score │
├──────────────────────────────────────────────────────────────────────────────────────────────┼───────┼───────┤
│ Modules critiques débranchés (Campaigns, Stores, Analytics, Loyalty, Returns) │ 25% │ 3.0 │
├──────────────────────────────────────────────────────────────────────────────────────────────┼───────┼───────┤
│ Modules transactionnels (Orders, Payments, Payouts, Disputes, Receipts) │ 20% │ 6.8 │
├──────────────────────────────────────────────────────────────────────────────────────────────┼───────┼───────┤
│ Core Admin (Auth, Dashboard, Admins, Roles) │ 15% │ 6.75 │
├──────────────────────────────────────────────────────────────────────────────────────────────┼───────┼───────┤
│ Modules partiellement fonctionnels (Customers, Delivery, Affiliates, Coupons, Notifications) │ 20% │ 5.1 │
├──────────────────────────────────────────────────────────────────────────────────────────────┼───────┼───────┤
│ Modules marketing connectés (Content, Messages, Reports, Audit) │ 10% │ 6.6 │
├──────────────────────────────────────────────────────────────────────────────────────────────┼───────┼───────┤
│ UI / Design System / Ergonomie │ 10% │ 7.0 │
└──────────────────────────────────────────────────────────────────────────────────────────────┴───────┴───────┘

Score global : 5.5 / 10

---

Estimation pour atteindre 8.0/10 : 6 à 8 semaines back-end + 2 semaines de tests d'intégration, en priorisant dans cet ordre :
correction du mapper ApiAdminStoreDataSource, création de la table campaigns, endpoint GET /returns/summary + JOINs, colonne
isBanned Drizzle, alignement statuts Payouts, révocation token JWT à la déconnexion.
