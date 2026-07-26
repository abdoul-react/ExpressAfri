import type {
  AdminStoreDataSource,
  AdminStore,
  StoreQueryParams,
  PaginatedResult,
  UpdateKycPayload,
  UpdateDocumentPayload,
  UpdateCommissionPayload,
  UpdateStorePayload,
  StoreManager,
  CreateManagerPayload,
  SetManagerActivePayload,
  ResetManagerPasswordPayload,
  CreateStorePayload,
  StoreMedia,
  StoreMediaType,
  StoreSection,
  StoreSectionItem,
  CreateSectionPayload,
  UpdateSectionPayload,
  StoreGroup,
  StoreGroupItem,
  CreateStoreGroupPayload,
  UpdateStoreGroupPayload,
  PaymentProvider,
  StorePaymentMethod,
  CreateStorePaymentMethodPayload,
  UpdateStorePaymentMethodPayload,
  PaymentMethodValidation,
} from '../AdminStoreDataSource'
import { MOCK_STORES } from './data/mockStores'

export class MockAdminStoreDataSource implements AdminStoreDataSource {
  private stores: AdminStore[] = MOCK_STORES.map((s) => ({ ...s }))

  private delay(ms = 400): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  async list(params: StoreQueryParams): Promise<PaginatedResult<AdminStore>> {
    await this.delay()
    const { page = 1, limit = 10, search, status, sortBy, sortOrder } = params
    let filtered = [...this.stores]

    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.ownerName.toLowerCase().includes(q) ||
          s.city.toLowerCase().includes(q),
      )
    }
    if (status) filtered = filtered.filter((s) => s.status === status)

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

  async create(payload: CreateStorePayload): Promise<AdminStore> {
    await this.delay(400)
    const store: AdminStore = {
      id: `mock-${Date.now()}`,
      name: payload.name,
      ownerName: '',
      ownerEmail: payload.email,
      phone: payload.phone ?? '',
      city: '',
      country: payload.country ?? 'Niger',
      description: '',
      status: 'pending',
      commissionRate: payload.commissionRate ?? 0,
      productCount: 0,
      totalOrders: 0,
      revenue: 0,
      kyc: { status: 'not_submitted', documents: [], ownerFirstName: '', ownerLastName: '', ownerIdNumber: '' },
      sanctions: [],
      createdAt: new Date().toISOString(),
    }
    this.stores.push(store)
    return { ...store }
  }

  async getById(id: string): Promise<AdminStore> {
    await this.delay(300)
    const store = this.stores.find((s) => s.id === id)
    if (!store) throw new Error('Boutique introuvable')
    return { ...store }
  }

  async update(id: string, payload: UpdateStorePayload): Promise<AdminStore> {
    await this.delay(400)
    return this._update(id, payload)
  }

  async delete(id: string): Promise<void> {
    await this.delay(400)
    const idx = this.stores.findIndex((s) => s.id === id)
    if (idx === -1) throw new Error('Boutique introuvable')
    this.stores.splice(idx, 1)
  }

  private _update(id: string, patch: Partial<AdminStore>): AdminStore {
    const idx = this.stores.findIndex((s) => s.id === id)
    if (idx === -1) throw new Error('Boutique introuvable')
    this.stores[idx] = { ...this.stores[idx], ...patch, updatedAt: new Date().toISOString() }
    return { ...this.stores[idx] }
  }

  async approve(id: string): Promise<AdminStore> {
    await this.delay()
    const store = this._update(id, { status: 'approved' })
    store.sanctions.push({
      id: `sanction_${Date.now()}`,
      type: 'reactivation',
      reason: 'Boutique approuvée',
      adminId: 'admin_1',
      adminName: 'Admin',
      createdAt: new Date().toISOString(),
    })
    return store
  }

  async reject(id: string, reason?: string): Promise<AdminStore> {
    await this.delay()
    const store = this._update(id, { status: 'rejected', rejectionReason: reason })
    store.sanctions.push({
      id: `sanction_${Date.now()}`,
      type: 'rejection',
      reason: reason ?? 'Rejeté',
      adminId: 'admin_1',
      adminName: 'Admin',
      createdAt: new Date().toISOString(),
    })
    return store
  }

  async suspend(id: string, reason?: string): Promise<AdminStore> {
    await this.delay()
    const store = this._update(id, { status: 'suspended', suspensionReason: reason })
    store.sanctions.push({
      id: `sanction_${Date.now()}`,
      type: 'suspension',
      reason: reason ?? 'Suspendu',
      adminId: 'admin_1',
      adminName: 'Admin',
      createdAt: new Date().toISOString(),
    })
    return store
  }

  async reactivate(id: string): Promise<AdminStore> {
    await this.delay()
    const store = this._update(id, { status: 'approved', suspensionReason: undefined, rejectionReason: undefined })
    store.sanctions.push({
      id: `sanction_${Date.now()}`,
      type: 'reactivation',
      reason: 'Boutique réactivée',
      adminId: 'admin_1',
      adminName: 'Admin',
      createdAt: new Date().toISOString(),
    })
    return store
  }

  async updateKyc(id: string, payload: UpdateKycPayload): Promise<AdminStore> {
    await this.delay(500)
    const idx = this.stores.findIndex((s) => s.id === id)
    if (idx === -1) throw new Error('Boutique introuvable')
    this.stores[idx] = {
      ...this.stores[idx],
      kyc: {
        ...this.stores[idx].kyc,
        status: payload.status,
        rejectionReason: payload.rejectionReason,
        reviewedBy: payload.reviewedBy ?? 'Admin',
        reviewedAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    }
    return { ...this.stores[idx] }
  }

  async updateDocument(storeId: string, docId: string, payload: UpdateDocumentPayload): Promise<AdminStore> {
    await this.delay(400)
    const idx = this.stores.findIndex((s) => s.id === storeId)
    if (idx === -1) throw new Error('Boutique introuvable')
    this.stores[idx] = {
      ...this.stores[idx],
      kyc: {
        ...this.stores[idx].kyc,
        documents: this.stores[idx].kyc.documents.map((d) =>
          d.id === docId
            ? { ...d, status: payload.status, rejectionReason: payload.rejectionReason, reviewedAt: new Date().toISOString() }
            : d,
        ),
      },
      updatedAt: new Date().toISOString(),
    }
    return { ...this.stores[idx] }
  }

  async updateCommission(id: string, payload: UpdateCommissionPayload): Promise<AdminStore> {
    await this.delay(300)
    return this._update(id, { commissionRate: payload.commissionRate })
  }

  async listManagers(_storeId: string): Promise<StoreManager[]> {
    await this.delay()
    return []
  }

  async createManager(_storeId: string, _payload: CreateManagerPayload): Promise<StoreManager> {
    await this.delay()
    throw new Error('Non implémenté en mode mock')
  }

  async setManagerActive(_storeId: string, _managerId: string, _payload: SetManagerActivePayload): Promise<StoreManager> {
    await this.delay()
    throw new Error('Non implémenté en mode mock')
  }

  async resetManagerPassword(_storeId: string, _managerId: string, _payload: ResetManagerPasswordPayload): Promise<StoreManager> {
    await this.delay()
    throw new Error('Non implémenté en mode mock')
  }

  async listMedia(_storeId: string): Promise<StoreMedia[]> {
    await this.delay()
    return []
  }

  async uploadMedia(_storeId: string, _file: File, _type: StoreMediaType, _alt?: string): Promise<StoreMedia> {
    await this.delay()
    throw new Error('Non implémenté en mode mock')
  }

  async reorderMedia(_storeId: string, _ids: string[]): Promise<void> {
    await this.delay()
  }

  async deleteMedia(_storeId: string, _mediaId: string): Promise<void> {
    await this.delay()
  }

  async listSections(_storeId: string): Promise<StoreSection[]> {
    await this.delay()
    return []
  }

  async createSection(_storeId: string, _payload: CreateSectionPayload): Promise<StoreSection> {
    await this.delay()
    throw new Error('Non implémenté en mode mock')
  }

  async updateSection(_storeId: string, _sectionId: string, _payload: UpdateSectionPayload): Promise<StoreSection> {
    await this.delay()
    throw new Error('Non implémenté en mode mock')
  }

  async deleteSection(_storeId: string, _sectionId: string): Promise<void> {
    await this.delay()
  }

  async reorderSections(_storeId: string, _ids: string[]): Promise<void> {
    await this.delay()
  }

  async listSectionItems(_storeId: string, _sectionId: string): Promise<StoreSectionItem[]> {
    await this.delay()
    return []
  }

  async addSectionItems(_storeId: string, _sectionId: string, _productIds: string[]): Promise<void> {
    await this.delay()
  }

  async removeSectionItem(_storeId: string, _sectionId: string, _itemId: string): Promise<void> {
    await this.delay()
  }

  async reorderSectionItems(_storeId: string, _sectionId: string, _ids: string[]): Promise<void> {
    await this.delay()
  }

  async listStoreGroups(): Promise<StoreGroup[]> {
    await this.delay()
    return []
  }

  async createStoreGroup(_payload: CreateStoreGroupPayload): Promise<StoreGroup> {
    await this.delay()
    throw new Error('Non implémenté en mode mock')
  }

  async updateStoreGroup(_groupId: string, _payload: UpdateStoreGroupPayload): Promise<StoreGroup> {
    await this.delay()
    throw new Error('Non implémenté en mode mock')
  }

  async deleteStoreGroup(_groupId: string): Promise<void> {
    await this.delay()
  }

  async reorderStoreGroups(_ids: string[]): Promise<void> {
    await this.delay()
  }

  async listStoreGroupItems(_groupId: string): Promise<StoreGroupItem[]> {
    await this.delay()
    return []
  }

  async addStoreGroupItems(_groupId: string, _storeIds: string[]): Promise<void> {
    await this.delay()
  }

  async removeStoreGroupItem(_groupId: string, _itemId: string): Promise<void> {
    await this.delay()
  }

  async reorderStoreGroupItems(_groupId: string, _ids: string[]): Promise<void> {
    await this.delay()
  }

  async listPaymentProviders(_storeId: string): Promise<PaymentProvider[]> {
    await this.delay()
    return []
  }

  async listPaymentMethods(_storeId: string): Promise<StorePaymentMethod[]> {
    await this.delay()
    return []
  }

  async createPaymentMethod(_storeId: string, _payload: CreateStorePaymentMethodPayload): Promise<StorePaymentMethod> {
    await this.delay()
    throw new Error('Non implémenté en mode mock')
  }

  async updatePaymentMethod(_storeId: string, _methodId: string, _payload: UpdateStorePaymentMethodPayload): Promise<StorePaymentMethod> {
    await this.delay()
    throw new Error('Non implémenté en mode mock')
  }

  async deletePaymentMethod(_storeId: string, _methodId: string): Promise<void> {
    await this.delay()
  }

  async reorderPaymentMethods(_storeId: string, _ids: string[]): Promise<void> {
    await this.delay()
  }

  async validatePaymentMethod(_storeId: string, _methodId: string): Promise<PaymentMethodValidation> {
    await this.delay()
    return { ok: false, missing: [], message: 'Non implémenté en mode mock' }
  }
}
