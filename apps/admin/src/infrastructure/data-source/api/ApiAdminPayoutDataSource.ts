import type { AdminPayoutDataSource, Payout, PayoutSummary, PayoutQueryParams, PaginatedResult } from '../AdminPayoutDataSource'
import api from '@/lib/api'

function toPayout(raw: any): Payout {
  return {
    ...raw,
    amount: Number(raw.amount),
    commissionRate: Number(raw.commissionRate),
    commissionAmount: Number(raw.commissionAmount),
    netAmount: Number(raw.netAmount),
  }
}

export class ApiAdminPayoutDataSource implements AdminPayoutDataSource {
  async list(params: PayoutQueryParams): Promise<PaginatedResult<Payout>> {
    const { data } = await api.get('/payouts', { params })
    return { ...data, data: data.data.map(toPayout) }
  }

  async getById(id: string): Promise<Payout> {
    const { data } = await api.get(`/payouts/${id}`)
    return toPayout(data)
  }

  async getSummary(): Promise<PayoutSummary> {
    const { data } = await api.get('/payouts/summary')
    return data
  }

  async markAsPaid(id: string, payload: { paymentReference: string; paidAt?: string; notes?: string }): Promise<Payout> {
    const { data } = await api.put(`/payouts/${id}/mark-paid`, payload)
    return toPayout(data)
  }

  async cancel(id: string, reason?: string): Promise<Payout> {
    const { data } = await api.put(`/payouts/${id}/cancel`, { reason })
    return toPayout(data)
  }

  async processPayout(id: string): Promise<Payout> {
    const { data } = await api.put(`/payouts/${id}/process`, { processedBy: '' })
    return toPayout(data)
  }

  async getPayoutsByStore(storeId: string): Promise<Payout[]> {
    const { data } = await api.get('/payouts', { params: { storeId } })
    return (data.data ?? data).map(toPayout)
  }
}
