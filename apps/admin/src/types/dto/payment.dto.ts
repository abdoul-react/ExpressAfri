export interface PaymentDTO {
  id: string
  orderId: string
  orderNumber?: string
  amount: number
  fees?: number
  currency: string
  status: string
  method: string
  methodLabel?: string
  customerId: string
  customerName?: string
  customerEmail?: string
  refundedAmount?: number | null
  refundedAt?: string | null
  refundReason?: string | null
  failedAt?: string | null
  transactionId?: string
  paidAt?: string | null
  createdAt: string
  updatedAt: string
}
