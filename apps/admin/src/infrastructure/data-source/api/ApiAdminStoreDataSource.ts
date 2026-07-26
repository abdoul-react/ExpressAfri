import type { AdminStoreDataSource, AdminStore, StoreQueryParams, PaginatedResult, UpdateKycPayload, UpdateDocumentPayload, UpdateCommissionPayload, UpdateStorePayload, StoreManager, CreateManagerPayload, SetManagerActivePayload, ResetManagerPasswordPayload, StoreMedia, StoreMediaType, StoreSection, StoreSectionItem, CreateSectionPayload, UpdateSectionPayload, StoreGroup, StoreGroupItem, CreateStoreGroupPayload, UpdateStoreGroupPayload, PaymentProvider, StorePaymentMethod, CreateStorePaymentMethodPayload, UpdateStorePaymentMethodPayload, PaymentMethodValidation } from '../AdminStoreDataSource'
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
    description: raw.description ?? '',
    status: raw.status,
    logoUrl: raw.logoUrl ?? null,
    coverUrl: raw.coverUrl ?? null,
    productCount: Number(raw.productCount ?? 0),
    totalOrders: Number(raw.totalOrders ?? 0),
    revenue: Number(raw.revenue ?? 0),
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

  // Le verdict KYC passe par les routes de décision dédiées, protégées par
  // `stores.approve` / `stores.reject`. `PUT /stores/:id/kyc` ne sert qu'au
  // dépôt du dossier par le gérant et remet toujours le statut à `pending` :
  // l'utiliser ici annulerait la décision au lieu de l'enregistrer.
  //
  // Ces deux routes renvoient la ligne KYC, pas la boutique : on relit la
  // boutique pour rendre un AdminStore complet.
  async updateKyc(id: string, payload: UpdateKycPayload): Promise<AdminStore> {
    if (payload.status === 'approved') {
      await api.put(`/stores/${id}/kyc/approve`, {})
      return this.getById(id)
    }
    if (payload.status === 'rejected') {
      await api.put(`/stores/${id}/kyc/reject`, {
        reason: payload.rejectionReason,
      })
      return this.getById(id)
    }
    throw new Error(`Statut KYC non pris en charge : ${payload.status}`)
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

  async listMedia(storeId: string): Promise<StoreMedia[]> {
    const { data } = await api.get(`/stores/${storeId}/media`)
    return data
  }

  async uploadMedia(storeId: string, file: File, type: StoreMediaType, alt?: string): Promise<StoreMedia> {
    const form = new FormData()
    form.append('file', file)
    form.append('type', type)
    if (alt) form.append('alt', alt)
    const { data } = await api.post(`/stores/${storeId}/media`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  }

  async reorderMedia(storeId: string, ids: string[]): Promise<void> {
    await api.put(`/stores/${storeId}/media/reorder`, { ids })
  }

  async deleteMedia(storeId: string, mediaId: string): Promise<void> {
    await api.delete(`/stores/${storeId}/media/${mediaId}`)
  }

  async listSections(storeId: string): Promise<StoreSection[]> {
    const { data } = await api.get(`/stores/${storeId}/sections`)
    return data
  }

  async createSection(storeId: string, payload: CreateSectionPayload): Promise<StoreSection> {
    const { data } = await api.post(`/stores/${storeId}/sections`, payload)
    return data
  }

  async updateSection(
    storeId: string,
    sectionId: string,
    payload: UpdateSectionPayload,
  ): Promise<StoreSection> {
    const { data } = await api.put(`/stores/${storeId}/sections/${sectionId}`, payload)
    return data
  }

  async deleteSection(storeId: string, sectionId: string): Promise<void> {
    await api.delete(`/stores/${storeId}/sections/${sectionId}`)
  }

  async reorderSections(storeId: string, ids: string[]): Promise<void> {
    await api.put(`/stores/${storeId}/sections/reorder`, { ids })
  }

  async listSectionItems(storeId: string, sectionId: string): Promise<StoreSectionItem[]> {
    const { data } = await api.get(`/stores/${storeId}/sections/${sectionId}/items`)
    return data
  }

  async addSectionItems(storeId: string, sectionId: string, productIds: string[]): Promise<void> {
    await api.post(`/stores/${storeId}/sections/${sectionId}/items`, { productIds })
  }

  async removeSectionItem(storeId: string, sectionId: string, itemId: string): Promise<void> {
    await api.delete(`/stores/${storeId}/sections/${sectionId}/items/${itemId}`)
  }

  async reorderSectionItems(storeId: string, sectionId: string, ids: string[]): Promise<void> {
    await api.put(`/stores/${storeId}/sections/${sectionId}/items/reorder`, { ids })
  }

  // ─── Sections de la liste des boutiques (vitrine, admin central) ───────────
  // Routes sans storeId : ces sections sont transverses à la plateforme.

  async listStoreGroups(): Promise<StoreGroup[]> {
    const { data } = await api.get('/store-groups')
    return data
  }

  async createStoreGroup(payload: CreateStoreGroupPayload): Promise<StoreGroup> {
    const { data } = await api.post('/store-groups', payload)
    return data
  }

  async updateStoreGroup(groupId: string, payload: UpdateStoreGroupPayload): Promise<StoreGroup> {
    const { data } = await api.put(`/store-groups/${groupId}`, payload)
    return data
  }

  async deleteStoreGroup(groupId: string): Promise<void> {
    await api.delete(`/store-groups/${groupId}`)
  }

  async reorderStoreGroups(ids: string[]): Promise<void> {
    await api.put('/store-groups/reorder', { ids })
  }

  async listStoreGroupItems(groupId: string): Promise<StoreGroupItem[]> {
    const { data } = await api.get(`/store-groups/${groupId}/stores`)
    return data
  }

  async addStoreGroupItems(groupId: string, storeIds: string[]): Promise<void> {
    await api.post(`/store-groups/${groupId}/stores`, { storeIds })
  }

  async removeStoreGroupItem(groupId: string, itemId: string): Promise<void> {
    await api.delete(`/store-groups/${groupId}/stores/${itemId}`)
  }

  async reorderStoreGroupItems(groupId: string, ids: string[]): Promise<void> {
    await api.put(`/store-groups/${groupId}/stores/reorder`, { ids })
  }

  // ─── Moyens de paiement (cloisonnés au boutiquier) ─────────────────────────

  async listPaymentProviders(storeId: string): Promise<PaymentProvider[]> {
    const { data } = await api.get(`/stores/${storeId}/payment-methods/catalog`)
    return data
  }

  async listPaymentMethods(storeId: string): Promise<StorePaymentMethod[]> {
    const { data } = await api.get(`/stores/${storeId}/payment-methods`)
    return data
  }

  async createPaymentMethod(storeId: string, payload: CreateStorePaymentMethodPayload): Promise<StorePaymentMethod> {
    const { data } = await api.post(`/stores/${storeId}/payment-methods`, payload)
    return data
  }

  async updatePaymentMethod(storeId: string, methodId: string, payload: UpdateStorePaymentMethodPayload): Promise<StorePaymentMethod> {
    const { data } = await api.put(`/stores/${storeId}/payment-methods/${methodId}`, payload)
    return data
  }

  async deletePaymentMethod(storeId: string, methodId: string): Promise<void> {
    await api.delete(`/stores/${storeId}/payment-methods/${methodId}`)
  }

  async reorderPaymentMethods(storeId: string, ids: string[]): Promise<void> {
    await api.put(`/stores/${storeId}/payment-methods/reorder`, { ids })
  }

  async validatePaymentMethod(storeId: string, methodId: string): Promise<PaymentMethodValidation> {
    const { data } = await api.post(`/stores/${storeId}/payment-methods/${methodId}/validate`)
    return data
  }
}
