import type { AdminCouponDataSource, Coupon, CreateCouponInput, UpdateCouponInput, CouponQueryParams, PaginatedCoupons } from '../AdminCouponDataSource'
import api from '@/lib/api'

function toCoupon(raw: any): Coupon {
  return { ...raw, value: Number(raw.value), minPurchase: raw.minPurchase ? Number(raw.minPurchase) : undefined, maxDiscount: raw.maxDiscount ? Number(raw.maxDiscount) : undefined, usedCount: Number(raw.usedCount) }
}

export class ApiAdminCouponDataSource implements AdminCouponDataSource {
  async list(params?: CouponQueryParams): Promise<PaginatedCoupons> {
    const { data } = await api.get('/coupons', { params })
    return { data: data.data.map(toCoupon), total: data.total, page: data.page }
  }

  async getById(id: string): Promise<Coupon> {
    const { data } = await api.get(`/coupons/${id}`)
    return toCoupon(data)
  }

  async getByCode(code: string): Promise<Coupon | null> {
    try {
      const { data } = await api.get(`/coupons/by-code/${code}`)
      return toCoupon(data)
    } catch { return null }
  }

  async create(input: CreateCouponInput): Promise<Coupon> {
    const { data } = await api.post('/coupons', input)
    return toCoupon(data)
  }

  async update(id: string, input: UpdateCouponInput): Promise<Coupon> {
    const { data } = await api.put(`/coupons/${id}`, input)
    return toCoupon(data)
  }

  async delete(id: string): Promise<void> {
    await api.delete(`/coupons/${id}`)
  }
}
