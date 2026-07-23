export class CreateOrderDto {
  items: {
    productId: string
    variantId?: string
    quantity: number
  }[]
  shippingAddressId: string
  paymentMethod: string
  couponCode?: string
  notes?: string
  idempotencyKey?: string
}
