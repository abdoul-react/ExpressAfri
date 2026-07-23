// Registre centralisé des statuts métier : libellés français + variante visuelle.
// Source unique de vérité — ne pas redéfinir de map de statuts dans les pages.

export type StatusVariant = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple'

export interface StatusMeta {
  label: string
  variant: StatusVariant
}

export type StatusMap = Record<string, StatusMeta>

/** Retourne la méta d'un statut, avec repli neutre sur la clé brute. */
export function statusMeta(map: StatusMap, key: string | undefined | null): StatusMeta {
  if (!key) return { label: '—', variant: 'neutral' }
  return map[key] ?? { label: key, variant: 'neutral' }
}

// ─── Commandes ────────────────────────────────────────────────────────────────
export const ORDER_STATUS: StatusMap = {
  pending: { label: 'En attente', variant: 'warning' },
  confirmed: { label: 'Confirmée', variant: 'info' },
  shipped: { label: 'Expédiée', variant: 'purple' },
  delivered: { label: 'Livrée', variant: 'success' },
  cancelled: { label: 'Annulée', variant: 'danger' },
  refunded: { label: 'Remboursée', variant: 'neutral' },
}

// ─── Paiements ────────────────────────────────────────────────────────────────
export const PAYMENT_STATUS: StatusMap = {
  paid: { label: 'Payé', variant: 'success' },
  pending: { label: 'En attente', variant: 'warning' },
  failed: { label: 'Échoué', variant: 'danger' },
  refunded: { label: 'Remboursé', variant: 'neutral' },
}

// ─── Versements vendeurs ──────────────────────────────────────────────────────
export const PAYOUT_STATUS: StatusMap = {
  pending: { label: 'En attente', variant: 'warning' },
  processing: { label: 'En cours', variant: 'info' },
  paid: { label: 'Payé', variant: 'success' },
  cancelled: { label: 'Annulé', variant: 'neutral' },
}

// ─── Retours ──────────────────────────────────────────────────────────────────
export const RETURN_STATUS: StatusMap = {
  pending: { label: 'En attente', variant: 'warning' },
  approved: { label: 'Approuvé', variant: 'info' },
  received: { label: 'Reçu', variant: 'purple' },
  refunded: { label: 'Remboursé', variant: 'success' },
  rejected: { label: 'Rejeté', variant: 'danger' },
  cancelled: { label: 'Annulé', variant: 'neutral' },
}

// ─── Litiges ──────────────────────────────────────────────────────────────────
export const DISPUTE_STATUS: StatusMap = {
  open: { label: 'Ouvert', variant: 'danger' },
  in_review: { label: 'En examen', variant: 'warning' },
  in_mediation: { label: 'En médiation', variant: 'info' },
  resolved: { label: 'Résolu', variant: 'success' },
  rejected: { label: 'Rejeté', variant: 'neutral' },
  closed: { label: 'Fermé', variant: 'neutral' },
}

// ─── Livraisons (assignations) ────────────────────────────────────────────────
export const DELIVERY_STATUS: StatusMap = {
  assigned: { label: 'Assignée', variant: 'warning' },
  'picked-up': { label: 'Récupérée', variant: 'info' },
  'in-transit': { label: 'En transit', variant: 'purple' },
  delivered: { label: 'Livrée', variant: 'success' },
  failed: { label: 'Échouée', variant: 'danger' },
}

// ─── Boutiques ────────────────────────────────────────────────────────────────
export const STORE_STATUS: StatusMap = {
  pending: { label: 'En attente', variant: 'warning' },
  approved: { label: 'Approuvée', variant: 'success' },
  rejected: { label: 'Rejetée', variant: 'danger' },
  suspended: { label: 'Suspendue', variant: 'neutral' },
}

export const KYC_STATUS: StatusMap = {
  not_submitted: { label: 'Non soumis', variant: 'neutral' },
  pending: { label: 'En attente', variant: 'warning' },
  approved: { label: 'Approuvé', variant: 'success' },
  rejected: { label: 'Rejeté', variant: 'danger' },
}

export const SANCTION_TYPE: StatusMap = {
  warning: { label: 'Avertissement', variant: 'warning' },
  suspension: { label: 'Suspension', variant: 'danger' },
  rejection: { label: 'Rejet', variant: 'danger' },
  reactivation: { label: 'Réactivation', variant: 'success' },
}

// ─── Produits ─────────────────────────────────────────────────────────────────
export const PRODUCT_STATUS: StatusMap = {
  active: { label: 'Actif', variant: 'success' },
  inactive: { label: 'Inactif', variant: 'neutral' },
  archived: { label: 'Archivé', variant: 'warning' },
}

// ─── Modération produits ──────────────────────────────────────────────────────
export const MODERATION_STATUS: StatusMap = {
  pending: { label: 'En attente', variant: 'warning' },
  approved: { label: 'Approuvé', variant: 'success' },
  rejected: { label: 'Rejeté', variant: 'danger' },
}

// ─── Coupons & campagnes ──────────────────────────────────────────────────────
export const COUPON_STATUS: StatusMap = {
  active: { label: 'Actif', variant: 'success' },
  scheduled: { label: 'Programmé', variant: 'info' },
  expired: { label: 'Expiré', variant: 'neutral' },
  inactive: { label: 'Inactif', variant: 'danger' },
}

export const CAMPAIGN_STATUS: StatusMap = {
  active: { label: 'Active', variant: 'success' },
  scheduled: { label: 'Programmée', variant: 'info' },
  expired: { label: 'Expirée', variant: 'neutral' },
  inactive: { label: 'Inactive', variant: 'danger' },
}

// ─── Support (tickets/messages) ───────────────────────────────────────────────
export const TICKET_STATUS: StatusMap = {
  open: { label: 'Ouvert', variant: 'info' },
  in_progress: { label: 'En cours', variant: 'warning' },
  resolved: { label: 'Résolu', variant: 'success' },
  closed: { label: 'Fermé', variant: 'neutral' },
}

// ─── Signalements ─────────────────────────────────────────────────────────────
export const REPORT_STATUS: StatusMap = {
  pending: { label: 'En attente', variant: 'warning' },
  investigating: { label: 'En cours', variant: 'info' },
  resolved: { label: 'Résolu', variant: 'success' },
  dismissed: { label: 'Rejeté', variant: 'neutral' },
}

export const REPORT_TYPE: StatusMap = {
  product: { label: 'Produit', variant: 'danger' },
  seller: { label: 'Vendeur', variant: 'primary' },
  user: { label: 'Utilisateur', variant: 'purple' },
  other: { label: 'Autre', variant: 'neutral' },
}

// ─── Reçus ────────────────────────────────────────────────────────────────────
export const RECEIPT_STATUS: StatusMap = {
  sent: { label: 'Envoyé', variant: 'success' },
  unsent: { label: 'Non envoyé', variant: 'neutral' },
  failed: { label: 'Échec', variant: 'danger' },
}

export const RECEIPT_TYPE: StatusMap = {
  email: { label: 'Email', variant: 'info' },
  sms: { label: 'SMS', variant: 'purple' },
  print: { label: 'Impression', variant: 'warning' },
}

// ─── Notifications ────────────────────────────────────────────────────────────
export const NOTIFICATION_STATUS: StatusMap = {
  sent: { label: 'Envoyé', variant: 'neutral' },
  delivered: { label: 'Délivré', variant: 'success' },
  opened: { label: 'Ouvert', variant: 'info' },
  failed: { label: 'Échec', variant: 'danger' },
}

// ─── Affiliation (commissions) ────────────────────────────────────────────────
export const COMMISSION_STATUS: StatusMap = {
  pending: { label: 'En attente', variant: 'warning' },
  approved: { label: 'Approuvé', variant: 'info' },
  paid: { label: 'Payé', variant: 'success' },
  reversed: { label: 'Reversé', variant: 'danger' },
}
