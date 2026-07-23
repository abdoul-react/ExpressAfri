import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common'
import { eq, and, sql, like, or, desc, inArray, gte } from 'drizzle-orm'
import { DRIZZLE, type DrizzleDB } from '../../database/database.module'
import { orders, orderItems, orderStatusLog } from '../../database/schema/orders'
import { shipments, shipmentItems } from '../../database/schema/shipments'
import { receipts, receiptSettings } from '../../database/schema/receipts'
import { products, productVariants } from '../../database/schema/products'
import { deliveryAssignments, deliveryPersons } from '../../database/schema/delivery'
import { customers } from '../../database/schema/customers'
import { ChatService } from '../chat/chat.service'
import { ReceiptsService } from '../receipts/receipts.service'
import { OrderEventsListener } from '../notifications/order-events.listener'
import { orderStatusMessage } from '../../common/system-messages'

@Injectable()
export class OrdersService {
  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
    private chat: ChatService,
    private receipts: ReceiptsService,
    private orderEvents: OrderEventsListener,
  ) {}

  async list(params: { page?: number; limit?: number; storeId?: string; status?: string; search?: string }) {
    const page = params.page ?? 1
    const limit = params.limit ?? 10
    const offset = (page - 1) * limit

    const conditions = []
    if (params.storeId) conditions.push(eq(orders.storeId, params.storeId))
    if (params.status) conditions.push(eq(orders.status, params.status))
    if (params.search) conditions.push(or(like(orders.orderNumber, `%${params.search}%`), like(orders.couponCode, `%${params.search}%`)))

    const where = conditions.length ? and(...conditions) : undefined
    const [data, [{ count }]] = await Promise.all([
      this.db.select().from(orders).where(where).limit(limit).offset(offset).orderBy(orders.createdAt),
      this.db.select({ count: sql<number>`count(*)` }).from(orders).where(where),
    ])
    return { data, total: Number(count), page }
  }

  async getById(id: string) {
    const [order] = await this.db.select().from(orders).where(eq(orders.id, id)).limit(1)
    if (!order) return null
    const items = await this.db.select().from(orderItems).where(eq(orderItems.orderId, id))
    const statusLog = await this.db.select().from(orderStatusLog).where(eq(orderStatusLog.orderId, id)).orderBy(orderStatusLog.createdAt)
    return { ...order, items, statusLog }
  }

  async updateStatus(id: string, status: string, changedBy?: string, reason?: string) {
    const [order] = await this.db.select().from(orders).where(eq(orders.id, id)).limit(1)
    if (!order) return null

    await this.db.update(orders).set({ status, updatedAt: new Date() }).where(eq(orders.id, id))
    await this.db.insert(orderStatusLog).values({
      orderId: id,
      storeId: order.storeId,
      fromStatus: order.status,
      toStatus: status,
      changedBy,
      reason,
    })

    if (status === 'shipped') await this.db.update(orders).set({ shippedAt: new Date() }).where(eq(orders.id, id))
    if (status === 'delivered') await this.db.update(orders).set({ deliveredAt: new Date() }).where(eq(orders.id, id))

    // Notifier le client dans sa boîte de réception (best-effort — n'annule pas
    // le changement de statut si l'envoi échoue). Message dans la langue du client.
    let language: string | null = null
    if (order.customerId) {
      const [c] = await this.db.select({ language: customers.language }).from(customers)
        .where(eq(customers.id, order.customerId)).limit(1)
      language = c?.language ?? null
    }
    const notice = orderStatusMessage(status, order.orderNumber, language)
    if (notice) await this.chat.postOrderSystemMessage(id, notice)

    // Commande livrée → créer un reçu automatiquement, et l'envoyer si
    // le store a activé l'option auto_send dans ses paramètres.
    if (status === 'delivered') {
      try {
        const [existing] = await this.db.select({ id: receipts.id }).from(receipts)
          .where(eq(receipts.orderId, id)).limit(1)
        if (!existing) {
          const receipt = await this.receipts.create({ orderId: id, storeId: order.storeId })
          const [settings] = await this.db.select().from(receiptSettings)
            .where(eq(receiptSettings.storeId, order.storeId)).limit(1)
          if (settings?.autoSend) {
            await this.receipts.send(receipt.id)
          }
        }
      } catch {
        // Best-effort : la livraison n'est pas bloquée par un échec de reçu
      }
    }

    return this.getById(id)
  }

  async createFromCheckout(data: any, customerId?: string) {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const randPart = Math.random().toString(36).substring(2, 6).toUpperCase()
    const orderNumber = `EXP-${datePart}-${randPart}`
    // Utiliser le storeId fourni, ou celui du premier article, ou la boutique système (UUID fixe du seed)
    const SYSTEM_STORE_ID = '00000000-0000-0000-0000-000000000001'
    const storeId = data.storeId ?? data.items?.[0]?.storeId ?? SYSTEM_STORE_ID

    // UUID regex simple pour valider les IDs avant insertion FK
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const isValidUuid = (s: unknown): boolean =>
      typeof s === 'string' && UUID_RE.test(s)

    // Vérifier que la boutique système existe, sinon la créer
    if (!isValidUuid(storeId)) {
      throw new Error(`storeId invalide : "${storeId}"`)
    }

    // Idempotency : si une clé est fournie et qu'une commande existe déjà, la retourner
    if (data.idempotencyKey) {
      const [existing] = await this.db.select().from(orders)
        .where(eq(orders.idempotencyKey, data.idempotencyKey)).limit(1)
      if (existing) return this.getById(existing.id)
    }

    // N'insérer les articles que si leur productId est un UUID valide (évite FK violation avec IDs mock)
    const validItems = (data.items ?? []).filter((item: any) => isValidUuid(item.productId))

    // Tout est transactionnel : résolution de variante + décrément de stock +
    // insertion. Une rupture de stock annule TOUTE la commande
    const orderId = await this.db.transaction(async (tx) => {
      const [order] = await tx.insert(orders).values({
        storeId,
        idempotencyKey: data.idempotencyKey ?? null,
        customerId: isValidUuid(customerId) ? customerId : undefined,
        orderNumber,
        status: 'pending',
        subtotal: data.subtotal ?? '0',
        shippingCost: data.shippingCost ?? '0',
        taxAmount: data.taxAmount ?? '0',
        discountAmount: data.discountAmount ?? '0',
        total: data.total ?? '0',
        currency: data.currency ?? 'XOF',
        couponCode: data.couponCode,
        shippingAddress: data.shippingAddress ? JSON.stringify(data.shippingAddress) : undefined,
        billingAddress: data.billingAddress ? JSON.stringify(data.billingAddress) : undefined,
        notes: data.notes,
      }).returning()

      for (const item of validItems) {
        const quantity = item.quantity ?? 1
        // Résolution de la variante à partir de la sélection structurée du client.
        // Sans sélection (produit sans déclinaison) ou variante introuvable : on
        // conserve juste le libellé texte (sku) sans toucher au stock.
        const resolvedVariantId = await this.resolveAndDecrementVariant(
          tx,
          item.productId,
          item.variantAttributes,
          quantity,
          item.label ?? item.title ?? item.variantLabel ?? 'Article',
        )

        await tx.insert(orderItems).values({
          orderId: order.id,
          productId: item.productId,
          variantId: resolvedVariantId ?? (isValidUuid(item.variantId) ? item.variantId : undefined),
          storeId,
          // La déclinaison choisie par le client (ex. « Rouge, L ») arrive du mobile
          // sous `variantLabel` ; on la conserve dans `sku` (relu comme variante côté
          // mobile ET admin) pour que le gérant sache quoi préparer.
          sku: item.sku ?? item.variantLabel ?? null,
          label: item.label ?? item.title ?? 'Article',
          imageUrl: item.imageUrl ?? item.image ?? null,
          quantity,
          unitPrice: item.unitPrice ?? item.price ?? '0',
          totalPrice: ((Number(item.unitPrice ?? item.price ?? 0)) * quantity).toString(),
        })
      }

      await tx.insert(orderStatusLog).values({
        orderId: order.id,
        storeId,
        toStatus: 'pending',
      })

      return order.id
    })

    return this.getById(orderId)
  }

  /**
   * Résout la variante exacte choisie par le client puis décrémente son stock
   * de façon atomique. Retourne l'id de variante si résolue+décrémentée, sinon
   * null (produit sans déclinaison, ou sélection ne correspondant à aucune
   * variante active → on n'impacte pas le stock, on garde le libellé texte).
   * Lève BadRequestException si la variante existe mais est en rupture.
   */
  private async resolveAndDecrementVariant(
    tx: any,
    productId: string,
    variantAttributes: unknown,
    quantity: number,
    label: string,
  ): Promise<string | null> {
    if (!Array.isArray(variantAttributes) || variantAttributes.length === 0) return null

    // Clé de comparaison normalisée (insensible à la casse/espaces), triée pour
    // que l'ordre des attributs n'influe pas sur la correspondance.
    const norm = (attrs: any[]): string =>
      attrs
        .filter((a) => a && a.name != null && a.value != null)
        .map((a) => `${String(a.name).trim().toLowerCase()}=${String(a.value).trim().toLowerCase()}`)
        .sort()
        .join('|')

    const wanted = norm(variantAttributes as any[])
    if (!wanted) return null

    const variants = await tx.select().from(productVariants).where(
      and(eq(productVariants.productId, productId), eq(productVariants.isActive, true)),
    )
    const match = variants.find(
      (v: any) => norm(Array.isArray(v.attributes) ? v.attributes : []) === wanted,
    )
    if (!match) return null

    // Décrément atomique : ne réussit que si le stock est suffisant. RETURNING
    // vide = rupture → on annule toute la commande.
    const decremented = await tx.update(productVariants)
      .set({ stock: sql`${productVariants.stock} - ${quantity}`, updatedAt: new Date() })
      .where(and(eq(productVariants.id, match.id), gte(productVariants.stock, quantity)))
      .returning({ id: productVariants.id })

    if (decremented.length === 0) {
      throw new BadRequestException(`Stock insuffisant pour « ${label} »`)
    }
    return match.id
  }

  async mobileList(customerId: string, status?: string) {
    const conditions = [eq(orders.customerId, customerId)]
    if (status && status !== 'all') {
      // L'app envoie des statuts "mobile" (unpaid, toShip…) : les convertir
      // vers les statuts DB (pending, confirmed…) avant de filtrer
      const dbStatuses = this.toDbStatuses(status)
      if (dbStatuses.length === 0) return []
      conditions.push(inArray(orders.status, dbStatuses))
    }

    const data = await this.db.select().from(orders).where(and(...conditions)).orderBy(desc(orders.createdAt))

    return Promise.all(data.map((o) => this.toMobileOrder(o)))
  }

  /** Inverse de mapStatus : statut mobile → statuts DB correspondants. */
  private toDbStatuses(mobileStatus: string): string[] {
    const map: Record<string, string[]> = {
      unpaid: ['pending'],
      toShip: ['confirmed', 'processing'],
      shipped: ['shipped'],
      toReview: ['delivered'],
      returns: ['cancelled', 'refunded'],
    }
    // Statut inconnu : tenter tel quel (permet de filtrer directement par statut DB)
    return map[mobileStatus] ?? [mobileStatus]
  }

  /** Détail d'une commande au format mobile — null si absente ou n'appartenant pas au client. */
  async mobileGetById(customerId: string, id: string) {
    const [order] = await this.db.select().from(orders)
      .where(and(eq(orders.id, id), eq(orders.customerId, customerId))).limit(1)
    if (!order) return null
    return this.toMobileOrder(order)
  }

  /**
   * Suivi de livraison en temps réel pour le client.
   * Assemble la chronologie RÉELLE : journal des statuts de la commande
   * (confirmée, expédiée… posés par l'admin) + événements du livreur
   * (affecté, colis récupéré, livré — horodatés par les affectations que
   * l'admin gère dans Livraison). Retourne aussi la fiche du livreur pour
   * que le client puisse l'appeler.
   */
  async mobileTracking(customerId: string, orderId: string) {
    const [order] = await this.db.select().from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.customerId, customerId))).limit(1)
    if (!order) throw new NotFoundException('Commande introuvable')

    const [statusLog, [assignment]] = await Promise.all([
      this.db.select().from(orderStatusLog)
        .where(eq(orderStatusLog.orderId, orderId))
        .orderBy(orderStatusLog.createdAt),
      this.db.select({
        id: deliveryAssignments.id,
        status: deliveryAssignments.status,
        assignedAt: deliveryAssignments.assignedAt,
        pickedUpAt: deliveryAssignments.pickedUpAt,
        deliveredAt: deliveryAssignments.deliveredAt,
        courierName: deliveryPersons.name,
        courierPhone: deliveryPersons.phone,
        courierVehicle: deliveryPersons.vehicleType,
        courierPhoto: deliveryPersons.profilePhoto,
        courierRating: deliveryPersons.rating,
        courierDeliveries: deliveryPersons.totalDeliveries,
      })
        .from(deliveryAssignments)
        .innerJoin(deliveryPersons, eq(deliveryAssignments.deliveryPersonId, deliveryPersons.id))
        .where(eq(deliveryAssignments.orderId, orderId))
        .orderBy(desc(deliveryAssignments.assignedAt))
        .limit(1),
    ])

    // Chronologie unifiée, triée par date — chaque événement est un fait réel
    const events: { key: string; at: string; detail?: string }[] = []
    if (order.createdAt) events.push({ key: 'placed', at: order.createdAt.toISOString() })
    for (const log of statusLog) {
      if (!log.createdAt) continue
      events.push({ key: `status:${log.toStatus}`, at: log.createdAt.toISOString(), detail: log.reason ?? undefined })
    }
    if (assignment?.assignedAt) {
      events.push({ key: 'courier_assigned', at: assignment.assignedAt.toISOString(), detail: assignment.courierName })
    }
    if (assignment?.pickedUpAt) {
      events.push({ key: 'picked_up', at: assignment.pickedUpAt.toISOString(), detail: assignment.courierName })
    }
    if (assignment?.deliveredAt) {
      events.push({ key: 'delivered', at: assignment.deliveredAt.toISOString(), detail: assignment.courierName })
    }
    events.sort((a, b) => a.at.localeCompare(b.at))

    // Étape courante des 5 jalons affichés :
    // 0 commande passée · 1 confirmée · 2 expédiée/récupérée · 3 en route · 4 livrée
    let currentStep = 0
    if (['confirmed', 'processing'].includes(order.status)) currentStep = 1
    if (order.status === 'shipped' || assignment?.status === 'assigned') currentStep = 2
    if (assignment?.status === 'picked_up') currentStep = 3
    if (order.status === 'delivered' || assignment?.status === 'delivered') currentStep = 4

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: this.mapStatus(order.status),
      trackingNumber: order.trackingNumber,
      currentStep,
      courier: assignment ? {
        name: assignment.courierName,
        phone: assignment.courierPhone,
        vehicleType: assignment.courierVehicle,
        photo: assignment.courierPhoto,
        rating: Number(assignment.courierRating ?? 0),
        totalDeliveries: assignment.courierDeliveries ?? 0,
        status: assignment.status,
      } : null,
      events,
    }
  }

  /** Mappe une ligne orders vers le format consommé par l'app mobile. */
  private async toMobileOrder(o: typeof orders.$inferSelect) {
    const items = await this.db.select().from(orderItems).where(eq(orderItems.orderId, o.id))
    const productIds = [...new Set(items.map(i => i.productId))]
    const productData = productIds.length
      ? await this.db.select({ id: products.id, name: products.name }).from(products).where(inArray(products.id, productIds))
      : []

    const productMap = new Map(productData.map(p => [p.id, p.name]))
    const enhancedItems = items.map(item => ({
      productId: item.productId,
      title: productMap.get(item.productId) ?? item.label,
      image: item.imageUrl ?? '',
      priceUsd: Number(item.unitPrice),
      quantity: item.quantity,
      variantLabel: item.sku,
    }))

    // shippingAddress est stockée en JSON texte → objet { name, street, city, country, phone } ou null
    let address: Record<string, unknown> | null = null
    if (o.shippingAddress) {
      if (typeof o.shippingAddress === 'string') {
        try { address = JSON.parse(o.shippingAddress) } catch { address = null }
      } else {
        address = o.shippingAddress as Record<string, unknown>
      }
    }

    return {
      id: o.id,
      orderNumber: o.orderNumber,
      status: this.mapStatus(o.status),
      totalUsd: Number(o.total),
      shippingUsd: Number(o.shippingCost),
      taxUsd: Number(o.taxAmount),
      discountUsd: Number(o.discountAmount),
      createdAt: o.createdAt?.toISOString(),
      items: enhancedItems,
      address,
      trackingNumber: o.trackingNumber,
      estimatedDelivery: null,
    }
  }

  private mapStatus(dbStatus: string): string {
    const map: Record<string, string> = {
      pending: 'unpaid',
      confirmed: 'toShip',
      processing: 'toShip',
      shipped: 'shipped',
      delivered: 'toReview',
      cancelled: 'returns',
      refunded: 'returns',
    }
    return map[dbStatus] ?? dbStatus
  }

  async createShipment(orderId: string, data: {
    items: { orderItemId: string; quantity: number }[]
    trackingNumber?: string
    deliveryPersonId?: string
    notes?: string
  }) {
    const [order] = await this.db.select().from(orders)
      .where(eq(orders.id, orderId)).limit(1)
    if (!order) throw new NotFoundException('Commande introuvable')

    const [shipment] = await this.db.insert(shipments).values({
      orderId,
      storeId: order.storeId,
      trackingNumber: data.trackingNumber ?? null,
      deliveryPersonId: data.deliveryPersonId ?? null,
      status: 'preparing',
      notes: data.notes ?? null,
    }).returning()

    await this.db.insert(shipmentItems).values(
      data.items.map((i) => ({
        shipmentId: shipment.id,
        orderItemId: i.orderItemId,
        quantity: i.quantity,
      }))
    )

    for (const item of data.items) {
      await this.db.update(orderItems)
        .set({ status: 'ready' })
        .where(eq(orderItems.id, item.orderItemId))
    }

    await this.recalculateOrderStatus(orderId)

    if (order) {
      await this.orderEvents.onShipmentCreated(orderId, data.trackingNumber)
    }

    return shipment
  }

  async updateItemStatus(orderId: string, itemId: string, data: { status: string; issueReason?: string }) {
    const patch: Record<string, unknown> = { status: data.status }
    if (data.status === 'issue') patch.issueReason = data.issueReason
    if (data.status === 'shipped') patch.shippedAt = new Date()
    if (data.status === 'delivered') patch.deliveredAt = new Date()

    await this.db.update(orderItems).set(patch)
      .where(and(eq(orderItems.id, itemId), eq(orderItems.orderId, orderId)))

    await this.recalculateOrderStatus(orderId)

    if (data.status === 'issue') {
      const [item] = await this.db.select().from(orderItems).where(eq(orderItems.id, itemId)).limit(1)
      if (item) {
        await this.orderEvents.onItemIssue(orderId, item.label, data.issueReason ?? '')
      }
    }

    return { success: true }
  }

  async listShipments(orderId: string) {
    return this.db.select().from(shipments)
      .where(eq(shipments.orderId, orderId))
      .orderBy(shipments.createdAt)
  }

  private async recalculateOrderStatus(orderId: string) {
    const items = await this.db.select().from(orderItems)
      .where(eq(orderItems.orderId, orderId))

    const statuses = items.map((i) => i.status)
    let newStatus: string

    if (statuses.every((s) => s === 'delivered')) {
      newStatus = 'delivered'
    } else if (statuses.every((s) => s === 'cancelled' || s === 'issue')) {
      newStatus = 'cancelled'
    } else if (statuses.some((s) => s === 'shipped' || s === 'delivered')) {
      newStatus = 'shipped'
    } else if (statuses.some((s) => s === 'ready')) {
      newStatus = 'processing'
    } else {
      newStatus = 'confirmed'
    }

    const [order] = await this.db.select().from(orders).where(eq(orders.id, orderId)).limit(1)
    if (order && order.status !== newStatus) {
      await this.db.update(orders).set({
        status: newStatus,
        updatedAt: new Date(),
        ...(newStatus === 'shipped' ? { shippedAt: new Date() } : {}),
        ...(newStatus === 'delivered' ? { deliveredAt: new Date() } : {}),
      }).where(eq(orders.id, orderId))

      await this.db.insert(orderStatusLog).values({
        orderId,
        storeId: order.storeId,
        fromStatus: order.status,
        toStatus: newStatus,
        reason: 'Recalcul automatique depuis statuts items',
      })
    }
  }
}
