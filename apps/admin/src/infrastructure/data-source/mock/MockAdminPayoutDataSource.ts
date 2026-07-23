import type { AdminPayoutDataSource, Payout, PayoutSummary, PayoutQueryParams, PaginatedResult } from '../AdminPayoutDataSource'
import { MOCK_PAYOUTS } from './data/mockPayouts'

export class MockAdminPayoutDataSource implements AdminPayoutDataSource {
  private payouts: Payout[] = MOCK_PAYOUTS.map((p) => ({ ...p }))

  private delay(ms = 400): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  async list(params: PayoutQueryParams): Promise<PaginatedResult<Payout>> {
    await this.delay()
    const { page = 1, limit = 10, search, status, storeId, sortBy, sortOrder } = params
    let filtered = [...this.payouts]

    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.storeName.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          (p.paymentReference ?? '').toLowerCase().includes(q),
      )
    }
    if (status) filtered = filtered.filter((p) => p.status === status)
    if (storeId) filtered = filtered.filter((p) => p.storeId === storeId)

    if (sortBy) {
      filtered.sort((a, b) => {
        const av = (a as any)[sortBy] ?? ''
        const bv = (b as any)[sortBy] ?? ''
        const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))
        return sortOrder === 'desc' ? -cmp : cmp
      })
    }

    const total = filtered.length
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const start = (page - 1) * limit
    return { data: filtered.slice(start, start + limit), total, page, limit, totalPages }
  }

  async getById(id: string): Promise<Payout> {
    await this.delay(300)
    const payout = this.payouts.find((p) => p.id === id)
    if (!payout) throw new Error('Versement introuvable')
    return { ...payout }
  }

  async getSummary(): Promise<PayoutSummary> {
    await this.delay(200)
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    return {
      totalPending: this.payouts.filter((p) => p.status === 'pending').reduce((s, p) => s + p.netAmount, 0),
      totalPaidThisMonth: this.payouts
        .filter((p) => p.status === 'paid' && p.paidAt && p.paidAt >= monthStart)
        .reduce((s, p) => s + p.netAmount, 0),
      totalCommissionCollected: this.payouts
        .filter((p) => p.status === 'paid' || p.status === 'processing')
        .reduce((s, p) => s + p.commissionAmount, 0),
      pendingCount: this.payouts.filter((p) => p.status === 'pending').length,
    }
  }

  async markAsPaid(id: string, payload: { paymentReference: string; paidAt?: string; notes?: string }): Promise<Payout> {
    await this.delay(400)
    const idx = this.payouts.findIndex((p) => p.id === id)
    if (idx === -1) throw new Error('Versement introuvable')
    this.payouts[idx] = {
      ...this.payouts[idx],
      status: 'paid',
      paymentReference: payload.paymentReference,
      paidAt: payload.paidAt ?? new Date().toISOString(),
      notes: payload.notes ?? this.payouts[idx].notes,
    }
    return { ...this.payouts[idx] }
  }

  async cancel(id: string, reason?: string): Promise<Payout> {
    await this.delay(400)
    const idx = this.payouts.findIndex((p) => p.id === id)
    if (idx === -1) throw new Error('Versement introuvable')
    this.payouts[idx] = { ...this.payouts[idx], status: 'cancelled', notes: reason ?? this.payouts[idx].notes }
    return { ...this.payouts[idx] }
  }

  async processPayout(id: string): Promise<Payout> {
    await this.delay(300)
    const idx = this.payouts.findIndex((p) => p.id === id)
    if (idx === -1) throw new Error('Versement introuvable')
    this.payouts[idx] = { ...this.payouts[idx], status: 'processing' }
    return { ...this.payouts[idx] }
  }

  async getPayoutsByStore(storeId: string): Promise<Payout[]> {
    await this.delay(200)
    return this.payouts.filter((p) => p.storeId === storeId)
  }
}
