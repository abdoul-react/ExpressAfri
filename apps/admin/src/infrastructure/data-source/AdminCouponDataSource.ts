export interface Coupon {
  id: string
  code: string
  name: string
  description?: string
  type: 'percentage' | 'fixed' | 'free_shipping'
  value: number
  minPurchase?: number
  maxDiscount?: number
  startDate: string
  endDate: string
  isActive: boolean
  usageLimitPerUser?: number
  usageLimitTotal?: number
  usedCount: number
  firstTimeOnly: boolean
  applicableTo: 'all' | 'category' | 'store' | 'product'
  applicableId?: string
  applicableName?: string
  affiliateId?: string
  affiliateName?: string
  createdAt: string
  updatedAt: string
}

export interface CreateCouponInput {
  code: string
  name: string
  description?: string
  type: Coupon['type']
  value: number
  minPurchase?: number
  maxDiscount?: number
  startDate: string
  endDate: string
  isActive?: boolean
  usageLimitPerUser?: number
  usageLimitTotal?: number
  firstTimeOnly?: boolean
  applicableTo?: Coupon['applicableTo']
  applicableId?: string
  applicableName?: string
  affiliateId?: string
  affiliateName?: string
}

export interface UpdateCouponInput extends Partial<CreateCouponInput> {}

export interface CouponQueryParams {
  page?: number
  limit?: number
  search?: string
  status?: 'active' | 'inactive' | 'scheduled' | 'expired'
  type?: string
  affiliateId?: string
}

export interface PaginatedCoupons {
  data: Coupon[]
  total: number
  page: number
}

export interface AdminCouponDataSource {
  list(params?: CouponQueryParams): Promise<PaginatedCoupons>
  getById(id: string): Promise<Coupon>
  getByCode(code: string): Promise<Coupon | null>
  create(data: CreateCouponInput): Promise<Coupon>
  update(id: string, data: UpdateCouponInput): Promise<Coupon>
  delete(id: string): Promise<void>
}
