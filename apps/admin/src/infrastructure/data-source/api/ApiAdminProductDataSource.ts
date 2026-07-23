import type { AdminProductDataSource, ProductQueryParams, CreateProductInput, UpdateProductInput, PaginatedResult, ModerationResult } from '../AdminProductDataSource'
import type { ProductDTO, ProductListItemDTO, ProductVariantDTO, ProductAttribute } from '@/types/dto'
import api from '@/lib/api'

function toVariantPayload(v: Omit<ProductVariantDTO, 'id'>, i: number) {
  const attributes = v.attributes ?? []
  const label =
    attributes.map((a) => a.value).filter(Boolean).join(' / ') || v.sku || `Variante ${i + 1}`
  return {
    sku: v.sku,
    label,
    attributes,
    price: v.price ? String(v.price) : undefined,
    stock: v.stock ?? 0,
    imageUrl: v.image ?? null,
    sortOrder: i,
    isActive: v.isActive ?? true,
  }
}

function toProduct(raw: Record<string, unknown>): ProductDTO {
  const rawVariants = (raw.variants ?? []) as Record<string, unknown>[]
  const realVariants = rawVariants.filter(
    (v) => Array.isArray(v.attributes) && (v.attributes as unknown[]).length > 0,
  )
  const variants: ProductVariantDTO[] = realVariants.map((v): ProductVariantDTO => ({
    id: v.id as string,
    sku: v.sku as string,
    price: Number(v.price ?? raw.price),
    compareAtPrice: undefined,
    stock: (v.stock ?? 0) as number,
    attributes: (v.attributes ?? []) as ProductAttribute[],
    image: v.imageUrl ? (v.imageUrl as string) : undefined,
    isActive: (v.isActive ?? true) as boolean,
  }))

  const images = ((raw.images ?? []) as (string | { url: string })[]).map((i) => typeof i === 'string' ? i : i.url)
  const totalStock =
    (raw.totalStock as number) ?? rawVariants.reduce((s, v) => s + ((v.stock ?? 0) as number), 0)
  const defaultSku =
    (raw.sku as string) ??
    rawVariants.find((v) => !(Array.isArray(v.attributes) && (v.attributes as unknown[]).length))?.sku as string ??
    (rawVariants[0]?.sku as string) ??
    ''

  return {
    id: raw.id as string,
    name: raw.name as string,
    description: (raw.description ?? '') as string,
    price: Number(raw.price),
    compareAtPrice: raw.comparePrice ? Number(raw.comparePrice) : undefined,
    categoryId: (raw.categoryId ?? '') as string,
    stock: totalStock,
    totalStock,
    sku: variants.length ? variants[0].sku : defaultSku,
    isActive: raw.status === 'active',
    imageUrl: images[0] ?? '',
    images,
    variants,
    moderationStatus: raw.moderationStatus as string | undefined,
    rejectionReason: raw.rejectionReason as string | undefined,
    storeId: raw.storeId as string | undefined,
    status: raw.status as string | undefined,
    tags: raw.tags as string[] | undefined,
    isFeatured: raw.isFeatured as boolean | undefined,
    createdAt: raw.createdAt as string | undefined,
    updatedAt: raw.updatedAt as string | undefined,
  }
}

function toProductListItem(raw: Record<string, unknown>): ProductListItemDTO {
  return {
    id: raw.id as string,
    name: raw.name as string,
    price: Number(raw.price),
    compareAtPrice: raw.comparePrice ? Number(raw.comparePrice) : undefined,
    stock: Number(raw.totalStock ?? raw.stock ?? 0),
    sku: (raw.sku ?? '') as string,
    imageUrl: (((raw.images as unknown[]) ?? [])[0] as string) ?? ((raw.imageUrl as string) ?? ''),
    status: raw.status as string | undefined,
    moderationStatus: raw.moderationStatus as string | undefined,
    categoryId: (raw.categoryId ?? '') as string,
    tags: raw.tags as string[] | undefined,
    isFeatured: raw.isFeatured as boolean | undefined,
    createdAt: raw.createdAt as string | undefined,
  }
}

export class ApiAdminProductDataSource implements AdminProductDataSource {
  async list(params?: ProductQueryParams): Promise<PaginatedResult<ProductListItemDTO>> {
    const { data } = await api.get('/products', { params })
    return {
      ...data,
      data: (data.data as Record<string, unknown>[]).map(toProductListItem),
    }
  }

  async getById(id: string): Promise<ProductDTO> {
    const { data } = await api.get(`/products/${id}`)
    return toProduct(data as Record<string, unknown>)
  }

  async create(input: CreateProductInput): Promise<ProductDTO> {
    const body: Record<string, unknown> = {
      name: input.name,
      description: input.description,
      price: String(input.price),
      comparePrice: input.compareAtPrice ? String(input.compareAtPrice) : undefined,
      categoryId: input.categoryId,
      status: input.isActive ? 'active' : 'draft',
      sku: input.sku,
      stock: input.stock,
      tags: input.tags ?? [],
    }
    if (input.images?.length) {
      body.images = input.images.map((url, i) => ({ url, alt: `${input.name} - ${i + 1}`, sortOrder: i }))
    }
    if (input.variants?.length) {
      body.variants = input.variants.map((v, i) => toVariantPayload(v, i))
    }
    const { data } = await api.post('/products', body)
    return toProduct(data as Record<string, unknown>)
  }

  async update(id: string, input: UpdateProductInput): Promise<ProductDTO> {
    const body: Record<string, unknown> = {
      name: input.name,
      description: input.description,
      price: input.price ? String(input.price) : undefined,
      comparePrice: input.compareAtPrice ? String(input.compareAtPrice) : undefined,
      categoryId: input.categoryId,
      status: input.isActive !== undefined ? (input.isActive ? 'active' : 'draft') : undefined,
      ...(input.sku !== undefined ? { sku: input.sku } : {}),
      ...(input.stock !== undefined ? { stock: input.stock } : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
    }
    if (input.images !== undefined) {
      body.images = input.images.map((url, i) => ({ url, alt: `${input.name ?? ''} - ${i + 1}`, sortOrder: i }))
    }
    if (input.variants) {
      body.variants = input.variants.map((v, i) => toVariantPayload(v, i))
    }
    const { data } = await api.put(`/products/${id}`, body)
    return toProduct(data as Record<string, unknown>)
  }

  async delete(id: string): Promise<void> {
    await api.delete(`/products/${id}`)
  }

  async export(_params: ProductQueryParams): Promise<Blob> {
    throw new Error('Export not yet available via API')
  }

  async moderateApprove(id: string): Promise<ModerationResult> {
    const { data } = await api.put(`/products/${id}/moderate`, { status: 'approved' })
    return data as ModerationResult
  }

  async moderateReject(id: string, reason?: string): Promise<ModerationResult> {
    const { data } = await api.put(`/products/${id}/moderate`, { status: 'rejected', reason })
    return data as ModerationResult
  }
}
