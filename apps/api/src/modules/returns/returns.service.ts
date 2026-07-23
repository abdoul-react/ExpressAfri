import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common'
import { eq, like, or, and, sql, desc } from 'drizzle-orm'
import { DRIZZLE, type DrizzleDB } from '../../database/database.module'
import { returns, returnItems } from '../../database/schema/returns'
import { orders } from '../../database/schema/orders'

@Injectable()
export class ReturnsService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async list(params: { page?: number; limit?: number; search?: string; status?: string }) {
    const page = params.page ?? 1; const limit = params.limit ?? 10; const offset = (page - 1) * limit
    const conditions = []
    if (params.search) conditions.push(or(like(returns.reason, `%${params.search}%`)))
    if (params.status) conditions.push(eq(returns.status, params.status))
    const where = conditions.length ? and(...conditions) : undefined
    const [data, [{ count }]] = await Promise.all([
      this.db.select().from(returns).where(where).limit(limit).offset(offset).orderBy(returns.createdAt),
      this.db.select({ count: sql<number>`count(*)` }).from(returns).where(where),
    ])
    return { data, total: Number(count), page }
  }

  async getById(id: string) {
    const [ret] = await this.db.select().from(returns).where(eq(returns.id, id)).limit(1)
    if (!ret) throw new NotFoundException('Retour introuvable')
    const items = await this.db.select().from(returnItems).where(eq(returnItems.returnId, id))
    return { ...ret, items }
  }

  async create(data: any) {
    const { items, ...returnData } = data
    const [ret] = await this.db.insert(returns).values(returnData).returning()
    if (items?.length) await this.db.insert(returnItems).values(items.map((i: any) => ({ ...i, returnId: ret.id })))
    return this.getById(ret.id)
  }

  async updateStatus(id: string, status: string, data?: { refundAmount?: number; notes?: string }) {
    const [ret] = await this.db.update(returns).set({ status, refundAmount: data?.refundAmount ? String(data.refundAmount) : undefined, notes: data?.notes, updatedAt: new Date() }).where(eq(returns.id, id)).returning()
    if (!ret) throw new NotFoundException('Retour introuvable')
    return ret
  }

  // ── Client (mobile) ──

  /** Retours du client, avec leurs articles, du plus récent au plus ancien. */
  async mobileList(customerId: string) {
    const rows = await this.db.select().from(returns)
      .where(eq(returns.customerId, customerId))
      .orderBy(desc(returns.createdAt))

    return Promise.all(rows.map(async (r) => {
      const items = await this.db.select().from(returnItems).where(eq(returnItems.returnId, r.id))
      return {
        id: r.id,
        orderId: r.orderId,
        reason: r.reason,
        status: r.status,
        refundAmount: r.refundAmount ? Number(r.refundAmount) : null,
        createdAt: r.createdAt?.toISOString(),
        items: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
      }
    }))
  }

  /** Crée une demande de retour pour une commande appartenant au client. */
  async mobileCreate(
    customerId: string,
    data: { orderId: string; reason: string; items?: { productId: string; quantity: number }[] },
  ) {
    // La commande doit exister et appartenir au client
    const [order] = await this.db.select().from(orders)
      .where(and(eq(orders.id, data.orderId), eq(orders.customerId, customerId))).limit(1)
    if (!order) throw new NotFoundException('Commande introuvable')

    // Une seule demande en cours par commande
    const [existing] = await this.db.select({ id: returns.id }).from(returns)
      .where(and(
        eq(returns.orderId, data.orderId),
        eq(returns.customerId, customerId),
        eq(returns.status, 'pending'),
      )).limit(1)
    if (existing) throw new ConflictException('Une demande de retour est déjà en cours pour cette commande')

    const [ret] = await this.db.insert(returns).values({
      storeId: order.storeId,
      orderId: data.orderId,
      customerId,
      reason: data.reason.trim(),
      status: 'pending',
    }).returning()

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const validItems = (data.items ?? []).filter(i => UUID_RE.test(i.productId))
    if (validItems.length) {
      await this.db.insert(returnItems).values(
        validItems.map(i => ({ returnId: ret.id, productId: i.productId, quantity: Math.max(1, i.quantity ?? 1) })),
      )
    }

    return { id: ret.id, status: ret.status, createdAt: ret.createdAt?.toISOString() }
  }
}
