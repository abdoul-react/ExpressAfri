# PLAN FINAL D'IMPLÉMENTATION — ExpressAfri conformité production

# PLAN FINAL D'IMPLÉMENTATION — ExpressAfri
## Conformité production, emplacements exacts et code obligatoire
## 0\. Décision de release
Le commit audité est `6fdb45f1cf6db28641f801ba1ce52ef6eaa202e3`.

**Statut : NON VALIDÉ production.** Le code couvre une grande partie du plan initial, mais les points suivants restent bloquants : le checkout accepte encore des montants venant du client, aucun PSP réel et webhook signé n'est branché, l'idempotence n'est pas garantie par une contrainte unique démontrée, le fulfillment n'est pas transactionnel, les transitions sont insuffisamment contrôlées, le reçu n'a pas de séquence atomique ni de snapshot complet, le PDF est stocké sur le filesystem local, les notifications sont best-effort sans outbox, et la CI ne prouve pas les tests/lint/migrations.

Ce document est le plan de correction final. Cursor doit modifier le code réel, pas seulement ajouter des commentaires ou des exemples.

* * *
# 1\. Règles absolues pour Cursor
1. Lire `CURSOR_MASTER_PLAN.md`, ce document et le code réel avant chaque phase.
2. Ne pas recopier aveuglément les snippets : adapter aux types et services existants.
3. Chaque modification de schéma doit produire : fichier Drizzle, migration SQL, snapshot/journal Drizzle, seed compatible et test sur PostgreSQL vide et existant.
4. Utiliser `ValidationPipe` avec `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`.
5. Toute opération commande, paiement, stock, reçu et fulfillment doit être transactionnelle et idempotente.
6. Ne jamais faire confiance aux prix, taxes, remises, frais ou statuts fournis par le mobile.
7. Ne jamais stocker de données carte brutes. Utiliser un token PSP ou une page hébergée.
8. Ne jamais utiliser `any` dans les domaines commande/paiement/reçu/fulfillment pour contourner le typage.
9. Aucun `catch {}` silencieux sur une opération critique. Logger avec requestId et créer un événement de reprise.
10. Ne pas supprimer ou désactiver un test pour faire passer le build.
11. Ne faire aucun `git add`, `git commit` ou `git push`.
12. À chaque limite de contexte, mettre à jour `CURSOR_PROGRESS.md` à la racine avec phase, fichiers modifiés, migrations, commandes exécutées, erreurs et prochaine action.
13. Ne déclarer une phase terminée qu'après les critères de sortie et les tests associés.

* * *
# 2\. Phase A : corriger le checkout et le paiement
## A1. Validation globale de l'API
**Fichier exact :** `apps/api/src/main.ts`

Ajouter après la création de l'application et avant `app.listen(...)` :

```plain
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
}))
```

Ajouter les imports nécessaires depuis `@nestjs/common`.

**Fichier exact :** `apps/api/src/modules/mobile/dto/create-order.dto.ts`

Remplacer les propriétés libres par des DTO imbriqués validés :

```plain
import { Type } from 'class-transformer'
import {
  ArrayMinSize, IsArray, IsInt, IsOptional, IsString, IsUUID,
  IsIn, Min, IsEmail, MaxLength,
} from 'class-validator'

export class CreateOrderItemDto {
  @IsUUID()
  productId!: string

  @IsOptional()
  @IsUUID()
  variantId?: string

  @IsInt()
  @Min(1)
  quantity!: number
}

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[]

  @IsUUID()
  shippingAddressId!: string

  @IsString()
  @IsIn(['orange_money', 'wave', 'mobile_money', 'card', 'cod', 'wallet'])
  paymentMethod!: string

  @IsOptional()
  @IsString()
  @MaxLength(64)
  couponCode?: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string

  @IsString()
  @IsUUID()
  idempotencyKey!: string
}
```

## A2. Ajouter la contrainte d'idempotence
**Fichier exact :** `apps/api/src/database/schema/orders.ts`

Modifier l'import pour inclure `uniqueIndex`, puis la définition `orders` :

```plain
import { pgTable, uuid, text, timestamp, decimal, integer, jsonb, uniqueIndex } from 'drizzle-orm/pg-core'
```

À la fin des colonnes de `orders`, ajouter la configuration de table :

```plain
}, (table) => ({
  ordersIdempotencyKeyUnique: uniqueIndex('orders_idempotency_key_unique')
    .on(table.idempotencyKey),
}))
```

Si PostgreSQL contient déjà des doublons, écrire une migration de nettoyage contrôlé avant l'index. Ne jamais supprimer arbitrairement une commande : conserver la plus ancienne et journaliser les doublons.

**Migration obligatoire :** `apps/api/drizzle/<next>_orders_idempotency_unique.sql`

```sql
DELETE FROM orders a
USING orders b
WHERE a.idempotency_key IS NOT NULL
  AND a.idempotency_key = b.idempotency_key
  AND a.created_at > b.created_at;
CREATE UNIQUE INDEX IF NOT EXISTS orders_idempotency_key_unique
  ON orders (idempotency_key)
  WHERE idempotency_key IS NOT NULL;
```

Adapter le nom de migration au prochain numéro réel. Générer aussi le snapshot et le journal via Drizzle.
## A3. Recalculer le prix côté serveur
**Fichier exact :** `apps/api/src/modules/orders/orders.service.ts`, méthode `createFromCheckout`.

Ne plus utiliser directement : `data.subtotal`, `data.shippingCost`, `data.taxAmount`, `data.discountAmount`, `data.total`, `data.currency`.

Créer avant la transaction une méthode privée :

```plain
private async priceCart(tx: any, items: CreateOrderItemInput[], customerId?: string) {
  let subtotal = 0
  const pricedItems: PricedItem[] = []

  for (const input of items) {
    const [product] = await tx.select().from(products).where(and(
      eq(products.id, input.productId),
      eq(products.status, 'active'),
      eq(products.moderationStatus, 'approved'),
    )).limit(1)
    if (!product) throw new BadRequestException('Produit indisponible')

    const variant = input.variantId
      ? (await tx.select().from(productVariants).where(and(
          eq(productVariants.id, input.variantId),
          eq(productVariants.productId, product.id),
          eq(productVariants.isActive, true),
        )).limit(1))[0]
      : undefined

    if (input.variantId && !variant) throw new BadRequestException('Variante invalide')
    const unitPrice = Number(variant?.price ?? product.price)
    if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new BadRequestException('Prix invalide')

    const lineTotal = unitPrice * input.quantity
    subtotal += lineTotal
    pricedItems.push({ product, variant, quantity: input.quantity, unitPrice, lineTotal })
  }

  const shippingCost = await this.calculateShippingFromServer(tx, subtotal, customerId)
  const discount = await this.calculateCouponFromServer(tx, pricedItems, subtotal, customerId)
  const total = Math.max(0, subtotal + shippingCost - discount)
  return { pricedItems, subtotal, shippingCost, discount, tax: 0, total }
}
```

Adapter les noms de types et colonnes à ceux déjà présents. Le body client peut conserver des champs d'affichage, mais le serveur doit les ignorer pour les montants.

Dans la même méthode, exécuter prix, réservation/décrément stock, insertion order, order\_items, payment pending et status log dans **une seule transaction**. Utiliser un UPDATE conditionnel `stock >= quantity`. Si une ligne échoue, toute la transaction doit être rollback.

**Critère :** une requête avec `total: 1` pour un panier à 10000 ne crée jamais une commande à 1.
## A4. Créer le vrai cycle de paiement
**Fichiers à créer :**
*   `apps/api/src/modules/payments/providers/payment-provider.ts`
*   `apps/api/src/modules/payments/providers/mock-payment.provider.ts`
*   `apps/api/src/modules/payments/payment-webhook.service.ts`
*   `apps/api/src/modules/payments/dto/init-payment.dto.ts`

**Fichier à modifier :** `apps/api/src/database/schema/payments.ts`

Ajouter : `provider`, `providerPaymentId`, `failureCode`, `capturedAt`, `metadata`, `webhookEventId`, et index uniques partiels sur les clés provider/idempotency. Ajouter des checks SQL pour les statuts si le schéma du projet le permet.

Contrat minimal :

```plain
export interface PaymentProvider {
  readonly name: string
  initialize(input: {
    paymentId: string
    amount: string
    currency: string
    method: string
    returnUrl?: string
  }): Promise<{ providerPaymentId: string; checkoutUrl?: string; status: 'pending' | 'authorized' }>
  verifyWebhook(rawBody: Buffer, signature: string): boolean
  parseWebhook(rawBody: Buffer): { eventId: string; providerPaymentId: string; status: 'authorized' | 'captured' | 'failed' | 'refunded' }
}
```

Ne pas brancher un faux succès en production. Le provider mock ne doit fonctionner que si `NODE_ENV=test`.

**Fichier exact :** `apps/api/src/modules/payments/payments.controller.ts`

Ajouter :
*   `POST /payments/:orderId/initialize` protégé par client, avec DTO validé.
*   `POST /payments/webhooks/:provider` public mais protégé par signature brute et idempotence d'événement.

Le webhook doit :
1. vérifier la signature sur le body brut ;
2. retrouver le paiement par providerPaymentId ;
3. verrouiller la ligne dans une transaction ;
4. ignorer un événement déjà traité ;
5. vérifier montant/devise/commande ;
6. mettre à jour paiement et commande selon une machine d'état ;
7. créer un message système une seule fois ;
8. répondre 2xx seulement après persistance fiable.

Le mobile ne vide le panier qu'après `captured` ou après création confirmée pour COD. Pour carte, ne jamais envoyer le numéro/CVV au backend ExpressAfri.

* * *
# 3\. Phase B : fulfillment partiel sûr
## B1. Statuts centralisés
**Fichier à créer :** `apps/api/src/modules/orders/order-status.ts`

Définir les unions `OrderItemStatus`, `OrderStatus`, `ShipmentStatus`, les transitions autorisées et une fonction `assertTransition(from, to)` qui lance `BadRequestException` si invalide.

**Fichier exact :** `apps/api/src/modules/orders/orders.service.ts`

Modifier `createShipment` pour utiliser `this.db.transaction(async (tx) => ...)` et :

```plain
for (const requested of data.items) {
  if (requested.quantity < 1) throw new BadRequestException('Quantité invalide')
  const [item] = await tx.select().from(orderItems).where(and(
    eq(orderItems.id, requested.orderItemId),
    eq(orderItems.orderId, orderId),
  )).for('update')
  if (!item) throw new BadRequestException('Article hors commande')

  const alreadyShipped = await this.getShippedQuantity(tx, item.id)
  const remaining = item.quantity - alreadyShipped
  if (requested.quantity > remaining) throw new BadRequestException('Quantité déjà expédiée')
  assertItemTransition(item.status ?? 'pending', 'ready')
}
```

Créer le shipment, les shipment\_items et les statuts dans la même transaction. Ajouter une contrainte ou une vérification empêchant deux lignes actives sur le même `orderItemId` avec quantité cumulée supérieure à la quantité commandée.

Modifier `updateItemStatus` pour :
*   valider l'enum ;
*   vérifier que l'item appartient à la commande ;
*   vérifier la transition ;
*   fixer les dates uniquement lors de la première transition ;
*   insérer un event d'audit ;
*   recalculer le statut global dans la transaction ;
*   émettre l'événement après commit via outbox.
## B2. Cas métier obligatoires
Tester et implémenter :
*   3 articles prêts sur 5 : expédition de 3 seulement ;
*   1 article en incident : les 4 autres restent expédiables ;
*   seconde expédition du même article au-delà de la quantité : refus ;
*   livraison partielle : statut global `partially_shipped` ou projection documentée ;
*   tous livrés : `delivered` ;
*   tous annulés/en incident : `cancelled` uniquement selon règle métier explicite.

**Fichier exact :** `apps/admin/src/features/orders/pages/AdminOrderDetailPage.tsx`

Le bouton de sélection doit être actif uniquement pour les items expédiables. Les erreurs API doivent être affichées et la sélection doit être nettoyée après succès. L'UI ne doit pas autoriser une transition que `order-status.ts` refuse.

* * *
# 4\. Phase C : reçus réellement conformes
## C1. Schéma et numéro séquentiel
**Fichier exact :** `apps/api/src/database/schema/receipts.ts`

Ajouter à `receiptSettings` : `fiscalYear`, `nextNumber` avec valeur par défaut 1 et index unique `(store_id, fiscal_year)`. Ajouter à `receipts` : `snapshot`, `paymentId`, `fiscalYear`, `sequenceNumber`, contrainte unique `(store_id, fiscal_year, sequence_number)`.

**Fichier exact :** `apps/api/src/modules/receipts/receipts.service.ts`, méthode `create`.

Remplacer la construction `REC-${orderNumber}` par une transaction : verrouiller la ligne settings de la boutique et de l'exercice, incrémenter `nextNumber`, construire `REC-${year}-${numberPad}`, insérer le reçu avec snapshot JSON immuable. Une nouvelle tentative doit retrouver le reçu existant pour le même orderId/paymentId et ne pas générer un second numéro.
## C2. PDF complet
**Fichier exact :** `apps/api/src/modules/receipts/receipts.service.ts`, méthode `generatePdf`.

Charger le snapshot du reçu, pas des données vivantes. Ajouter un tableau de lignes avec : libellé, SKU/variante, quantité, prix unitaire, total ligne. Ajouter sous-total, livraison, remise, taxes, total, devise, moyen et statut de paiement, mentions légales, numéro séquentiel et date. Tester les longues listes et les accents.
## C3. Stockage privé
**Fichiers à créer :**
*   `apps/api/src/modules/storage/object-storage.service.ts`
*   `apps/api/src/modules/storage/local-object-storage.service.ts` uniquement pour test/local

En production, écrire dans S3/MinIO via variables d'environnement. Enregistrer uniquement une clé d'objet, puis générer une URL signée courte. Le controller doit vérifier que le client connecté est propriétaire du reçu ou que l'admin possède la permission.

Ne pas servir directement `uploads/receipts` en public sans contrôle.
## C4. Admin reçus
**Fichiers à vérifier/modifier :**
*   `apps/admin/src/features/receipts/pages/AdminReceiptListPage.tsx`
*   `apps/admin/src/features/receipts/services/adminReceiptService.ts`
*   `apps/api/src/modules/receipts/receipts.controller.ts`

Implémenter liste paginée, recherche, filtre statut/type, détail, aperçu/téléchargement, génération manuelle, renvoi, statut `failed`, retry et paramètres branding. Chaque action doit passer par `PermissionGuard` et afficher l'erreur API.

Le mobile doit avoir une route sécurisée `app/receipts/[id].tsx` ou un téléchargement signé depuis la commande.
## C5. Erreurs de reçu
Dans `apps/api/src/modules/orders/orders.service.ts`, remplacer le `catch {}` silencieux autour du reçu livré par :
*   log structuré avec `orderId` et `receiptId` ;
*   état/outbox `receipt_pending` ou `receipt_failed` ;
*   retry administrable ;
*   message système indiquant seulement que le reçu sera disponible, jamais une fausse réussite.

* * *
# 5\. Phase D : messages, outbox et notifications
## D1. Déduplication des événements
**Fichiers à créer :**
*   `apps/api/src/database/schema/outbox.ts`
*   `apps/api/src/modules/notifications/outbox.service.ts`
*   `apps/api/src/modules/notifications/outbox.worker.ts`

Table `outbox_events` : id, type, aggregateType, aggregateId, idempotencyKey unique, payload JSONB, status pending/processing/done/failed, attempts, nextAttemptAt, lastError, createdAt, processedAt.
## D2. Corriger le listener actuel
**Fichier exact :** `apps/api/src/modules/notifications/order-events.listener.ts`

Le fichier actuel appelle directement `postOrderSystemMessage`, sans déduplication et sans push. Modifier `onOrderStatusChange` pour créer un événement outbox dans la transaction métier. Le worker publie ensuite : message système, push, email/SMS selon préférences. L'idempotencyKey doit être par exemple `order:${orderId}:status:${newStatus}:${eventVersion}`.

Les messages système doivent couvrir : confirmation, préparation, expédition, transit, livraison, incident, annulation, remboursement et reçu.
## D3. Push
**Fichiers exacts :** `apps/api/src/modules/push/push.service.ts` et `apps/api/src/modules/push/push-token.schema.ts`.

Conserver les tokens par appareil, désactiver les tokens invalides renvoyés par Expo, appliquer retry exponentiel et journaliser le résultat sans token complet dans les logs.

Ajouter polling ou WebSocket documenté côté mobile. Le fallback polling doit invalider les conversations et messages toutes les 5 à 10 secondes uniquement lorsque l'écran est actif.

* * *
# 6\. Phase E : sécurité API
## E1. Guards
**Fichiers exacts :** `apps/api/src/common/decorators/admin-only.decorator.ts`, tous les controllers sous `apps/api/src/modules/admin-*`, `apps/api/src/modules/products`, `orders`, `receipts`, `content`, `delivery`, `payments`.

Vérifier route par route : public, customer, admin, permission fine. Ajouter tests HTTP : token client refusé sur admin, token admin refusé sur route customer-only si nécessaire, absence de token refusée sur mutations privées.
## E2. Throttling sensible
**Fichier exact :** `apps/api/src/app.module.ts`.

Le throttle global `100/min` existe déjà. Ajouter des limites spécifiques pour OTP, login, webhook, checkout et upload. Ne pas appliquer aveuglément la même limite à toutes les routes.
## E3. OTP
**Fichiers exacts :** `apps/api/src/database/schema/otp.ts`, `apps/api/src/modules/mobile/mobile.service.ts`.

Stocker uniquement un hash du code, invalider les anciens codes, limiter par contact/IP, incrémenter les essais atomiquement, expirer et supprimer les codes. Le code en clair ne doit jamais être écrit dans les logs en production.
## E4. Uploads
**Fichiers exacts :** `apps/api/src/modules/mobile/mobile.controller.ts` et controllers d'upload.

Le code actuel utilise `diskStorage` et valide surtout MIME/extension. Ajouter taille, dimensions, contenu réel, nom aléatoire, répertoire non exécutable, nettoyage des fichiers orphelins et stockage privé. Ne jamais accepter le nom original comme base de confiance.

* * *
# 7\. Phase F : tests obligatoires
## Fichiers à créer
*   `apps/api/src/modules/orders/orders.service.spec.ts`
*   `apps/api/src/modules/payments/payment-webhook.service.spec.ts`
*   `apps/api/src/modules/receipts/receipts.service.spec.ts`
*   `apps/api/src/modules/notifications/outbox.service.spec.ts`
*   `apps/api/test/production.e2e-spec.ts`
*   `apps/admin/src/features/orders/pages/AdminOrderDetailPage.test.tsx` si le setup existe
*   tests mobiles du checkout et de la messagerie selon le runner existant
## Scénarios minimum
1. prix falsifié ;
2. double checkout idempotent ;
3. concurrence sur le dernier stock ;
4. webhook PSP répété ;
5. 3/5 items expédiés ;
6. item expédié deux fois refusé ;
7. livraison répétée produit un seul reçu ;
8. numéro reçu concurrent unique ;
9. PDF multi-lignes correct ;
10. accès reçu d'un autre client refusé ;
11. message système unique ;
12. OTP expiré/réutilisé/refusé après 5 essais ;
13. upload non-image/trop volumineux refusé ;
14. migration base vide et base existante ;
15. readiness PostgreSQL indisponible.

Aucun script de test ne doit être un placeholder. Ajouter une base PostgreSQL dédiée pour e2e et rollback propre.

* * *
# 8\. Phase G : observabilité et exploitation
## Fichiers à modifier/créer
*   `apps/api/src/main.ts`
*   `apps/api/src/health/health.controller.ts`
*   `apps/api/src/health/health.service.ts`
*   `apps/api/src/common/interceptors/request-id.interceptor.ts`
*   `apps/api/src/common/logger/*`
*   `.env.example`
*   `docker-compose.test.yml`

Ajouter requestId, readiness séparée de liveness, vérification PostgreSQL et dépendances, logs JSON avec orderId/paymentId/receiptId sans PII sensible, métriques d'erreurs et temps de réponse. Ajouter documentation des variables PSP, stockage objet, Redis, DB et secrets.

Les backups PostgreSQL, restauration testée, rotation des uploads et rollback doivent être documentés dans `RUNBOOK_PRODUCTION.md`. Ne jamais déclarer ces éléments implémentés si seuls des fichiers de documentation existent.

* * *
# 9\. Phase H : CI et release gate
**Fichier exact :** `.github/workflows/ci.yml`

Remplacer le workflow minimal par des jobs qui exécutent réellement :

```yaml
- npm ci
- npm run check:arch
- npm run lint -- --no-fix
- npx tsc --noEmit
- npm test -- --runInBand
- npm run test:e2e
- npm audit --audit-level=high
- migration sur PostgreSQL de CI
- build API
- build admin
- build Docker
- scan secrets
```

La CI doit utiliser une version PostgreSQL explicite avec service healthcheck. Les migrations doivent être appliquées sur une base vierge puis les tests e2e exécutés. Les secrets doivent venir des GitHub Actions secrets, jamais d'un fichier commité.

Ajouter `.github/dependabot.yml` et une règle de protection de branche documentée. Le workflow ne doit jamais pousser automatiquement une release sans approbation.

* * *
# 10\. Commandes de validation
Exécuter et conserver la sortie dans `FINAL_PRODUCTION_READINESS_REPORT.md` :

```bash
npm run check:arch
npm run lint -- --no-fix
npx tsc --noEmit
cd apps/api && npm run lint -- --no-fix
cd apps/api && npm run build
cd apps/api && npm test -- --runInBand
cd apps/api && npm run test:e2e
cd ../admin && npm run build
cd ../..
npm audit --audit-level=high
```

Ajouter des tests manuels avec comptes de test et données de test, sans secrets réels.

Le rapport final doit contenir pour chaque critère : `PASS`, `FAIL` ou `BLOCKED`, le fichier exact, la commande et la preuve. Interdiction d'écrire `100% prêt` pour une fonctionnalité seulement prévue.

* * *
# 11\. Définition stricte de terminé
La conformité est validée seulement si :
*   chaque phase A à H est exécutée ;
*   chaque ajout de table/colonne possède schema + migration + test ;
*   les prix ne sont jamais contrôlés par le client ;
*   le paiement réel possède init + webhook signé + idempotence ;
*   stock et fulfillment sont transactionnels ;
*   les reçus sont séquentiels, détaillés, durables et autorisés ;
*   les erreurs critiques sont visibles et récupérables ;
*   tests unitaires, e2e, permissions et concurrence passent ;
*   CI valide tout sur PostgreSQL ;
*   le rapport final liste les risques résiduels ;
*   Cursor n'a effectué aucun push Git.

Créer ensuite `FINAL_PRODUCTION_READINESS_REPORT.md` à la racine. Ne pas toucher à Git après cela.