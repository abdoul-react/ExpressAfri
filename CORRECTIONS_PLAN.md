# PLAN DE CORRECTIONS — ExpressAfri Platform
**Date :** 24 juillet 2026
**Basé sur :** Audit technique complet (57 agents, 26 modules analysés)
**Score actuel :** 5.5 / 10 → **Objectif : 8.0 / 10**

---

## LÉGENDE

- ❌ BUG BLOQUANT — fonctionnalité cassée ou absente en production
- ⚠️ PROBLÈME MOYEN — dégradation UX ou incohérence non bloquante
- 🔒 SÉCURITÉ — faille de sécurité à corriger impérativement
- 📦 MIGRATION DB — nécessite une migration Drizzle
- 🔌 API MANQUANTE — endpoint à créer côté NestJS
- 🖥️ FRONTEND — correction côté admin React
- 📱 MOBILE — correction côté app React Native

---

## PARTIE 1 — CORRECTIONS CRITIQUES (TOP 10)

> À corriger avant tout déploiement en production.

---

### CORRECTION C-01 — CAMPAIGNS : Mauvaise table SQL
**Modules :** `apps/api/src/modules/campaigns/` + schéma DB
**Priorité :** BLOQUANTE
**Score actuel :** 2.0/10

#### Ce qui manque
La feature Campaigns utilise la table `contentBlocks` (groupName='campaign') au lieu d'une table `campaigns` dédiée qui n'existe pas dans le schéma DB. Les champs métier (`startDate`, `endDate`, `budget`, `spent`, `impressions`, `clicks`, `conversions`, `revenue`, `targetType`, `targetValue`) sont totalement absents. De plus, `update()` et `delete()` sans filtre `groupName` peuvent écraser ou supprimer n'importe quel content block de la plateforme.

#### Implémentation nécessaire

**1. Migration DB — créer la table `campaigns`**
```typescript
// apps/api/src/database/schema/campaigns.ts (NOUVEAU FICHIER)
export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 50 }).notNull(), // 'discount' | 'banner' | 'push' | 'email'
  status: varchar('status', { length: 50 }).notNull().default('draft'), // 'draft' | 'active' | 'paused' | 'ended'
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  budget: decimal('budget', { precision: 12, scale: 2 }),
  spent: decimal('spent', { precision: 12, scale: 2 }).default('0'),
  impressions: integer('impressions').default(0),
  clicks: integer('clicks').default(0),
  conversions: integer('conversions').default(0),
  revenue: decimal('revenue', { precision: 12, scale: 2 }).default('0'),
  targetType: varchar('target_type', { length: 50 }), // 'all' | 'segment' | 'store' | 'category'
  targetValue: varchar('target_value', { length: 255 }),
  imageUrl: varchar('image_url', { length: 500 }),
  createdBy: uuid('created_by').references(() => adminUsers.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})
```

**2. Réécrire `campaigns.service.ts`**
- Remplacer toutes les requêtes sur `contentBlocks` par des requêtes sur la table `campaigns`
- Implémenter `list()`, `getById()`, `create()`, `update()`, `delete()` sur la bonne table
- Ajouter des DTOs de validation avec `class-validator`

**3. Réécrire `campaigns.controller.ts`**
- Ajouter `@UseGuards(JwtAuthGuard, PermissionsGuard)` au niveau classe
- Ajouter `@Permissions('campaigns.read')`, `@Permissions('campaigns.create')`, etc.
- Remplacer `body: any` par les DTOs typés
- Ajouter `@ParseUUIDPipe` sur les paramètres d'ID

**4. Ajouter `campaigns` à `schema/index.ts`**

---

### CORRECTION C-02 — STORES : 4 bugs bloquants dans ApiAdminStoreDataSource
**Modules :** `apps/admin/src/infrastructure/data-source/api/ApiAdminStoreDataSource.ts`
**Priorité :** BLOQUANTE
**Score actuel :** 4.0/10

#### Ce qui manque
- `updateKyc()` fait un `GET` au lieu d'un `PUT` → mise à jour KYC silencieusement ignorée
- `reactivate()` envoie `{ status: 'active' }` qui n'existe pas dans le schéma → boutiques restent suspendues
- `approve()` appelle `/kyc/approve` au lieu d'un endpoint de changement de statut boutique
- `toStore()` : `ownerName` mappe `raw.name` (nom boutique) au lieu du nom du propriétaire ; `city` toujours vide

#### Implémentation nécessaire

**1. Corriger `updateKyc()` (ligne ~58)**
```typescript
// AVANT (FAUX)
async updateKyc(storeId: string, data: KycUpdateData) {
  const response = await this.api.get(`/stores/${storeId}/kyc`, data) // ← GET !!
  ...
}

// APRÈS (CORRECT)
async updateKyc(storeId: string, data: KycUpdateData) {
  const response = await this.api.put(`/stores/${storeId}/kyc`, data)
  return this.toStore(response.data)
}
```

**2. Corriger `approve()` (ligne ~38)**
```typescript
// AVANT (FAUX)
async approve(storeId: string) {
  await this.api.put(`/stores/${storeId}/kyc/approve`) // ← mauvais endpoint
}

// APRÈS (CORRECT)
async approve(storeId: string) {
  await this.api.patch(`/stores/${storeId}/status`, { status: 'approved' })
}
```

**3. Corriger `reactivate()` (ligne ~53)**
```typescript
// AVANT (FAUX)
async reactivate(storeId: string) {
  await this.api.patch(`/stores/${storeId}/status`, { status: 'active' }) // 'active' n'existe pas
}

// APRÈS (CORRECT)
async reactivate(storeId: string) {
  await this.api.patch(`/stores/${storeId}/status`, { status: 'approved' })
}
```

**4. Corriger le mapper `toStore()` (ligne ~8)**
```typescript
// AVANT (FAUX)
private toStore(raw: any): AdminStore {
  return {
    ...
    ownerName: raw.name,   // ← nom de la boutique, pas du propriétaire
    city: '',              // ← toujours vide
  }
}

// APRÈS (CORRECT)
private toStore(raw: any): AdminStore {
  return {
    ...
    ownerName: raw.owner?.name ?? raw.ownerName ?? '',
    city: raw.owner?.city ?? raw.city ?? '',
    country: raw.owner?.country ?? raw.country ?? '',
  }
}
```

**5. Côté API — ajouter l'endpoint `PATCH /stores/:id/status`**
```typescript
// apps/api/src/modules/stores/stores.controller.ts
@Patch(':id/status')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('stores.manage')
async updateStatus(
  @Param('id', ParseUUIDPipe) id: string,
  @Body() body: UpdateStoreStatusDto,
) {
  return this.storesService.updateStatus(id, body.status)
}
```

**6. Corriger la faille IDOR sur `GET /stores/:id/kyc`**
```typescript
// Ajouter vérification storeId dans le guard ou le service
if (user.storeId && user.storeId !== id) throw new ForbiddenException()
```

---

### CORRECTION C-03 — ANALYTICS : Données entièrement hardcodées
**Modules :** `apps/api/src/modules/analytics/analytics.service.ts`
**Priorité :** BLOQUANTE
**Score actuel :** 3.0/10

#### Ce qui manque
- `topProducts: []`, `topCategories: []`, `revenueByPayment: []`, `geographicData: []` hardcodés
- `conversionRate: 2.4` jamais calculé
- `revenueChart` utilise `COUNT(*)` au lieu de `SUM(total)` → affiche nombre de commandes, pas le CA
- `getPeriodStart` pour `'today'` : `prevPeriodStart === periodStart` → croissance toujours 0
- Divisions par zéro non protégées → `NaN` dans les StatCards
- `getFunnelData()`, `getCohortData()`, `getAbandonedCartData()` retournent `[]`

#### Implémentation nécessaire

**1. Corriger `revenueChart` dans `getChartData()`**
```typescript
// AVANT (FAUX)
SELECT date_trunc('day', created_at) as date, COUNT(*) as value ...

// APRÈS (CORRECT)
SELECT date_trunc('day', created_at) as date, SUM(total) as value
FROM orders
WHERE created_at BETWEEN :start AND :end AND status NOT IN ('cancelled', 'refunded')
GROUP BY date_trunc('day', created_at)
ORDER BY date ASC
```

**2. Implémenter `getTopProducts()`**
```typescript
async getTopProducts(limit = 10, start: Date, end: Date) {
  return db
    .select({
      productId: orderItems.productId,
      name: products.name,
      revenue: sum(orderItems.price).mapWith(Number),
      quantity: sum(orderItems.quantity).mapWith(Number),
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(products, eq(orderItems.productId, products.id))
    .where(and(
      between(orders.createdAt, start, end),
      notInArray(orders.status, ['cancelled', 'refunded'])
    ))
    .groupBy(orderItems.productId, products.name)
    .orderBy(desc(sum(orderItems.price)))
    .limit(limit)
}
```

**3. Implémenter `getTopCategories()`**
```typescript
// Agrégation par catégorie via JOIN orderItems → products → categories
```

**4. Implémenter `getRevenueByPayment()`**
```typescript
// GROUP BY payments.method avec SUM(total)
```

**5. Calculer le `conversionRate` réel**
```typescript
// conversionRate = (ordersCount / uniqueVisitors) * 100
// Si les visites ne sont pas trackées, exposer la métrique comme null plutôt que hardcoder 2.4
```

**6. Protéger les divisions par zéro**
```typescript
const safeDiv = (a: number, b: number) => b === 0 ? 0 : a / b
// Appliquer sur tous les calculs de croissance et taux
```

**7. Corriger `getPeriodStart` pour `'today'`**
```typescript
case 'today':
  periodStart = startOfDay(now)
  prevPeriodStart = subDays(startOfDay(now), 1) // ← hier, pas aujourd'hui
  break
```

---

### CORRECTION C-04 — LOYALTY : Ajustement de points impossible
**Modules :**
- `apps/api/src/modules/loyalty/loyalty.service.ts` (~ligne 73)
- Hook `useAdjustPoints` (frontend)
**Priorité :** BLOQUANTE
**Score actuel :** 3.0/10

#### Ce qui manque
**Bug 1 :** `adjustPoints` execute `WHERE loyaltyPoints.id = id` mais reçoit le `customerId` → l'ajustement échoue (NotFoundException) ou corrompt un enregistrement aléatoire.

**Bug 2 :** Le hook envoie `{ points }` mais le contrôleur attend `body.balance` → `points` est `undefined` au niveau API → aucun ajustement ne prend jamais effet.

**Bug 3 :** `loyaltyRules` et `loyaltyRewards` ont un FK `storeId NOT NULL` → la page admin plateforme crée des règles sans `storeId` → erreur de contrainte DB.

**Bug 4 :** `getTransactions()` retourne `[]` hardcodé (stub avec TODO).

#### Implémentation nécessaire

**1. Corriger la clause WHERE dans `adjustPoints()`**
```typescript
// AVANT (FAUX)
.where(eq(loyaltyPoints.id, id))

// APRÈS (CORRECT)
.where(eq(loyaltyPoints.customerId, customerId))
```

**2. Aligner le champ entre hook et contrôleur**
```typescript
// Option A — corriger le contrôleur pour accepter `points`
@Body('points') points: number  // au lieu de @Body('balance')

// Option B — corriger le hook pour envoyer `balance`
await api.post(`/loyalty/customers/${customerId}/adjust`, { balance: points, reason })
```

**3. Rendre `storeId` nullable dans `loyaltyRules` et `loyaltyRewards`**
```typescript
// apps/api/src/database/schema/loyalty.ts — migration
storeId: uuid('store_id').references(() => stores.id) // sans .notNull()
```

**4. Implémenter `getTransactions()` réel**
```typescript
// Créer une table `loyalty_transactions` ou utiliser outbox
// Retourner l'historique réel des opérations de points par client
```

---

### CORRECTION C-05 — RETURNS : 5 bugs bloquants cumulés
**Modules :**
- `apps/api/src/modules/returns/returns.controller.ts`
- `apps/api/src/modules/returns/returns.service.ts`
- `apps/admin/src/infrastructure/data-source/api/ApiAdminReturnDataSource.ts`
**Priorité :** BLOQUANTE
**Score actuel :** 3.5/10

#### Ce qui manque

**Bug 1 :** `GET /returns/summary` n'existe pas → capturé par `@Get(':id')` avec id=`'summary'` → 4 StatCards en erreur permanente.

**Bug 2 :** `returns.service.list()` sans JOIN `customers` → `customerName` et `customerEmail` toujours vides.

**Bug 3 :** `returns.service.list()` sans JOIN `returnItems` → colonne "Articles" affiche 0, montant remboursable = 0.

**Bug 4 :** `ApiAdminReturnDataSource.refund()` stocke la méthode de remboursement dans `notes` au lieu de la colonne `refundMethod`.

**Bug 5 :** `ApiAdminReturnDataSource.reject()` stocke la raison de rejet dans `notes` au lieu de `rejectionReason`. `selectedRet.rejectionReason` toujours `undefined`.

**Bug 6 :** Aucun `PermissionGuard` sur les boutons Approuver, Rejeter, Marquer reçu, Rembourser.

#### Implémentation nécessaire

**1. Ajouter `@Get('summary')` AVANT `@Get(':id')` dans le contrôleur**
```typescript
// apps/api/src/modules/returns/returns.controller.ts
@Get('summary')  // ← DOIT être déclaré AVANT @Get(':id')
@UseGuards(JwtAuthGuard)
async getSummary() {
  return this.returnsService.getSummary()
}

@Get(':id')
async getById(@Param('id', ParseUUIDPipe) id: string) { ... }
```

**2. Implémenter `ReturnsService.getSummary()`**
```typescript
async getSummary() {
  const [pending, approved, completed, total] = await Promise.all([
    db.select({ count: count() }).from(returns).where(eq(returns.status, 'pending')),
    db.select({ count: count() }).from(returns).where(eq(returns.status, 'approved')),
    db.select({ count: count() }).from(returns).where(eq(returns.status, 'completed')),
    db.select({ count: count() }).from(returns),
  ])
  return {
    pending: pending[0].count,
    approved: approved[0].count,
    completed: completed[0].count,
    total: total[0].count,
  }
}
```

**3. Ajouter les JOINs dans `returns.service.list()`**
```typescript
// Ajouter JOIN customers pour customerName/customerEmail
.leftJoin(customers, eq(returns.customerId, customers.id))
// Ajouter JOIN returnItems (subquery ou leftJoin)
.leftJoin(returnItems, eq(returns.id, returnItems.returnId))
```

**4. Corriger les mappings dans `ApiAdminReturnDataSource`**
```typescript
// refund()
async refund(id: string, method: string, amount: number) {
  await this.api.post(`/returns/${id}/refund`, {
    refundMethod: method,  // ← colonne dédiée, pas notes
    amount,
  })
}

// reject()
async reject(id: string, reason: string) {
  await this.api.post(`/returns/${id}/reject`, {
    rejectionReason: reason,  // ← colonne dédiée, pas notes
  })
}
```

**5. Ajouter `PermissionGuard` sur les actions frontend**
```typescript
<PermissionGuard permission="returns.manage">
  <Button onClick={handleApprove}>Approuver</Button>
</PermissionGuard>
// Idem pour Rejeter, Marquer reçu, Rembourser
```

---

### CORRECTION C-06 — CUSTOMERS : Bannissement = no-op
**Modules :**
- `apps/api/src/database/schema/customers.ts`
- `apps/api/src/modules/customers/customers.service.ts`
- `apps/api/src/modules/customers/customers.controller.ts`
**Priorité :** BLOQUANTE (sécurité plateforme)
**Score actuel :** 5.5/10

#### Ce qui manque
La colonne `isBanned` est absente du schéma Drizzle. `banCustomer`/`unbanCustomer` envoient `{ isBanned: true/false }` mais Drizzle ignore silencieusement les champs inconnus dans `.set()`. Aucun utilisateur n'est jamais réellement banni.

#### Implémentation nécessaire

**1. Migration DB — ajouter `is_banned` au schéma customers**
```typescript
// apps/api/src/database/schema/customers.ts
isBanned: boolean('is_banned').notNull().default(false),
bannedAt: timestamp('banned_at'),
bannedReason: text('banned_reason'),
```

**2. Créer endpoint dédié `POST /customers/:id/ban`**
```typescript
// apps/api/src/modules/customers/customers.controller.ts
@Post(':id/ban')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('customers.manage')
async banCustomer(
  @Param('id', ParseUUIDPipe) id: string,
  @Body() body: BanCustomerDto,
  @CurrentUser() admin: AdminUser,
) {
  return this.customersService.banCustomer(id, body.reason, admin.id)
}

@Post(':id/unban')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('customers.manage')
async unbanCustomer(@Param('id', ParseUUIDPipe) id: string) {
  return this.customersService.unbanCustomer(id)
}
```

**3. Implémenter dans `customers.service.ts`**
```typescript
async banCustomer(customerId: string, reason: string, adminId: string) {
  await db.update(customers)
    .set({ isBanned: true, bannedAt: new Date(), bannedReason: reason })
    .where(eq(customers.id, customerId))
  await this.auditService.create({ action: 'customer.ban', targetId: customerId, actorId: adminId })
}
```

**4. Appliquer la vérification dans le guard JWT mobile**
```typescript
// apps/api/src/common/guards/jwt-auth.guard.ts
if (user.isBanned) throw new ForbiddenException('Account suspended')
```

**5. Corriger l'endpoint frontend**
```typescript
// AdminCustomerDataSource — utiliser les nouveaux endpoints
async banCustomer(id: string, reason: string) {
  await this.api.post(`/customers/${id}/ban`, { reason })
}
async unbanCustomer(id: string) {
  await this.api.post(`/customers/${id}/unban`)
}
```

**6. Corriger `delete()` : remplacer `isGuest=true` par `deletedAt=new Date()`**
```typescript
// AVANT (sémantiquement incorrect)
.set({ isGuest: true })

// APRÈS (soft delete correct)
.set({ deletedAt: new Date() })
```

---

### CORRECTION C-07 — PAYOUTS : Triple désalignement API/Frontend
**Modules :**
- `apps/api/src/modules/payouts/payouts.service.ts`
- `apps/admin/src/infrastructure/data-source/api/ApiAdminPayoutDataSource.ts`
**Priorité :** BLOQUANTE
**Score actuel :** 4.0/10

#### Ce qui manque
- `process()` positionne `'completed'` au lieu de `'processing'` → état intermédiaire jamais atteint, boutons d'action n'apparaissent jamais
- `getSummary()` retourne des champs nommés différemment du frontend → 3 StatCards sur 4 affichent `undefined`
- Statut `'paid'` (frontend) ≠ `'completed'` (DB) → filtre `'paid'` retourne toujours 0
- `cancel()` préfixe `reason` avec `_` → raison jamais persistée
- `processPayout()` envoie `{ processedBy: '' }` → ID admin jamais transmis

#### Implémentation nécessaire

**1. Corriger les statuts — choisir une convention et l'appliquer partout**

Convention retenue : `pending → processing → paid → cancelled`

```typescript
// apps/api/src/modules/payouts/payouts.service.ts
async process(id: string, adminId: string) {
  await db.update(payouts)
    .set({ status: 'processing', processedBy: adminId, processedAt: new Date() })
    .where(eq(payouts.id, id))
}

async markAsPaid(id: string, reference: string, adminId: string) {
  await db.update(payouts)
    .set({ status: 'paid', paymentReference: reference, paidAt: new Date() })
    .where(eq(payouts.id, id))
}
```

**2. Aligner `getSummary()` avec ce qu'attend le frontend**
```typescript
// AVANT — noms de champs incorrects
async getSummary() {
  return { total, pending, completed, totalPaidOut }
}

// APRÈS — noms alignés sur le frontend
async getSummary() {
  return {
    totalPending: pendingAmount,
    totalPaidThisMonth: paidThisMonth,
    totalCommissionCollected: commissionTotal,
    pendingCount: pendingRows,
  }
}
```

**3. Corriger `cancel()` — supprimer le préfixe `_`**
```typescript
// AVANT (FAUX)
.set({ status: 'cancelled', _reason: reason }) // _reason ignoré

// APRÈS (CORRECT)
.set({ status: 'cancelled', cancellationReason: reason })
```

**4. Corriger `ApiAdminPayoutDataSource.processPayout()`**
```typescript
// Injecter l'ID admin réel
async processPayout(id: string) {
  const admin = useAdminAuth.getState().admin
  await this.api.post(`/payouts/${id}/process`, { processedBy: admin.id })
}
```

**5. Corriger la permission dans PermissionGuard**
```typescript
// AVANT — mauvaise permission
<PermissionGuard permission="stores.update">

// APRÈS — permission dédiée
<PermissionGuard permission="payouts.manage">
```

---

### CORRECTION C-08 — DELIVERY : Désalignement format + retour `rateAssignment`
**Modules :**
- `apps/api/src/modules/delivery/delivery.service.ts`
- `apps/admin/src/infrastructure/data-source/AdminDeliveryDataSource.ts`
- `apps/api/src/modules/delivery/delivery.controller.ts`
**Priorité :** BLOQUANTE
**Score actuel :** 5.5/10

#### Ce qui manque
**Bug 1 :** `rateAssignment` retourne `assignment` mais la DataSource attend `{ assignment, person }` → notation en échec silencieux.

**Bug 2 :** Statuts avec tirets côté frontend `'picked-up'`/`'in-transit'` ≠ underscores côté DB `'picked_up'`/`'in_transit'` → toutes les comparaisons de statut échouent.

**Bug 3 :** `updateAssignmentStatus` lors de `'delivered'` écrase toujours `pickedUpAt` avec `new Date()`.

**Bug 4 :** `deletePerson()` sans vérification des assignations actives → commandes orphelines.

**Bug 5 :** Aucun RBAC dans `DeliveryController`.

#### Implémentation nécessaire

**1. Corriger le retour de `rateAssignment()`**
```typescript
// apps/api/src/modules/delivery/delivery.service.ts
async rateAssignment(id: string, rating: number, comment?: string) {
  const assignment = await db.update(deliveryAssignments)
    .set({ rating, ratingComment: comment })
    .where(eq(deliveryAssignments.id, id))
    .returning()

  const person = await db.query.deliveryPersons.findFirst({
    where: eq(deliveryPersons.id, assignment[0].deliveryPersonId)
  })

  return { assignment: assignment[0], person }  // ← retourner les deux
}
```

**2. Normaliser les statuts avec underscores dans `AdminDeliveryDataSource.ts`**
```typescript
// Remplacer TOUS les 'picked-up' par 'picked_up' et 'in-transit' par 'in_transit'
const STATUS_MAP = {
  'picked-up': 'picked_up',
  'in-transit': 'in_transit',
} as const
```

**3. Corriger `updateAssignmentStatus` pour ne pas écraser `pickedUpAt`**
```typescript
// AVANT (FAUX)
if (status === 'delivered') {
  updateData.pickedUpAt = updateData.pickedUpAt ?? new Date() // écrase toujours
}

// APRÈS (CORRECT)
if (status === 'delivered' && !existingAssignment.pickedUpAt) {
  updateData.pickedUpAt = new Date()
}
updateData.deliveredAt = new Date()
```

**4. Vérifier les assignations actives avant `deletePerson()`**
```typescript
async deletePerson(id: string) {
  const activeAssignments = await db
    .select({ count: count() })
    .from(deliveryAssignments)
    .where(and(
      eq(deliveryAssignments.deliveryPersonId, id),
      inArray(deliveryAssignments.status, ['assigned', 'picked_up', 'in_transit'])
    ))

  if (activeAssignments[0].count > 0) {
    throw new ConflictException('Ce livreur a des livraisons actives en cours')
  }

  await db.delete(deliveryPersons).where(eq(deliveryPersons.id, id))
}
```

**5. Ajouter RBAC dans `DeliveryController`**
```typescript
@Controller('delivery')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DeliveryController { ... }

// + @Permissions('delivery.manage') sur chaque endpoint de mutation
// + @ParseUUIDPipe sur tous les paramètres d'ID
// + DTOs typés avec class-validator sur tous les @Body()
```

---

### CORRECTION C-09 — AUTH : Token JWT jamais révoqué à la déconnexion
**Modules :**
- `apps/admin/src/features/auth/infrastructure/api/ApiAdminAuthDataSource.ts`
- `apps/api/src/modules/auth/auth.service.ts`
- `apps/api/src/modules/auth/auth.controller.ts`
**Priorité :** SÉCURITÉ CRITIQUE
**Score actuel :** 7.0/10

#### Ce qui manque
`logout()` côté admin est un no-op commenté `"no-op for JWT-based auth"`. L'access token reste valide jusqu'à son expiration naturelle. En cas de vol de token, session partagée ou déconnexion forcée, l'accès reste actif.

#### Implémentation nécessaire

**1. Implémenter une blacklist de tokens JWT via Redis**
```typescript
// apps/api/src/modules/auth/token-blacklist.service.ts (NOUVEAU FICHIER)
@Injectable()
export class TokenBlacklistService {
  constructor(private readonly redis: RedisService) {}

  async blacklist(jti: string, expiresIn: number) {
    await this.redis.set(`blacklist:${jti}`, '1', 'EX', expiresIn)
  }

  async isBlacklisted(jti: string): Promise<boolean> {
    return (await this.redis.get(`blacklist:${jti}`)) !== null
  }
}
```

**2. Ajouter `jti` (JWT ID) dans le payload du token**
```typescript
// auth.service.ts — lors de la génération du token
const payload = {
  sub: user.id,
  email: user.email,
  role: user.role,
  jti: randomUUID(), // ← identifiant unique par token
}
```

**3. Vérifier la blacklist dans le guard JWT**
```typescript
// jwt.strategy.ts
async validate(payload: JwtPayload) {
  if (await this.tokenBlacklistService.isBlacklisted(payload.jti)) {
    throw new UnauthorizedException('Token révoqué')
  }
  return payload
}
```

**4. Implémenter l'endpoint `POST /auth/logout`**
```typescript
@Post('logout')
@UseGuards(JwtAuthGuard)
async logout(@CurrentUser() user: AdminUser, @Headers('authorization') auth: string) {
  const token = auth.replace('Bearer ', '')
  const decoded = this.jwtService.decode(token) as any
  const ttl = decoded.exp - Math.floor(Date.now() / 1000)
  await this.tokenBlacklistService.blacklist(decoded.jti, ttl)
  return { success: true }
}
```

**5. Corriger `logout()` côté admin DataSource**
```typescript
// ApiAdminAuthDataSource.ts
async logout(): Promise<void> {
  await this.api.post('/auth/logout')
  // Nettoyage local du token
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}
```

**6. Supprimer les credentials de démo de `LoginPage.tsx`**
```typescript
// Conditionner à la variable d'environnement
{import.meta.env.VITE_DEMO_MODE === 'true' && (
  <DemoCredentialsPanel />
)}
```

---

### CORRECTION C-10 — ORDERS + PAYMENTS : Le remboursement ne rembourse rien
**Modules :**
- `apps/admin/src/infrastructure/data-source/api/ApiAdminOrderDataSource.ts`
- `apps/api/src/modules/payments/payments.service.ts`
- `apps/api/src/modules/payments/payments.controller.ts`
**Priorité :** BLOQUANTE (perte financière client)
**Score actuel :** Orders 7.0/10 | Payments 8.5/10

#### Ce qui manque
`adminOrderDataSource.refund()` appelle `PUT /orders/:id/status` avec `{ status: 'refunded' }` et ignore le montant. Aucun appel à `POST /payments/:id/refund` n'est effectué. Le statut de commande change mais aucune somme n'est restituée.

De plus, `toOrder()` ne mappe pas `statusLog` → la timeline des statuts est toujours vide.

#### Implémentation nécessaire

**1. Corriger `refund()` dans `ApiAdminOrderDataSource.ts`**
```typescript
// AVANT (FAUX — ne fait aucun remboursement réel)
async refund(orderId: string, amount?: number) {
  await this.api.put(`/orders/${orderId}/status`, { status: 'refunded' })
}

// APRÈS (CORRECT — séquence complète)
async refund(orderId: string, amount?: number, reason?: string) {
  // 1. Récupérer le paiement associé à la commande
  const order = await this.api.get(`/orders/${orderId}`)
  const paymentId = order.data.paymentId

  // 2. Initier le remboursement financier réel
  if (paymentId) {
    await this.api.post(`/payments/${paymentId}/refund`, { amount, reason })
  }

  // 3. Mettre à jour le statut de la commande
  await this.api.put(`/orders/${orderId}/status`, { status: 'refunded' })
}
```

**2. Corriger `payments.service.refund()` pour recalculer le statut de commande**
```typescript
// apps/api/src/modules/payments/payments.service.ts
async refund(paymentId: string, amount?: number) {
  const payment = await this.getPaymentById(paymentId)

  // Initier le remboursement via le provider
  await this.paymentProvider.refund(payment.externalId, amount ?? payment.amount)

  // Mettre à jour le paiement
  const refundedAmount = amount ?? payment.amount
  const isFullRefund = refundedAmount >= payment.amount
  await db.update(payments)
    .set({
      status: isFullRefund ? 'refunded' : 'partially_refunded',
      refundedAt: new Date(),
      refundedAmount,
    })
    .where(eq(payments.id, paymentId))

  // Recalculer et mettre à jour le statut de la commande associée
  if (payment.orderId) {
    await this.ordersService.updateStatus(
      payment.orderId,
      isFullRefund ? 'refunded' : 'partially_refunded',
    )
  }
}
```

**3. Corriger `toOrder()` pour inclure `statusLog`**
```typescript
// ApiAdminOrderDataSource.ts
private toOrder(raw: any): AdminOrder {
  return {
    ...
    statusLog: raw.statusLog?.map((log: any) => ({
      status: log.status,
      timestamp: log.createdAt,
      note: log.note,
      updatedBy: log.updatedBy,
    })) ?? [],
  }
}
```

**4. Corriger `AdminOrderDetailPage.STATUS_FLOW` — ajouter les transitions manquantes**
```typescript
const STATUS_FLOW = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],    // ← manquait
  processing: ['shipped', 'cancelled'],      // ← manquait
  partially_shipped: ['shipped', 'cancelled'], // ← manquait
  shipped: ['delivered', 'cancelled'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
}
```

---

## PARTIE 2 — CORRECTIONS PAR MODULE (PRIORITÉ HAUTE)

---

### CORRECTION M-01 — DASHBOARD : Graphiques et onglets vides

**Fichiers :**
- `apps/admin/src/features/analytics/services/adminAnalyticsService.ts`
- `apps/admin/src/infrastructure/data-source/api/ApiAdminAnalyticsDataSource.ts`

#### Corrections

**1. Débrancher les stubs dans `ApiAdminAnalyticsDataSource.ts`**
```typescript
// AVANT (stubs)
async getRevenueChart() { return [] }
async getOrdersChart() { return [] }

// APRÈS
async getRevenueChart(period: string) {
  const { data } = await this.api.get('/analytics/chart', { params: { type: 'revenue', period } })
  return data
}
async getOrdersChart(period: string) {
  const { data } = await this.api.get('/analytics/chart', { params: { type: 'orders', period } })
  return data
}
```

**2. Persister la période dans l'URL**
```typescript
// AdminAnalyticsPage.tsx
const [searchParams, setSearchParams] = useSearchParams()
const period = searchParams.get('period') ?? 'month'
const setPeriod = (p: string) => setSearchParams({ period: p })
```

---

### CORRECTION M-02 — ADMINS : Sécurité et UX

**Fichiers :**
- `apps/admin/src/features/admins/pages/AdminAdminListPage.tsx`
- `apps/admin/src/features/admins/hooks/useAdminAdminList.ts`

#### Corrections

**1. Ajouter confirmation de mot de passe dans `PasswordModal`**
```typescript
// Ajouter un second champ et vérifier avant soumission
const [confirm, setConfirm] = useState('')
if (password !== confirm) return toast.error('Les mots de passe ne correspondent pas')
```

**2. Ajouter debounce sur la recherche (300ms)**
```typescript
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
const debouncedSearch = useDebouncedValue(search, 300)
// Utiliser debouncedSearch dans le hook à la place de search
```

**3. Validation de force du mot de passe**
```typescript
const isStrong = (pwd: string) => pwd.length >= 8 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd)
```

**4. Charger les rôles depuis l'API dans le filtre**
```typescript
const { data: roles } = useAdminRoles()
// Remplacer la constante statique ROLES par roles.data
```

---

### CORRECTION M-03 — ROLES : Réinitialisation et UX

**Fichier :** `apps/admin/src/features/roles/pages/AdminRoleListPage.tsx`

#### Corrections

**1. Réinitialiser le formulaire à l'ouverture de `EditRoleModal`**
```typescript
useEffect(() => {
  if (open && role) {
    setName(role.name)
    setPermissions(role.permissions)
  }
}, [open, role])
```

**2. Afficher le nombre d'admins assignés par rôle**
```typescript
// Ajouter un champ `adminCount` dans l'endpoint GET /roles
// Afficher <Badge>{role.adminCount} admin(s)</Badge> sur chaque carte
```

---

### CORRECTION M-04 — CATEGORIES : Cascade delete et sécurité

**Fichiers :**
- `apps/api/src/modules/products/categories.controller.ts`
- `apps/api/src/modules/products/categories.service.ts`

#### Corrections

**1. Ajouter la cascade delete dans `categories.service.ts`**
```typescript
async delete(id: string) {
  // Option A : réaffecter les sous-catégories au parent
  await db.update(categories)
    .set({ parentId: null })
    .where(eq(categories.parentId, id))

  // Option B : supprimer récursivement — préférable
  await db.delete(categories).where(eq(categories.id, id))
  // + FK ON DELETE CASCADE dans le schéma Drizzle
}
```

**2. Ajouter un guard de rôle sur POST, PUT, DELETE**
```typescript
@Post()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('categories.manage')
async create(@Body() dto: CreateCategoryDto) { ... }
```

**3. Remplacer l'upload base64 par un upload multipart**
```typescript
// Utiliser le StorageService existant
// L'admin envoie le fichier → StorageService retourne une URL HTTP
```

**4. Ajouter la pagination sur `GET /categories`**
```typescript
@Get()
async list(@Query() query: PaginationDto) {
  return this.categoriesService.list(query.page, query.limit)
}
```

---

### CORRECTION M-05 — PRODUCTS : Tri, permissions, export

**Fichiers :**
- `apps/api/src/modules/products/products.service.ts`
- `apps/admin/src/features/products/`

#### Corrections

**1. Implémenter `sortBy`/`sortOrder` dans `products.service.list()`**
```typescript
const sortColumn = {
  price: products.price,
  name: products.name,
  createdAt: products.createdAt,
  stock: products.stock,
}[query.sortBy ?? 'createdAt'] ?? products.createdAt

const order = query.sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn)
```

**2. Renforcer la vérification de modération**
```typescript
// Ajouter @AdminOnly() ou @Permissions('products.moderate')
@Patch(':id/moderate')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('products.moderate')
async moderate(...) { ... }
```

**3. Implémenter l'export CSV produits**
```typescript
@Get('export')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('products.export')
async export(@Res() res: Response, @Query() query: ProductQueryDto) {
  const products = await this.productsService.list({ ...query, limit: 10000 })
  const csv = this.csvService.generate(products.data)
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', 'attachment; filename=products.csv')
  res.send(csv)
}
```

---

### CORRECTION M-06 — RECEIPTS : Corrections mineures

**Fichiers :**
- `apps/admin/src/features/receipts/hooks/`
- `apps/api/src/modules/receipts/receipts.controller.ts`

#### Corrections

**1. Correction de l'invalidation React Query**
```typescript
// onSuccess dans useCreateReceipt et useSendBulkReceipts
queryClient.invalidateQueries({ queryKey: ['admin', 'receipts'], exact: true }) // exact:true pour ne pas invalider settings
```

**2. Ajouter `@UseGuards(JwtAuthGuard)` au niveau classe dans `ReceiptsController`**
```typescript
@Controller('receipts')
@UseGuards(JwtAuthGuard)  // ← niveau classe pour éviter les oublis
export class ReceiptsController { ... }
```

---

### CORRECTION M-07 — COUPONS : Règles métier non enforced

**Fichier :** `apps/api/src/modules/coupons/coupons.service.ts`

#### Corrections

**1. Implémenter `firstTimeOnly` dans `validate()`**
```typescript
if (coupon.firstTimeOnly) {
  const previousOrders = await db.select({ count: count() })
    .from(orders)
    .where(eq(orders.customerId, customerId))
  if (previousOrders[0].count > 0) {
    throw new BadRequestException('Ce coupon est réservé aux nouvelles commandes')
  }
}
```

**2. Enforcer `applicableTo` dans `validate()`**
```typescript
if (coupon.applicableTo === 'product' && coupon.applicableId) {
  const hasTargetProduct = items.some(item => item.productId === coupon.applicableId)
  if (!hasTargetProduct) throw new BadRequestException('Ce coupon ne s\'applique pas à ces produits')
}
if (coupon.applicableTo === 'store' && coupon.applicableId) {
  const hasTargetStore = items.some(item => item.storeId === coupon.applicableId)
  if (!hasTargetStore) throw new BadRequestException('Ce coupon est réservé à une boutique spécifique')
}
```

**3. Incrémenter `usedCount` à la complétion d'une commande**
```typescript
// Dans orders.service.ts, au passage en status 'delivered'
if (order.couponCode) {
  await db.update(coupons)
    .set({ usedCount: sql`used_count + 1` })
    .where(eq(coupons.code, order.couponCode))
}
```

---

### CORRECTION M-08 — AFFILIATES : Endpoints manquants + statuts

**Fichiers :**
- `apps/api/src/modules/affiliates/affiliates.controller.ts`
- `apps/api/src/modules/affiliates/affiliates.service.ts`

#### Corrections

**1. Ajouter les endpoints de gestion des codes affiliés**
```typescript
@Get(':id/codes')
async listCodes(@Param('id', ParseUUIDPipe) id: string) {
  return this.affiliatesService.listCodes(id)
}

@Post(':id/codes')
async createCode(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateAffiliateCodeDto) {
  return this.affiliatesService.createCode(id, dto)
}

@Patch(':id/codes/:codeId/toggle')
async toggleCode(@Param('id', ParseUUIDPipe) id: string, @Param('codeId', ParseUUIDPipe) codeId: string) {
  return this.affiliatesService.toggleCode(codeId)
}
```

**2. Corriger `rejectCommission()` — utiliser `'rejected'` au lieu de `'reversed'`**
```typescript
// AVANT
.set({ status: 'reversed' })

// APRÈS
.set({ status: 'rejected', rejectedAt: new Date() })
```

**3. Ajouter `@Permissions` sur les endpoints de mutation**
```typescript
@Post(':id/commissions/:commissionId/approve')
@Permissions('affiliates.manage')
async approveCommission(...) { ... }
```

---

### CORRECTION M-09 — NOTIFICATIONS : Implémenter l'envoi réel

**Fichier :** `apps/api/src/modules/notifications/notifications.controller.ts`

#### Corrections

**1. Implémenter `sendTest` réellement**
```typescript
@Post('test')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('notifications.send')
async sendTest(@Body() dto: SendTestNotificationDto) {
  return this.notificationsService.sendToUser(dto.userId, {
    templateId: dto.templateId,
    variables: dto.variables,
  })
}
```

**2. Implémenter `sendBatch` réellement**
```typescript
@Post('batch')
async sendBatch(@Body() dto: SendBatchNotificationDto) {
  const targets = await this.resolveTargets(dto.targetType, dto.targetValue)
  const results = await Promise.allSettled(
    targets.map(userId => this.notificationsService.sendToUser(userId, dto))
  )
  return {
    sent: results.filter(r => r.status === 'fulfilled').length,
    failed: results.filter(r => r.status === 'rejected').length,
  }
}
```

**3. Étendre `OutboxWorker.handle()` pour couvrir les événements marketing**
```typescript
case 'campaign.launched':
  await this.sendCampaignNotification(event)
  break
case 'loyalty.points_earned':
  await this.sendLoyaltyNotification(event)
  break
case 'promotion.new':
  await this.sendPromotionNotification(event)
  break
```

**4. Ajouter le champ `category` dans le schéma `notificationTemplates`**
```typescript
// Migration
category: varchar('category', { length: 100 }), // 'transactional' | 'marketing' | 'loyalty' | 'system'
```

---

### CORRECTION M-10 — MESSAGES : Admins dynamiques

**Fichier :** `apps/admin/src/features/messages/pages/` (ChatWorkspace ou InternalTab)

#### Corrections

**1. Charger la liste des admins depuis l'API**
```typescript
// AVANT (hardcodé)
const ADMIN_LIST = [
  { id: 'admin-1', name: 'Admin Principal' },
  { id: 'admin-2', name: 'Support Client' },
  ...
]

// APRÈS
const { data: admins } = useAdminAdminList({ limit: 100 })
```

**2. Ajouter une durée maximale d'enregistrement vocal (2 minutes)**
```typescript
const MAX_RECORDING_MS = 120_000
useEffect(() => {
  if (isRecording) {
    const timeout = setTimeout(() => stopRecording(), MAX_RECORDING_MS)
    return () => clearTimeout(timeout)
  }
}, [isRecording])
```

---

### CORRECTION M-11 — REPORTS : Sécurité

**Fichier :** `apps/api/src/modules/reports/reports.controller.ts`

#### Corrections

**1. Supprimer `@Public()` de `POST /reports` et ajouter un rate limiting**
```typescript
// Soit exiger l'authentification
@Post()
@UseGuards(JwtAuthGuard)
async create(...) { ... }

// Soit maintenir public mais avec throttling strict
@Post()
@Throttle({ default: { limit: 5, ttl: 60000 } })
async create(...) { ... }
```

**2. Ajouter des DTOs de validation**
```typescript
export class CreateReportDto {
  @IsString() @IsNotEmpty() subject: string
  @IsString() @IsNotEmpty() body: string
  @IsEnum(['spam', 'fraud', 'inappropriate', 'other']) category: string
  @IsUUID() @IsOptional() targetId?: string
}
```

---

### CORRECTION M-12 — AUDIT : Export CSV et acteurs

**Fichiers :**
- `apps/api/src/modules/audit/audit.controller.ts`
- `apps/api/src/modules/audit/audit.service.ts`

#### Corrections

**1. Convertir l'export en vrai CSV côté serveur**
```typescript
@Get('export')
async export(@Query() query: AuditQueryDto, @Res() res: Response) {
  const logs = await this.auditService.list({ ...query, limit: 50000 })
  const csv = [
    ['Date', 'Acteur', 'Rôle', 'Action', 'Cible', 'IP'].join(','),
    ...logs.data.map(log => [
      log.createdAt, log.actorEmail, log.actorRole, log.action, log.targetId, log.ip
    ].join(','))
  ].join('\n')
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename=audit-${new Date().toISOString().split('T')[0]}.csv`)
  res.send('﻿' + csv) // BOM pour Excel
}
```

**2. Injecter l'acteur dans `AuditService.create()`**
```typescript
// Passer le contexte d'authentification dans tous les appels
await this.auditService.create({
  action: 'customer.ban',
  targetId: customerId,
  actorId: req.user.id,        // ← injecter via @CurrentUser()
  actorEmail: req.user.email,
  actorRole: req.user.role,
  ip: req.ip,
})
```

---

## PARTIE 3 — COHÉRENCE ADMIN ↔ MOBILE

---

### CORRECTION X-01 — Statuts de commandes : créer un adaptateur partagé

**Fichier à créer :** `apps/api/src/common/order-status.adapter.ts`

```typescript
export const ADMIN_TO_MOBILE_STATUS: Record<string, string> = {
  'pending': 'toShip',
  'confirmed': 'toShip',
  'processing': 'toShip',
  'shipped': 'shipped',
  'partially_shipped': 'shipped',
  'delivered': 'toReview',
  'cancelled': 'cancelled',
  'refunded': 'refunded',
}

export const MOBILE_TO_ADMIN_STATUS: Record<string, string[]> = {
  'toShip': ['pending', 'confirmed', 'processing'],
  'shipped': ['shipped', 'partially_shipped'],
  'toReview': ['delivered'],
  'returns': ['return_requested', 'return_approved'],
}
```

### CORRECTION X-02 — Méthodes de paiement : charger depuis l'API

**Fichiers :** `apps/admin/src/features/payments/pages/AdminPaymentListPage.tsx`, `AdminReturnListPage.tsx`

```typescript
// Remplacer MOCK_METHODS par un appel API
const { data: paymentMethods } = usePaymentMethods()
// <Select> alimenté par paymentMethods.data au lieu de la constante
```

### CORRECTION X-03 — Notifications push : ajouter le champ deepLink

**Fichier :** formulaire de template notification admin

```typescript
// Ajouter dans le formulaire
<FormField label="Deep Link (optionnel)">
  <Input
    placeholder="orders/tracking?id={orderId}"
    value={template.deepLink}
    onChange={e => setTemplate({ ...template, deepLink: e.target.value })}
  />
</FormField>

// + ajouter colonne dans le schéma notificationTemplates
deepLink: varchar('deep_link', { length: 500 }),
```

### CORRECTION X-04 — Wallet client : page de gestion admin

**À créer :** `apps/admin/src/features/customers/components/CustomerWalletTab.tsx`

```typescript
// Onglet supplémentaire dans AdminCustomerDetailPage
// Afficher le solde actuel, l'historique des transactions bonus
// Formulaire de crédit manuel avec raison et montant
```

### CORRECTION X-05 — Motif de rejet KYC : champ libre

**Fichier :** `apps/admin/src/features/stores/pages/AdminStoreDetailPage.tsx`

```typescript
// AVANT
rejectionReason: 'Documents non conformes' // hardcodé

// APRÈS — ouvrir une modal avec champ libre
const [rejectReason, setRejectReason] = useState('')
// <Textarea value={rejectReason} onChange={...} placeholder="Motif du rejet..." />
```

### CORRECTION X-06 — TRACKING STEPS mobile : aligner les clés

**Fichier :** `app/orders/` (mobile)

```typescript
// Aligner les clés avec les statuts admin
const TRACKING_STEPS = {
  placed: 'pending',
  confirmed: 'confirmed',
  shipped: 'shipped',
  transit: 'in_transit',   // ← était 'transit', aligner avec 'in_transit'
  delivered: 'delivered',
}
```

---

## PARTIE 4 — QUALITÉ UI/UX

---

### CORRECTION U-01 — Sidebar responsive (BLOQUANT mobile/tablette)

**Fichier :** `apps/admin/src/components/layout/Sidebar.tsx`

```typescript
// Ajouter un overlay drawer pour les écrans <1024px
const [mobileOpen, setMobileOpen] = useState(false)

// Sur mobile : Sidebar en position fixed avec overlay backdrop
// Bouton hamburger dans TopNavbar pour toggle
{isMobile && (
  <>
    <div className={`fixed inset-0 bg-black/50 z-40 ${mobileOpen ? 'block' : 'hidden'}`}
         onClick={() => setMobileOpen(false)} />
    <aside className={`fixed left-0 top-0 h-full z-50 transition-transform
                       ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <SidebarContent />
    </aside>
  </>
)}
```

### CORRECTION U-02 — Filtre de dates commandes : dateFrom ≠ dateTo

**Fichier :** `apps/admin/src/features/orders/pages/AdminOrderListPage.tsx` (ligne ~43)

```typescript
// AVANT (FAUX — filtre impossible)
const params = {
  dateFrom: dateFilter,
  dateTo: dateFilter,   // ← identique à dateFrom !
}

// APRÈS (CORRECT)
const [dateFrom, setDateFrom] = useState('')
const [dateTo, setDateTo] = useState('')
// Deux champs date séparés dans l'UI
```

### CORRECTION U-03 — Icônes dupliquées dans la sidebar

**Fichier :** `apps/admin/src/components/layout/Sidebar.tsx`

```typescript
// Remplacer l'icône Star de Loyalty par une icône distincte
import { Gift } from 'lucide-react'
// { path: '/loyalty', label: 'Fidélité', icon: Gift }  // au lieu de Star
```

### CORRECTION U-04 — Mobile app : traduction manquante

**Fichier :** `app/stores/index.tsx`

```typescript
// AVANT (hardcodé)
<Text>Boutiques suivies</Text>

// APRÈS
const { t } = useTranslation()
<Text>{t('stores.followed')}</Text>
```

### CORRECTION U-05 — Mobile wallet : onglets sans données

**Fichier :** `app/wallet/savings.tsx`

```typescript
// L'onglet actif affiche toujours EmptyState — requête non filtrée par onglet
const { data } = useWalletTransactions({ type: activeTab }) // ← passer le tab actif
```

---

## PARTIE 5 — MODULE SHIPPING (À CRÉER ENTIÈREMENT)

**Statut :** Module entièrement absent côté API. DataSource admin existe mais sans backend.

### Ce qu'il faut créer

**1. Schema DB**
```typescript
// apps/api/src/database/schema/shipping.ts
export const shippingZones = pgTable('shipping_zones', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  countries: text('countries').array(),
  cities: text('cities').array(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
})

export const shippingRates = pgTable('shipping_rates', {
  id: uuid('id').primaryKey().defaultRandom(),
  zoneId: uuid('zone_id').references(() => shippingZones.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  minWeight: decimal('min_weight'),
  maxWeight: decimal('max_weight'),
  basePrice: decimal('base_price', { precision: 10, scale: 2 }).notNull(),
  pricePerKg: decimal('price_per_kg', { precision: 10, scale: 2 }),
  estimatedDaysMin: integer('estimated_days_min'),
  estimatedDaysMax: integer('estimated_days_max'),
  isActive: boolean('is_active').default(true),
})
```

**2. Module NestJS**
- `shipping.module.ts`, `shipping.controller.ts`, `shipping.service.ts`
- Endpoints : `GET /shipping/zones`, `POST /shipping/zones`, `PUT /shipping/zones/:id`, `DELETE /shipping/zones/:id`
- Endpoints : `GET /shipping/rates`, `POST /shipping/rates`, `PUT /shipping/rates/:id`

**3. Page Admin** (si non existante)
- Liste des zones avec CRUD
- Tarifs par zone avec formulaire

---

## RÉCAPITULATIF DES FICHIERS À CRÉER OU MODIFIER

### Nouveaux fichiers
| Fichier | Type | Raison |
|---------|------|--------|
| `apps/api/src/database/schema/campaigns.ts` | Schema DB | Table campaigns dédiée |
| `apps/api/src/database/schema/shipping.ts` | Schema DB | Module Shipping absent |
| `apps/api/src/modules/auth/token-blacklist.service.ts` | Service | Révocation JWT |
| `apps/api/src/modules/shipping/` | Module complet | Feature absente |
| `apps/admin/src/features/customers/components/CustomerWalletTab.tsx` | Composant | Gestion wallet admin |

### Fichiers à modifier (critiques)
| Fichier | Corrections |
|---------|------------|
| `apps/api/src/modules/campaigns/campaigns.service.ts` | Réécriture complète (mauvaise table) |
| `apps/admin/src/infrastructure/data-source/api/ApiAdminStoreDataSource.ts` | 4 bugs (GET→PUT, endpoints, mapper) |
| `apps/api/src/modules/analytics/analytics.service.ts` | Données hardcodées → requêtes SQL réelles |
| `apps/api/src/modules/loyalty/loyalty.service.ts` | WHERE id→customerId, getSummary |
| `apps/api/src/modules/returns/returns.controller.ts` | Ajouter @Get('summary') avant @Get(':id') |
| `apps/api/src/modules/returns/returns.service.ts` | JOINs clients + returnItems + getSummary() |
| `apps/api/src/database/schema/customers.ts` | Ajouter colonne is_banned |
| `apps/api/src/modules/customers/customers.service.ts` | banCustomer no-op → réel |
| `apps/api/src/modules/payouts/payouts.service.ts` | Statuts + getSummary + cancel reason |
| `apps/admin/src/infrastructure/data-source/api/ApiAdminPayoutDataSource.ts` | Champs getSummary + statuts |
| `apps/api/src/modules/delivery/delivery.service.ts` | rateAssignment retour + statuts |
| `apps/admin/src/infrastructure/data-source/AdminDeliveryDataSource.ts` | Statuts tirets→underscores |
| `apps/admin/src/features/auth/infrastructure/api/ApiAdminAuthDataSource.ts` | Logout réel + supprimer démo credentials |
| `apps/admin/src/infrastructure/data-source/api/ApiAdminOrderDataSource.ts` | refund() → appel POST /payments/refund + toOrder statusLog |
| `apps/api/src/modules/payments/payments.service.ts` | refund() recalcule statut commande |

---

## ORDRE D'EXÉCUTION RECOMMANDÉ

### Sprint 1 — Sécurité + No-ops critiques (semaine 1-2)
1. C-09 — JWT logout + supprimer credentials démo
2. C-06 — isBanned migration DB + endpoint ban
3. C-10 — refund() appel financier réel
4. C-02 — ApiAdminStoreDataSource 4 bugs

### Sprint 2 — Modules débranchés (semaine 3-4)
5. C-01 — Campaigns table SQL + réécriture service
6. C-05 — Returns endpoint summary + JOINs + mappings
7. C-04 — Loyalty adjustPoints + getSummary
8. C-07 — Payouts statuts + getSummary

### Sprint 3 — Analytics + Delivery + Shipping (semaine 5-6)
9. C-03 — Analytics requêtes SQL réelles
10. C-08 — Delivery statuts + rateAssignment
11. SHIPPING — Module complet (schema + API + UI)

### Sprint 4 — Corrections modules moyens (semaine 7-8)
12. M-01 à M-12 — toutes les corrections par module
13. X-01 à X-06 — cohérence mobile

### Sprint 5 — UI/UX + Tests (semaine 9-10)
14. U-01 à U-05 — corrections UI
15. Tests d'intégration sur tous les flux corrigés

---

*Document généré le 24 juillet 2026 — ExpressAfri v1.x*
*Ce document doit être tenu à jour au fur et à mesure des corrections appliquées.*
