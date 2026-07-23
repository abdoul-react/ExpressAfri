export interface Payout {
  id: string
  storeId: string
  storeName: string
  amount: number
  commissionRate: number
  commissionAmount: number
  netAmount: number
  periodStart: string
  periodEnd: string
  status: 'pending' | 'processing' | 'paid' | 'cancelled'
  paymentMethod: 'bank_transfer' | 'mobile_money' | 'wave' | 'orange_money'
  paymentReference?: string
  paidAt?: string
  notes?: string
  createdAt: string
}

export interface PayoutSummary {
  totalPending: number
  totalPaidThisMonth: number
  totalCommissionCollected: number
  pendingCount: number
}

export interface PayoutQueryParams {
  page?: number
  limit?: number
  search?: string
  status?: string
  storeId?: string
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

export interface AdminPayoutDataSource {
  list(params: PayoutQueryParams): Promise<PaginatedResult<Payout>>
  getById(id: string): Promise<Payout>
  getSummary(): Promise<PayoutSummary>
  markAsPaid(id: string, payload: { paymentReference: string; paidAt?: string; notes?: string }): Promise<Payout>
  cancel(id: string, reason?: string): Promise<Payout>
  processPayout(id: string): Promise<Payout>
  getPayoutsByStore(storeId: string): Promise<Payout[]>
}
