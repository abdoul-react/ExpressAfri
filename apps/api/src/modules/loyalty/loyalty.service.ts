import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { eq, like, or, and, sql } from 'drizzle-orm'
import { DRIZZLE, type DrizzleDB } from '../../database/database.module'
import { loyaltyRules, loyaltyRewards, loyaltyPoints } from '../../database/schema/loyalty'

@Injectable()
export class LoyaltyService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async listRules(params: { page?: number; limit?: number }) {
    const page = params.page ?? 1; const limit = params.limit ?? 10; const offset = (page - 1) * limit
    const [data, [{ count }]] = await Promise.all([
      this.db.select().from(loyaltyRules).limit(limit).offset(offset).orderBy(loyaltyRules.createdAt),
      this.db.select({ count: sql<number>`count(*)` }).from(loyaltyRules),
    ])
    return { data, total: Number(count), page }
  }

  async createRule(data: any) { const [rule] = await this.db.insert(loyaltyRules).values(data).returning(); return rule }
  async updateRule(id: string, data: any) { const [rule] = await this.db.update(loyaltyRules).set({ ...data, updatedAt: new Date() }).where(eq(loyaltyRules.id, id)).returning(); if (!rule) throw new NotFoundException('Règle introuvable'); return rule }

  async listRewards(params: { page?: number; limit?: number }) {
    const page = params.page ?? 1; const limit = params.limit ?? 10; const offset = (page - 1) * limit
    const [data, [{ count }]] = await Promise.all([
      this.db.select().from(loyaltyRewards).limit(limit).offset(offset).orderBy(loyaltyRewards.createdAt),
      this.db.select({ count: sql<number>`count(*)` }).from(loyaltyRewards),
    ])
    return { data, total: Number(count), page }
  }

  async createReward(data: any) { const [reward] = await this.db.insert(loyaltyRewards).values(data).returning(); return reward }
  async updateReward(id: string, data: any) { const [reward] = await this.db.update(loyaltyRewards).set({ ...data, updatedAt: new Date() }).where(eq(loyaltyRewards.id, id)).returning(); if (!reward) throw new NotFoundException('Récompense introuvable'); return reward }

  async listCustomerPoints(params: { page?: number; limit?: number }) {
    const page = params.page ?? 1; const limit = params.limit ?? 10; const offset = (page - 1) * limit
    const [data, [{ count }]] = await Promise.all([
      this.db.select().from(loyaltyPoints).limit(limit).offset(offset).orderBy(loyaltyPoints.balance),
      this.db.select({ count: sql<number>`count(*)` }).from(loyaltyPoints),
    ])
    return { data, total: Number(count), page }
  }

  async adjustPoints(id: string, balance: number, _reason?: string) {
    const [lp] = await this.db.update(loyaltyPoints).set({ balance, updatedAt: new Date() }).where(eq(loyaltyPoints.id, id)).returning()
    if (!lp) throw new NotFoundException('Points fidélité introuvables'); return lp
  }

  async getSummary() {
    const [[{ totalMembers }], [{ totalPoints }], [{ totalRedeemed }]] = await Promise.all([
      this.db.select({ totalMembers: sql<number>`count(*)` }).from(loyaltyPoints),
      this.db.select({ totalPoints: sql<number>`coalesce(sum(balance), 0)` }).from(loyaltyPoints),
      this.db.select({ totalRedeemed: sql<number>`0` }).from(loyaltyPoints).limit(1),
    ])
    return {
      totalMembers: Number(totalMembers),
      totalPointsIssued: Number(totalPoints),
      totalPointsRedeemed: Number(totalRedeemed),
      activeRules: 0,
      activeRewards: 0,
    }
  }

  async getCustomerPoints(customerId: string) {
    const [lp] = await this.db.select().from(loyaltyPoints).where(eq(loyaltyPoints.customerId, customerId)).limit(1)
    if (!lp) return { customerId, balance: 0, lifetimePoints: 0 }
    return { ...lp, points: lp.balance, lifetimePoints: lp.balance }
  }

  async getTransactions(_customerId: string) {
    // Les transactions détaillées nécessitent une table dédiée (non créée dans ce sprint)
    // On retourne un tableau vide pour éviter le 404 — à implémenter si la table est ajoutée
    return []
  }

  async deleteRule(id: string) {
    await this.db.delete(loyaltyRules).where(eq(loyaltyRules.id, id))
    return { deleted: true }
  }

  async deleteReward(id: string) {
    await this.db.delete(loyaltyRewards).where(eq(loyaltyRewards.id, id))
    return { deleted: true }
  }
}
