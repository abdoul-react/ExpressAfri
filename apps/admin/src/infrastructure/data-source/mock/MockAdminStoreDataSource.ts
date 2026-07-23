import type {
  AdminStoreDataSource,
  AdminStore,
  StoreQueryParams,
  PaginatedResult,
  UpdateKycPayload,
  UpdateDocumentPayload,
  UpdateCommissionPayload,
  StoreManager,
  CreateManagerPayload,
  SetManagerActivePayload,
  ResetManagerPasswordPayload,
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

  async getById(id: string): Promise<AdminStore> {
    await this.delay(300)
    const store = this.stores.find((s) => s.id === id)
    if (!store) throw new Error('Boutique introuvable')
    return { ...store }
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
}
