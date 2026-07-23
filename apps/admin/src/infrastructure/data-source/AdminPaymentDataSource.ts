import type { PaymentDTO } from '@/types/dto'

export interface PaymentQueryParams {
  page?: number
  limit?: number
  search?: string
  status?: string
  method?: string
  dateFrom?: string
  dateTo?: string
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

export interface AdminPaymentDataSource {
  list(params: PaymentQueryParams): Promise<PaginatedResult<PaymentDTO>>
  getById(id: string): Promise<PaymentDTO>
  refund(id: string, amount?: number, reason?: string): Promise<PaymentDTO>
}
