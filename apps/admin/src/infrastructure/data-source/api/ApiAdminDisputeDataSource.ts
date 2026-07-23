import type { AdminDisputeDataSource, AdminDispute, DisputeQueryParams, UpdateDisputeStatusPayload, ResolveDisputePayload, AddDisputeMessagePayload } from '../AdminDisputeDataSource'
import type { PaginatedResult } from '../AdminOrderDataSource'
import api from '@/lib/api'

function toDispute(raw: any): AdminDispute {
  return {
    ...raw,
    amount: Number(raw.amount),
    resolutionAmount: raw.resolutionAmount != null ? Number(raw.resolutionAmount) : undefined,
  }
}

export class ApiAdminDisputeDataSource implements AdminDisputeDataSource {
  async list(params: DisputeQueryParams): Promise<PaginatedResult<AdminDispute>> {
    const { data } = await api.get('/disputes', { params })
    return { ...data, data: data.data.map(toDispute) }
  }

  async getById(id: string): Promise<AdminDispute> {
    const { data } = await api.get(`/disputes/${id}`)
    return toDispute(data)
  }

  async updateStatus(id: string, payload: UpdateDisputeStatusPayload): Promise<AdminDispute> {
    const { data } = await api.put(`/disputes/${id}/status`, payload)
    return toDispute(data)
  }

  async resolve(id: string, payload: ResolveDisputePayload): Promise<AdminDispute> {
    const { data } = await api.put(`/disputes/${id}/resolve`, payload)
    return toDispute(data)
  }

  async addMessage(id: string, payload: AddDisputeMessagePayload): Promise<AdminDispute> {
    const { data } = await api.post(`/disputes/${id}/messages`, payload)
    return toDispute(data)
  }

  async assignToAdmin(id: string, adminId: string, adminName: string): Promise<AdminDispute> {
    const { data } = await api.put(`/disputes/${id}/assign`, { adminId, adminName })
    return toDispute(data)
  }

  async delete(id: string): Promise<void> {
    await api.delete(`/disputes/${id}`)
  }
}
