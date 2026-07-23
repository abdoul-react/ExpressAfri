import type { AdminReturnDataSource, ReturnQueryParams, ReturnRequest, ReturnSummary, PaginatedResult } from '../AdminReturnDataSource'
import { MOCK_RETURNS } from './data/mockReturns'

export class MockAdminReturnDataSource implements AdminReturnDataSource {
  private returns = [...MOCK_RETURNS]

  private delay(ms = 400): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  async list(params: ReturnQueryParams): Promise<PaginatedResult<ReturnRequest>> {
    await this.delay()
    const { page = 1, limit = 10, search, status, fromDate, toDate, sortBy, sortOrder } = params

    let filtered = [...this.returns]

    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.orderId.toLowerCase().includes(q) ||
          r.customerName.toLowerCase().includes(q) ||
          r.reason.toLowerCase().includes(q),
      )
    }

    if (status) filtered = filtered.filter((r) => r.status === status)
    if (fromDate) filtered = filtered.filter((r) => r.createdAt >= fromDate)
    if (toDate) filtered = filtered.filter((r) => r.createdAt <= toDate)

    if (sortBy) {
      filtered.sort((a, b) => {
        const aVal = (a as any)[sortBy]
        const bVal = (b as any)[sortBy]
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortOrder === 'desc' ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal)
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

  async getById(id: string): Promise<ReturnRequest> {
    await this.delay()
    const ret = this.returns.find((r) => r.id === id)
    if (!ret) throw new Error('Demande de retour introuvable')
    return ret
  }

  async getSummary(): Promise<ReturnSummary> {
    await this.delay(200)
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    return {
      pending: this.returns.filter((r) => r.status === 'pending').length,
      approved: this.returns.filter((r) => r.status === 'approved').length,
      received: this.returns.filter((r) => r.status === 'received').length,
      refunded: this.returns.filter((r) => r.status === 'refunded').length,
      totalRefundedThisMonth: this.returns
        .filter((r) => r.status === 'refunded' && r.createdAt >= monthStart)
        .reduce((sum, r) => sum + (r.refundAmount ?? 0), 0),
    }
  }

  async approve(id: string): Promise<ReturnRequest> {
    await this.delay(300)
    const index = this.returns.findIndex((r) => r.id === id)
    if (index === -1) throw new Error('Demande de retour introuvable')
    this.returns[index] = { ...this.returns[index], status: 'approved', updatedAt: new Date().toISOString() }
    return this.returns[index]
  }

  async markAsReceived(id: string): Promise<ReturnRequest> {
    await this.delay(300)
    const index = this.returns.findIndex((r) => r.id === id)
    if (index === -1) throw new Error('Demande de retour introuvable')
    this.returns[index] = { ...this.returns[index], status: 'received', updatedAt: new Date().toISOString() }
    return this.returns[index]
  }

  async refund(id: string, amount?: number, method?: string): Promise<ReturnRequest> {
    await this.delay(300)
    const index = this.returns.findIndex((r) => r.id === id)
    if (index === -1) throw new Error('Demande de retour introuvable')
    const ret = this.returns[index]
    const refundAmount = amount ?? ret.items.reduce((s, i) => s + i.price * i.quantity, 0)
    this.returns[index] = {
      ...ret,
      status: 'refunded',
      refundAmount,
      refundMethod: method ?? 'Orange Money',
      updatedAt: new Date().toISOString(),
      resolvedAt: new Date().toISOString(),
    }
    return this.returns[index]
  }

  async reject(id: string, reason?: string): Promise<ReturnRequest> {
    await this.delay(300)
    const index = this.returns.findIndex((r) => r.id === id)
    if (index === -1) throw new Error('Demande de retour introuvable')
    this.returns[index] = {
      ...this.returns[index],
      status: 'rejected',
      rejectionReason: reason ?? 'Demande non conforme à notre politique de retour',
      updatedAt: new Date().toISOString(),
      resolvedAt: new Date().toISOString(),
    }
    return this.returns[index]
  }

  async cancel(id: string): Promise<ReturnRequest> {
    await this.delay(300)
    const index = this.returns.findIndex((r) => r.id === id)
    if (index === -1) throw new Error('Demande de retour introuvable')
    this.returns[index] = { ...this.returns[index], status: 'cancelled', updatedAt: new Date().toISOString() }
    return this.returns[index]
  }
}
