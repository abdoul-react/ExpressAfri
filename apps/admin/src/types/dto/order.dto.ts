export interface OrderItemDTO {
  id: string
  productId: string
  title: string
  image?: string
  quantity: number
  unitPrice: number
  totalPrice: number
  variantLabel?: string
}

export interface OrderDTO {
  id: string
  orderNumber: string
  customerId: string
  customerName: string
  customerEmail?: string
  customerPhone?: string
  items: OrderItemDTO[]
  subtotal: number
  shippingCost: number
  taxAmount: number
  discountAmount: number
  total: number
  status: string
  currency: string
  paymentMethod?: string
  paymentStatus?: string
  shippingAddress?: Record<string, unknown>
  trackingNumber?: string
  notes?: string
  createdAt: string
  updatedAt: string
  statusLog?: Array<{
    status: string
    timestamp: string
    note?: string
    updatedBy?: string
  }>
}

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
