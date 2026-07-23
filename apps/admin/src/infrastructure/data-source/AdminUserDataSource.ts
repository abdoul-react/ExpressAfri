import type { CustomerDTO, CustomerUpdateInput, OrderDTO } from '@/types/dto'

export interface CustomerQueryParams {
  page?: number
  limit?: number
  search?: string
  isBanned?: boolean
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

export interface AdminUserDataSource {
  listCustomers(params: CustomerQueryParams): Promise<PaginatedResult<CustomerDTO>>
  getCustomerById(id: string): Promise<CustomerDTO>
  getCustomerOrders(customerId: string): Promise<OrderDTO[]>
  updateCustomer(id: string, data: CustomerUpdateInput): Promise<CustomerDTO>
  deleteCustomer(id: string): Promise<void>
  banCustomer(id: string): Promise<void>
  unbanCustomer(id: string): Promise<void>
}
