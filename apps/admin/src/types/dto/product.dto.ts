export interface ProductAttribute {
  name: string
  value: string
}

export interface ProductVariantDTO {
  id: string
  sku: string
  price: number
  compareAtPrice?: number
  stock: number
  attributes: ProductAttribute[]
  image?: string
  isActive: boolean
}

export interface ProductDTO {
  id: string
  name: string
  description: string
  price: number
  compareAtPrice?: number
  categoryId: string
  stock: number
  totalStock: number
  sku: string
  isActive: boolean
  imageUrl: string
  images: string[]
  variants: ProductVariantDTO[]
  moderationStatus?: string
  rejectionReason?: string
  storeId?: string
  status?: string
  tags?: string[]
  isFeatured?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface ProductListItemDTO {
  id: string
  name: string
  price: number
  compareAtPrice?: number
  stock: number
  sku: string
  imageUrl: string
  status?: string
  moderationStatus?: string
  categoryId: string
  tags?: string[]
  isFeatured?: boolean
  createdAt?: string
}
