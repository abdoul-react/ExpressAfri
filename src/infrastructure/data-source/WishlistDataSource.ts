export interface WishlistDataSource {
  list(customerId: string): Promise<string[]>
  add(customerId: string, productId: string): Promise<void>
  remove(customerId: string, productId: string): Promise<void>
  has(customerId: string, productId: string): Promise<boolean>
}
