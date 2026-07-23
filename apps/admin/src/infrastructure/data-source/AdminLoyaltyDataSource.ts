export interface LoyaltyRule {
  id: string
  name: string
  type: 'earn_per_spend' | 'signup_bonus' | 'referral_bonus' | 'birthday_bonus' | 'review_bonus' | 'custom'
  points: number
  condition?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface LoyaltyReward {
  id: string
  name: string
  description: string
  pointsCost: number
  type: 'discount' | 'free_shipping' | 'free_product' | 'voucher'
  value: number
  isActive: boolean
  stock?: number
  createdAt: string
  updatedAt: string
}

export interface CustomerPoints {
  customerId: string
  customerName: string
  customerEmail: string
  points: number
  lifetimePoints: number
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  lastActivity: string
}

export interface PointsTransaction {
  id: string
  customerId: string
  customerName: string
  type: 'earned' | 'spent' | 'expired' | 'adjusted'
  points: number
  description: string
  createdAt: string
}

export interface LoyaltyQueryParams {
  page?: number
  limit?: number
  search?: string
  tier?: string
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

export interface LoyaltySummary {
  totalCustomers: number
  totalPointsIssued: number
  totalPointsRedeemed: number
  activeRewards: number
  activeRules: number
}

export interface AdminLoyaltyDataSource {
  getSummary(): Promise<LoyaltySummary>
  listRules(): Promise<LoyaltyRule[]>
  createRule(data: Partial<LoyaltyRule>): Promise<LoyaltyRule>
  updateRule(id: string, data: Partial<LoyaltyRule>): Promise<LoyaltyRule>
  deleteRule(id: string): Promise<void>

  listRewards(): Promise<LoyaltyReward[]>
  createReward(data: Partial<LoyaltyReward>): Promise<LoyaltyReward>
  updateReward(id: string, data: Partial<LoyaltyReward>): Promise<LoyaltyReward>
  deleteReward(id: string): Promise<void>

  listCustomers(params: LoyaltyQueryParams): Promise<PaginatedResult<CustomerPoints>>
  getCustomerPoints(customerId: string): Promise<CustomerPoints>
  adjustPoints(customerId: string, points: number, reason: string): Promise<CustomerPoints>
  getTransactions(customerId: string): Promise<PointsTransaction[]>
}
