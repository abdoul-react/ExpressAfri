import type { AdminUserDataSource, CustomerQueryParams, PaginatedResult } from '../AdminUserDataSource'
import type { CustomerDTO, CustomerUpdateInput, OrderDTO } from '@/types/dto'
import api from '@/lib/api'
import { GEOGRAPHY } from '@/features/delivery/services/geographyService'

function countryName(code: string | null | undefined): string | null {
  if (!code) return null
  const country = GEOGRAPHY.find((c) => c.code === code.toUpperCase())
  return country ? `${country.flag} ${country.name}` : code
}

function toCustomer(raw: Record<string, unknown>): CustomerDTO {
  const name =
    (raw.name as string) ??
    [raw.firstName, raw.lastName].filter(Boolean).join(' ').trim() ??
    ''
  return {
    ...raw as unknown as CustomerDTO,
    name: name || (raw.email as string) || 'Client',
    country: (raw.country ?? countryName(raw.countryCode as string | undefined)) as string | undefined,
    totalOrders: Number(raw.totalOrders ?? 0) || 0,
    totalSpent: Number(raw.totalSpent ?? 0) || 0,
    isBanned: Boolean(raw.isBanned),
  }
}

export class ApiAdminUserDataSource implements AdminUserDataSource {
  async listCustomers(params: CustomerQueryParams): Promise<PaginatedResult<CustomerDTO>> {
    const { data } = await api.get('/customers', { params })
    const items = ((data.data ?? data) as Record<string, unknown>[]).map(toCustomer)
    return {
      data: items,
      total: Number(data.total),
      page: Number(data.page),
      limit: Number(data.limit),
      totalPages: Number(data.totalPages),
    }
  }

  async getCustomerById(id: string): Promise<CustomerDTO> {
    const { data } = await api.get(`/customers/${id}`)
    return toCustomer(data as Record<string, unknown>)
  }

  async getCustomerOrders(_customerId: string): Promise<OrderDTO[]> {
    throw new Error('Customer orders are not available via API')
  }

  async updateCustomer(id: string, payload: CustomerUpdateInput): Promise<CustomerDTO> {
    const { data } = await api.put(`/customers/${id}`, payload)
    return toCustomer(data as Record<string, unknown>)
  }

  async deleteCustomer(id: string): Promise<void> {
    await api.delete(`/customers/${id}`)
  }

  async banCustomer(id: string): Promise<void> {
    await api.put(`/customers/${id}`, { isBanned: true })
  }

  async unbanCustomer(id: string): Promise<void> {
    await api.put(`/customers/${id}`, { isBanned: false })
  }
}
