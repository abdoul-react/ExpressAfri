import type { AdminAffiliateDataSource, Affiliate, AffiliateCode, AffiliateCommission, AffiliateQueryParams, CommissionQueryParams, PaginatedResult, AffiliateStatus } from '../AdminAffiliateDataSource'
import { MOCK_AFFILIATES, MOCK_AFFILIATE_CODES, MOCK_AFFILIATE_COMMISSIONS } from './data/mockAffiliates'

export class MockAdminAffiliateDataSource implements AdminAffiliateDataSource {
  private affiliates = [...MOCK_AFFILIATES]
  private codes = [...MOCK_AFFILIATE_CODES]
  private commissions = [...MOCK_AFFILIATE_COMMISSIONS]

  private delay(ms = 300) { return new Promise<void>((r) => setTimeout(r, ms)) }

  async list(params: AffiliateQueryParams): Promise<PaginatedResult<Affiliate>> {
    await this.delay()
    const { page = 1, limit = 10, search, status, sortBy, sortOrder } = params
    let filtered = [...this.affiliates]
    if (search) { const q = search.toLowerCase(); filtered = filtered.filter((a) => a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || a.country.toLowerCase().includes(q)) }
    if (status) filtered = filtered.filter((a) => a.status === status)
    if (sortBy) { filtered.sort((a, b) => { const av = (a as any)[sortBy]; const bv = (b as any)[sortBy]; if (typeof av === 'number') return sortOrder === 'desc' ? bv - av : av - bv; if (typeof av === 'string') return sortOrder === 'desc' ? bv.localeCompare(av) : av.localeCompare(bv); return 0 }) }
    const total = filtered.length; const totalPages = Math.ceil(total / limit)
    return { data: filtered.slice((page - 1) * limit, (page - 1) * limit + limit), total, page, limit, totalPages }
  }

  async getById(id: string): Promise<Affiliate> {
    await this.delay()
    const a = this.affiliates.find((a) => a.id === id)
    if (!a) throw new Error('Affilié introuvable')
    return a
  }

  async create(data: Partial<Affiliate>): Promise<Affiliate> {
    await this.delay(300)
    const id = `aff_${String(this.affiliates.length + 1).padStart(3, '0')}`
    const affiliate: Affiliate = { id, name: data.name ?? '', email: data.email ?? '', phone: data.phone ?? '', country: data.country ?? '', status: 'pending', defaultCommissionRate: data.defaultCommissionRate ?? 5, paymentMethod: data.paymentMethod ?? 'orange_money', paymentDetails: data.paymentDetails ?? '', totalEarned: 0, totalPaid: 0, totalPending: 0, totalReferrals: 0, notes: data.notes, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    this.affiliates.push(affiliate)
    return affiliate
  }

  async update(id: string, data: Partial<Affiliate>): Promise<Affiliate> {
    await this.delay(300)
    const i = this.affiliates.findIndex((a) => a.id === id)
    if (i === -1) throw new Error('Affilié introuvable')
    this.affiliates[i] = { ...this.affiliates[i], ...data, updatedAt: new Date().toISOString() }
    return this.affiliates[i]
  }

  async updateStatus(id: string, status: string): Promise<Affiliate> {
    await this.delay(200)
    const i = this.affiliates.findIndex((a) => a.id === id)
    if (i === -1) throw new Error('Affilié introuvable')
    this.affiliates[i] = { ...this.affiliates[i], status: status as Affiliate['status'], updatedAt: new Date().toISOString() }
    return this.affiliates[i]
  }

  async listCodes(affiliateId: string): Promise<AffiliateCode[]> {
    await this.delay()
    return this.codes.filter((c) => c.affiliateId === affiliateId)
  }

  async createCode(affiliateId: string, data: Partial<AffiliateCode>): Promise<AffiliateCode> {
    await this.delay(300)
    const id = `ac_${String(this.codes.length + 1).padStart(3, '0')}`
    const code: AffiliateCode = { id, affiliateId, code: (data.code ?? '').toUpperCase().trim(), discountType: data.discountType ?? 'percentage', discountValue: data.discountValue ?? 10, minOrderAmount: data.minOrderAmount, maxUses: data.maxUses, currentUses: 0, isActive: data.isActive ?? true, createdAt: new Date().toISOString(), expiresAt: data.expiresAt }
    this.codes.push(code)
    return code
  }

  async updateCode(id: string, data: Partial<AffiliateCode>): Promise<AffiliateCode> {
    await this.delay(300)
    const i = this.codes.findIndex((c) => c.id === id)
    if (i === -1) throw new Error('Code introuvable')
    this.codes[i] = { ...this.codes[i], ...data, code: data.code ? data.code.toUpperCase().trim() : this.codes[i].code }
    return this.codes[i]
  }

  async toggleCode(id: string, isActive: boolean): Promise<AffiliateCode> {
    await this.delay(200)
    const i = this.codes.findIndex((c) => c.id === id)
    if (i === -1) throw new Error('Code introuvable')
    this.codes[i] = { ...this.codes[i], isActive }
    return this.codes[i]
  }

  async listCommissions(params: CommissionQueryParams): Promise<PaginatedResult<AffiliateCommission>> {
    await this.delay()
    const { page = 1, limit = 10, affiliateId, status, sortBy = 'createdAt', sortOrder = 'desc' } = params
    let filtered = [...this.commissions]
    if (affiliateId) filtered = filtered.filter((c) => c.affiliateId === affiliateId)
    if (status) filtered = filtered.filter((c) => c.status === status)
    filtered.sort((a, b) => { const av = (a as any)[sortBy]; const bv = (b as any)[sortBy]; if (typeof av === 'string') return sortOrder === 'desc' ? bv.localeCompare(av) : av.localeCompare(bv); return 0 })
    const total = filtered.length; const totalPages = Math.ceil(total / limit)
    return { data: filtered.slice((page - 1) * limit, (page - 1) * limit + limit), total, page, limit, totalPages }
  }

  async approveCommission(id: string): Promise<AffiliateCommission> {
    await this.delay(200)
    const i = this.commissions.findIndex((c) => c.id === id)
    if (i === -1) throw new Error('Commission introuvable')
    this.commissions[i] = { ...this.commissions[i], status: 'approved' }
    return this.commissions[i]
  }

  async rejectCommission(id: string): Promise<AffiliateCommission> {
    await this.delay(200)
    const i = this.commissions.findIndex((c) => c.id === id)
    if (i === -1) throw new Error('Commission introuvable')
    this.commissions[i] = { ...this.commissions[i], status: 'reversed' }
    return this.commissions[i]
  }

  async getSummary(): Promise<{ totalAffiliates: number; activeAffiliates: number; totalCommissionsPending: number; totalPaidThisMonth: number }> {
    await this.delay(200)
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    return {
      totalAffiliates: this.affiliates.length,
      activeAffiliates: this.affiliates.filter((a) => a.status === 'active').length,
      totalCommissionsPending: this.commissions.filter((c) => c.status === 'pending').reduce((s, c) => s + c.commissionAmount, 0),
      totalPaidThisMonth: this.commissions.filter((c) => c.status === 'paid' && (c.paidAt ?? '') >= monthStart).reduce((s, c) => s + c.commissionAmount, 0),
    }
  }
}
