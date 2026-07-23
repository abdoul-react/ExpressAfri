import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common'
import { eq, and, sql } from 'drizzle-orm'
import { DRIZZLE, type DrizzleDB } from '../../database/database.module'
import { wishlistItems } from '../../database/schema/wishlist'

@Injectable()
export class WishlistService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async list(customerId: string) {
    return this.db.select().from(wishlistItems).where(eq(wishlistItems.customerId, customerId)).orderBy(wishlistItems.createdAt)
  }

  async add(customerId: string, productId: string) {
    const [existing] = await this.db.select().from(wishlistItems).where(and(eq(wishlistItems.customerId, customerId), eq(wishlistItems.productId, productId))).limit(1)
    if (existing) throw new ConflictException('Produit déjà dans la wishlist')
    const [item] = await this.db.insert(wishlistItems).values({ customerId, productId }).returning()
    return item
  }

  async remove(customerId: string, productId: string) {
    const [item] = await this.db.delete(wishlistItems).where(and(eq(wishlistItems.customerId, customerId), eq(wishlistItems.productId, productId))).returning()
    if (!item) throw new NotFoundException('Produit introuvable dans la wishlist')
    return item
  }

  async has(customerId: string, productId: string) {
    const [item] = await this.db.select({ id: wishlistItems.id }).from(wishlistItems).where(and(eq(wishlistItems.customerId, customerId), eq(wishlistItems.productId, productId))).limit(1)
    return { has: !!item }
  }
}
