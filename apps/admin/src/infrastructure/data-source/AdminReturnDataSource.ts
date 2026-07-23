export type ReturnStatus = 'pending' | 'approved' | 'received' | 'refunded' | 'rejected' | 'cancelled'

export interface ReturnItem {
  productId: string
  productName: string
  quantity: number
  price: number
}

export interface ReturnRequest {
  id: string
  orderId: string
  customerId: string
  customerName: string
  customerEmail: string
  items: ReturnItem[]
  reason: string
  status: ReturnStatus
  refundAmount?: number
  refundMethod?: string
  rejectionReason?: string
  createdAt: string
  updatedAt: string
  resolvedAt?: string
}

export interface ReturnQueryParams {
  page?: number
  limit?: number
  search?: string
  status?: ReturnStatus
  fromDate?: string
  toDate?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface ReturnSummary {
  pending: number
  approved: number
  received: number
  refunded: number
  totalRefundedThisMonth: number
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface AdminReturnDataSource {
  list(params: ReturnQueryParams): Promise<PaginatedResult<ReturnRequest>>
  getById(id: string): Promise<ReturnRequest>
  getSummary(): Promise<ReturnSummary>
  approve(id: string): Promise<ReturnRequest>
  markAsReceived(id: string): Promise<ReturnRequest>
  refund(id: string, amount?: number, method?: string): Promise<ReturnRequest>
  reject(id: string, reason?: string): Promise<ReturnRequest>
  cancel(id: string): Promise<ReturnRequest>
}
