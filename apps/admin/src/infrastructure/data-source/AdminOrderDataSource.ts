import type { OrderDTO, OrderStatus } from '@/types/dto'

export interface OrderQueryParams {
  page?: number
  limit?: number
  search?: string
  status?: OrderStatus | string
  customerId?: string
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

export interface AdminOrderDataSource {
  list(params: OrderQueryParams): Promise<PaginatedResult<OrderDTO>>
  getById(id: string): Promise<OrderDTO>
  updateStatus(id: string, status: string): Promise<OrderDTO>
  cancel(id: string, reason?: string): Promise<OrderDTO>
  refund(id: string, amount?: number): Promise<OrderDTO>
}
