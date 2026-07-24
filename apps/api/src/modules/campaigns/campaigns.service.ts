import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, like, and, sql, desc } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { campaigns } from '../../database/schema/campaigns';

@Injectable()
export class CampaignsService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async list(params: { page?: number; limit?: number; search?: string; status?: string; storeId?: string }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const offset = (page - 1) * limit;
    const conditions: any[] = [];
    if (params.search) conditions.push(like(campaigns.name, `%${params.search}%`));
    if (params.status) conditions.push(eq(campaigns.status, params.status));
    if (params.storeId) conditions.push(eq(campaigns.storeId, params.storeId));
    const where = conditions.length ? and(...conditions) : undefined;
    const [data, [{ count }]] = await Promise.all([
      this.db
        .select()
        .from(campaigns)
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(campaigns.createdAt)),
      this.db.select({ count: sql<number>`count(*)` }).from(campaigns).where(where),
    ]);
    return { data, total: Number(count), page };
  }

  async getById(id: string) {
    const [campaign] = await this.db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, id))
      .limit(1);
    if (!campaign) throw new NotFoundException('Campagne introuvable');
    return campaign;
  }

  async create(data: any) {
    const [campaign] = await this.db.insert(campaigns).values(data).returning();
    return campaign;
  }

  async update(id: string, data: any) {
    const [campaign] = await this.db
      .update(campaigns)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(campaigns.id, id))
      .returning();
    if (!campaign) throw new NotFoundException('Campagne introuvable');
    return campaign;
  }

  async delete(id: string) {
    const [c] = await this.db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
    if (!c) throw new NotFoundException('Campagne introuvable');
    await this.db.delete(campaigns).where(eq(campaigns.id, id));
    return { deleted: true };
  }

  async launch(id: string) {
    const [c] = await this.db.update(campaigns)
      .set({ status: 'active', isActive: true, updatedAt: new Date() })
      .where(eq(campaigns.id, id))
      .returning();
    if (!c) throw new NotFoundException('Campagne introuvable');
    return c;
  }

  async pause(id: string) {
    const [c] = await this.db.update(campaigns)
      .set({ status: 'paused', updatedAt: new Date() })
      .where(eq(campaigns.id, id))
      .returning();
    if (!c) throw new NotFoundException('Campagne introuvable');
    return c;
  }

  async getSummary() {
    const [
      [{ total }],
      [{ active }],
      [{ draft }],
      [{ ended }],
      [{ totalBudget }],
      [{ totalSpent }],
    ] = await Promise.all([
      this.db.select({ total: sql<number>`count(*)` }).from(campaigns),
      this.db.select({ active: sql<number>`count(*)` }).from(campaigns).where(eq(campaigns.status, 'active')),
      this.db.select({ draft: sql<number>`count(*)` }).from(campaigns).where(eq(campaigns.status, 'draft')),
      this.db.select({ ended: sql<number>`count(*)` }).from(campaigns).where(eq(campaigns.status, 'ended')),
      this.db.select({ totalBudget: sql<number>`coalesce(sum(budget), 0)` }).from(campaigns),
      this.db.select({ totalSpent: sql<number>`coalesce(sum(spent), 0)` }).from(campaigns),
    ]);
    return {
      total: Number(total),
      active: Number(active),
      draft: Number(draft),
      ended: Number(ended),
      totalBudget: Number(totalBudget),
      totalSpent: Number(totalSpent),
    };
  }
}
