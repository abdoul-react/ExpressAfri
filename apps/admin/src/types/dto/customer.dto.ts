export interface CustomerDTO {
  id: string
  name: string
  email: string
  phone?: string
  avatar?: string
  firstName?: string
  lastName?: string
  country?: string
  city?: string
  isBanned: boolean
  totalOrders: number
  totalSpent: number
  lastOrderAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface CustomerUpdateInput {
  name?: string
  firstName?: string
  lastName?: string
  phone?: string
  avatar?: string
  isBanned?: boolean
}
