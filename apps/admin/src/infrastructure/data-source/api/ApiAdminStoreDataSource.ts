import type { AdminStoreDataSource, AdminStore, StoreQueryParams, PaginatedResult, UpdateKycPayload, UpdateDocumentPayload, UpdateCommissionPayload, UpdateStorePayload, StoreManager, CreateManagerPayload, SetManagerActivePayload, ResetManagerPasswordPayload } from '../AdminStoreDataSource'
import api from '@/lib/api'

function toStore(raw: any): AdminStore {
  return {
    id: raw.id,
    name: raw.name,
    ownerName: raw.owner?.name ?? raw.ownerName ?? '',
    ownerEmail: raw.owner?.email ?? raw.email,
    phone: raw.phone ?? '',
    city: raw.city ?? raw.owner?.city ?? raw.address?.city ?? raw.location?.city ?? '',
    country: raw.owner?.country ?? raw.country,
    description: '',
    status: raw.status,
    logoUrl: null,
    productCount: 0,
    totalOrders: 0,
    revenue: 0,
    commissionRate: Number(raw.commissionRate),
    kyc: (raw.kyc as any) ?? { status: 'not_submitted', documents: [], ownerFirstName: '', ownerLastName: '', ownerIdNumber: '' },
    sanctions: [],
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  }
}

export class ApiAdminStoreDataSource implements AdminStoreDataSource {
  async list(params?: StoreQueryParams): Promise<PaginatedResult<AdminStore>> {
    const { data } = await api.get('/stores', { params })
    return { ...data, data: data.data.map(toStore) }
  }

  async create(payload: import('../AdminStoreDataSource').CreateStorePayload): Promise<AdminStore> {
    const { data } = await api.post('/stores', payload)
    return toStore(data)
  }

  async getById(id: string): Promise<AdminStore> {
    const { data } = await api.get(`/stores/${id}`)
    return toStore(data)
  }

  async update(id: string, payload: UpdateStorePayload): Promise<AdminStore> {
    const { data } = await api.put(`/stores/${id}`, payload)
    return toStore(data)
  }

  async delete(id: string): Promise<void> {
    await api.delete(`/stores/${id}`)
  }

  async approve(id: string): Promise<AdminStore> {
    const { data } = await api.patch(`/stores/${id}/status`, { status: 'approved' })
    return toStore(data)
  }

  async reject(id: string, reason?: string): Promise<AdminStore> {
    const { data } = await api.put(`/stores/${id}/kyc/reject`, { reason })
    return toStore(data)
  }

  async suspend(id: string, reason?: string): Promise<AdminStore> {
    const { data } = await api.patch(`/stores/${id}/status`, { status: 'suspended' })
    return toStore(data)
  }

  async reactivate(id: string): Promise<AdminStore> {
    const { data } = await api.patch(`/stores/${id}/status`, { status: 'approved' })
    return toStore(data)
  }

  async updateKyc(id: string, _payload: UpdateKycPayload): Promise<AdminStore> {
    const { data } = await api.put(`/stores/${id}/kyc`, _payload)
    return toStore(data)
  }

  async updateDocument(_storeId: string, _docId: string, _payload: UpdateDocumentPayload): Promise<AdminStore> {
    throw new Error('Document management not yet available via API')
  }

  async updateCommission(id: string, payload: UpdateCommissionPayload): Promise<AdminStore> {
    const { data } = await api.put(`/stores/${id}`, { commissionRate: String(payload.commissionRate) })
    return toStore(data)
  }

  async listManagers(storeId: string): Promise<StoreManager[]> {
    const { data } = await api.get(`/stores/${storeId}/managers`)
    return data
  }

  async createManager(storeId: string, payload: CreateManagerPayload): Promise<StoreManager> {
    const { data } = await api.post(`/stores/${storeId}/managers`, payload)
    return data
  }

  async setManagerActive(storeId: string, managerId: string, payload: SetManagerActivePayload): Promise<StoreManager> {
    const { data } = await api.put(`/stores/${storeId}/managers/${managerId}/active`, payload)
    return data
  }

  async resetManagerPassword(storeId: string, managerId: string, payload: ResetManagerPasswordPayload): Promise<StoreManager> {
    const { data } = await api.put(`/stores/${storeId}/managers/${managerId}/password`, payload)
    return data
  }
}
