import type { AdminOrderDataSource, OrderQueryParams, PaginatedResult } from '../AdminOrderDataSource'
import type { OrderDTO } from '@/types/dto'
import { MOCK_ORDERS } from './data/mockOrders'

export class MockAdminOrderDataSource implements AdminOrderDataSource {
  private orders: OrderDTO[] = [...MOCK_ORDERS] as unknown as OrderDTO[]
  private delay(ms = 400): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  async list(params: OrderQueryParams): Promise<PaginatedResult<OrderDTO>> {
    await this.delay()
    const { page = 1, limit = 10, search, status, dateFrom: fromDate, dateTo: toDate, sortBy, sortOrder } = params

    let filtered = [...this.orders]

    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          (o.customerEmail ?? '').toLowerCase().includes(q),
      )
    }
    if (status) filtered = filtered.filter((o) => o.status === status)
    if (fromDate) filtered = filtered.filter((o) => new Date(o.createdAt) >= new Date(fromDate))
    if (toDate) filtered = filtered.filter((o) => new Date(o.createdAt) <= new Date(toDate))

    if (sortBy) {
      filtered.sort((a, b) => {
        const aVal = a[sortBy as keyof OrderDTO]
        const bVal = b[sortBy as keyof OrderDTO]
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

  async getById(id: string): Promise<OrderDTO> {
    await this.delay()
    const order = this.orders.find((o) => o.id === id)
    if (!order) throw new Error('Commande introuvable')
    return order
  }

  async updateStatus(id: string, status: string): Promise<OrderDTO> {
    await this.delay()
    const index = this.orders.findIndex((o) => o.id === id)
    if (index === -1) throw new Error('Commande introuvable')
    this.orders[index] = { ...this.orders[index], status, updatedAt: new Date().toISOString() }
    return this.orders[index]
  }

  async cancel(id: string, reason?: string): Promise<OrderDTO> {
    await this.delay()
    const index = this.orders.findIndex((o) => o.id === id)
    if (index === -1) throw new Error('Commande introuvable')
    this.orders[index] = {
      ...this.orders[index],
      status: 'cancelled',
      notes: reason,
      updatedAt: new Date().toISOString(),
    }
    return this.orders[index]
  }

  async refund(id: string, amount?: number): Promise<OrderDTO> {
    await this.delay()
    const index = this.orders.findIndex((o) => o.id === id)
    if (index === -1) throw new Error('Commande introuvable')
    this.orders[index] = {
      ...this.orders[index],
      status: 'refunded',
      paymentStatus: 'refunded',
      updatedAt: new Date().toISOString(),
    }
    return this.orders[index]
  }

  private shipments: Record<string, any[]> = {}

  async createShipment(orderId: string, data: import('../AdminOrderDataSource').ShipmentInput): Promise<any> {
    await this.delay()
    const order = this.orders.find((o) => o.id === orderId)
    if (!order) throw new Error('Commande introuvable')
    const shipment = {
      id: `ship_${Date.now()}`,
      orderId,
      status: 'preparing',
      items: data.items,
      trackingNumber: data.trackingNumber ?? null,
      notes: data.notes ?? null,
      createdAt: new Date().toISOString(),
    }
    this.shipments[orderId] = [...(this.shipments[orderId] ?? []), shipment]
    for (const item of data.items) {
      const idx = this.orders.findIndex((o) => o.id === orderId)
      if (idx > -1) {
        const items = (this.orders[idx] as any).items ?? []
        const itemIdx = items.findIndex((i: any) => i.id === item.orderItemId || i.productId === item.orderItemId)
        if (itemIdx > -1) items[itemIdx].status = 'ready'
      }
    }
    return shipment
  }

  async updateItemStatus(orderId: string, itemId: string, status: string, issueReason?: string): Promise<any> {
    await this.delay()
    const order = this.orders.find((o) => o.id === orderId)
    if (!order) throw new Error('Commande introuvable')
    return { success: true }
  }

  async listShipments(orderId: string): Promise<any[]> {
    await this.delay()
    return this.shipments[orderId] ?? []
  }
}
