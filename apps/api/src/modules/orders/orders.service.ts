import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, sql, like, or, desc, inArray, gte, lte } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import {
  orders,
  orderItems,
  orderStatusLog,
} from '../../database/schema/orders';
import { shipments, shipmentItems } from '../../database/schema/shipments';
import { receipts, receiptSettings } from '../../database/schema/receipts';
import { products, productVariants } from '../../database/schema/products';
import {
  deliveryAssignments,
  deliveryPersons,
} from '../../database/schema/delivery';
import { customers, addresses } from '../../database/schema/customers';
import { coupons } from '../../database/schema/coupons';
import { payments } from '../../database/schema/payments';
import { ChatService } from '../chat/chat.service';
import { ReceiptsService } from '../receipts/receipts.service';
import { OutboxService } from '../notifications/outbox.service';
import { AuditService } from '../audit/audit.service';
import { orderStatusMessage } from '../../common/system-messages';
import {
  assertOrderItemTransition,
  assertOrderTransition,
  type OrderItemStatus,
  type OrderStatus,
} from './order-status';
import { AppLoggerService } from '../../common/logger/logger.service';
import { setLogContext } from '../../common/interceptors/request-id.interceptor';

@Injectable()
export class OrdersService {
  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
    private chat: ChatService,
    private receipts: ReceiptsService,
    private outbox: OutboxService,
    private audit: AuditService,
    private logger: AppLoggerService,
  ) {}

  async list(params: {
    page?: number;
    limit?: number;
    storeId?: string;
    status?: string;
    search?: string;
    customerId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (params.storeId) conditions.push(eq(orders.storeId, params.storeId));
    if (params.status) conditions.push(eq(orders.status, params.status));
    if (params.customerId) conditions.push(eq(orders.customerId, params.customerId));
    if (params.dateFrom) conditions.push(gte(orders.createdAt, new Date(params.dateFrom)));
    if (params.dateTo) conditions.push(lte(orders.createdAt, new Date(params.dateTo)));
    if (params.search)
      conditions.push(
        or(
          like(orders.orderNumber, `%${params.search}%`),
          like(orders.couponCode, `%${params.search}%`),
        ),
      );

    const where = conditions.length ? and(...conditions) : undefined;
    const [data, [{ count }]] = await Promise.all([
      this.db
        .select()
        .from(orders)
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(orders.createdAt),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(orders)
        .where(where),
    ]);
    return { data, total: Number(count), page };
  }

  async getById(id: string) {
    const [order] = await this.db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);
    if (!order) return null;
    const items = await this.db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, id));
    const statusLog = await this.db
      .select()
      .from(orderStatusLog)
      .where(eq(orderStatusLog.orderId, id))
      .orderBy(orderStatusLog.createdAt);
    return { ...order, items, statusLog };
  }

  async updateStatus(
    id: string,
    status: string,
    changedBy?: string,
    reason?: string,
  ) {
    const [order] = await this.db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);
    if (!order) return null;

    assertOrderTransition(order.status as OrderStatus, status as OrderStatus);

    // Générer le message de notification (besoin de la langue du client)
    let language: string | null = null;
    if (order.customerId) {
      const [c] = await this.db
        .select({ language: customers.language })
        .from(customers)
        .where(eq(customers.id, order.customerId))
        .limit(1);
      language = c?.language ?? null;
    }
    const notice = orderStatusMessage(status, order.orderNumber, language);

    // Transaction métier : update statut + log + outbox event (atomique)
    await this.db.transaction(async (tx) => {
      await tx
        .update(orders)
        .set({ status, updatedAt: new Date() })
        .where(eq(orders.id, id));
      await tx.insert(orderStatusLog).values({
        orderId: id,
        storeId: order.storeId,
        fromStatus: order.status,
        toStatus: status,
        changedBy,
        reason,
      });

      if (status === 'shipped')
        await tx
          .update(orders)
          .set({ shippedAt: new Date() })
          .where(eq(orders.id, id));
      if (status === 'delivered')
        await tx
          .update(orders)
          .set({ deliveredAt: new Date() })
          .where(eq(orders.id, id));

      if (notice) {
        await this.outbox.createEventInTx(tx, {
          type: 'order.status_changed',
          aggregateType: 'order',
          aggregateId: id,
          idempotencyKey: `order:${id}:status:${status}`,
          payload: {
            orderId: id,
            content: notice,
            customerId: order.customerId,
            orderNumber: order.orderNumber,
          },
        });
      }
    });

    await this.audit.create({
      action: 'UPDATE_STATUS',
      resource: 'orders',
      resourceId: id,
      actorId: changedBy,
      details: { fromStatus: order.status, toStatus: status, reason },
      status: 'success',
    });

    // Commande livrée → incrémenter les compteurs client
    if (status === 'delivered' && order.customerId) {
      await this.db.update(customers)
        .set({
          totalOrders: sql`${customers.totalOrders} + 1`,
          totalSpent: sql`${customers.totalSpent} + ${order.total}`,
          updatedAt: new Date(),
        })
        .where(eq(customers.id, order.customerId));
    }

    // Commande livrée → créer un reçu automatiquement, et l'envoyer si
    // le store a activé l'option auto_send dans ses paramètres.
    // En cas d'échec, le reçu est marqué 'failed' pour retry admin.
    if (status === 'delivered') {
      try {
        const [existing] = await this.db
          .select({ id: receipts.id })
          .from(receipts)
          .where(eq(receipts.orderId, id))
          .limit(1);
        if (!existing) {
          const receipt = await this.receipts.create({
            orderId: id,
            storeId: order.storeId,
          });
          try {
            const [settings] = await this.db
              .select()
              .from(receiptSettings)
              .where(eq(receiptSettings.storeId, order.storeId))
              .limit(1);
            if (settings?.autoSend) {
              await this.receipts.send(receipt.id);
            }
          } catch (sendErr) {
            setLogContext('orderId', id);
            setLogContext('receiptId', receipt.id);
            this.logger.error(
              `Échec envoi reçu pour commande ${id}`,
              sendErr instanceof Error ? sendErr.stack : undefined,
            );
            await this.db
              .update(receipts)
              .set({ status: 'failed', updatedAt: new Date() })
              .where(eq(receipts.id, receipt.id));
            await this.chat.postOrderSystemMessage(
              id,
              'Votre reçu sera bientôt disponible dans la section Reçus.',
            );
          }
        }
      } catch (err) {
        setLogContext('orderId', id);
        this.logger.error(
          `Échec création reçu pour commande ${id}`,
          err instanceof Error ? err.stack : undefined,
        );
      }
    }

    return this.getById(id);
  }

  private async priceCart(
    tx: any,
    items: { productId: string; variantId?: string; quantity: number }[],
    couponCode?: string | null,
    _customerId?: string,
  ) {
    const SYSTEM_STORE_ID = '00000000-0000-0000-0000-000000000001';
    let subtotal = 0;
    const pricedItems: {
      product: typeof products.$inferSelect;
      variant: typeof productVariants.$inferSelect | undefined;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }[] = [];

    for (const input of items) {
      const [product] = await tx
        .select()
        .from(products)
        .where(
          and(
            eq(products.id, input.productId),
            eq(products.status, 'active'),
            eq(products.moderationStatus, 'approved'),
          ),
        )
        .limit(1);
      if (!product)
        throw new BadRequestException(
          `Produit ${input.productId} indisponible`,
        );

      const variant = input.variantId
        ? (
            await tx
              .select()
              .from(productVariants)
              .where(
                and(
                  eq(productVariants.id, input.variantId),
                  eq(productVariants.productId, product.id),
                  eq(productVariants.isActive, true),
                ),
              )
              .limit(1)
          )[0]
        : undefined;

      if (input.variantId && !variant)
        throw new BadRequestException(`Variante ${input.variantId} invalide`);

      if (variant && variant.stock < input.quantity) {
        throw new BadRequestException(
          `Stock insuffisant pour ${variant.label} (dispo: ${variant.stock})`,
        );
      }

      const unitPrice = Number(variant?.price ?? product.price);
      if (!Number.isFinite(unitPrice) || unitPrice < 0)
        throw new BadRequestException('Prix invalide');

      const lineTotal = unitPrice * input.quantity;
      subtotal += lineTotal;
      pricedItems.push({
        product: { ...product, storeId: product.storeId ?? SYSTEM_STORE_ID },
        variant,
        quantity: input.quantity,
        unitPrice,
        lineTotal,
      });
    }

    const shippingCost = subtotal >= 10000 ? 0 : 1500;
    let discount = 0;
    let couponId: string | null = null;

    if (couponCode) {
      const [coupon] = await tx
        .select()
        .from(coupons)
        .where(and(eq(coupons.code, couponCode), eq(coupons.isActive, true)))
        .limit(1);
      if (coupon && new Date(coupon.endDate) > new Date()) {
        couponId = coupon.id;
        if (coupon.type === 'percentage') {
          discount = (subtotal * Number(coupon.value)) / 100;
          if (coupon.maxDiscount)
            discount = Math.min(discount, Number(coupon.maxDiscount));
        } else if (coupon.type === 'fixed') {
          discount = Number(coupon.value);
        } else if (coupon.type === 'free_shipping') {
          discount = shippingCost;
        }
      }
    }

    const total = Math.max(0, subtotal + shippingCost - discount);
    return { pricedItems, subtotal, shippingCost, discount, total, couponId };
  }

  async createFromCheckout(
    data: {
      items: { productId: string; variantId?: string; quantity: number }[];
      shippingAddressId: string;
      paymentMethod: string;
      couponCode?: string | null;
      notes?: string | null;
      idempotencyKey?: string | null;
    },
    customerId?: string,
  ) {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const orderNumber = `EXP-${datePart}-${randPart}`;
    const SYSTEM_STORE_ID = '00000000-0000-0000-0000-000000000001';

    const UUID_RE =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isValidUuid = (s: unknown): boolean =>
      typeof s === 'string' && UUID_RE.test(s);

    // Idempotency : si une clé est fournie et qu'une commande existe déjà, la retourner
    if (data.idempotencyKey) {
      const [existing] = await this.db
        .select()
        .from(orders)
        .where(eq(orders.idempotencyKey, data.idempotencyKey))
        .limit(1);
      if (existing) return this.getById(existing.id);
    }

    const validItems = (data.items ?? []).filter((item) =>
      isValidUuid(item.productId),
    );

    // Résoudre l'adresse de livraison (read-only, OK hors transaction)
    let shippingAddress: unknown = null;
    if (data.shippingAddressId && isValidUuid(data.shippingAddressId)) {
      const [addr] = await this.db
        .select()
        .from(addresses)
        .where(
          and(
            eq(addresses.id, data.shippingAddressId),
            ...(customerId ? [eq(addresses.customerId, customerId)] : []),
          ),
        )
        .limit(1);
      if (addr) shippingAddress = addr;
    }

    // Tout est transactionnel : calcul prix + réservation stock + insertion commande/items +
    // payment pending. Une rupture de stock annule TOUTE la commande.
    const orderId = await this.db.transaction(async (tx) => {
      // Recalculer TOUS les prix côté serveur — les montants envoyés par le client sont ignorés
      const { pricedItems, subtotal, shippingCost, discount, total, couponId } =
        await this.priceCart(
          tx,
          validItems.map((i) => ({
            productId: i.productId,
            variantId: i.variantId ?? undefined,
            quantity: i.quantity ?? 1,
          })),
          data.couponCode ?? null,
          customerId,
        );

      const storeId = pricedItems[0]?.product.storeId ?? SYSTEM_STORE_ID;
      const defaultStatus =
        data.paymentMethod === 'cod' ? 'confirmed' : 'pending';
      const [order] = await tx
        .insert(orders)
        .values({
          storeId,
          idempotencyKey: data.idempotencyKey ?? null,
          customerId: isValidUuid(customerId) ? customerId : undefined,
          orderNumber,
          status: defaultStatus,
          subtotal: subtotal.toFixed(2),
          shippingCost: shippingCost.toFixed(2),
          taxAmount: '0',
          discountAmount: discount.toFixed(2),
          total: total.toFixed(2),
          currency: 'XOF',
          couponId,
          couponCode: data.couponCode ?? null,
          shippingAddress: shippingAddress
            ? JSON.stringify(shippingAddress)
            : undefined,
          notes: data.notes ?? null,
        })
        .returning();

      for (const pi of pricedItems) {
        const variant = pi.variant;
        if (variant) {
          const decremented = await tx
            .update(productVariants)
            .set({
              stock: sql`${productVariants.stock} - ${pi.quantity}`,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(productVariants.id, variant.id),
                gte(productVariants.stock, pi.quantity),
              ),
            )
            .returning({ id: productVariants.id });
          if (decremented.length === 0) {
            throw new BadRequestException(
              `Stock insuffisant pour ${variant.label}`,
            );
          }
        }

        await tx.insert(orderItems).values({
          orderId: order.id,
          productId: pi.product.id,
          variantId: variant?.id ?? null,
          storeId,
          sku: variant?.sku ?? pi.product.slug,
          label: variant
            ? `${pi.product.name} - ${variant.label}`
            : pi.product.name,
          quantity: pi.quantity,
          unitPrice: pi.unitPrice.toFixed(2),
          totalPrice: pi.lineTotal.toFixed(2),
        });
      }

      await tx.insert(orderStatusLog).values({
        orderId: order.id,
        storeId,
        fromStatus: null,
        toStatus: defaultStatus,
        reason: 'Commande créée',
      });

      await tx.insert(payments).values({
        orderId: order.id,
        storeId,
        method: data.paymentMethod ?? 'orange_money',
        status: 'pending',
        amount: total.toFixed(2),
        currency: 'XOF',
        idempotencyKey: data.idempotencyKey
          ? `${data.idempotencyKey}:payment`
          : null,
      });

      return order.id;
    });

    await this.audit.create({
      action: 'CREATE',
      resource: 'orders',
      resourceId: orderId,
      details: { orderNumber, paymentMethod: data.paymentMethod },
      status: 'success',
    });

    return this.getById(orderId);
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
    if (!Array.isArray(variantAttributes) || variantAttributes.length === 0)
      return null;

    // Clé de comparaison normalisée (insensible à la casse/espaces), triée pour
    // que l'ordre des attributs n'influe pas sur la correspondance.
    const norm = (attrs: any[]): string =>
      attrs
        .filter((a) => a && a.name != null && a.value != null)
        .map(
          (a) =>
            `${String(a.name).trim().toLowerCase()}=${String(a.value).trim().toLowerCase()}`,
        )
        .sort()
        .join('|');

    const wanted = norm(variantAttributes);
    if (!wanted) return null;

    const variants = await tx
      .select()
      .from(productVariants)
      .where(
        and(
          eq(productVariants.productId, productId),
          eq(productVariants.isActive, true),
        ),
      );
    const match = variants.find(
      (v: any) =>
        norm(Array.isArray(v.attributes) ? v.attributes : []) === wanted,
    );
    if (!match) return null;

    // Décrément atomique : ne réussit que si le stock est suffisant. RETURNING
    // vide = rupture → on annule toute la commande.
    const decremented = await tx
      .update(productVariants)
      .set({
        stock: sql`${productVariants.stock} - ${quantity}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(productVariants.id, match.id),
          gte(productVariants.stock, quantity),
        ),
      )
      .returning({ id: productVariants.id });

    if (decremented.length === 0) {
      throw new BadRequestException(`Stock insuffisant pour « ${label} »`);
    }
    return match.id;
  }

  async mobileList(customerId: string, status?: string) {
    const conditions = [eq(orders.customerId, customerId)];
    if (status && status !== 'all') {
      // L'app envoie des statuts "mobile" (unpaid, toShip…) : les convertir
      // vers les statuts DB (pending, confirmed…) avant de filtrer
      const dbStatuses = this.toDbStatuses(status);
      if (dbStatuses.length === 0) return [];
      conditions.push(inArray(orders.status, dbStatuses));
    }

    const data = await this.db
      .select()
      .from(orders)
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt));

    return Promise.all(data.map((o) => this.toMobileOrder(o)));
  }

  /** Inverse de mapStatus : statut mobile → statuts DB correspondants. */
  private toDbStatuses(mobileStatus: string): string[] {
    const map: Record<string, string[]> = {
      unpaid: ['pending'],
      toShip: ['confirmed', 'processing'],
      shipped: ['shipped'],
      toReview: ['delivered'],
      returns: ['cancelled', 'refunded'],
    };
    // Statut inconnu : tenter tel quel (permet de filtrer directement par statut DB)
    return map[mobileStatus] ?? [mobileStatus];
  }

  /** Détail d'une commande au format mobile — null si absente ou n'appartenant pas au client. */
  async mobileGetById(customerId: string, id: string) {
    const [order] = await this.db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.customerId, customerId)))
      .limit(1);
    if (!order) return null;
    return this.toMobileOrder(order);
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
    const [order] = await this.db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.customerId, customerId)))
      .limit(1);
    if (!order) throw new NotFoundException('Commande introuvable');

    const [statusLog, [assignment]] = await Promise.all([
      this.db
        .select()
        .from(orderStatusLog)
        .where(eq(orderStatusLog.orderId, orderId))
        .orderBy(orderStatusLog.createdAt),
      this.db
        .select({
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
        .innerJoin(
          deliveryPersons,
          eq(deliveryAssignments.deliveryPersonId, deliveryPersons.id),
        )
        .where(eq(deliveryAssignments.orderId, orderId))
        .orderBy(desc(deliveryAssignments.assignedAt))
        .limit(1),
    ]);

    // Chronologie unifiée, triée par date — chaque événement est un fait réel
    const events: { key: string; at: string; detail?: string }[] = [];
    if (order.createdAt)
      events.push({ key: 'placed', at: order.createdAt.toISOString() });
    for (const log of statusLog) {
      if (!log.createdAt) continue;
      events.push({
        key: `status:${log.toStatus}`,
        at: log.createdAt.toISOString(),
        detail: log.reason ?? undefined,
      });
    }
    if (assignment?.assignedAt) {
      events.push({
        key: 'courier_assigned',
        at: assignment.assignedAt.toISOString(),
        detail: assignment.courierName,
      });
    }
    if (assignment?.pickedUpAt) {
      events.push({
        key: 'picked_up',
        at: assignment.pickedUpAt.toISOString(),
        detail: assignment.courierName,
      });
    }
    if (assignment?.deliveredAt) {
      events.push({
        key: 'delivered',
        at: assignment.deliveredAt.toISOString(),
        detail: assignment.courierName,
      });
    }
    events.sort((a, b) => a.at.localeCompare(b.at));

    // Étape courante des 5 jalons affichés :
    // 0 commande passée · 1 confirmée · 2 expédiée/récupérée · 3 en route · 4 livrée
    let currentStep = 0;
    if (['confirmed', 'processing'].includes(order.status)) currentStep = 1;
    if (order.status === 'shipped' || assignment?.status === 'assigned')
      currentStep = 2;
    if (assignment?.status === 'picked_up') currentStep = 3;
    if (order.status === 'delivered' || assignment?.status === 'delivered')
      currentStep = 4;

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: this.mapStatus(order.status),
      trackingNumber: order.trackingNumber,
      currentStep,
      courier: assignment
        ? {
            name: assignment.courierName,
            phone: assignment.courierPhone,
            vehicleType: assignment.courierVehicle,
            photo: assignment.courierPhoto,
            rating: Number(assignment.courierRating ?? 0),
            totalDeliveries: assignment.courierDeliveries ?? 0,
            status: assignment.status,
          }
        : null,
      events,
    };
  }

  /** Mappe une ligne orders vers le format consommé par l'app mobile. */
  private async toMobileOrder(o: typeof orders.$inferSelect) {
    const items = await this.db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, o.id));
    const productIds = [...new Set(items.map((i) => i.productId))];
    const productData = productIds.length
      ? await this.db
          .select({ id: products.id, name: products.name })
          .from(products)
          .where(inArray(products.id, productIds))
      : [];

    const productMap = new Map(productData.map((p) => [p.id, p.name]));
    const enhancedItems = items.map((item) => ({
      productId: item.productId,
      title: productMap.get(item.productId) ?? item.label,
      image: item.imageUrl ?? '',
      priceUsd: Number(item.unitPrice),
      quantity: item.quantity,
      variantLabel: item.sku,
    }));

    // shippingAddress est stockée en JSON texte → objet { name, street, city, country, phone } ou null
    let address: Record<string, unknown> | null = null;
    if (o.shippingAddress) {
      if (typeof o.shippingAddress === 'string') {
        try {
          address = JSON.parse(o.shippingAddress);
        } catch {
          address = null;
        }
      } else {
        address = o.shippingAddress as Record<string, unknown>;
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
    };
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
      partially_shipped: 'toShip',
    };
    return map[dbStatus] ?? dbStatus;
  }

  private async getShippedQuantity(
    tx: any,
    orderItemId: string,
  ): Promise<number> {
    const rows = await tx
      .select({ qty: shipmentItems.quantity })
      .from(shipmentItems)
      .where(eq(shipmentItems.orderItemId, orderItemId));
    return rows.reduce((sum: number, r: { qty: number }) => sum + r.qty, 0);
  }

  async createShipment(
    orderId: string,
    data: {
      items: { orderItemId: string; quantity: number }[];
      trackingNumber?: string;
      deliveryPersonId?: string;
      notes?: string;
    },
  ) {
    const [order] = await this.db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    if (!order) throw new NotFoundException('Commande introuvable');

    return this.db
      .transaction(async (tx) => {
        for (const requested of data.items) {
          if (requested.quantity < 1)
            throw new BadRequestException('Quantité invalide');

          const [item] = await tx
            .select()
            .from(orderItems)
            .where(
              and(
                eq(orderItems.id, requested.orderItemId),
                eq(orderItems.orderId, orderId),
              ),
            )
            .for('update')
            .limit(1);
          if (!item) throw new BadRequestException('Article hors commande');

          const alreadyShipped = await this.getShippedQuantity(tx, item.id);
          const remaining = item.quantity - alreadyShipped;
          if (requested.quantity > remaining) {
            throw new BadRequestException(
              `Quantité déjà expédiée pour "${item.label}" (restant: ${remaining}, demandé: ${requested.quantity})`,
            );
          }

          assertOrderItemTransition(
            (item.status ?? 'pending') as OrderItemStatus,
            'ready',
          );
        }

        const [shipment] = await tx
          .insert(shipments)
          .values({
            orderId,
            storeId: order.storeId,
            trackingNumber: data.trackingNumber ?? null,
            deliveryPersonId: data.deliveryPersonId ?? null,
            status: 'preparing',
            notes: data.notes ?? null,
          })
          .returning();

        await tx.insert(shipmentItems).values(
          data.items.map((i) => ({
            shipmentId: shipment.id,
            orderItemId: i.orderItemId,
            quantity: i.quantity,
          })),
        );

        for (const requested of data.items) {
          await tx
            .update(orderItems)
            .set({ status: 'ready' })
            .where(eq(orderItems.id, requested.orderItemId));
        }

        await this.recalculateOrderStatusInTx(tx, orderId, order.storeId);

        let msg = '📦 Une expédition a été créée pour votre commande.';
        if (data.trackingNumber)
          msg += `\nNuméro de suivi : ${data.trackingNumber}`;
        await this.outbox.createEventInTx(tx, {
          type: 'order.shipment_created',
          aggregateType: 'order',
          aggregateId: orderId,
          idempotencyKey: `order:${orderId}:shipment:${shipment.id}`,
          payload: { orderId, content: msg },
        });

        return shipment;
      })
      .then(async (shipment) => {
        await this.audit.create({
          action: 'CREATE_SHIPMENT',
          resource: 'shipments',
          resourceId: shipment.id,
          details: {
            orderId,
            itemsCount: data.items.length,
            trackingNumber: data.trackingNumber,
          },
          status: 'success',
        });
        return shipment;
      });
  }

  async updateItemStatus(
    orderId: string,
    itemId: string,
    data: { status: string; issueReason?: string },
  ) {
    return this.db
      .transaction(async (tx) => {
        const [item] = await tx
          .select({
            id: orderItems.id,
            status: orderItems.status,
            shippedAt: orderItems.shippedAt,
            deliveredAt: orderItems.deliveredAt,
            label: orderItems.label,
            storeId: orderItems.storeId,
          })
          .from(orderItems)
          .where(
            and(eq(orderItems.id, itemId), eq(orderItems.orderId, orderId)),
          )
          .for('update')
          .limit(1);

        if (!item)
          throw new NotFoundException(
            'Article introuvable dans cette commande',
          );

        assertOrderItemTransition(
          (item.status ?? 'pending') as OrderItemStatus,
          data.status as OrderItemStatus,
        );

        const patch: Record<string, unknown> = {
          status: data.status,
          updatedAt: new Date(),
        };
        if (data.status === 'issue') patch.issueReason = data.issueReason;
        if (data.status === 'shipped' && !item.shippedAt)
          patch.shippedAt = new Date();
        if (data.status === 'delivered' && !item.deliveredAt)
          patch.deliveredAt = new Date();

        if (data.status === 'issue') {
          const msg = `⚠️ Un problème a été signalé sur l'article "${item.label}" : ${data.issueReason ?? ''}. Notre équipe vous contactera.`;
          await this.outbox.createEventInTx(tx, {
            type: 'order.item_issue',
            aggregateType: 'order',
            aggregateId: orderId,
            idempotencyKey: `order:${orderId}:item_issue:${itemId}`,
            payload: { orderId, content: msg },
          });
        }

        await tx.update(orderItems).set(patch).where(eq(orderItems.id, itemId));

        await this.recalculateOrderStatusInTx(tx, orderId, item.storeId);
      })
      .then(async () => {
        await this.audit.create({
          action: 'UPDATE_ITEM_STATUS',
          resource: 'order_items',
          resourceId: itemId,
          details: {
            orderId,
            newStatus: data.status,
            issueReason: data.issueReason,
          },
          status: 'success',
        });
        return { success: true };
      });
  }

  async listShipments(orderId: string) {
    return this.db
      .select()
      .from(shipments)
      .where(eq(shipments.orderId, orderId))
      .orderBy(shipments.createdAt);
  }

  private async recalculateOrderStatusInTx(
    tx: any,
    orderId: string,
    storeId: string,
  ): Promise<void> {
    const items = await tx
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    const statuses = items.map((i: any) => i.status);
    const allDelivered =
      statuses.length > 0 && statuses.every((s: string) => s === 'delivered');
    const allCancelledOrIssue =
      statuses.length > 0 &&
      statuses.every((s: string) => s === 'cancelled' || s === 'issue');
    const hasShippedOrDelivered = statuses.some(
      (s: string) => s === 'shipped' || s === 'delivered',
    );
    const allShipped =
      statuses.length > 0 &&
      statuses.every((s: string) => s === 'shipped' || s === 'delivered');
    const hasReady = statuses.some((s: string) => s === 'ready');

    let newStatus: string;
    if (allDelivered) newStatus = 'delivered';
    else if (allCancelledOrIssue) newStatus = 'cancelled';
    else if (hasShippedOrDelivered && !allShipped)
      newStatus = 'partially_shipped';
    else if (allShipped) newStatus = 'shipped';
    else if (hasReady) newStatus = 'processing';
    else newStatus = 'confirmed';

    const [order] = await tx
      .select({ id: orders.id, status: orders.status })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    if (order && order.status !== newStatus) {
      await tx
        .update(orders)
        .set({
          status: newStatus,
          updatedAt: new Date(),
          ...(newStatus === 'shipped' ? { shippedAt: new Date() } : {}),
          ...(newStatus === 'delivered' ? { deliveredAt: new Date() } : {}),
        })
        .where(eq(orders.id, orderId));

      await tx.insert(orderStatusLog).values({
        orderId,
        storeId,
        fromStatus: order.status,
        toStatus: newStatus,
        reason: 'Recalcul automatique depuis statuts items',
      });
    }
  }

  private async recalculateOrderStatus(orderId: string) {
    const [order] = await this.db
      .select({ id: orders.id, storeId: orders.storeId })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    if (!order) return;
    return this.db.transaction(async (tx) => {
      return this.recalculateOrderStatusInTx(tx, orderId, order.storeId);
    });
  }
}
