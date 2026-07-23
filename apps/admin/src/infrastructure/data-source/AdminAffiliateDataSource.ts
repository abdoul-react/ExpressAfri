export type AffiliateStatus = 'pending' | 'active' | 'suspended' | 'banned'
export type CommissionStatus = 'pending' | 'approved' | 'paid' | 'reversed'

export interface Affiliate {
  id: string
  name: string
  email: string
  phone: string
  country: string
  status: AffiliateStatus
  defaultCommissionRate: number
  paymentMethod: 'bank_transfer' | 'mobile_money' | 'orange_money' | 'wave'
  paymentDetails: string
  totalEarned: number
  totalPaid: number
  totalPending: number
  totalReferrals: number
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface AffiliateCode {
  id: string
  affiliateId: string
  code: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  minOrderAmount?: number
  maxUses?: number
  currentUses: number
  isActive: boolean
  createdAt: string
  expiresAt?: string
}

export interface AffiliateCommission {
  id: string
  affiliateId: string
  affiliateName: string
  orderId: string
  code: string
  customerName: string
  orderAmount: number
  commissionRate: number
  commissionAmount: number
  status: CommissionStatus
  createdAt: string
  paidAt?: string
}

export interface AffiliateQueryParams {
  page?: number
  limit?: number
  search?: string
  status?: AffiliateStatus
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface CommissionQueryParams {
  page?: number
  limit?: number
  affiliateId?: string
  status?: CommissionStatus
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface AdminAffiliateDataSource {
  list(params: AffiliateQueryParams): Promise<PaginatedResult<Affiliate>>
  getById(id: string): Promise<Affiliate>
  create(data: Partial<Affiliate>): Promise<Affiliate>
  update(id: string, data: Partial<Affiliate>): Promise<Affiliate>
  updateStatus(id: string, status: string): Promise<Affiliate>

  listCodes(affiliateId: string): Promise<AffiliateCode[]>
  createCode(affiliateId: string, data: Partial<AffiliateCode>): Promise<AffiliateCode>
  updateCode(id: string, data: Partial<AffiliateCode>): Promise<AffiliateCode>
  toggleCode(id: string, isActive: boolean): Promise<AffiliateCode>

  listCommissions(params: CommissionQueryParams): Promise<PaginatedResult<AffiliateCommission>>
  approveCommission(id: string): Promise<AffiliateCommission>
  rejectCommission(id: string): Promise<AffiliateCommission>

  getSummary(): Promise<{ totalAffiliates: number; activeAffiliates: number; totalCommissionsPending: number; totalPaidThisMonth: number }>
}
