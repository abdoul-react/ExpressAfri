import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common'
import { eq, like, or, and, sql, inArray } from 'drizzle-orm'
import { DRIZZLE, type DrizzleDB } from '../../database/database.module'
import { products, productVariants, productImages, categories } from '../../database/schema/products'
import { stores } from '../../database/schema/stores'
import { orderItems } from '../../database/schema/orders'
import { productReviews } from '../../database/schema/reviews'
import { wishlistItems } from '../../database/schema/wishlist'
import type { CreateProductDto, UpdateProductDto, ProductVariantDto } from './products.dto'

/**
 * Normalise une variante reçue de l'admin vers une ligne product_variants.
 * L'admin envoie `attributes: [{name, value}]` (ex. Taille: L) mais pas de
 * `label` : on le compose ici (colonne NOT NULL), et on nettoie les champs qui
 * n'appartiennent pas à la table (id temporaire, compareAtPrice, image).
 */
function toVariantRow(v: any, productId: string, storeId: string, idx: number) {
  const attributes = Array.isArray(v.attributes) ? v.attributes : []
  const label =
    v.label ||
    attributes.map((a: any) => a.value).filter(Boolean).join(' / ') ||
    v.sku ||
    `Variante ${idx + 1}`
  return {
    productId,
    storeId,
    sku: v.sku || `${productId.slice(0, 6)}-${idx + 1}`,
    label,
    attributes,
    price: v.price != null ? String(v.price) : null,
    stock: Number(v.stock) || 0,
    imageUrl: v.image ?? v.imageUrl ?? null,
    sortOrder: idx,
    isActive: v.isActive ?? true,
  }
}

@Injectable()
export class ProductsService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async list(params: { page?: number; limit?: number; search?: string; storeId?: string; categoryId?: string; status?: string; moderationStatus?: string }) {
    const page = params.page ?? 1
    const limit = params.limit ?? 10
    const offset = (page - 1) * limit

    const conditions = []
    if (params.search) conditions.push(or(like(products.name, `%${params.search}%`), like(products.description, `%${params.search}%`)))
    if (params.storeId) conditions.push(eq(products.storeId, params.storeId))
    if (params.categoryId) conditions.push(eq(products.categoryId, params.categoryId))
    if (params.status) conditions.push(eq(products.status, params.status))
    if (params.moderationStatus) conditions.push(eq(products.moderationStatus, params.moderationStatus))

    const where = conditions.length ? and(...conditions) : undefined
    const [data, [{ count }]] = await Promise.all([
      this.db.select().from(products).where(where).limit(limit).offset(offset).orderBy(products.createdAt),
      this.db.select({ count: sql<number>`count(*)` }).from(products).where(where),
    ])

    // Récupérer la première image de chaque produit
    const productIds = data.map((p) => p.id)
    const allImages = productIds.length
      ? await this.db.select().from(productImages)
          .where(inArray(productImages.productId, productIds))
          .orderBy(productImages.sortOrder)
      : []
    const imagesByProduct = new Map<string, string[]>()
    for (const img of allImages) {
      const list = imagesByProduct.get(img.productId) ?? []
      list.push(img.url)
      imagesByProduct.set(img.productId, list)
    }

    // Stock total = somme des stocks de toutes les variantes actives
    const allVariants = productIds.length
      ? await this.db.select({ productId: productVariants.productId, stock: productVariants.stock })
          .from(productVariants)
          .where(and(inArray(productVariants.productId, productIds), eq(productVariants.isActive, true)))
      : []
    const stockByProduct = new Map<string, number>()
    for (const v of allVariants) {
      stockByProduct.set(v.productId, (stockByProduct.get(v.productId) ?? 0) + (v.stock ?? 0))
    }

    const dataWithImages = data.map((p) => ({
      ...p,
      images: imagesByProduct.get(p.id) ?? [],
      totalStock: stockByProduct.get(p.id) ?? 0,
      variants: [],
    }))
    return { data: dataWithImages, total: Number(count), page }
  }

  async getById(id: string) {
    const [product] = await this.db.select().from(products).where(eq(products.id, id)).limit(1)
    if (!product) throw new NotFoundException('Produit introuvable')
    const variants = await this.db.select().from(productVariants).where(eq(productVariants.productId, id)).orderBy(productVariants.sortOrder)
    const images = await this.db.select().from(productImages).where(eq(productImages.productId, id)).orderBy(productImages.sortOrder)

    // Le SKU et le stock d'un produit SIMPLE vivent sur sa variante par défaut
    // (celle sans attributs). On les remonte au niveau produit pour que le
    // formulaire admin les affiche/édite comme des champs simples.
    const defaultVariant = variants.find((v) => !(v.attributes as any[])?.length) ?? variants[0]
    const totalStock = variants
      .filter((v) => v.isActive)
      .reduce((sum, v) => sum + (v.stock ?? 0), 0)

    return {
      ...product,
      variants,
      images,
      totalStock,
      sku: defaultVariant?.sku ?? null,
      stock: totalStock,
    }
  }

  async create(data: CreateProductDto & { storeId?: string; slug?: string }) {
    const { variants, images, sku, stock, ...rest } = data
    const productData: Record<string, any> = { ...rest }

    // Auto‑generate slug from name
    if (!productData.slug) {
      productData.slug = (productData.name ?? 'produit')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        + '-' + Date.now().toString(36)
    }

    // Default storeId if missing
    if (!productData.storeId) {
      const [firstStore] = await this.db.select({ id: stores.id }).from(stores).limit(1)
      if (firstStore) {
        productData.storeId = firstStore.id
      } else {
        throw new BadRequestException('Aucune boutique trouvée. Créez d\'abord une boutique dans la section "Boutiques".')
      }
    }

    const [product] = await this.db.insert(products).values(productData as any).returning()
    if (variants?.length) {
      await this.db.insert(productVariants).values(
        variants.map((v: ProductVariantDto, idx: number) => toVariantRow(v, product.id, productData.storeId, idx))
      )
    } else {
      // Produit SIMPLE (sans déclinaisons) : la table products n'a ni colonne
      // sku ni stock — on les persiste via une variante par défaut invisible
      // (attributes = []), sinon ils seraient perdus à l'enregistrement.
      await this.db.insert(productVariants).values([
        toVariantRow(
          { sku: sku || undefined, label: productData.name, attributes: [], price: null, stock: Number(stock) || 0, isActive: true },
          product.id,
          productData.storeId,
          0,
        ),
      ])
    }
    if (images?.length) {
      await this.db.insert(productImages).values(images.map((img: any) => ({ ...img, productId: product.id })))
    }
    return this.getById(product.id)
  }

  async update(id: string, data: UpdateProductDto & { storeId?: string }) {
    const { variants, images, sku, stock, ...rest } = data
    const productData: Record<string, any> = { ...rest }
    const [product] = await this.db.update(products).set({ ...productData, updatedAt: new Date() }).where(eq(products.id, id)).returning()
    if (variants?.length) {
      // Le produit passe (ou reste) en mode « avec déclinaisons » : on remplace
      // l'ensemble des variantes par celles envoyées.
      await this.db.delete(productVariants).where(eq(productVariants.productId, id))
      await this.db.insert(productVariants).values(
        variants.map((v: ProductVariantDto, idx: number) => toVariantRow(v, id, product.storeId, idx))
      )
    } else if (variants !== undefined || sku !== undefined || stock !== undefined) {
      // Produit SIMPLE : sku/stock vivent sur la variante par défaut. On met à
      // jour celle qui existe (pour préserver son id et l'historique commandes),
      // sinon on la crée.
      const existing = await this.db.select().from(productVariants).where(eq(productVariants.productId, id))
      const defaultVariant = existing.find((v) => !(v.attributes as any[])?.length) ?? existing[0]
      const row = toVariantRow(
        { sku: sku || defaultVariant?.sku, label: productData.name ?? product.name, attributes: [], price: null, stock: Number(stock) || 0, isActive: true },
        id,
        product.storeId,
        0,
      )
      if (defaultVariant) {
        // Supprimer d'éventuelles variantes à attributs devenues obsolètes.
        await this.db.delete(productVariants).where(and(eq(productVariants.productId, id), sql`${productVariants.id} <> ${defaultVariant.id}`))
        await this.db.update(productVariants).set({ ...row, updatedAt: new Date() }).where(eq(productVariants.id, defaultVariant.id))
      } else {
        await this.db.delete(productVariants).where(eq(productVariants.productId, id))
        await this.db.insert(productVariants).values([row])
      }
    }
    if (images) {
      await this.db.delete(productImages).where(eq(productImages.productId, id))
      if (images.length) await this.db.insert(productImages).values(images.map((img: any) => ({ ...img, productId: id })))
    }
    return this.getById(id)
  }

  async moderate(id: string, status: 'approved' | 'rejected', reason?: string) {
    const [product] = await this.db.update(products).set({ moderationStatus: status, rejectionReason: reason, updatedAt: new Date() }).where(eq(products.id, id)).returning()
    return product
  }

  /**
   * Suppression intelligente :
   * - Le produit est référencé dans order_items, reviews ou wishlist_items
   *   → archivage soft (status = 'archived'), réponse { archived: true }
   * - Aucune référence → suppression définitive réelle
   *
   * Les endpoints mobiles filtrent status = 'active' : un produit archivé
   * disparaît de l'app sans casser les historiques.
   */
  async delete(id: string) {
    const [product] = await this.db.select({ id: products.id }).from(products).where(eq(products.id, id)).limit(1)
    if (!product) throw new NotFoundException('Produit introuvable')

    // Vérifier les références bloquantes
    const [orderRef] = await this.db.select({ id: orderItems.id }).from(orderItems).where(eq(orderItems.productId, id)).limit(1)
    const [reviewRef] = await this.db.select({ id: productReviews.id }).from(productReviews).where(eq(productReviews.productId, id)).limit(1)
    const [wishRef] = await this.db.select({ id: wishlistItems.id }).from(wishlistItems).where(eq(wishlistItems.productId, id)).limit(1)

    const hasReferences = !!(orderRef || reviewRef || wishRef)

    if (hasReferences) {
      // Archivage soft — le produit n'apparaît plus dans l'app mobile
      const [archived] = await this.db
        .update(products)
        .set({ status: 'archived', updatedAt: new Date() })
        .where(eq(products.id, id))
        .returning()
      return { ...archived, archived: true }
    }

    // Suppression définitive — nettoyer les dépendances sans cascade d'abord
    await this.db.delete(wishlistItems).where(eq(wishlistItems.productId, id))
    await this.db.delete(productVariants).where(eq(productVariants.productId, id))
    await this.db.delete(productImages).where(eq(productImages.productId, id))
    const [deleted] = await this.db.delete(products).where(eq(products.id, id)).returning()
    if (!deleted) throw new NotFoundException('Produit introuvable')
    return { ...deleted, archived: false }
  }
}
