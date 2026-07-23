import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { eq, like, or, and, sql } from 'drizzle-orm'
import { DRIZZLE, type DrizzleDB } from '../../database/database.module'
import { contentBlocks } from '../../database/schema/content'

@Injectable()
export class CampaignsService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async list(params: { page?: number; limit?: number; search?: string }) {
    const page = params.page ?? 1; const limit = params.limit ?? 10; const offset = (page - 1) * limit
    const conds: any[] = [eq(contentBlocks.groupName, 'campaign')]
    if (params.search) conds.push(or(like(contentBlocks.label, `%${params.search}%`), like(contentBlocks.key, `%${params.search}%`)) as any)
    const where = conds.length > 1 ? and(...conds) : conds[0]
    const [data, [{ count }]] = await Promise.all([
      this.db.select().from(contentBlocks).where(where).limit(limit).offset(offset).orderBy(contentBlocks.createdAt),
      this.db.select({ count: sql<number>`count(*)` }).from(contentBlocks).where(where),
    ])
    return { data, total: Number(count), page }
  }

  async getById(id: string) {
    const [block] = await this.db.select().from(contentBlocks).where(and(eq(contentBlocks.id, id), eq(contentBlocks.groupName, 'campaign'))).limit(1)
    if (!block) throw new NotFoundException('Campagne introuvable')
    return block
  }

  async create(data: any) {
    const [block] = await this.db.insert(contentBlocks).values({ ...data, groupName: 'campaign' }).returning()
    return block
  }

  async update(id: string, data: any) {
    const [block] = await this.db.update(contentBlocks).set({ ...data, updatedAt: new Date() }).where(eq(contentBlocks.id, id)).returning()
    if (!block) throw new NotFoundException('Campagne introuvable')
    return block
  }

  async delete(id: string) { await this.db.delete(contentBlocks).where(eq(contentBlocks.id, id)) }
}
