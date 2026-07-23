import type { ProductDTO, ProductListItemDTO, ProductVariantDTO, ProductAttribute } from '@/types/dto'

export interface ProductQueryParams {
  page?: number
  limit?: number
  search?: string
  categoryId?: string
  status?: 'active' | 'inactive' | 'draft' | 'pending' | 'rejected'
  storeId?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export type { ProductAttribute, ProductVariantDTO as ProductVariant }

export interface CreateProductInput {
  name: string
  description: string
  price: number
  compareAtPrice?: number
  categoryId: string
  images: string[]
  stock: number
  sku: string
  isActive: boolean
  tags?: string[]
  variants?: Omit<ProductVariantDTO, 'id'>[]
}

export interface UpdateProductInput extends Partial<CreateProductInput> {}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ModerationResult {
  id: string
  status: string
  archived?: boolean
}

export interface AdminProductDataSource {
  list(params: ProductQueryParams): Promise<PaginatedResult<ProductListItemDTO>>
  getById(id: string): Promise<ProductDTO>
  create(data: CreateProductInput): Promise<ProductDTO>
  update(id: string, data: UpdateProductInput): Promise<ProductDTO>
  delete(id: string): Promise<void>
  export(params: ProductQueryParams): Promise<Blob>
  moderateApprove(id: string): Promise<ModerationResult>
  moderateReject(id: string, reason?: string): Promise<ModerationResult>
}
