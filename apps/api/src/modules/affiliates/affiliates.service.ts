import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { eq, like, or, and, sql } from 'drizzle-orm'
import { DRIZZLE, type DrizzleDB } from '../../database/database.module'
import { affiliates, affiliateCommissions } from '../../database/schema/affiliates'
import { coupons } from '../../database/schema/coupons'

@Injectable()
export class AffiliatesService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async list(params: { page?: number; limit?: number; search?: string; status?: string }) {
    const page = params.page ?? 1
    const limit = params.limit ?? 10
    const offset = (page - 1) * limit

    const conditions = []
    if (params.search) conditions.push(or(like(affiliates.name, `%${params.search}%`), like(affiliates.email, `%${params.search}%`), like(affiliates.country, `%${params.search}%`)))
    if (params.status) conditions.push(eq(affiliates.status, params.status))

    const where = conditions.length ? and(...conditions) : undefined
    const [data, [{ count }]] = await Promise.all([
      this.db.select().from(affiliates).where(where).limit(limit).offset(offset).orderBy(affiliates.createdAt),
      this.db.select({ count: sql<number>`count(*)` }).from(affiliates).where(where),
    ])
    return { data, total: Number(count), page, limit, totalPages: Math.ceil(Number(count) / limit) }
  }

  async getById(id: string) {
    const [affiliate] = await this.db.select().from(affiliates).where(eq(affiliates.id, id)).limit(1)
    if (!affiliate) throw new NotFoundException('Affilié introuvable')
    return affiliate
  }

  async create(data: any) {
    const [affiliate] = await this.db.insert(affiliates).values(data).returning()
    return affiliate
  }

  async update(id: string, data: any) {
    const [affiliate] = await this.db.update(affiliates).set({ ...data, updatedAt: new Date() }).where(eq(affiliates.id, id)).returning()
    return affiliate
  }

  async updateStatus(id: string, status: string) {
    const [affiliate] = await this.db.update(affiliates).set({ status, updatedAt: new Date() }).where(eq(affiliates.id, id)).returning()
    return affiliate
  }

  async getCoupons(affiliateId: string, params: { page?: number; limit?: number }) {
    const page = params.page ?? 1
    const limit = params.limit ?? 10
    const offset = (page - 1) * limit

    const [data, [{ count }]] = await Promise.all([
      this.db.select().from(coupons).where(eq(coupons.affiliateId, affiliateId)).limit(limit).offset(offset).orderBy(coupons.createdAt),
      this.db.select({ count: sql<number>`count(*)` }).from(coupons).where(eq(coupons.affiliateId, affiliateId)),
    ])
    return { data, total: Number(count), page, limit, totalPages: Math.ceil(Number(count) / limit) }
  }

  async listCommissions(params: { page?: number; limit?: number; affiliateId?: string; status?: string }) {
    const page = params.page ?? 1
    const limit = params.limit ?? 10
    const offset = (page - 1) * limit

    const conditions = []
    if (params.affiliateId) conditions.push(eq(affiliateCommissions.affiliateId, params.affiliateId))
    if (params.status) conditions.push(eq(affiliateCommissions.status, params.status))

    const where = conditions.length ? and(...conditions) : undefined
    const [data, [{ count }]] = await Promise.all([
      this.db.select().from(affiliateCommissions).where(where).limit(limit).offset(offset).orderBy(affiliateCommissions.createdAt),
      this.db.select({ count: sql<number>`count(*)` }).from(affiliateCommissions).where(where),
    ])
    return { data, total: Number(count), page, limit, totalPages: Math.ceil(Number(count) / limit) }
  }

  async approveCommission(id: string) {
    const [commission] = await this.db.update(affiliateCommissions).set({ status: 'approved', updatedAt: new Date() }).where(eq(affiliateCommissions.id, id)).returning()
    return commission
  }

  async rejectCommission(id: string) {
    const [commission] = await this.db.update(affiliateCommissions).set({ status: 'reversed', updatedAt: new Date() }).where(eq(affiliateCommissions.id, id)).returning()
    return commission
  }

  async getSummary() {
    const [totalAgg] = await this.db.select({ count: sql<number>`count(*)` }).from(affiliates)
    const [activeAgg] = await this.db.select({ count: sql<number>`count(*)` }).from(affiliates).where(eq(affiliates.status, 'active'))
    const [pendingAgg] = await this.db.select({ total: sql<string>`coalesce(sum(commission_amount), '0')` }).from(affiliateCommissions).where(eq(affiliateCommissions.status, 'pending'))
    const now = new Date()
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const [paidAgg] = await this.db.select({ total: sql<string>`coalesce(sum(commission_amount), '0')` }).from(affiliateCommissions)
      .where(and(eq(affiliateCommissions.status, 'paid'), sql`paid_at >= ${firstOfMonth.toISOString()}`))

    return {
      totalAffiliates: Number(totalAgg.count),
      activeAffiliates: Number(activeAgg.count),
      totalCommissionsPending: Number(pendingAgg.total),
      totalPaidThisMonth: Number(paidAgg.total),
    }
  }
}
