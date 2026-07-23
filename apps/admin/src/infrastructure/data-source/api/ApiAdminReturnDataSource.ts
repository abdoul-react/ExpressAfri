import type { AdminReturnDataSource, ReturnQueryParams, ReturnRequest, ReturnSummary, PaginatedResult } from '../AdminReturnDataSource'
import api from '@/lib/api'

function toReturn(raw: any): ReturnRequest {
  return {
    ...raw,
    items: (raw.items ?? []).map((i: any) => ({
      ...i,
      price: Number(i.price),
    })),
    refundAmount: raw.refundAmount != null ? Number(raw.refundAmount) : undefined,
  }
}

export class ApiAdminReturnDataSource implements AdminReturnDataSource {
  async list(params: ReturnQueryParams): Promise<PaginatedResult<ReturnRequest>> {
    const { data } = await api.get('/returns', { params })
    return { ...data, data: data.data.map(toReturn) }
  }

  async getById(id: string): Promise<ReturnRequest> {
    const { data } = await api.get(`/returns/${id}`)
    return toReturn(data)
  }

  async getSummary(): Promise<ReturnSummary> {
    const { data } = await api.get('/returns/summary')
    return { ...data, totalRefundedThisMonth: Number(data.totalRefundedThisMonth) }
  }

  async approve(id: string): Promise<ReturnRequest> {
    const { data } = await api.put(`/returns/${id}/status`, { status: 'approved' })
    return toReturn(data)
  }

  async markAsReceived(id: string): Promise<ReturnRequest> {
    const { data } = await api.put(`/returns/${id}/status`, { status: 'received' })
    return toReturn(data)
  }

  async refund(id: string, amount?: number, method?: string): Promise<ReturnRequest> {
    const { data } = await api.put(`/returns/${id}/status`, { status: 'refunded', refundAmount: amount, notes: method })
    return toReturn(data)
  }

  async reject(id: string, reason?: string): Promise<ReturnRequest> {
    const { data } = await api.put(`/returns/${id}/status`, { status: 'rejected', notes: reason })
    return toReturn(data)
  }

  async cancel(id: string): Promise<ReturnRequest> {
    const { data } = await api.put(`/returns/${id}/status`, { status: 'cancelled' })
    return toReturn(data)
  }
}
