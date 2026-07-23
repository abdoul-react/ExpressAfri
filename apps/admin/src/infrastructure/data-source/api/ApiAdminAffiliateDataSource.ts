import type { AdminAffiliateDataSource, Affiliate, AffiliateCode, AffiliateCommission, AffiliateQueryParams, CommissionQueryParams, PaginatedResult } from '../AdminAffiliateDataSource'
import api from '@/lib/api'

function toAffiliate(raw: any): Affiliate {
  return { ...raw, defaultCommissionRate: Number(raw.defaultCommissionRate), totalEarned: Number(raw.totalEarned), totalPaid: Number(raw.totalPaid), totalPending: Number(raw.totalPending), totalReferrals: Number(raw.totalReferrals) }
}

function toCommission(raw: any): AffiliateCommission {
  return { ...raw, orderAmount: Number(raw.orderAmount), commissionRate: Number(raw.commissionRate), commissionAmount: Number(raw.commissionAmount) }
}

export class ApiAdminAffiliateDataSource implements AdminAffiliateDataSource {
  async list(params?: AffiliateQueryParams): Promise<PaginatedResult<Affiliate>> {
    const { data } = await api.get('/affiliates', { params })
    return { ...data, data: data.data.map(toAffiliate) }
  }

  async getById(id: string): Promise<Affiliate> {
    const { data } = await api.get(`/affiliates/${id}`)
    return toAffiliate(data)
  }

  async create(input: Partial<Affiliate>): Promise<Affiliate> {
    const { data } = await api.post('/affiliates', input)
    return toAffiliate(data)
  }

  async update(id: string, input: Partial<Affiliate>): Promise<Affiliate> {
    const { data } = await api.put(`/affiliates/${id}`, input)
    return toAffiliate(data)
  }

  async updateStatus(id: string, status: string): Promise<Affiliate> {
    const { data } = await api.put(`/affiliates/${id}/status`, { status })
    return toAffiliate(data)
  }

  // Coupon-based affiliate codes (Option A) — returns coupons as AffiliateCode[]
  async listCodes(affiliateId: string): Promise<AffiliateCode[]> {
    const { data } = await api.get(`/affiliates/${affiliateId}/coupons`)
    return data.data.map((c: any) => ({
      id: c.id,
      affiliateId: c.affiliateId,
      code: c.code,
      discountType: c.type === 'fixed' ? 'fixed' : 'percentage',
      discountValue: Number(c.value),
      minOrderAmount: c.minPurchase ? Number(c.minPurchase) : undefined,
      maxUses: c.usageLimitTotal ?? undefined,
      currentUses: Number(c.usedCount),
      isActive: c.isActive,
      createdAt: c.createdAt,
      expiresAt: c.endDate,
    }))
  }

  async createCode(_affiliateId: string, _data: Partial<AffiliateCode>): Promise<AffiliateCode> {
    throw new Error('Use coupon creation instead (admin coupon form with affiliateId)')
  }

  async updateCode(_id: string, _data: Partial<AffiliateCode>): Promise<AffiliateCode> {
    throw new Error('Use coupon update instead')
  }

  async toggleCode(_id: string, _isActive: boolean): Promise<AffiliateCode> {
    throw new Error('Use coupon toggle instead')
  }

  async listCommissions(params?: CommissionQueryParams): Promise<PaginatedResult<AffiliateCommission>> {
    const { data } = await api.get('/affiliates/commissions/list', { params })
    return { ...data, data: data.data.map(toCommission) }
  }

  async approveCommission(id: string): Promise<AffiliateCommission> {
    const { data } = await api.put(`/affiliates/commissions/${id}/approve`)
    return toCommission(data)
  }

  async rejectCommission(id: string): Promise<AffiliateCommission> {
    const { data } = await api.put(`/affiliates/commissions/${id}/reject`)
    return toCommission(data)
  }

  async getSummary(): Promise<{ totalAffiliates: number; activeAffiliates: number; totalCommissionsPending: number; totalPaidThisMonth: number }> {
    const { data } = await api.get('/affiliates/summary')
    return { ...data, totalAffiliates: Number(data.totalAffiliates), activeAffiliates: Number(data.activeAffiliates), totalCommissionsPending: Number(data.totalCommissionsPending), totalPaidThisMonth: Number(data.totalPaidThisMonth) }
  }
}
