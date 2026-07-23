import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { eq, like, or, and, sql } from 'drizzle-orm'
import { DRIZZLE, type DrizzleDB } from '../../database/database.module'
import { payouts } from '../../database/schema/payouts'

@Injectable()
export class PayoutsService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async list(params: { page?: number; limit?: number; search?: string; status?: string; type?: string }) {
    const page = params.page ?? 1; const limit = params.limit ?? 10; const offset = (page - 1) * limit
    const conditions = []
    if (params.search) conditions.push(or(like(payouts.recipientName, `%${params.search}%`), like(payouts.recipientEmail, `%${params.search}%`)))
    if (params.status) conditions.push(eq(payouts.status, params.status))
    if (params.type) conditions.push(eq(payouts.type, params.type))
    const where = conditions.length ? and(...conditions) : undefined
    const [data, [{ count }]] = await Promise.all([
      this.db.select().from(payouts).where(where).limit(limit).offset(offset).orderBy(payouts.createdAt),
      this.db.select({ count: sql<number>`count(*)` }).from(payouts).where(where),
    ])
    return { data, total: Number(count), page }
  }

  async getById(id: string) {
    const [payout] = await this.db.select().from(payouts).where(eq(payouts.id, id)).limit(1)
    if (!payout) throw new NotFoundException('Versement introuvable')
    return payout
  }

  async create(data: any) {
    const [payout] = await this.db.insert(payouts).values(data).returning()
    return payout
  }

  async process(id: string, processedBy: string) {
    const [payout] = await this.db.update(payouts).set({ status: 'completed', processedBy, processedAt: new Date(), updatedAt: new Date() }).where(eq(payouts.id, id)).returning()
    if (!payout) throw new NotFoundException('Versement introuvable')
    return payout
  }

  async markAsPaid(id: string, data: { paymentReference: string; paidAt?: string; notes?: string }) {
    const [payout] = await this.db.update(payouts)
      .set({
        status: 'completed',
        processedAt: data.paidAt ? new Date(data.paidAt) : new Date(),
        notes: data.notes ?? (data.paymentReference ? `Réf. paiement : ${data.paymentReference}` : undefined),
        updatedAt: new Date(),
      })
      .where(eq(payouts.id, id))
      .returning()
    if (!payout) throw new NotFoundException('Versement introuvable')
    return payout
  }

  async cancel(id: string, _reason?: string) {
    const [payout] = await this.db.update(payouts)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(payouts.id, id))
      .returning()
    if (!payout) throw new NotFoundException('Versement introuvable')
    return payout
  }

  async getSummary() {
    const [[{ total }], [{ pending }], [{ completed }], [{ totalAmount }]] = await Promise.all([
      this.db.select({ total: sql<number>`count(*)` }).from(payouts),
      this.db.select({ pending: sql<number>`count(*)` }).from(payouts).where(eq(payouts.status, 'pending')),
      this.db.select({ completed: sql<number>`count(*)` }).from(payouts).where(eq(payouts.status, 'completed')),
      this.db.select({ totalAmount: sql<number>`coalesce(sum(amount), 0)` }).from(payouts).where(eq(payouts.status, 'completed')),
    ])
    return {
      total: Number(total),
      pending: Number(pending),
      completed: Number(completed),
      totalPaidOut: Number(totalAmount),
    }
  }
}
