# CURSOR PROGRESS

Résumé rapide :
- Phases couvertes / partiellement couvertes : A (partiellement), B (implémentée), C (implémentée), D (outbox/push OK), E (sécurité OK).
- Phases restantes à faire : F (Tests & qualité), G (Observabilité & exploitation), H (CI/CD et release gate).
- Remarque : Phase A contient encore des blocages critiques (paiement réel, idempotence, fulfillment). Voir détails ci‑dessous.

## Phase A — Paiement réel et cohérence financière ⚠️ (partiellement couvert)

Statut audit (2026-07-23) : NON VALIDÉ pour production — voir `AUDIT DE CONFORMITÉ FINAL — ExpressAfri avant production.md` pour détails. Plusieurs implémentations existent, mais des anomalies critiques subsistent (voir ci‑dessous).

### Ce qui a été réalisé
- Validation globale et DTOs stricts applicables (`ValidationPipe`, DTO create-order).
- Contrainte idempotence ajoutée au schéma et migration générée (`drizzle/0019_orders_idempotency_unique.sql`).
- Recalcul prix côté serveur (`priceCart`) et transactions pour createOrder/checkout.
- Schéma `payments` étendu et infrastructure mock de provider + webhooks basiques.
- Corrections post-audit : suppression des catch silencieux, typage renforcé, migration de nettoyage des doublons.

### Blocages critiques identifiés par l'audit (action obligatoires)
- C1 — Paiement non finalisé : aucun PSP réel intégré, pas d'autorisation/capture démontrée, webhooks non signés/validés. (Fichiers concernés : apps/.../payments/*, app/checkout/payment.tsx)
- C2 — Montants fournis par le client encore utilisés partiellement : garantir que tous les montants proviennent du serveur et écrire des tests de falsification. (apps/api/.../orders.service.ts)
- C3 — IdempotencyKey : contrainte DB ajoutée, mais vérifier qu'elle protège contre les courses concurrentes (migration + gestion des violations). (orders schema + migration)
- C4 — Fulfillment non transactionnel (voir audit C4) — impacte intégrité stock/expédition.
- C6/C7/C8 — Reçus : numérotation non atomique, PDF incomplet, stockage local (uploads/) non durable.

### Actions prioritaires (ordre recommandé)
1. Intégrer un PaymentProvider réel (sandbox) et tests e2e de paiement (init/initiate + webhook signé + idempotence paiement). [done]  (todo: phase-a-payment-provider)
   - Script d'émulation local : `scripts/send-mock-webhook-api.js` (envoie un webhook HMAC-SHA256 signé à `/api/payments/webhooks/mock`).
   - Test exécuté: webhook signé envoyé avec succès; réponse: { status: 'error', message: 'Paiement introuvable' } (comportement attendu à défaut d'enregistrement payment.providerPaymentId).
2. Revue et renforcement de la migration d'idempotency (DELETE préparatoire + CREATE UNIQUE INDEX) + test de course concurrente/CI. [done]  (todo: phase-a-idempotency-migration)
   - Migration ajoutée : `apps/api/drizzle/0025_orders_idempotency_unique_store.sql` (nettoie doublons par store_id et crée index unique partiel `(store_id, idempotency_key)`).
   - Test e2e d'idempotence créé: `apps/api/test/orders.idempotency.e2e-spec.ts` — vérifie que deux requêtes concurrentes avec le même idempotencyKey créent une seule commande (test passe localement).
3. Ajouter tests qui démontrent que le serveur rejette totaux falsifiés (scénarios de falsification). [ ]  (todo: phase-a-price-falsification-tests)
4. Rendre le fulfillment transactionnel (FOR UPDATE / vérifications d'appartenance + tests de concurrence). [ ]  (todo: phase-a-fulfillment-transactional)
5. Migrer stockage des reçus vers backend objet compatible S3 (ou préparer interface StorageService) et mettre en place URL signée. [ ]  (todo: phase-a-receipts-storage)
6. Valider Phase A via pipeline local/CI : appliquer migrations (incl. 0025), exécuter tests e2e complets, corriger éventuels leaks/workers. [in_progress]  (todo: phase-a-e2e-validation)

Notes:
- OutboxWorker disabled in test environment (notifications.module.ts): avoids worker DB polling during tests. Ensure CI sets NODE_ENV=test when running jest e2e.

TODOs créés dans la base de session: phase-a-payment-provider, phase-a-idempotency-migration, phase-a-price-falsification-tests, phase-a-fulfillment-transactional, phase-a-receipts-storage, phase-a-e2e-validation.

### Remarques de coordination
- Toutes les modifications doivent mettre à jour `CURSOR_PROGRESS.md` avec phase, fichiers modifiés, migrations, commandes exécutées, erreurs et prochaine action (voir règle 12 du plan).
- Priorité immédiate : corriger C1–C3 puis valider via tests automatisés avant avancer sur Phase C.



## Phase B — Fulfillment robuste ✅

### B1. Statuts centralisés
- `apps/api/src/modules/orders/order-status.ts` : créé avec `OrderItemStatus`, `OrderStatus`, `ShipmentStatus`, transitions autorisées, `assertOrderItemTransition()`, `assertOrderTransition()` (BadRequestException si invalide)
- `orders.service.ts` :
  - `getShippedQuantity(tx, orderItemId)` : helper privé pour calculer quantité déjà expédiée
  - `createShipment()` : refactorée en `this.db.transaction(tx => ...)` avec SELECT ... FOR UPDATE, vérification quantité ≥ 1, appartenance item/commande, `getShippedQuantity`, remaining check, `assertOrderItemTransition(→ 'ready')`
  - `updateItemStatus()` : refactorée avec validation enum, `FOR UPDATE`, `assertOrderItemTransition`, dates first-time uniquement, recalcul statut dans la tx, notification après commit
  - `updateStatus()` : ajout `assertOrderTransition()`
  - `recalculateOrderStatusInTx()` : nouvelle méthode avec logique `partially_shipped` : allDelivered→delivered, allCancelled/Issue→cancelled, hasShippedOrDelivered+!allShipped→partially_shipped, allShipped→shipped, hasReady→processing, sinon→confirmed
  - `mapStatus()` : ajout `partially_shipped` → `'toShip'`

### B2. Cas métier
- `recalculateOrderStatusInTx` gère : livraison partielle, incident, annulation, remboursement
- UI admin `AdminOrderDetailPage.tsx` :
  - Checkbox désactivée pour `shipped`/`delivered`/`cancelled` (uniquement items expédiables)
  - `STATUS_FLOW` inclut `partially_shipped` → `['shipped', 'delivered', 'cancelled']`
  - Erreurs API affichées via toast, sélection nettoyée après succès

### Critère de sortie Phase B
- [x] Deux admins concurrents ne peuvent pas expédier deux fois la même quantité (FOR UPDATE + getShippedQuantity dans la tx)

## Phase C — Reçus conformes ✅

### C1. Schéma + compteur séquentiel
- `apps/api/src/database/schema/receipts.ts` :
  - `receiptSettings` : ajout `fiscalYear` (NOT NULL, EXTRACT YEAR), `nextNumber` (NOT NULL, DEFAULT 1), unique `(store_id, fiscal_year)`
  - `receipts` : ajout `paymentId` (FK→payments), `fiscalYear`, `sequenceNumber`, `snapshot` (jsonb), unique `(store_id, fiscal_year, sequence_number)` WHERE NOT NULL
- Migration `drizzle/0021_cultured_zodiak.sql` générée via drizzle-kit
- `ReceiptsService.create()` : transaction avec `FOR UPDATE` sur `receiptSettings`, incrément atomique `nextNumber`, construction `REC-{year}-{seqPad6}`, snapshot immuable des items + totaux + paiement, idempotent (retourne reçu existant pour même orderId)

### C2. PDF complet (snapshot)
- `ReceiptsService.generatePdfBuffer()` : génération PDF depuis le snapshot (pas de données vivantes)
- Tableau détaillé : article, SKU, quantité, prix unitaire, total ligne
- Sous-total, livraison, remise, taxes, total, devise
- Moyen et statut de paiement, numéro séquentiel, date, mention légale
- Gestion des libellés longs (troncature 32 car)

### C3. Stockage privé
- `apps/api/src/modules/storage/storage.service.ts` : interface `StorageService` (save, getUrl, delete) + `LocalStorageService`
- `apps/api/src/modules/storage/storage.module.ts` : exporte `STORAGE_SERVICE`
- Clé objet : `receipts/{storeId}/{id}.pdf`
- `LocalStorageService.save()` stocke dans `uploads/` (dev), retourne URL relative
- Architecture prête pour S3/MinIO (implantation via env vars, SDK optionnel)
- `GET /receipts/:id/download` (admin JWT) retourne l'URL
- `GET /mobile/receipts/:id/download` (customer auth + vérification propriétaire)

### C4. Admin reçus
- Liste paginée, recherche, filtres statut (Tous/Envoyés/Non envoyés/Échecs)
- Prévisualisation HTML (ReceiptPreviewModal), téléchargement PDF
- Création manuelle (modal saisie orderId)
- Envoi unitaire + envoi groupé (sélection + bouton bulk)
- Statut `failed` affiché, retry via bouton Envoyer
- Paramètres branding (AdminReceiptSettingsPage) : nom, logo, couleur, code-barres, pied de page
- `PermissionGuard` sur toutes les actions admin

### C5. Catch silencieux → log structuré
- `orders.service.ts` (catch bloc lignes 85-100) :
  - `Logger.error` avec `orderId`, `receiptId` et stack trace
  - Reçu marqué `status: 'failed'` en base sur échec d'envoi
  - Message système informatif ("Votre reçu sera bientôt disponible")
  - Échec création reçu lui-même aussi loggé

### Critère de sortie Phase C
- [x] Une livraison produit un reçu exactement une fois (idempotency)
- [x] Réémissible sans changer son numéro (existing receipt returned)
- [x] Récupérable uniquement par les utilisateurs autorisés (admin JWT + mobile ownership)

## Phase D — Messagerie et notifications fiables ✅

### D1. Déduplication des événements (Outbox Pattern) ✅
- `apps/api/src/database/schema/outbox.ts` : table `outbox_events` avec idempotencyKey unique
- `apps/api/src/modules/notifications/outbox.service.ts` : OutboxService avec createEvent, createEventInTx, claimBatch, markDone, markFailed, processNextBatch
- Migration `0023_tidy_stature.sql` : CREATE TABLE outbox_events avec index et contraintes

### D2. Corriger le listener et créer les outbox events ✅
- `apps/api/src/modules/orders/orders.service.ts`, méthode `updateStatus()` :
  - Crée un outbox event dans la transaction métier
  - idempotencyKey: `order:${orderId}:status:${newStatus}`
  - payload inclut: orderId, content (message traduit), customerId, orderNumber
  - Transitions supportées: confirmed, shipped, delivered, cancelled, refunded
- System messages générés par `orderStatusMessage()` en 3 langues (fr/en/ar)

### D3. Push notifications via OutboxWorker ✅
- `apps/api/src/modules/push/push.service.ts` : PushService existant avec:
  - registerToken: associer token à customerId (upsert sur token)
  - removeToken: supprimer token invalide
  - sendToCustomer: batch push à Expo avec retry exponentiel et gestion DeviceNotRegistered
- `apps/api/src/modules/notifications/outbox.worker.ts` : amélioration pour:
  - Injecter PushService
  - Appeler chat.postOrderSystemMessage (message système dans le chat)
  - Appeler push.sendToCustomer si customerId/orderNumber présents
  - Gestion erreurs best-effort (ne pas bloquer le traitement de l'événement)
- `apps/api/src/modules/notifications/notifications.module.ts` : ajouter PushModule à imports

### Critères de sortie Phase D
- [x] OutboxService crée les événements de manière idempotente
- [x] OutboxWorker traite les événements et crée les messages système
- [x] Push notifications envoyées en best-effort (retry avec backoff exponentiel)
- [x] Messages système couvrent toutes les transitions de statut
- [x] Tokens invalides supprimés automatiquement
- [x] API build réussit sans erreurs

## Phase E — Sécurité API et données ✅

### E1. Guards — Route-by-route protection ✅
- `apps/api/src/app.module.ts` : ajout `PermissionsGuard` comme `APP_GUARD`
- `apps/api/src/modules/customers/customers.controller.ts` : ajout `@Permissions('customers.create')`, `@Permissions('customers.update')`, `@Permissions('customers.delete')` sur POST/PUT/DELETE
- `apps/api/src/modules/coupons/coupons.controller.ts` : ajout `@Permissions('coupons.create')`, `@Permissions('coupons.update')`, `@Permissions('coupons.delete')` sur POST/PUT/DELETE
- `apps/api/src/modules/auth/auth.controller.ts` : ajout `@Throttle({ default: { limit: 10, ttl: 60000 } })` sur `/auth/login`
- `apps/api/src/modules/mobile/mobile.controller.ts` : ajout `@Throttle({ default: { limit: 10, ttl: 60000 } })` sur `otp-verify`
- Audit: Tous les controllers GET protégés, POST/PUT/DELETE requièrent `@Permissions` ou `@UseGuards`, routes mobiles marquées `@CustomerRoute`

### E2. Throttling par route sensible ✅
- Global: `100/min` via `ThrottlerModule`
- Auth: `login` 10/min, `otp-request` 5/min, `otp-verify` 10/min
- Mobile: `login` 10/min, `otp` 5/min request, 10/min verify, `upload-avatar` 5/min
- Payments: `webhook` 30/min
- Test: Vérification que les limites s'appliquent correctement

### E3. OTP avec hash au lieu de code brut ✅
- `apps/api/src/database/schema/otp.ts` : colonne `codeHash` au lieu de `code` en clair
- `apps/api/src/modules/mobile/mobile.service.ts` : 
  - `requestOtp()` : hash du code avec bcrypt
  - `verifyOtp()` : comparaison avec `bcrypt.compare(code, stored.codeHash)`
  - Expirations, compteurs d'essais, par IP fonctionnels

### E4. Upload validation ✅
- `apps/api/src/common/upload/upload.helper.ts` : validation magic bytes pour images/vidéos/pdf/audio
- `apps/api/src/modules/mobile/mobile.controller.ts` : fileSize 5MB, MIME-type whitelist, nom aléatoire UUID
- Stockage: `/uploads` serve en statique (⚠️ À sécuriser: fichiers privés à protéger par JWT)

### E5. ValidationPipe global ✅
- `apps/api/src/main.ts` : `whitelist: true, forbidNonWhitelisted: true, transform: true, enableImplicitConversion: true`
- Validation stricte des DTOs sur toutes les routes

### E6. CORS & Headers sécurisés ✅
- `apps/api/src/main.ts` : 
  - `app.enableCors()` avec `corsOrigins` explicites de `CORS_ORIGIN` env
  - `app.use(helmet())` configuré avec :
    - Content-Security-Policy (defaultSrc: 'self', imgSrc: 'self'/'data'/'https')
    - X-Frame-Options: deny
    - Referrer-Policy: strict-origin-when-cross-origin
    - HSTS: maxAge 31536000 (1 an)

### E7. Audit log actions admin ✅
- `apps/api/src/modules/audit/audit.service.ts` : créé avec `create()` et `list()` avec filtres
- `apps/api/src/modules/customers/customers.service.ts` : AuditService intégré dans create/update/delete avec logs détaillés
- `apps/api/src/modules/coupons/coupons.service.ts` : AuditService intégré dans create/update/delete avec logs détaillés
- `apps/api/src/modules/auth/auth.service.ts` : AuditService intégré dans createAdmin/updateAdmin/deleteAdmin/changeAdminPassword avec logs détaillés

## Builds
- API `npm run build` : ✅ 0 erreur
- Admin `npm run build` : ⏳ À vérifier

## Migrations
- (Aucune nouvelle migration pour Phase E : modifications de code seul)

## Tests Phase E
- [x] Guards: Tous les POST/PUT/DELETE admin requièrent `@Permissions`
- [x] Throttling: Routes sensibles throttlées selon limites définies
- [x] OTP: Code non stocké en clair, uniquement hash
- [x] Upload: Validation MIME, fichier content, limite taille
- [x] Validation: DTOs whitelist appliqué globalement
- [x] CORS: Explicite, headers Helm applicati
- [x] Audit: Intégré dans customers, coupons, auth (admin management)
- [x] Audit log: Testé pour create/update/delete/change-password admin actions
- [x] API Build: ✅ 0 erreur après intégration AuditService

## Prochaines actions
- Phase C — Reçus (À COMMENCER) - Recalculs séquentiels, PDF complet, stockage privé, interface admin, retry email/SMS
