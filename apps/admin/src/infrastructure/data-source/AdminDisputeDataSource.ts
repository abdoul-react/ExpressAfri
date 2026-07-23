import type { PaginatedResult } from './AdminOrderDataSource'

// ─── Types ────────────────────────────────────────────────────────────────────

export type DisputeStatus =
  | 'open'          // Ouvert — en attente de traitement admin
  | 'in_review'     // En cours d'examen
  | 'in_mediation'  // En médiation (échanges entre les parties)
  | 'resolved'      // Résolu favorablement (remboursement accordé / renvoi validé)
  | 'rejected'      // Rejeté (réclamation non fondée)
  | 'closed'        // Fermé (délai expiré ou abandon)

export type DisputeReason =
  | 'not_received'       // Produit non reçu
  | 'not_as_described'   // Non conforme à la description
  | 'defective'          // Produit défectueux
  | 'wrong_item'         // Mauvais article reçu
  | 'damaged'            // Produit endommagé
  | 'unauthorized'       // Transaction non autorisée
  | 'other'              // Autre

export type DisputeResolution =
  | 'full_refund'        // Remboursement total
  | 'partial_refund'     // Remboursement partiel
  | 'replacement'        // Renvoi du produit
  | 'store_credit'       // Avoir boutique
  | 'no_action'          // Aucune action (rejeté)

export interface DisputeMessage {
  id: string
  disputeId: string
  authorId: string
  authorName: string
  authorRole: 'customer' | 'seller' | 'admin' | 'system'
  content: string
  attachments?: DisputeAttachment[]
  createdAt: string
}

export interface DisputeAttachment {
  id: string
  name: string
  url: string
  type: 'image' | 'document'
}

export interface DisputeTimeline {
  id: string
  disputeId: string
  status: DisputeStatus
  note?: string
  actorId: string
  actorName: string
  actorRole: 'customer' | 'seller' | 'admin' | 'system'
  createdAt: string
}

export interface AdminDispute {
  id: string
  orderId: string
  orderRef: string          // ex: #ord_0042
  customerId: string
  customerName: string
  customerEmail: string
  sellerId: string
  sellerName: string
  storeName: string
  productId: string
  productName: string
  productImage?: string
  amount: number            // Montant contesté en FCFA
  reason: DisputeReason
  status: DisputeStatus
  resolution?: DisputeResolution
  resolutionAmount?: number // Montant remboursé (partiel)
  resolutionNote?: string   // Note de l'admin lors de la résolution
  description: string       // Description initiale du client
  evidence?: string[]       // URLs des preuves initiales
  messages: DisputeMessage[]
  timeline: DisputeTimeline[]
  assignedAdminId?: string
  assignedAdminName?: string
  dueDate?: string          // Date limite de traitement
  createdAt: string
  updatedAt: string
}

// ─── Query params ─────────────────────────────────────────────────────────────

export interface DisputeQueryParams {
  page?: number
  limit?: number
  search?: string
  status?: DisputeStatus | ''
  reason?: DisputeReason | ''
  fromDate?: string
  toDate?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// ─── Mutation payloads ────────────────────────────────────────────────────────

export interface UpdateDisputeStatusPayload {
  status: DisputeStatus
  note?: string
}

export interface ResolveDisputePayload {
  resolution: DisputeResolution
  resolutionAmount?: number
  resolutionNote: string
}

export interface AddDisputeMessagePayload {
  content: string
  attachments?: Omit<DisputeAttachment, 'id'>[]
}

// ─── DataSource interface ─────────────────────────────────────────────────────

export interface AdminDisputeDataSource {
  list(params: DisputeQueryParams): Promise<PaginatedResult<AdminDispute>>
  getById(id: string): Promise<AdminDispute>
  updateStatus(id: string, payload: UpdateDisputeStatusPayload): Promise<AdminDispute>
  resolve(id: string, payload: ResolveDisputePayload): Promise<AdminDispute>
  addMessage(id: string, payload: AddDisputeMessagePayload): Promise<AdminDispute>
  assignToAdmin(id: string, adminId: string, adminName: string): Promise<AdminDispute>
  delete(id: string): Promise<void>
}
