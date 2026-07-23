import type { AdminProductDataSource, ProductQueryParams, CreateProductInput, UpdateProductInput, PaginatedResult, ModerationResult } from '../AdminProductDataSource'
import type { ProductDTO, ProductListItemDTO } from '@/types/dto'
import { MOCK_PRODUCTS } from './data/mockProducts'
import { MOCK_CATEGORIES } from './data/mockCategories'

export class MockAdminProductDataSource implements AdminProductDataSource {
  private products: ProductDTO[] = [...MOCK_PRODUCTS] as unknown as ProductDTO[]
  private delay(ms = 400): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  async list(params: ProductQueryParams): Promise<PaginatedResult<ProductListItemDTO>> {
    await this.delay()
    const { page = 1, limit = 10, search, categoryId, status, storeId, sortBy, sortOrder } = params

    let filtered = [...this.products]

    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
    }
    if (categoryId) {
      filtered = filtered.filter((p) => p.categoryId === categoryId)
    }
    if (storeId) {
      filtered = filtered.filter((p) => p.storeId === storeId)
    }
    if (status === 'active') filtered = filtered.filter((p) => p.moderationStatus === 'approved' && p.isActive)
    if (status === 'inactive') filtered = filtered.filter((p) => p.moderationStatus !== 'rejected' && !p.isActive)
    if (status === 'pending') filtered = filtered.filter((p) => p.moderationStatus === 'pending')
    if (status === 'rejected') filtered = filtered.filter((p) => p.moderationStatus === 'rejected')

    if (sortBy) {
      filtered.sort((a, b) => {
        const aVal = a[sortBy as keyof ProductDTO]
        const bVal = b[sortBy as keyof ProductDTO]
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortOrder === 'desc' ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal)
        }
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortOrder === 'desc' ? bVal - aVal : aVal - bVal
        }
        return 0
      })
    }

    const total = filtered.length
    const totalPages = Math.ceil(total / limit)
    const start = (page - 1) * limit
    const data: ProductListItemDTO[] = filtered.slice(start, start + limit).map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      stock: p.stock,
      sku: p.sku,
      imageUrl: p.imageUrl,
      status: p.status,
      moderationStatus: p.moderationStatus,
      categoryId: p.categoryId,
      tags: p.tags,
      isFeatured: p.isFeatured,
      createdAt: p.createdAt,
    }))

    return { data, total, page, limit, totalPages }
  }

  async getById(id: string): Promise<ProductDTO> {
    await this.delay()
    const product = this.products.find((p) => p.id === id)
    if (!product) throw new Error('Produit introuvable')
    return product
  }

  async create(data: CreateProductInput): Promise<ProductDTO> {
    await this.delay()
    const nextId = Math.max(0, ...this.products.map((product) => Number(product.id.replace('prod_', '')) || 0)) + 1
    const category = MOCK_CATEGORIES.find((item) => item.id === data.categoryId)?.name ?? ''
    const product: ProductDTO = {
      id: `prod_${String(nextId).padStart(4, '0')}`,
      name: data.name,
      description: data.description,
      price: data.price,
      compareAtPrice: data.compareAtPrice,
      categoryId: data.categoryId,
      stock: data.stock,
      totalStock: data.stock,
      sku: data.sku,
      isActive: data.isActive,
      imageUrl: data.images[0] ?? '',
      images: data.images,
      variants: data.variants?.map((v, vi) => ({
        id: `var_${nextId}_${vi}`,
        sku: v.sku,
        price: v.price,
        stock: v.stock,
        attributes: v.attributes,
        image: v.image,
        isActive: v.isActive,
      })) ?? [],
      tags: data.tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    this.products.push(product)
    return product
  }

  async update(id: string, data: UpdateProductInput): Promise<ProductDTO> {
    await this.delay()
    const index = this.products.findIndex((p) => p.id === id)
    if (index === -1) throw new Error('Produit introuvable')
    const existing = this.products[index]
    const updated: ProductDTO = {
      ...existing,
      ...data,
      imageUrl: data.images?.[0] ?? existing.imageUrl,
      images: data.images ?? existing.images,
      variants: data.variants
        ? data.variants.map((v, vi) => ({
            id: existing.variants[vi]?.id ?? `var_${vi}_${Date.now()}`,
            sku: v.sku,
            price: v.price,
            stock: v.stock,
            attributes: v.attributes,
            image: v.image,
            isActive: v.isActive,
          }))
        : existing.variants,
      updatedAt: new Date().toISOString(),
    }
    this.products[index] = updated
    return this.products[index]
  }

  async delete(id: string): Promise<void> {
    await this.delay()
    const index = this.products.findIndex((p) => p.id === id)
    if (index === -1) throw new Error('Produit introuvable')
    this.products.splice(index, 1)
  }

  async moderateApprove(id: string): Promise<ModerationResult> {
    await this.delay(300)
    const index = this.products.findIndex((p) => p.id === id)
    if (index === -1) throw new Error('Produit introuvable')
    this.products[index] = {
      ...this.products[index],
      moderationStatus: 'approved',
      isActive: true,
      updatedAt: new Date().toISOString(),
    }
    return { id, status: 'approved' }
  }

  async moderateReject(id: string, reason?: string): Promise<ModerationResult> {
    await this.delay(300)
    const index = this.products.findIndex((p) => p.id === id)
    if (index === -1) throw new Error('Produit introuvable')
    this.products[index] = {
      ...this.products[index],
      moderationStatus: 'rejected',
      isActive: false,
      rejectionReason: reason ?? 'Produit non conforme aux critères de la plateforme',
      updatedAt: new Date().toISOString(),
    }
    return { id, status: 'rejected' }
  }

  async export(_params: ProductQueryParams): Promise<Blob> {
    await this.delay()
    return new Blob(['id,name,price,stock\nprod_001,Test,15000,10'], { type: 'text/csv' })
  }
}
