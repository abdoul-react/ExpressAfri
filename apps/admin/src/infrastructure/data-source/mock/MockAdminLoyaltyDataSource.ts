import type { AdminLoyaltyDataSource, LoyaltyRule, LoyaltyReward, CustomerPoints, PointsTransaction, LoyaltyQueryParams, LoyaltySummary, PaginatedResult } from '../AdminLoyaltyDataSource'
import { MOCK_LOYALTY_RULES, MOCK_LOYALTY_REWARDS, MOCK_CUSTOMER_POINTS, MOCK_TRANSACTIONS } from './data/mockLoyalty'

export class MockAdminLoyaltyDataSource implements AdminLoyaltyDataSource {
  private rules = [...MOCK_LOYALTY_RULES]
  private rewards = [...MOCK_LOYALTY_REWARDS]
  private customers = [...MOCK_CUSTOMER_POINTS]
  private transactions = [...MOCK_TRANSACTIONS]

  private delay(ms = 300) { return new Promise<void>((r) => setTimeout(r, ms)) }

  async getSummary(): Promise<LoyaltySummary> {
    await this.delay()
    return {
      totalCustomers: this.customers.length,
      totalPointsIssued: this.customers.reduce((s, c) => s + c.lifetimePoints, 0),
      totalPointsRedeemed: this.transactions.filter((t) => t.type === 'spent').reduce((s, t) => s + Math.abs(t.points), 0),
      activeRewards: this.rewards.filter((r) => r.isActive).length,
      activeRules: this.rules.filter((r) => r.isActive).length,
    }
  }

  async listRules() { await this.delay(); return [...this.rules] }
  async createRule(data: Partial<LoyaltyRule>): Promise<LoyaltyRule> {
    await this.delay(300)
    const rule: LoyaltyRule = { id: `rule_${String(this.rules.length + 1).padStart(3, '0')}`, name: data.name ?? '', type: data.type ?? 'earn_per_spend', points: data.points ?? 0, condition: data.condition, isActive: data.isActive ?? true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    this.rules.push(rule); return rule
  }
  async updateRule(id: string, data: Partial<LoyaltyRule>): Promise<LoyaltyRule> {
    await this.delay(300); const i = this.rules.findIndex((r) => r.id === id); if (i === -1) throw new Error('Règle introuvable')
    this.rules[i] = { ...this.rules[i], ...data, updatedAt: new Date().toISOString() }; return this.rules[i]
  }
  async deleteRule(id: string): Promise<void> { await this.delay(200); const i = this.rules.findIndex((r) => r.id === id); if (i === -1) throw new Error('Règle introuvable'); this.rules.splice(i, 1) }

  async listRewards() { await this.delay(); return [...this.rewards] }
  async createReward(data: Partial<LoyaltyReward>): Promise<LoyaltyReward> {
    await this.delay(300)
    const reward: LoyaltyReward = { id: `rew_${String(this.rewards.length + 1).padStart(3, '0')}`, name: data.name ?? '', description: data.description ?? '', pointsCost: data.pointsCost ?? 0, type: data.type ?? 'discount', value: data.value ?? 0, isActive: data.isActive ?? true, stock: data.stock, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    this.rewards.push(reward); return reward
  }
  async updateReward(id: string, data: Partial<LoyaltyReward>): Promise<LoyaltyReward> {
    await this.delay(300); const i = this.rewards.findIndex((r) => r.id === id); if (i === -1) throw new Error('Récompense introuvable')
    this.rewards[i] = { ...this.rewards[i], ...data, updatedAt: new Date().toISOString() }; return this.rewards[i]
  }
  async deleteReward(id: string): Promise<void> { await this.delay(200); const i = this.rewards.findIndex((r) => r.id === id); if (i === -1) throw new Error('Récompense introuvable'); this.rewards.splice(i, 1) }

  async listCustomers(params: LoyaltyQueryParams): Promise<PaginatedResult<CustomerPoints>> {
    await this.delay()
    const { page = 1, limit = 10, search, tier, sortBy, sortOrder } = params
    let filtered = [...this.customers]
    if (search) { const q = search.toLowerCase(); filtered = filtered.filter((c) => c.customerName.toLowerCase().includes(q) || c.customerEmail.toLowerCase().includes(q)) }
    if (tier) filtered = filtered.filter((c) => c.tier === tier)
    if (sortBy) { filtered.sort((a, b) => { const av = (a as any)[sortBy]; const bv = (b as any)[sortBy]; if (typeof av === 'number') return sortOrder === 'desc' ? bv - av : av - bv; return 0 }) }
    const total = filtered.length; const totalPages = Math.ceil(total / limit)
    return { data: filtered.slice((page - 1) * limit, (page - 1) * limit + limit), total, page, limit, totalPages }
  }

  async getCustomerPoints(customerId: string): Promise<CustomerPoints> {
    await this.delay(); const c = this.customers.find((c) => c.customerId === customerId); if (!c) throw new Error('Client introuvable'); return c
  }

  async adjustPoints(customerId: string, points: number, reason: string): Promise<CustomerPoints> {
    await this.delay(300)
    const i = this.customers.findIndex((c) => c.customerId === customerId); if (i === -1) throw new Error('Client introuvable')
    this.customers[i].points += points; this.customers[i].lifetimePoints += Math.max(0, points)
    this.transactions.unshift({ id: `txn_${Date.now()}`, customerId, customerName: this.customers[i].customerName, type: 'adjusted', points, description: reason, createdAt: new Date().toISOString() })
    return this.customers[i]
  }

  async getTransactions(customerId: string): Promise<PointsTransaction[]> {
    await this.delay(); return this.transactions.filter((t) => t.customerId === customerId)
  }
}
