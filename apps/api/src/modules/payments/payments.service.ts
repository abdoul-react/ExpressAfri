import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { eq, like, or, and, sql } from 'drizzle-orm'
import { DRIZZLE, type DrizzleDB } from '../../database/database.module'
import { payments, refunds } from '../../database/schema/payments'

@Injectable()
export class PaymentsService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async list(params: { page?: number; limit?: number; search?: string; status?: string; method?: string; orderId?: string }) {
    const page = params.page ?? 1; const limit = params.limit ?? 10; const offset = (page - 1) * limit
    const conditions = []
    if (params.search) conditions.push(or(like(payments.transactionId, `%${params.search}%`)))
    if (params.status) conditions.push(eq(payments.status, params.status))
    if (params.method) conditions.push(eq(payments.method, params.method))
    if (params.orderId) conditions.push(eq(payments.orderId, params.orderId))
    const where = conditions.length ? and(...conditions) : undefined
    const [data, [{ count }]] = await Promise.all([
      this.db.select().from(payments).where(where).limit(limit).offset(offset).orderBy(payments.createdAt),
      this.db.select({ count: sql<number>`count(*)` }).from(payments).where(where),
    ])
    return { data, total: Number(count), page }
  }

  async getById(id: string) {
    const [payment] = await this.db.select().from(payments).where(eq(payments.id, id)).limit(1)
    if (!payment) throw new NotFoundException('Paiement introuvable')
    const refundList = await this.db.select().from(refunds).where(eq(refunds.paymentId, id))
    return { ...payment, refunds: refundList }
  }

  async create(data: any) {
    const [payment] = await this.db.insert(payments).values(data).returning()
    return payment
  }

  async refund(id: string, data: { amount: number; reason?: string }) {
    const [payment] = await this.db.select().from(payments).where(eq(payments.id, id)).limit(1)
    if (!payment) throw new NotFoundException('Paiement introuvable')
    const [refund] = await this.db.insert(refunds).values({ paymentId: id, orderId: payment.orderId, storeId: payment.storeId, amount: String(data.amount), reason: data.reason }).returning()
    await this.db.update(payments).set({ status: 'refunded', updatedAt: new Date() }).where(eq(payments.id, id))
    return refund
  }
}
