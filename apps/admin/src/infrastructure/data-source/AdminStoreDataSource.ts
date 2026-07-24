export interface StoreQueryParams {
  page?: number
  limit?: number
  search?: string
  status?: 'pending' | 'approved' | 'rejected' | 'suspended'
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ─── KYC ─────────────────────────────────────────────────────────────────────

export type KycStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected'

export interface KycDocument {
  id: string
  type: 'id_card' | 'passport' | 'business_registration' | 'tax_certificate' | 'bank_statement' | 'other'
  label: string
  url: string
  status: 'pending' | 'approved' | 'rejected'
  rejectionReason?: string
  uploadedAt: string
  reviewedAt?: string
}

export interface StoreKyc {
  status: KycStatus
  submittedAt?: string
  reviewedAt?: string
  reviewedBy?: string
  rejectionReason?: string
  // Identité du gérant
  ownerFirstName: string
  ownerLastName: string
  ownerIdNumber: string          // N° pièce d'identité
  ownerDateOfBirth?: string
  ownerNationality?: string
  // Informations légales boutique
  businessName?: string          // Raison sociale
  businessType?: 'individual' | 'company' | 'association'
  rccmNumber?: string            // Registre commerce
  taxpayerNumber?: string        // Numéro contribuable / NIF
  businessAddress?: string
  // Documents
  documents: KycDocument[]
}

// ─── Sanction / historique ────────────────────────────────────────────────────

export interface StoreSanction {
  id: string
  type: 'warning' | 'suspension' | 'rejection' | 'reactivation'
  reason: string
  adminId: string
  adminName: string
  createdAt: string
}

// ─── Store complet ────────────────────────────────────────────────────────────

export interface AdminStore {
  id: string
  name: string
  ownerName: string
  ownerEmail: string
  phone: string
  city: string
  country: string
  description: string
  status: 'pending' | 'approved' | 'rejected' | 'suspended'
  rejectionReason?: string
  suspensionReason?: string
  logoUrl?: string | null
  productCount: number
  totalOrders: number
  revenue: number
  // Commission
  commissionRate: number         // % prélevé par la plateforme (ex: 5.0)
  // KYC
  kyc: StoreKyc
  // Sanctions
  sanctions: StoreSanction[]
  // Dates
  createdAt: string
  updatedAt?: string
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export interface UpdateKycPayload {
  status: KycStatus
  rejectionReason?: string
  reviewedBy?: string
}

export interface UpdateDocumentPayload {
  status: 'approved' | 'rejected'
  rejectionReason?: string
}

export interface UpdateCommissionPayload {
  commissionRate: number
}

// ─── Store Manager ─────────────────────────────────────────────────────────────

export interface StoreManager {
  id: string
  email: string
  name: string
  isActive: boolean
  createdAt: string
}

export interface CreateManagerPayload {
  email: string
  name: string
  password: string
}

export interface SetManagerActivePayload {
  isActive: boolean
}

export interface ResetManagerPasswordPayload {
  password: string
}

// ─── DataSource ───────────────────────────────────────────────────────────────

export interface CreateStorePayload {
  name: string
  email: string
  phone?: string
  country?: string
  commissionRate?: number
}

export interface UpdateStorePayload {
  name?: string
  email?: string
  phone?: string
  country?: string
  city?: string
  description?: string
}

export interface AdminStoreDataSource {
  list(params: StoreQueryParams): Promise<PaginatedResult<AdminStore>>
  getById(id: string): Promise<AdminStore>
  create(payload: CreateStorePayload): Promise<AdminStore>
  update(id: string, payload: UpdateStorePayload): Promise<AdminStore>
  delete(id: string): Promise<void>
  approve(id: string): Promise<AdminStore>
  reject(id: string, reason?: string): Promise<AdminStore>
  suspend(id: string, reason?: string): Promise<AdminStore>
  reactivate(id: string): Promise<AdminStore>
  updateKyc(id: string, payload: UpdateKycPayload): Promise<AdminStore>
  updateDocument(storeId: string, docId: string, payload: UpdateDocumentPayload): Promise<AdminStore>
  updateCommission(id: string, payload: UpdateCommissionPayload): Promise<AdminStore>
  listManagers(storeId: string): Promise<StoreManager[]>
  createManager(storeId: string, payload: CreateManagerPayload): Promise<StoreManager>
  setManagerActive(storeId: string, managerId: string, payload: SetManagerActivePayload): Promise<StoreManager>
  resetManagerPassword(storeId: string, managerId: string, payload: ResetManagerPasswordPayload): Promise<StoreManager>
}
