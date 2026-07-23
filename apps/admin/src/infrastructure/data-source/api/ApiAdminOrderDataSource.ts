import type { AdminOrderDataSource, OrderQueryParams, PaginatedResult } from '../AdminOrderDataSource'
import type { OrderDTO } from '@/types/dto'
import api from '@/lib/api'

function toOrder(raw: Record<string, unknown>): OrderDTO {
  const customer = raw.customer as Record<string, unknown> | undefined
  return {
    id: raw.id as string,
    orderNumber: (raw.orderNumber ?? raw.id) as string,
    customerId: raw.customerId as string,
    customerName: (raw.customerName ?? customer?.name ?? '') as string,
    customerEmail: raw.customerEmail as string | undefined,
    customerPhone: raw.customerPhone as string | undefined,
    items: (raw.items ?? []) as OrderDTO['items'],
    subtotal: Number(raw.subtotal),
    shippingCost: Number(raw.shippingCost ?? 0),
    taxAmount: Number(raw.taxAmount ?? 0),
    discountAmount: Number(raw.discountAmount ?? 0),
    total: Number(raw.total),
    status: raw.status as string,
    currency: (raw.currency ?? 'XOF') as string,
    paymentMethod: raw.paymentMethod as string | undefined,
    paymentStatus: raw.paymentStatus as string | undefined,
    shippingAddress: raw.shippingAddress as Record<string, unknown> | undefined,
    trackingNumber: raw.trackingNumber as string | undefined,
    notes: raw.notes as string | undefined,
    createdAt: raw.createdAt as string,
    updatedAt: raw.updatedAt as string,
  }
}

export class ApiAdminOrderDataSource implements AdminOrderDataSource {
  async list(params?: OrderQueryParams): Promise<PaginatedResult<OrderDTO>> {
    const { data } = await api.get('/orders', { params })
    return {
      data: (data.data as Record<string, unknown>[]).map(toOrder),
      total: Number(data.total) || 0,
      page: Number(data.page) || 1,
      limit: Number(data.limit) || 10,
      totalPages: Number(data.totalPages) || Math.max(1, Math.ceil((Number(data.total) || 0) / (Number(data.limit) || 10))),
    }
  }

  async getById(id: string): Promise<OrderDTO> {
    const { data } = await api.get(`/orders/${id}`)
    return toOrder(data as Record<string, unknown>)
  }

  async updateStatus(id: string, status: string): Promise<OrderDTO> {
    const { data } = await api.put(`/orders/${id}/status`, { status })
    return toOrder(data as Record<string, unknown>)
  }

  async cancel(id: string, reason?: string): Promise<OrderDTO> {
    const { data } = await api.put(`/orders/${id}/status`, { status: 'cancelled', reason })
    return toOrder(data as Record<string, unknown>)
  }

  async refund(id: string, _amount?: number): Promise<OrderDTO> {
    const { data } = await api.put(`/orders/${id}/status`, { status: 'refunded' })
    return toOrder(data as Record<string, unknown>)
  }

  async createShipment(orderId: string, input: import('../AdminOrderDataSource').ShipmentInput): Promise<any> {
    const { data } = await api.post(`/orders/${orderId}/shipments`, input)
    return data
  }

  async updateItemStatus(orderId: string, itemId: string, status: string, issueReason?: string): Promise<any> {
    const { data } = await api.put(`/orders/${orderId}/items/${itemId}/status`, { status, issueReason })
    return data
  }

  async listShipments(orderId: string): Promise<any[]> {
    const { data } = await api.get(`/orders/${orderId}/shipments`)
    return data ?? []
  }
}
