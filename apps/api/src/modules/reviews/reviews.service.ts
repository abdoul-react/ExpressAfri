import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { eq, and, sql } from 'drizzle-orm'
import { DRIZZLE, type DrizzleDB } from '../../database/database.module'
import { productReviews } from '../../database/schema/reviews'

@Injectable()
export class ReviewsService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async list(params: { page?: number; limit?: number; productId?: string; status?: string }) {
    const page = params.page ?? 1; const limit = params.limit ?? 10; const offset = (page - 1) * limit
    const conditions = []
    if (params.productId) conditions.push(eq(productReviews.productId, params.productId))
    if (params.status) conditions.push(eq(productReviews.isActive, params.status === 'active'))
    const where = conditions.length ? and(...conditions) : undefined
    const [data, [{ count }]] = await Promise.all([
      this.db.select().from(productReviews).where(where).limit(limit).offset(offset).orderBy(productReviews.createdAt),
      this.db.select({ count: sql<number>`count(*)` }).from(productReviews).where(where),
    ])
    return { data, total: Number(count), page }
  }

  async moderate(id: string, isActive: boolean) {
    const [review] = await this.db.update(productReviews).set({ isActive, updatedAt: new Date() }).where(eq(productReviews.id, id)).returning()
    if (!review) throw new NotFoundException('Avis introuvable'); return review
  }
}
