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

  async getCustomerOrders(customerId: string): Promise<OrderDTO[]> {
    const { data } = await api.get('/orders', { params: { customerId, limit: 50 } })
    const items = (data.data ?? data) as Record<string, unknown>[]
    return items.map((raw) => ({
      id: raw.id as string,
      orderNumber: (raw.orderNumber ?? raw.id) as string,
      customerId: raw.customerId as string,
      customerName: (raw.customerName ?? '') as string,
      customerEmail: raw.customerEmail as string | undefined,
      customerPhone: raw.customerPhone as string | undefined,
      items: (raw.items ?? []) as OrderDTO['items'],
      subtotal: Number(raw.subtotal ?? 0),
      shippingCost: Number(raw.shippingCost ?? 0),
      taxAmount: Number(raw.taxAmount ?? 0),
      discountAmount: Number(raw.discountAmount ?? 0),
      total: Number(raw.total ?? 0),
      status: raw.status as string,
      currency: (raw.currency ?? 'XOF') as string,
      paymentMethod: raw.paymentMethod as string | undefined,
      paymentStatus: raw.paymentStatus as string | undefined,
      shippingAddress: raw.shippingAddress as Record<string, unknown> | undefined,
      trackingNumber: raw.trackingNumber as string | undefined,
      notes: raw.notes as string | undefined,
      createdAt: raw.createdAt as string,
      updatedAt: raw.updatedAt as string,
      statusLog: ((raw.statusLog ?? []) as any[]).map((e) => ({
        status: e.toStatus,
        timestamp: e.createdAt,
        note: e.reason,
        updatedBy: e.changedBy,
      })),
    }))
  }

  async updateCustomer(id: string, payload: CustomerUpdateInput): Promise<CustomerDTO> {
    const { data } = await api.put(`/customers/${id}`, payload)
    return toCustomer(data as Record<string, unknown>)
  }

  async deleteCustomer(id: string): Promise<void> {
    await api.delete(`/customers/${id}`)
  }

  async banCustomer(id: string, reason?: string): Promise<void> {
    await api.post(`/customers/${id}/ban`, { reason: reason ?? '' })
  }

  async unbanCustomer(id: string): Promise<void> {
    await api.post(`/customers/${id}/unban`)
  }
}
