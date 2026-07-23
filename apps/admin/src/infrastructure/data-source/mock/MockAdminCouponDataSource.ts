import type { AdminCouponDataSource, Coupon, CouponQueryParams, PaginatedCoupons, CreateCouponInput, UpdateCouponInput } from '../AdminCouponDataSource'
import { MOCK_COUPONS } from './data/mockCoupons'

let idCounter = MOCK_COUPONS.length + 1

export class MockAdminCouponDataSource implements AdminCouponDataSource {
  private items: Coupon[] = [...MOCK_COUPONS]
  private delay(ms = 300) { return new Promise<void>((r) => setTimeout(r, ms)) }

  async list(params?: CouponQueryParams): Promise<PaginatedCoupons> {
    await this.delay()
    let filtered = [...this.items]
    if (params?.search) {
      const s = params.search.toLowerCase()
      filtered = filtered.filter((x) => x.code.toLowerCase().includes(s) || x.name.toLowerCase().includes(s) || x.description?.toLowerCase().includes(s))
    }
    if (params?.status) {
      const now = new Date()
      filtered = filtered.filter((x) => {
        if (params.status === 'active') return x.isActive && new Date(x.startDate) <= now && new Date(x.endDate) >= now
        if (params.status === 'inactive') return !x.isActive
        if (params.status === 'scheduled') return x.isActive && new Date(x.startDate) > now
        if (params.status === 'expired') return x.isActive && new Date(x.endDate) < now
        return true
      })
    }
    if (params?.type) filtered = filtered.filter((x) => x.type === params.type)
    if (params?.affiliateId) filtered = filtered.filter((x) => x.affiliateId === params.affiliateId)
    const page = params?.page ?? 1
    const limit = params?.limit ?? 10
    const start = (page - 1) * limit
    return { data: filtered.slice(start, start + limit), total: filtered.length, page }
  }

  async getById(id: string): Promise<Coupon> {
    await this.delay()
    const item = this.items.find((x) => x.id === id)
    if (!item) throw new Error('Coupon introuvable')
    return item
  }

  async getByCode(code: string): Promise<Coupon | null> {
    await this.delay()
    return this.items.find((x) => x.code.toLowerCase() === code.toLowerCase()) ?? null
  }

  async create(data: CreateCouponInput): Promise<Coupon> {
    await this.delay()
    const now = new Date().toISOString()
    const item: Coupon = { id: `coup_${String(idCounter++).padStart(3, '0')}`, ...data, firstTimeOnly: data.firstTimeOnly ?? false, applicableTo: data.applicableTo ?? 'all', isActive: data.isActive ?? true, usedCount: 0, affiliateId: data.affiliateId, affiliateName: data.affiliateName, createdAt: now, updatedAt: now }
    this.items.push(item)
    return item
  }

  async update(id: string, data: UpdateCouponInput): Promise<Coupon> {
    await this.delay()
    const idx = this.items.findIndex((x) => x.id === id)
    if (idx === -1) throw new Error('Coupon introuvable')
    this.items[idx] = { ...this.items[idx], ...data, updatedAt: new Date().toISOString() }
    return this.items[idx]
  }

  async delete(id: string): Promise<void> {
    await this.delay()
    const idx = this.items.findIndex((x) => x.id === id)
    if (idx === -1) throw new Error('Coupon introuvable')
    this.items.splice(idx, 1)
  }
}
