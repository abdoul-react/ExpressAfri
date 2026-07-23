import type { AdminUserDataSource, CustomerQueryParams, PaginatedResult } from '../AdminUserDataSource'
import type { CustomerDTO, CustomerUpdateInput, OrderDTO } from '@/types/dto'
import { MOCK_CUSTOMERS } from './data/mockCustomers'
import { MOCK_ORDERS } from './data/mockOrders'

export class MockAdminUserDataSource implements AdminUserDataSource {
  private customers: CustomerDTO[] = [...MOCK_CUSTOMERS] as unknown as CustomerDTO[]
  private delay(ms = 400): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  async listCustomers(params: CustomerQueryParams): Promise<PaginatedResult<CustomerDTO>> {
    await this.delay()
    const { page = 1, limit = 10, search, sortBy, sortOrder } = params

    let filtered = [...this.customers]

    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(
        (c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.phone ?? '').includes(q),
      )
    }

    if (sortBy) {
      filtered.sort((a, b) => {
        const aVal = a[sortBy as keyof CustomerDTO]
        const bVal = b[sortBy as keyof CustomerDTO]
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortOrder === 'desc' ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal)
        }
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortOrder === 'desc' ? bVal - aVal : aVal - bVal
        }
        return 0
      })
    }

    const total = filtered.length
    const totalPages = Math.ceil(total / limit)
    const start = (page - 1) * limit
    const data = filtered.slice(start, start + limit)

    return { data, total, page, limit, totalPages }
  }

  async getCustomerById(id: string): Promise<CustomerDTO> {
    await this.delay()
    const customer = this.customers.find((c) => c.id === id)
    if (!customer) throw new Error('Client introuvable')
    return customer
  }

  async getCustomerOrders(customerId: string): Promise<OrderDTO[]> {
    await this.delay()
    const customer = this.customers.find((c) => c.id === customerId)
    if (!customer) return []
    return MOCK_ORDERS.filter((o) => o.customerName === customer.name) as unknown as OrderDTO[]
  }

  async updateCustomer(id: string, data: CustomerUpdateInput): Promise<CustomerDTO> {
    await this.delay()
    const index = this.customers.findIndex((c) => c.id === id)
    if (index === -1) throw new Error('Client introuvable')
    this.customers[index] = { ...this.customers[index], ...data }
    return this.customers[index]
  }

  async deleteCustomer(id: string): Promise<void> {
    await this.delay()
    const index = this.customers.findIndex((c) => c.id === id)
    if (index === -1) throw new Error('Client introuvable')
    this.customers.splice(index, 1)
  }

  async banCustomer(id: string): Promise<void> {
    await this.delay()
    const index = this.customers.findIndex((c) => c.id === id)
    if (index === -1) throw new Error('Client introuvable')
    this.customers[index].isBanned = true
  }

  async unbanCustomer(id: string): Promise<void> {
    await this.delay()
    const index = this.customers.findIndex((c) => c.id === id)
    if (index === -1) throw new Error('Client introuvable')
    this.customers[index].isBanned = false
  }
}
