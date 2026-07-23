import type { AdminPaymentDataSource, PaymentQueryParams, PaginatedResult } from '../AdminPaymentDataSource'
import type { PaymentDTO } from '@/types/dto'
import { MOCK_PAYMENTS } from './data/mockPayments'

export class MockAdminPaymentDataSource implements AdminPaymentDataSource {
  private payments: PaymentDTO[] = [...MOCK_PAYMENTS] as unknown as PaymentDTO[]
  private delay(ms = 400): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  async list(params: PaymentQueryParams): Promise<PaginatedResult<PaymentDTO>> {
    await this.delay()
    const { page = 1, limit = 10, search, status, method, dateFrom: fromDate, dateTo: toDate, sortBy, sortOrder } = params

    let filtered = [...this.payments]

    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.id.toLowerCase().includes(q) ||
          p.orderId.toLowerCase().includes(q) ||
          (p.transactionId ?? '').toLowerCase().includes(q) ||
          (p.customerName ?? '').toLowerCase().includes(q),
      )
    }
    if (status) filtered = filtered.filter((p) => p.status === status)
    if (method) filtered = filtered.filter((p) => p.method === method)
    if (fromDate) filtered = filtered.filter((p) => new Date(p.createdAt) >= new Date(fromDate))
    if (toDate) filtered = filtered.filter((p) => new Date(p.createdAt) <= new Date(toDate))

    if (sortBy) {
      filtered.sort((a, b) => {
        const aVal = a[sortBy as keyof PaymentDTO]
        const bVal = b[sortBy as keyof PaymentDTO]
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

  async getById(id: string): Promise<PaymentDTO> {
    await this.delay()
    const payment = this.payments.find((p) => p.id === id)
    if (!payment) throw new Error('Paiement introuvable')
    return payment
  }

  async refund(id: string, amount?: number, reason?: string): Promise<PaymentDTO> {
    await this.delay()
    const index = this.payments.findIndex((p) => p.id === id)
    if (index === -1) throw new Error('Paiement introuvable')
    if (this.payments[index].status !== 'paid') throw new Error('Seuls les paiements confirmés peuvent être remboursés')
    this.payments[index] = {
      ...this.payments[index],
      status: 'refunded',
      refundedAmount: amount ?? this.payments[index].amount,
      refundedAt: new Date().toISOString(),
    }
    return this.payments[index]
  }
}
