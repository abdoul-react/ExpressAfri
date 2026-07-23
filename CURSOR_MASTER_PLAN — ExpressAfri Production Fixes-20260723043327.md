# CURSOR_MASTER_PLAN — ExpressAfri Production Fixes

# CURSOR MASTER PLAN — ExpressAfri
## Instructions pour Cursor AI
> **Objectif** : Amener le projet ExpressAfri à un niveau 100% production-ready.  
> Ce document est la source de vérité. Exécuter chaque phase dans l'ordre.  
> Après chaque phase, vérifier : `npx tsc --noEmit` + `npm run lint` (mobile) et `npm run build` (API + admin).
* * *
## Contexte du projet

| Couche | Techno | Dossier |
| ---| ---| --- |
| App Mobile | Expo SDK 57 + React Native + TypeScript + expo-router | Racine (`app/`, `src/`) |
| Backend API | NestJS + Drizzle ORM + PostgreSQL | `apps/api/` |
| Panel Admin | React + Vite + Tailwind | `apps/admin/` |

**Architecture** : Monolithe modulaire NestJS (28 modules). Chaque module = un domaine métier isolé.
**Conventions** : écran → hook → service → datasource. Pas d'import direct de mocks depuis les écrans.

* * *
## PHASE 1 — FIX CRITIQUE : Guard JWT Admin Global (BLOQUANT)
### Problème
`apps/api/src/app.module.ts` (ligne ~70-72) : le `JwtAuthGuard` admin est enregistré **globalement** via `APP_GUARD`. Il intercepte TOUTES les requêtes, y compris celles des clients mobile. Résultat : `POST /orders`, `POST /chat/messages`, etc. renvoient 401 pour les clients.
### Correction
**Fichier :** **`apps/api/src/app.module.ts`**

```typescript
// SUPPRIMER le provider global :
// {
//   provide: APP_GUARD,
//   useClass: JwtAuthGuard,
// },

// Le guard admin doit être appliqué UNIQUEMENT sur les controllers admin
// via @UseGuards(JwtAuthGuard) sur chaque controller admin,
// OU via un module AdminModule qui a son propre APP_GUARD local.
```

**Approche recommandée** : Créer un décorateur `@AdminOnly()` qui combine `@UseGuards(JwtAuthGuard)` et l'appliquer sur tous les controllers admin :

```typescript
// apps/api/src/common/decorators/admin-only.decorator.ts
import { applyDecorators, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../guards/jwt-auth.guard'

export function AdminOnly() {
  return applyDecorators(UseGuards(JwtAuthGuard))
}
```

Puis dans chaque controller admin :

```typescript
@Controller('products')
@AdminOnly()
export class ProductsController { ... }
```

Les controllers mobile (`MobileController`, `ChatController`) utilisent `@Public()` ou `CustomerAuthGuard`.

**Vérification** : Après correction, `POST /mobile/orders` avec un token client ne doit plus renvoyer 401.

* * *
## PHASE 2 — CHECKOUT RÉEL (Création commande + stock)
### 2.1 Endpoint POST /mobile/orders
**Fichier :** **`apps/api/src/modules/mobile/mobile.controller.ts`**

Ajouter :

```typescript
@Post('orders')
@ApiBearerAuth()
@HttpCode(HttpStatus.CREATED)
@ApiOperation({ summary: 'Créer une commande depuis le panier' })
async createOrder(@CurrentUser() user: any, @Body() body: CreateOrderDto) {
  if (!user?.id) throw new UnauthorizedException('Connexion requise')
  return this.service.createOrder(user.id, body)
}
```

**Fichier :** **`apps/api/src/modules/mobile/dto/create-order.dto.ts`** (CRÉER)

```typescript
export class CreateOrderDto {
  items: {
    productId: string
    variantId?: string
    quantity: number
  }[]
  shippingAddressId: string
  paymentMethod: string // 'orange_money' | 'wave' | 'card' | 'cod' | 'wallet'
  couponCode?: string
  notes?: string
}
```

### 2.2 Service createOrder
**Fichier :** **`apps/api/src/modules/mobile/mobile.service.ts`**

```typescript
async createOrder(customerId: string, dto: CreateOrderDto) {
  // 1. Valider le client
  const [customer] = await this.db.select().from(customers)
    .where(eq(customers.id, customerId)).limit(1)
  if (!customer) throw new NotFoundException('Client introuvable')

  // 2. Récupérer et valider chaque produit/variante
  const orderItems = []
  let subtotal = 0

  for (const item of dto.items) {
    const [product] = await this.db.select().from(products)
      .where(and(eq(products.id, item.productId), eq(products.status, 'active')))
      .limit(1)
    if (!product) throw new BadRequestException(`Produit ${item.productId} introuvable ou inactif`)

    let unitPrice = Number(product.price)
    let sku = product.slug
    let label = product.name
    let imageUrl = null

    if (item.variantId) {
      const [variant] = await this.db.select().from(productVariants)
        .where(and(
          eq(productVariants.id, item.variantId),
          eq(productVariants.productId, item.productId)
        )).limit(1)
      if (!variant) throw new BadRequestException(`Variante ${item.variantId} introuvable`)
      if (variant.stock < item.quantity) {
        throw new BadRequestException(`Stock insuffisant pour ${variant.label} (dispo: ${variant.stock})`)
      }
      unitPrice = variant.price ? Number(variant.price) : unitPrice
      sku = variant.sku
      label = `${product.name} - ${variant.label}`
      imageUrl = variant.imageUrl
    }

    // Récupérer la première image du produit si pas de variante
    if (!imageUrl) {
      const [img] = await this.db.select().from(productImages)
        .where(eq(productImages.productId, item.productId))
        .orderBy(productImages.sortOrder)
        .limit(1)
      imageUrl = img?.url ?? null
    }

    const totalPrice = unitPrice * item.quantity
    subtotal += totalPrice

    orderItems.push({
      productId: item.productId,
      variantId: item.variantId ?? null,
      storeId: product.storeId,
      sku,
      label,
      imageUrl,
      quantity: item.quantity,
      unitPrice: unitPrice.toFixed(2),
      totalPrice: totalPrice.toFixed(2),
    })
  }

  // 3. Calculer les frais
  const shippingCost = subtotal >= 10000 ? 0 : 1500 // Lire depuis app_settings
  const taxAmount = 0 // Pas de TVA sur marketplace pour l'instant
  let discountAmount = 0

  // 4. Appliquer le coupon si fourni
  let couponId = null
  if (dto.couponCode) {
    const [coupon] = await this.db.select().from(coupons)
      .where(and(
        eq(coupons.code, dto.couponCode),
        eq(coupons.isActive, true)
      )).limit(1)
    if (coupon && new Date(coupon.endDate) > new Date()) {
      couponId = coupon.id
      if (coupon.type === 'percentage') {
        discountAmount = subtotal * Number(coupon.value) / 100
        if (coupon.maxDiscount) discountAmount = Math.min(discountAmount, Number(coupon.maxDiscount))
      } else if (coupon.type === 'fixed') {
        discountAmount = Number(coupon.value)
      } else if (coupon.type === 'free_shipping') {
        discountAmount = shippingCost
      }
    }
  }

  const total = subtotal + shippingCost + taxAmount - discountAmount

  // 5. Récupérer l'adresse de livraison
  const [address] = await this.db.select().from(addresses)
    .where(and(eq(addresses.id, dto.shippingAddressId), eq(addresses.customerId, customerId)))
    .limit(1)
  if (!address) throw new BadRequestException('Adresse de livraison introuvable')

  // 6. Générer le numéro de commande
  const orderNumber = `EA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

  // 7. Insérer la commande
  const storeId = orderItems[0].storeId // Multi-store: splitter par store si nécessaire
  const [order] = await this.db.insert(orders).values({
    storeId,
    customerId,
    orderNumber,
    status: dto.paymentMethod === 'cod' ? 'confirmed' : 'pending',
    subtotal: subtotal.toFixed(2),
    shippingCost: shippingCost.toFixed(2),
    taxAmount: taxAmount.toFixed(2),
    discountAmount: discountAmount.toFixed(2),
    total: total.toFixed(2),
    currency: 'XOF',
    couponId,
    couponCode: dto.couponCode ?? null,
    shippingAddress: JSON.stringify(address),
    notes: dto.notes ?? null,
  }).returning()

  // 8. Insérer les items
  await this.db.insert(orderItemsTable).values(
    orderItems.map((oi) => ({ ...oi, orderId: order.id }))
  )

  // 9. Décrémenter le stock
  for (const item of dto.items) {
    if (item.variantId) {
      await this.db.update(productVariants)
        .set({ stock: sql`stock - ${item.quantity}` })
        .where(eq(productVariants.id, item.variantId))
    }
  }

  // 10. Log le statut initial
  await this.db.insert(orderStatusLog).values({
    orderId: order.id,
    storeId,
    fromStatus: null,
    toStatus: order.status,
    reason: 'Commande créée',
  })

  // 11. Incrémenter les stats client
  await this.db.update(customers).set({
    totalOrders: sql`total_orders + 1`,
    totalSpent: sql`total_spent + ${total}`,
  }).where(eq(customers.id, customerId))

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    total: order.total,
    currency: order.currency,
    message: dto.paymentMethod === 'cod'
      ? 'Commande confirmée. Paiement à la livraison.'
      : 'Commande créée. Veuillez procéder au paiement.',
  }
}
```

### 2.3 Côté Mobile — Brancher le vrai checkout
**Fichier :** **`app/checkout/payment.tsx`**

Remplacer le `setTimeout` simulé par un vrai appel API :

```typescript
// AVANT (supprimer) :
// await new Promise((resolve) => setTimeout(resolve, 1200));
// clear();
// router.replace('/checkout/success');

// APRÈS :
const cartItems = useCartStore.getState().items
const selectedAddress = useAddressStore.getState().selectedId

try {
  setLoading(true)
  const response = await apiAdapter.post('/mobile/orders', {
    items: cartItems.map((i) => ({
      productId: i.productId,
      variantId: i.variantId,
      quantity: i.quantity,
    })),
    shippingAddressId: selectedAddress,
    paymentMethod: selectedMethod,
    couponCode: coupon?.code,
  })

  if (selectedMethod === 'cod') {
    // Paiement à la livraison : commande déjà confirmée
    useCartStore.getState().clear()
    router.replace({ pathname: '/checkout/success', params: { orderId: response.id } })
  } else {
    // Mobile Money / Carte : initier le paiement
    // TODO Phase 7 : intégration réelle avec Flutterwave/Paystack
    // Pour l'instant : simuler le succès
    useCartStore.getState().clear()
    router.replace({ pathname: '/checkout/success', params: { orderId: response.id } })
  }
} catch (error: any) {
  Alert.alert('Erreur', error.message || 'Impossible de créer la commande')
} finally {
  setLoading(false)
}
```

* * *
## PHASE 3 — FULFILLMENT PARTIEL (Commandes multi-produits)
### 3.1 Migration : statut par item + table shipments
**Fichier :** **`apps/api/src/database/schema/orders.ts`**

Ajouter les colonnes à `order_items` :

```typescript
// Dans la définition de orderItems, ajouter :
status: text('status').default('pending'), // 'pending','confirmed','ready','shipped','delivered','cancelled','issue'
issueReason: text('issue_reason'),
shippedAt: timestamp('shipped_at', { withTimezone: true }),
deliveredAt: timestamp('delivered_at', { withTimezone: true }),
```

**Nouveau fichier :** **`apps/api/src/database/schema/shipments.ts`**

```typescript
import { pgTable, uuid, text, timestamp, integer, decimal } from 'drizzle-orm/pg-core'
import { orders } from './orders'
import { stores } from './stores'

export const shipments = pgTable('shipments', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  trackingNumber: text('tracking_number'),
  trackingUrl: text('tracking_url'),
  deliveryPersonId: uuid('delivery_person_id'),
  status: text('status').default('preparing'), // 'preparing','shipped','in_transit','delivered','failed'
  notes: text('notes'),
  shippedAt: timestamp('shipped_at', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const shipmentItems = pgTable('shipment_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  shipmentId: uuid('shipment_id').notNull().references(() => shipments.id, { onDelete: 'cascade' }),
  orderItemId: uuid('order_item_id').notNull(),
  quantity: integer('quantity').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})
```

**Exporter dans** **`apps/api/src/database/schema/index.ts`** :

```typescript
export * from './shipments'
```

### 3.2 Endpoints Admin pour fulfillment partiel
**Fichier :** **`apps/api/src/modules/orders/orders.controller.ts`**

Ajouter :

```typescript
@Post(':id/shipments')
@ApiOperation({ summary: 'Créer une expédition partielle (sélectionner items prêts)' })
async createShipment(
  @Param('id') orderId: string,
  @Body() body: {
    items: { orderItemId: string; quantity: number }[]
    trackingNumber?: string
    deliveryPersonId?: string
    notes?: string
  }
) {
  return this.service.createShipment(orderId, body)
}

@Put(':id/items/:itemId/status')
@ApiOperation({ summary: 'Changer le statut d\'un item individuellement' })
async updateItemStatus(
  @Param('id') orderId: string,
  @Param('itemId') itemId: string,
  @Body() body: { status: string; issueReason?: string }
) {
  return this.service.updateItemStatus(orderId, itemId, body)
}

@Get(':id/shipments')
@ApiOperation({ summary: 'Lister les expéditions d\'une commande' })
async listShipments(@Param('id') orderId: string) {
  return this.service.listShipments(orderId)
}
```

### 3.3 Service fulfillment
**Fichier :** **`apps/api/src/modules/orders/orders.service.ts`**

```typescript
async createShipment(orderId: string, data: {
  items: { orderItemId: string; quantity: number }[]
  trackingNumber?: string
  deliveryPersonId?: string
  notes?: string
}) {
  const [order] = await this.db.select().from(orders)
    .where(eq(orders.id, orderId)).limit(1)
  if (!order) throw new NotFoundException('Commande introuvable')

  // Créer l'expédition
  const [shipment] = await this.db.insert(shipments).values({
    orderId,
    storeId: order.storeId,
    trackingNumber: data.trackingNumber ?? null,
    deliveryPersonId: data.deliveryPersonId ?? null,
    status: 'preparing',
    notes: data.notes ?? null,
  }).returning()

  // Ajouter les items à l'expédition
  await this.db.insert(shipmentItems).values(
    data.items.map((i) => ({
      shipmentId: shipment.id,
      orderItemId: i.orderItemId,
      quantity: i.quantity,
    }))
  )

  // Mettre à jour le statut des items
  for (const item of data.items) {
    await this.db.update(orderItemsTable)
      .set({ status: 'ready' })
      .where(eq(orderItemsTable.id, item.orderItemId))
  }

  // Recalculer le statut global de la commande
  await this.recalculateOrderStatus(orderId)

  return shipment
}

async updateItemStatus(orderId: string, itemId: string, data: { status: string; issueReason?: string }) {
  const patch: Record<string, unknown> = { status: data.status }
  if (data.status === 'issue') patch.issueReason = data.issueReason
  if (data.status === 'shipped') patch.shippedAt = new Date()
  if (data.status === 'delivered') patch.deliveredAt = new Date()

  await this.db.update(orderItemsTable).set(patch)
    .where(and(eq(orderItemsTable.id, itemId), eq(orderItemsTable.orderId, orderId)))

  await this.recalculateOrderStatus(orderId)
  
  // Déclencher notification (Phase 5)
  await this.emitOrderEvent(orderId, `item_${data.status}`, itemId)

  return { success: true }
}

private async recalculateOrderStatus(orderId: string) {
  const items = await this.db.select().from(orderItemsTable)
    .where(eq(orderItemsTable.orderId, orderId))

  const statuses = items.map((i) => i.status)
  let newStatus: string

  if (statuses.every((s) => s === 'delivered')) {
    newStatus = 'delivered'
  } else if (statuses.every((s) => s === 'cancelled' || s === 'issue')) {
    newStatus = 'cancelled'
  } else if (statuses.some((s) => s === 'shipped' || s === 'delivered')) {
    newStatus = 'shipped' // Partiellement expédié
  } else if (statuses.some((s) => s === 'ready')) {
    newStatus = 'processing'
  } else if (statuses.every((s) => s === 'confirmed' || s === 'ready')) {
    newStatus = 'confirmed'
  } else {
    newStatus = 'pending'
  }

  const [order] = await this.db.select().from(orders).where(eq(orders.id, orderId)).limit(1)
  if (order && order.status !== newStatus) {
    await this.db.update(orders).set({
      status: newStatus,
      updatedAt: new Date(),
      ...(newStatus === 'shipped' ? { shippedAt: new Date() } : {}),
      ...(newStatus === 'delivered' ? { deliveredAt: new Date() } : {}),
    }).where(eq(orders.id, orderId))

    // Log la transition
    await this.db.insert(orderStatusLog).values({
      orderId,
      storeId: order.storeId,
      fromStatus: order.status,
      toStatus: newStatus,
      reason: 'Recalcul automatique depuis statuts items',
    })
  }
}
```

### 3.4 Admin Panel — UI Fulfillment
**Fichier :** **`apps/admin/src/features/orders/pages/AdminOrderDetailPage.tsx`**

Ajouter une section "Items de la commande" avec :
*   Checkbox par item pour sélectionner ceux qui sont prêts
*   Bouton "Créer une expédition" avec les items sélectionnés
*   Bouton "Signaler un problème" par item (ouvre un champ reason)
*   Badge de statut par item (pending/ready/shipped/delivered/issue)
*   Timeline des expéditions créées

* * *
## PHASE 4 — MESSAGERIE UNIFIÉE
### 4.1 Pont Admin → Chat Mobile
**Fichier :** **`apps/api/src/modules/admin-messages/admin-messages.controller.ts`**

Ajouter les endpoints :

```typescript
@Get('chat')
@ApiOperation({ summary: 'Lister toutes les conversations chat mobile (vue admin)' })
async listChatConversations(@Query('page') page = 1, @Query('limit') limit = 20) {
  return this.service.listChatConversations({ page: +page, limit: +limit })
}

@Get('chat/:id')
@ApiOperation({ summary: 'Détail conversation + messages' })
async getChatConversation(@Param('id') id: string) {
  return this.service.getChatConversation(id)
}

@Post('chat/:id/reply')
@ApiOperation({ summary: 'Répondre à un client depuis l\'admin' })
async replyChatConversation(
  @Param('id') id: string,
  @Body() body: { content: string },
  @CurrentUser() admin: any,
) {
  return this.service.replyChatConversation(id, body.content, admin)
}
```

### 4.2 Service
**Fichier :** **`apps/api/src/modules/admin-messages/admin-messages.service.ts`**

```typescript
import { conversations, messages } from '../../database/schema/chat'

async listChatConversations(params: { page: number; limit: number }) {
  const offset = (params.page - 1) * params.limit
  const [data, [{ count }]] = await Promise.all([
    this.db.select().from(conversations)
      .limit(params.limit).offset(offset)
      .orderBy(desc(conversations.updatedAt)),
    this.db.select({ count: sql<number>`count(*)` }).from(conversations),
  ])
  
  // Enrichir avec le dernier message et le count non-lu
  const enriched = await Promise.all(data.map(async (conv) => {
    const [lastMsg] = await this.db.select().from(messages)
      .where(eq(messages.conversationId, conv.id))
      .orderBy(desc(messages.createdAt)).limit(1)
    const [{ unread }] = await this.db.select({ unread: sql<number>`count(*)` })
      .from(messages)
      .where(and(
        eq(messages.conversationId, conv.id),
        eq(messages.isRead, false),
        ne(messages.senderRole, 'admin')
      ))
    return { ...conv, lastMessage: lastMsg ?? null, unreadCount: Number(unread) }
  }))

  return { data: enriched, total: Number(count), page: params.page, limit: params.limit }
}

async getChatConversation(id: string) {
  const [conv] = await this.db.select().from(conversations)
    .where(eq(conversations.id, id)).limit(1)
  if (!conv) throw new NotFoundException('Conversation introuvable')
  
  const msgList = await this.db.select().from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(messages.createdAt)

  // Marquer les messages client comme lus
  await this.db.update(messages)
    .set({ isRead: true })
    .where(and(
      eq(messages.conversationId, id),
      ne(messages.senderRole, 'admin')
    ))

  return { ...conv, messages: msgList }
}

async replyChatConversation(conversationId: string, content: string, admin: any) {
  const [conv] = await this.db.select().from(conversations)
    .where(eq(conversations.id, conversationId)).limit(1)
  if (!conv) throw new NotFoundException('Conversation introuvable')

  const [msg] = await this.db.insert(messages).values({
    conversationId,
    senderId: admin.id,
    senderRole: 'admin',
    senderName: admin.name ?? 'Admin',
    content,
    isRead: false,
  }).returning()

  await this.db.update(conversations)
    .set({ updatedAt: new Date(), status: 'active' })
    .where(eq(conversations.id, conversationId))

  return msg
}
```

### 4.3 Messages système (table messages, senderRole = 'system')
**Fichier :** **`apps/api/src/modules/notifications/order-events.listener.ts`** (CRÉER)

```typescript
import { Injectable } from '@nestjs/common'
import { db } from '../../database'
import { conversations, messages } from '../../database/schema/chat'
import { eq } from 'drizzle-orm'

@Injectable()
export class OrderEventsListener {
  constructor(private db: any) {}

  async onOrderStatusChange(orderId: string, customerId: string, newStatus: string, details?: string) {
    // Trouver ou créer la conversation de la commande
    let [conv] = await this.db.select().from(conversations)
      .where(and(
        eq(conversations.customerId, customerId),
        eq(conversations.subject, `Commande #${orderId.slice(0, 8)}`)
      )).limit(1)

    if (!conv) {
      [conv] = await this.db.insert(conversations).values({
        customerId,
        subject: `Commande #${orderId.slice(0, 8)}`,
        status: 'active',
      }).returning()
    }

    // Messages système par statut
    const systemMessages: Record<string, string> = {
      confirmed: '✅ Votre commande a été confirmée. Nous préparons vos articles.',
      processing: '📦 Votre commande est en cours de préparation.',
      shipped: '🚚 Votre commande a été expédiée ! Vous serez livré sous 2-5 jours.',
      delivered: '🎉 Votre commande a été livrée. Merci pour votre achat !',
      cancelled: '❌ Votre commande a été annulée.',
      refunded: '💰 Votre remboursement a été effectué.',
    }

    const content = systemMessages[newStatus] ?? `Statut mis à jour : ${newStatus}`
    const fullContent = details ? `${content}
${details}` : content

    // Insérer le message système
    await this.db.insert(messages).values({
      conversationId: conv.id,
      senderId: 'system',
      senderRole: 'system',
      senderName: 'ExpressAfri',
      content: fullContent,
      isRead: false,
    })

    await this.db.update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conv.id))
  }

  async onShipmentCreated(orderId: string, customerId: string, trackingNumber?: string) {
    let message = '📦 Une expédition a été créée pour votre commande.'
    if (trackingNumber) {
      message += `
Numéro de suivi : ${trackingNumber}`
    }
    await this.onOrderStatusChange(orderId, customerId, 'shipment_created', message)
  }

  async onItemIssue(orderId: string, customerId: string, itemName: string, reason: string) {
    const message = `⚠️ Un problème a été signalé sur l'article "${itemName}" : ${reason}. Notre équipe vous contactera.`
    await this.onOrderStatusChange(orderId, customerId, 'item_issue', message)
  }
}
```

### 4.4 Intégrer l'event listener dans OrdersService
Dans `orders.service.ts`, après chaque changement de statut :

```typescript
// Après updateOrderStatus :
await this.orderEventsListener.onOrderStatusChange(orderId, order.customerId, newStatus)

// Après createShipment :
await this.orderEventsListener.onShipmentCreated(orderId, order.customerId, data.trackingNumber)

// Après updateItemStatus avec status='issue' :
await this.orderEventsListener.onItemIssue(orderId, order.customerId, item.label, data.issueReason)
```

### 4.5 Admin Panel — onglet Chat clients
**Fichier :** **`apps/admin/src/features/messages/pages/AdminMessageListPage.tsx`**

Ajouter un onglet "Chat clients" qui :
*   Appelle `GET /messages/chat`
*   Affiche la liste des conversations avec badge non-lu
*   Au clic → charge `GET /messages/chat/:id` et affiche les messages
*   Permet de répondre via `POST /messages/chat/:id/reply`
*   Différencie visuellement les messages client/admin/système

* * *
## PHASE 5 — MODULE REÇUS COMPLET
### 5.1 Schéma DB
**Fichier :** **`apps/api/src/database/schema/receipts.ts`**

```typescript
import { pgTable, uuid, text, timestamp, decimal, integer, boolean, jsonb } from 'drizzle-orm/pg-core'
import { orders } from './orders'
import { stores } from './stores'

export const receipts = pgTable('receipts', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  receiptNumber: text('receipt_number').notNull().unique(), // Séquentiel : EA-2026-000001
  customerId: uuid('customer_id'),
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email'),
  customerPhone: text('customer_phone'),
  items: jsonb('items').notNull(), // Snapshot des items au moment de la génération
  subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
  shippingCost: decimal('shipping_cost', { precision: 10, scale: 2 }).default('0'),
  taxAmount: decimal('tax_amount', { precision: 10, scale: 2 }).default('0'),
  discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }).default('0'),
  total: decimal('total', { precision: 12, scale: 2 }).notNull(),
  currency: text('currency').default('XOF'),
  paymentMethod: text('payment_method'),
  paymentStatus: text('payment_status'),
  pdfUrl: text('pdf_url'), // URL du PDF généré
  status: text('status').default('generated'), // 'generated','sent','viewed'
  sentAt: timestamp('sent_at', { withTimezone: true }),
  metadata: jsonb('metadata'), // Données supplémentaires (mentions légales, etc.)
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const receiptSettings = pgTable('receipt_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  prefix: text('prefix').default('EA'), // Préfixe de numérotation
  nextNumber: integer('next_number').default(1),
  logoUrl: text('logo_url'),
  businessName: text('business_name'),
  businessAddress: text('business_address'),
  businessPhone: text('business_phone'),
  businessEmail: text('business_email'),
  taxId: text('tax_id'), // NIF/RCCM
  legalMention: text('legal_mention'), // Mentions légales obligatoires
  footerText: text('footer_text'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})
```

### 5.2 Service Reçus
**Fichier :** **`apps/api/src/modules/receipts/receipts.service.ts`**

```typescript
import { Injectable, NotFoundException } from '@nestjs/common'
import { eq, sql, desc } from 'drizzle-orm'

@Injectable()
export class ReceiptsService {
  constructor(private db: any) {}

  async generateReceipt(orderId: string) {
    // 1. Charger la commande complète
    const [order] = await this.db.select().from(orders)
      .where(eq(orders.id, orderId)).limit(1)
    if (!order) throw new NotFoundException('Commande introuvable')

    // 2. Charger les items
    const items = await this.db.select().from(orderItemsTable)
      .where(eq(orderItemsTable.orderId, orderId))

    // 3. Charger le client
    const [customer] = await this.db.select().from(customers)
      .where(eq(customers.id, order.customerId)).limit(1)

    // 4. Charger les settings de reçu
    let [settings] = await this.db.select().from(receiptSettings)
      .where(eq(receiptSettings.storeId, order.storeId)).limit(1)
    if (!settings) {
      // Créer des settings par défaut
      [settings] = await this.db.insert(receiptSettings).values({
        storeId: order.storeId,
        prefix: 'EA',
        nextNumber: 1,
      }).returning()
    }

    // 5. Générer le numéro séquentiel
    const year = new Date().getFullYear()
    const num = String(settings.nextNumber).padStart(6, '0')
    const receiptNumber = `${settings.prefix}-${year}-${num}`

    // Incrémenter le compteur
    await this.db.update(receiptSettings)
      .set({ nextNumber: sql`next_number + 1` })
      .where(eq(receiptSettings.id, settings.id))

    // 6. Créer le reçu
    const [receipt] = await this.db.insert(receipts).values({
      orderId,
      storeId: order.storeId,
      receiptNumber,
      customerId: order.customerId,
      customerName: customer ? `${customer.firstName} ${customer.lastName}` : 'Client',
      customerEmail: customer?.email,
      customerPhone: customer?.phone,
      items: JSON.stringify(items),
      subtotal: order.subtotal,
      shippingCost: order.shippingCost,
      taxAmount: order.taxAmount,
      discountAmount: order.discountAmount,
      total: order.total,
      currency: order.currency,
      paymentMethod: null, // Rempli lors du paiement
      paymentStatus: 'pending',
      metadata: JSON.stringify({
        businessName: settings.businessName,
        businessAddress: settings.businessAddress,
        taxId: settings.taxId,
        legalMention: settings.legalMention,
        footerText: settings.footerText,
      }),
    }).returning()

    return receipt
  }

  async listReceipts(params: { page: number; limit: number; storeId?: string }) {
    const offset = (params.page - 1) * params.limit
    const conditions = params.storeId ? eq(receipts.storeId, params.storeId) : undefined
    
    const [data, [{ count }]] = await Promise.all([
      this.db.select().from(receipts)
        .where(conditions)
        .limit(params.limit).offset(offset)
        .orderBy(desc(receipts.createdAt)),
      this.db.select({ count: sql<number>`count(*)` }).from(receipts).where(conditions),
    ])
    return { data, total: Number(count) }
  }

  async getReceipt(id: string) {
    const [receipt] = await this.db.select().from(receipts)
      .where(eq(receipts.id, id)).limit(1)
    if (!receipt) throw new NotFoundException('Reçu introuvable')
    return receipt
  }

  async resendReceipt(id: string) {
    const receipt = await this.getReceipt(id)
    // TODO: Envoyer par email/SMS via le module notifications
    await this.db.update(receipts)
      .set({ status: 'sent', sentAt: new Date() })
      .where(eq(receipts.id, id))
    return { success: true, message: 'Reçu renvoyé' }
  }

  async updateSettings(storeId: string, data: Partial<typeof receiptSettings.$inferInsert>) {
    const [existing] = await this.db.select().from(receiptSettings)
      .where(eq(receiptSettings.storeId, storeId)).limit(1)
    if (existing) {
      const [updated] = await this.db.update(receiptSettings).set({ ...data, updatedAt: new Date() })
        .where(eq(receiptSettings.id, existing.id)).returning()
      return updated
    } else {
      const [created] = await this.db.insert(receiptSettings).values({ storeId, ...data }).returning()
      return created
    }
  }
}
```

### 5.3 Controller Reçus
**Fichier :** **`apps/api/src/modules/receipts/receipts.controller.ts`**

```typescript
import { Controller, Get, Post, Put, Param, Query, Body } from '@nestjs/common'

@Controller('receipts')
export class ReceiptsController {
  constructor(private service: ReceiptsService) {}

  @Post('generate/:orderId')
  @ApiOperation({ summary: 'Générer un reçu pour une commande' })
  async generate(@Param('orderId') orderId: string) {
    return this.service.generateReceipt(orderId)
  }

  @Get()
  @ApiOperation({ summary: 'Lister tous les reçus' })
  async list(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.service.listReceipts({ page: +page, limit: +limit })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un reçu' })
  async get(@Param('id') id: string) {
    return this.service.getReceipt(id)
  }

  @Post(':id/resend')
  @ApiOperation({ summary: 'Renvoyer un reçu au client' })
  async resend(@Param('id') id: string) {
    return this.service.resendReceipt(id)
  }

  @Put('settings/:storeId')
  @ApiOperation({ summary: 'Configurer les paramètres de reçus (logo, mentions, numérotation)' })
  async updateSettings(
    @Param('storeId') storeId: string,
    @Body() body: any,
  ) {
    return this.service.updateSettings(storeId, body)
  }
}
```

### 5.4 Déclenchement automatique
Dans `orders.service.ts`, quand le statut passe à `delivered` :

```typescript
if (newStatus === 'delivered') {
  await this.receiptsService.generateReceipt(orderId)
  // Le reçu sera aussi envoyé via notifications
}
```

* * *
## PHASE 6 — NOTIFICATIONS PUSH & TEMPS RÉEL
### 6.1 Schéma push tokens
**Ajouter dans** **`apps/api/src/database/schema/customers.ts`** :

```typescript
export const pushTokens = pgTable('push_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  token: text('token').notNull(),
  platform: text('platform'), // 'ios' | 'android' | 'web'
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})
```

### 6.2 Endpoint enregistrement token
**Dans** **`MobileController`** :

```typescript
@Post('push-token')
@ApiBearerAuth()
async registerPushToken(
  @CurrentUser() user: any,
  @Body() body: { token: string; platform: string }
) {
  return this.service.registerPushToken(user.id, body.token, body.platform)
}
```

### 6.3 Service notification push (via Expo)
**Fichier :** **`apps/api/src/modules/notifications/push.service.ts`** (CRÉER)

```typescript
import { Injectable } from '@nestjs/common'

@Injectable()
export class PushService {
  private readonly EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

  async sendPush(tokens: string[], title: string, body: string, data?: any) {
    const messages = tokens.map((token) => ({
      to: token,
      sound: 'default',
      title,
      body,
      data,
    }))

    try {
      const response = await fetch(this.EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages),
      })
      return response.json()
    } catch (error) {
      console.error('Push notification failed:', error)
    }
  }
}
```

### 6.4 Intégrer dans OrderEventsListener

```typescript
// Après chaque message système, envoyer aussi une push notification
const tokens = await this.db.select().from(pushTokens)
  .where(and(eq(pushTokens.customerId, customerId), eq(pushTokens.isActive, true)))

if (tokens.length > 0) {
  await this.pushService.sendPush(
    tokens.map((t) => t.token),
    'ExpressAfri',
    content,
    { orderId, type: 'order_update' }
  )
}
```

* * *
## PHASE 7 — SÉCURITÉ & ROBUSTESSE
### 7.1 OTP persistant (Redis ou DB)
**Fichier :** **`apps/api/src/modules/auth/auth.service.ts`**

Remplacer `private otpStore = new Map(...)` par la table DB :

```typescript
// Nouveau fichier schema : apps/api/src/database/schema/otp.ts
export const otpCodes = pgTable('otp_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  phone: text('phone').notNull(),
  code: text('code').notNull(),
  attempts: integer('attempts').default(0),
  maxAttempts: integer('max_attempts').default(5),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})
```

Dans `auth.service.ts` :

```typescript
async sendOtp(phone: string) {
  // Rate limiting : max 3 OTP par heure
  const recentCount = await this.db.select({ count: sql<number>`count(*)` })
    .from(otpCodes)
    .where(and(
      eq(otpCodes.phone, phone),
      gt(otpCodes.createdAt, sql`now() - interval '1 hour'`)
    ))
  if (Number(recentCount[0].count) >= 3) {
    throw new BadRequestException('Trop de tentatives. Réessayez dans 1 heure.')
  }

  const code = String(Math.floor(100000 + Math.random() * 900000))
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 min

  await this.db.insert(otpCodes).values({ phone, code, expiresAt })

  // TODO: Envoyer par SMS (intégration Orange SMS / Twilio)
  console.log(`OTP for ${phone}: ${code}`) // Dev only

  return { message: 'Code envoyé', expiresIn: 600 }
}

async verifyOtp(phone: string, code: string) {
  const [otp] = await this.db.select().from(otpCodes)
    .where(and(
      eq(otpCodes.phone, phone),
      eq(otpCodes.code, code),
      isNull(otpCodes.usedAt)
    ))
    .orderBy(desc(otpCodes.createdAt))
    .limit(1)

  if (!otp) throw new BadRequestException('Code invalide')
  if (new Date(otp.expiresAt) < new Date()) throw new BadRequestException('Code expiré')
  if (otp.attempts >= otp.maxAttempts) throw new BadRequestException('Trop de tentatives')

  // Marquer comme utilisé
  await this.db.update(otpCodes)
    .set({ usedAt: new Date() })
    .where(eq(otpCodes.id, otp.id))

  // Créer ou récupérer le customer + générer JWT
  // ...
}
```

### 7.2 Rate Limiting global
**Fichier :** **`apps/api/src/main.ts`**

```typescript
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'

// Dans AppModule imports :
ThrottlerModule.forRoot([{
  ttl: 60000, // 1 minute
  limit: 100, // 100 requêtes par minute
}])

// Provider :
{ provide: APP_GUARD, useClass: ThrottlerGuard }
```

**Installer** : `cd apps/api && npm install @nestjs/throttler`
### 7.3 Idempotency pour les commandes
Dans `CreateOrderDto`, ajouter :

```typescript
idempotencyKey?: string // UUID unique par tentative de commande
```

Dans `createOrder` :

```typescript
if (dto.idempotencyKey) {
  const [existing] = await this.db.select().from(orders)
    .where(eq(orders.idempotencyKey, dto.idempotencyKey)).limit(1)
  if (existing) return existing // Retourner la commande déjà créée
}
```

Ajouter `idempotencyKey` dans la table `orders`.
### 7.4 Validation stock atomique
Remplacer la vérification stock par un UPDATE conditionnel (évite les race conditions) :

```typescript
const result = await this.db.execute(sql`
  UPDATE product_variants
  SET stock = stock - ${quantity}
  WHERE id = ${variantId} AND stock >= ${quantity}
  RETURNING stock
`)
if (result.rows.length === 0) {
  throw new BadRequestException('Stock insuffisant (course de requêtes détectée)')
}
```

* * *
## PHASE 8 — CORRECTIONS UX MOBILE (issues identifiées)
### 8.1 Toutes les valeurs hardcodées → app\_settings
Créer le hook et l'utiliser partout :

**Fichier :** **`src/features/content/useAppSettings.ts`** — tel que défini dans PLAN\_CORRECTIONS\_3.md

Remplacer :
*   `FREE_SHIP_THRESHOLD = 20` → `getNumber('commerce.freeShippingThreshold', 10000)`
*   `"Niger · Niamey"` → `get('app.country')` + lookup pays
*   `"Bonus +20"` → `get('loyalty.bonusValue', '20')`
*   `"AfriExpress"` → `get('app.name', 'ExpressAfri')`
### 8.2 BannerCarousel refactorisé
Appliquer le code complet de C1 dans PLAN\_CORRECTIONS\_3.md (utiliser `imageUrl` + `backgroundColor` au lieu de `gradient`).
### 8.3 Badge notifications dynamique
Appliquer C3 de PLAN\_CORRECTIONS\_3.md (`useUnreadCount` hook).
### 8.4 Feature flags consommés
Appliquer C6 de PLAN\_CORRECTIONS\_3.md (`useFeatureFlags` hook + wrappers).
### 8.5 Écran pages statiques
**Fichier :** **`app/static-page/[slug].tsx`** (CRÉER)

```typescript
import { useLocalSearchParams } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { apiAdapter } from '@/infrastructure/api/apiAdapter'
import { WebView } from 'react-native-webview'
import { ScreenHeader } from '@/components'

export default function StaticPage() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const { data, isLoading } = useQuery({
    queryKey: ['static-page', slug],
    queryFn: () => apiAdapter.get(`/content/pages/${slug}`),
  })

  return (
    <>
      <ScreenHeader title={data?.title ?? ''} />
      {data?.content && (
        <WebView
          source={{ html: `<html><body style="font-family:system-ui;padding:16px">${data.content}</body></html>` }}
          style={{ flex: 1 }}
        />
      )}
    </>
  )
}
```

### 8.6 Avis clients réels
**Dans** **`MobileController`** :

```typescript
@Get('products/:id/reviews')
@Public()
async getProductReviews(@Param('id') id: string, @Query('page') page = 1) {
  return this.service.getProductReviews(id, +page)
}

@Post('products/:id/reviews')
@ApiBearerAuth()
async createReview(
  @Param('id') id: string,
  @CurrentUser() user: any,
  @Body() body: { rating: number; comment: string; images?: string[] }
) {
  return this.service.createReview(id, user.id, body)
}
```

### 8.7 Profil persistant
Vérifier que `src/store/authStore.ts` appelle `PUT /mobile/profile` à chaque modification (nom, avatar, gender, birthYear) et que le state Zustand se synchronise avec la réponse serveur.
### 8.8 Commandes depuis l'API
Remplacer le hook `useOrders()` pour qu'il appelle `GET /mobile/orders` au lieu de lire des données locales/mock.
### 8.9 Coupons réels
L'écran `app/coupons/index.tsx` doit appeler `GET /mobile/coupons` (endpoint existant) et afficher les coupons actifs du client.
### 8.10 Suppression produit = archivage
Dans `products.service.ts` :

```typescript
async deleteProduct(id: string) {
  // Vérifier si le produit est lié à des commandes
  const [ref] = await this.db.select({ count: sql<number>`count(*)` })
    .from(orderItemsTable)
    .where(eq(orderItemsTable.productId, id))
  
  if (Number(ref.count) > 0) {
    // Archiver au lieu de supprimer
    await this.db.update(products)
      .set({ status: 'archived', updatedAt: new Date() })
      .where(eq(products.id, id))
    return { archived: true, message: 'Produit archivé (lié à des commandes existantes)' }
  }

  // Suppression réelle
  await this.db.delete(productImages).where(eq(productImages.productId, id))
  await this.db.delete(productVariants).where(eq(productVariants.productId, id))
  await this.db.delete(products).where(eq(products.id, id))
  return { deleted: true }
}
```

* * *
## PHASE 9 — FRAÎCHEUR DES DONNÉES
### 9.1 Focus refetch
**Fichier :** **`app/_layout.tsx`**

```typescript
import { AppState, Platform } from 'react-native'
import { focusManager, onlineManager } from '@tanstack/react-query'

// Brancher le focus manager
focusManager.setEventListener((handleFocus) => {
  const subscription = AppState.addEventListener('change', (state) => {
    if (Platform.OS !== 'web') {
      handleFocus(state === 'active')
    }
  })
  return () => subscription.remove()
})
```

### 9.2 Pull-to-refresh
Ajouter `RefreshControl` sur les écrans principaux (Accueil, Store, Compte, Commandes) :

```typescript
<ScrollView
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true)
        queryClient.invalidateQueries({ queryKey: ['products'] })
        queryClient.invalidateQueries({ queryKey: ['banners'] })
        // ... etc
        setTimeout(() => setRefreshing(false), 1000)
      }}
    />
  }
>
```

### 9.3 staleTime optimisé

```typescript
// Données qui changent souvent
const STALE_SHORT = 30_000 // 30s : cart, orders, notifications, conversations
// Données semi-statiques
const STALE_MEDIUM = 2 * 60_000 // 2min : products, banners
// Données quasi-statiques
const STALE_LONG = 10 * 60_000 // 10min : categories, settings, feature-flags, payment-methods
```

* * *
## PHASE 10 — PRODUCTION INFRASTRUCTURE
### 10.1 Dockerfile API
**Fichier :** **`apps/api/Dockerfile`** (CRÉER)

```plain
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### 10.2 Health check
**Fichier :** **`apps/api/src/health/health.controller.ts`** (CRÉER)

```typescript
import { Controller, Get } from '@nestjs/common'

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() }
  }
}
```

### 10.3 GitHub Actions CI
**Fichier :** **`.github/workflows/ci.yml`** (CRÉER)

```yaml
name: CI
on: [push, pull_request]
jobs:
  api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: cd apps/api && npm ci && npm run build && npm run lint
  mobile:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci --legacy-peer-deps && npx tsc --noEmit
  admin:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: cd apps/admin && npm ci && npm run build
```

### 10.4 Logging structuré

```bash
cd apps/api && npm install nestjs-pino pino-http pino-pretty
```

Dans `app.module.ts` :

```typescript
import { LoggerModule } from 'nestjs-pino'

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        transport: process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty' }
          : undefined,
      },
    }),
    // ... autres modules
  ],
})
```

* * *
## CHECKLIST FINALE
Après toutes les phases, vérifier :
- [ ] `cd apps/api && npm run build` → 0 erreur
- [ ] `cd apps/admin && npm run build` → 0 erreur
- [ ] `npx tsc --noEmit` (racine) → 0 erreur
- [ ] `npm run check:arch` → 0 violation
- [ ] `npm run lint` → 0 erreur
- [ ] Migrations DB appliquées (`npx drizzle-kit push --force`)
- [ ] Seed mis à jour avec les nouvelles tables
- [ ] Test manuel : créer une commande depuis l'app → visible dans l'admin
- [ ] Test manuel : changer statut item → message système dans la conversation client
- [ ] Test manuel : supprimer un produit lié à une commande → archivé
- [ ] Test manuel : modifier profil → persiste après redémarrage
- [ ] Test manuel : configurer un reçu dans l'admin → généré à la livraison