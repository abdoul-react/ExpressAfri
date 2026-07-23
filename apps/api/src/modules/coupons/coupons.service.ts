import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common'
import { eq, like, or, and, sql, lt, gt } from 'drizzle-orm'
import { DRIZZLE, type DrizzleDB } from '../../database/database.module'
import { coupons, couponUsage } from '../../database/schema/coupons'

@Injectable()
export class CouponsService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async list(params: { page?: number; limit?: number; search?: string; status?: string; type?: string; affiliateId?: string }) {
    const page = params.page ?? 1
    const limit = params.limit ?? 10
    const offset = (page - 1) * limit

    const conditions = []
    if (params.search) conditions.push(or(like(coupons.code, `%${params.search}%`), like(coupons.name, `%${params.search}%`)))
    if (params.type) conditions.push(eq(coupons.type, params.type))
    if (params.affiliateId) conditions.push(eq(coupons.affiliateId, params.affiliateId))

    if (params.status) {
      const now = new Date()
      if (params.status === 'active') conditions.push(and(eq(coupons.isActive, true), lt(coupons.startDate, now), gt(coupons.endDate, now)))
      else if (params.status === 'inactive') conditions.push(eq(coupons.isActive, false))
      else if (params.status === 'scheduled') conditions.push(and(eq(coupons.isActive, true), gt(coupons.startDate, now)))
      else if (params.status === 'expired') conditions.push(and(eq(coupons.isActive, true), lt(coupons.endDate, now)))
    }

    const where = conditions.length ? and(...conditions) : undefined
    const [data, [{ count }]] = await Promise.all([
      this.db.select().from(coupons).where(where).limit(limit).offset(offset).orderBy(coupons.createdAt),
      this.db.select({ count: sql<number>`count(*)` }).from(coupons).where(where),
    ])
    return { data, total: Number(count), page }
  }

  async getById(id: string) {
    const [coupon] = await this.db.select().from(coupons).where(eq(coupons.id, id)).limit(1)
    if (!coupon) throw new NotFoundException('Coupon introuvable')
    return coupon
  }

  async getByCode(code: string) {
    const [coupon] = await this.db.select().from(coupons).where(eq(coupons.code, code.toUpperCase())).limit(1)
    return coupon ?? null
  }

  async create(data: any) {
    const existing = await this.getByCode(data.code)
    if (existing) throw new ConflictException('Ce code promo existe déjà')
    const [coupon] = await this.db.insert(coupons).values({ ...data, code: data.code.toUpperCase() }).returning()
    return coupon
  }

  async update(id: string, data: any) {
    const [coupon] = await this.db.update(coupons).set({ ...data, updatedAt: new Date() }).where(eq(coupons.id, id)).returning()
    if (!coupon) throw new NotFoundException('Coupon introuvable')
    return coupon
  }

  async delete(id: string) {
    await this.db.delete(coupons).where(eq(coupons.id, id))
  }

  async validate(code: string, customerEmail?: string, orderAmount?: number) {
    const coupon = await this.getByCode(code)
    if (!coupon) return { valid: false, reason: 'Code promo invalide' }
    if (!coupon.isActive) return { valid: false, reason: 'Ce code promo est désactivé' }

    const now = new Date()
    if (new Date(coupon.startDate) > now) return { valid: false, reason: 'Ce code promo n\'est pas encore actif' }
    if (new Date(coupon.endDate) < now) return { valid: false, reason: 'Ce code promo a expiré' }
    if (coupon.usageLimitTotal && (coupon.usedCount ?? 0) >= coupon.usageLimitTotal) return { valid: false, reason: 'Ce code promo a atteint sa limite d\'utilisations' }

    if (coupon.minPurchase && orderAmount && orderAmount < Number(coupon.minPurchase)) {
      return { valid: false, reason: `Achat minimum de ${coupon.minPurchase} FCFA requis` }
    }

    if (coupon.usageLimitPerUser && customerEmail) {
      const [usage] = await this.db.select({ count: sql<number>`count(*)` }).from(couponUsage)
        .where(and(eq(couponUsage.couponId, coupon.id), eq(couponUsage.customerEmail, customerEmail))).limit(1)
      if (Number(usage.count) >= coupon.usageLimitPerUser) return { valid: false, reason: 'Vous avez déjà utilisé ce code promo' }
    }

    return { valid: true, coupon }
  }
}
