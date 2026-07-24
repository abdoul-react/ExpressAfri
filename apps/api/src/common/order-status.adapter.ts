export const ADMIN_TO_MOBILE_STATUS: Record<string, string> = {
  pending: 'toShip',
  confirmed: 'toShip',
  processing: 'toShip',
  shipped: 'shipped',
  partially_shipped: 'shipped',
  delivered: 'toReview',
  cancelled: 'cancelled',
  refunded: 'refunded',
}

export const MOBILE_TO_ADMIN_STATUSES: Record<string, string[]> = {
  toShip: ['pending', 'confirmed', 'processing'],
  shipped: ['shipped', 'partially_shipped'],
  toReview: ['delivered'],
  returns: ['return_requested', 'return_approved'],
  cancelled: ['cancelled'],
  refunded: ['refunded'],
}

export function toMobileStatus(adminStatus: string): string {
  return ADMIN_TO_MOBILE_STATUS[adminStatus] ?? adminStatus
}
