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
  coverUrl?: string | null
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

// ─── Médias ───────────────────────────────────────────────────────────────────

export type StoreMediaType = 'logo' | 'cover' | 'gallery'

export interface StoreMedia {
  id: string
  storeId: string
  type: StoreMediaType
  url: string
  alt?: string | null
  sortOrder: number
  isActive: boolean
  createdAt: string
}

// ─── Sections de catalogue ────────────────────────────────────────────────────

/** Format des cartes produit de la section, tel que rendu par l'app mobile. */
export type StoreSectionLayout = 'grid' | 'rail' | 'list' | 'showcase'

export interface StoreSection {
  id: string
  title: string
  subtitle?: string | null
  layout: StoreSectionLayout
  sortOrder: number
  isActive: boolean
  productCount: number
}

export interface StoreSectionItem {
  id: string
  productId: string
  name: string
  price: string
  status: string
  sortOrder: number
  imageUrl?: string | null
}

export interface CreateSectionPayload {
  title: string
  subtitle?: string
  layout?: StoreSectionLayout
}

export interface UpdateSectionPayload {
  title?: string
  subtitle?: string | null
  layout?: StoreSectionLayout
  isActive?: boolean
}

// ─── Sections de la liste des boutiques (vitrine) ─────────────────────────────

/**
 * Regroupement de BOUTIQUES par thème sur la page liste, à ne pas confondre
 * avec `StoreSection` ci-dessus qui regroupe des PRODUITS dans une boutique.
 * Ces sections relèvent de l'admin central : un gérant n'y a pas accès.
 */
export interface StoreGroup {
  id: string
  title: string
  subtitle?: string | null
  icon?: string | null
  sortOrder: number
  isActive: boolean
  storeCount: number
}

export interface StoreGroupItem {
  id: string
  storeId: string
  name: string
  city?: string | null
  country?: string | null
  status: string
  sortOrder: number
  logoUrl?: string | null
}

export interface CreateStoreGroupPayload {
  title: string
  subtitle?: string
  icon?: string
}

export interface UpdateStoreGroupPayload {
  title?: string
  subtitle?: string | null
  icon?: string | null
  isActive?: boolean
}

// ─── Moyens de paiement de la boutique ────────────────────────────────────────

/** Types reconnus par l'API. Le catalogue global normalise vers ces valeurs. */
export type StorePaymentType =
  | 'mobile_money'
  | 'card'
  | 'wallet'
  | 'cash_on_delivery'

/** Provider proposé par l'admin central : le boutiquier ne peut activer que ça. */
export interface PaymentProvider {
  code: string
  name: string
  description?: string | null
  logoUrl?: string | null
  type: StorePaymentType
  supportedCountries?: string[] | null
}

export interface StorePaymentMethod {
  id: string
  storeId: string
  type: StorePaymentType
  provider: string
  displayName: string
  description?: string | null
  logoUrl?: string | null
  iconUrl?: string | null
  instructions?: string | null
  countries?: string[] | null
  isEnabled: boolean
  isPublic: boolean
  sortOrder: number
  metadataPublic?: Record<string, unknown>
  /** Champs de configuration non sensibles, lisibles tels quels. */
  config: Record<string, string>
  /**
   * Aperçus masqués (`••••1234`) des champs sensibles déjà renseignés.
   * L'API ne renvoie jamais la valeur en clair après sauvegarde : ce champ
   * sert seulement à savoir qu'une clé existe.
   */
  secrets: Record<string, string>
}

export interface CreateStorePaymentMethodPayload {
  provider: string
  type?: StorePaymentType
  displayName?: string
  description?: string
  instructions?: string
  isEnabled?: boolean
  config?: Record<string, string | null>
}

export interface UpdateStorePaymentMethodPayload {
  type?: StorePaymentType
  displayName?: string
  description?: string | null
  logoUrl?: string | null
  instructions?: string | null
  countries?: string[]
  isEnabled?: boolean
  isPublic?: boolean
  /** Une valeur `null` supprime la clé — seul moyen de retirer un secret. */
  config?: Record<string, string | null>
}

export interface PaymentMethodValidation {
  ok: boolean
  missing: string[]
  message: string
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
  listMedia(storeId: string): Promise<StoreMedia[]>
  uploadMedia(storeId: string, file: File, type: StoreMediaType, alt?: string): Promise<StoreMedia>
  reorderMedia(storeId: string, ids: string[]): Promise<void>
  deleteMedia(storeId: string, mediaId: string): Promise<void>
  listSections(storeId: string): Promise<StoreSection[]>
  createSection(storeId: string, payload: CreateSectionPayload): Promise<StoreSection>
  updateSection(storeId: string, sectionId: string, payload: UpdateSectionPayload): Promise<StoreSection>
  deleteSection(storeId: string, sectionId: string): Promise<void>
  reorderSections(storeId: string, ids: string[]): Promise<void>
  listSectionItems(storeId: string, sectionId: string): Promise<StoreSectionItem[]>
  addSectionItems(storeId: string, sectionId: string, productIds: string[]): Promise<void>
  removeSectionItem(storeId: string, sectionId: string, itemId: string): Promise<void>
  reorderSectionItems(storeId: string, sectionId: string, ids: string[]): Promise<void>
  listStoreGroups(): Promise<StoreGroup[]>
  createStoreGroup(payload: CreateStoreGroupPayload): Promise<StoreGroup>
  updateStoreGroup(groupId: string, payload: UpdateStoreGroupPayload): Promise<StoreGroup>
  deleteStoreGroup(groupId: string): Promise<void>
  reorderStoreGroups(ids: string[]): Promise<void>
  listStoreGroupItems(groupId: string): Promise<StoreGroupItem[]>
  addStoreGroupItems(groupId: string, storeIds: string[]): Promise<void>
  removeStoreGroupItem(groupId: string, itemId: string): Promise<void>
  reorderStoreGroupItems(groupId: string, ids: string[]): Promise<void>
  listPaymentProviders(storeId: string): Promise<PaymentProvider[]>
  listPaymentMethods(storeId: string): Promise<StorePaymentMethod[]>
  createPaymentMethod(storeId: string, payload: CreateStorePaymentMethodPayload): Promise<StorePaymentMethod>
  updatePaymentMethod(storeId: string, methodId: string, payload: UpdateStorePaymentMethodPayload): Promise<StorePaymentMethod>
  deletePaymentMethod(storeId: string, methodId: string): Promise<void>
  reorderPaymentMethods(storeId: string, ids: string[]): Promise<void>
  validatePaymentMethod(storeId: string, methodId: string): Promise<PaymentMethodValidation>
}
