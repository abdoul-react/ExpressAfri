import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, like, or, and, sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { payouts } from '../../database/schema/payouts';

@Injectable()
export class PayoutsService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async list(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    type?: string;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const offset = (page - 1) * limit;
    const conditions = [];
    if (params.search)
      conditions.push(
        or(
          like(payouts.recipientName, `%${params.search}%`),
          like(payouts.recipientEmail, `%${params.search}%`),
        ),
      );
    if (params.status) conditions.push(eq(payouts.status, params.status));
    if (params.type) conditions.push(eq(payouts.type, params.type));
    const where = conditions.length ? and(...conditions) : undefined;
    const [data, [{ count }]] = await Promise.all([
      this.db
        .select()
        .from(payouts)
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(payouts.createdAt),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(payouts)
        .where(where),
    ]);
    return { data, total: Number(count), page };
  }

  async getById(id: string) {
    const [payout] = await this.db
      .select()
      .from(payouts)
      .where(eq(payouts.id, id))
      .limit(1);
    if (!payout) throw new NotFoundException('Versement introuvable');
    return payout;
  }

  async create(data: any) {
    const [payout] = await this.db.insert(payouts).values(data).returning();
    return payout;
  }

  async process(id: string, processedBy: string) {
    const [payout] = await this.db
      .update(payouts)
      .set({
        status: 'processing',
        processedBy: processedBy || null,
        processedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(payouts.id, id))
      .returning();
    if (!payout) throw new NotFoundException('Versement introuvable');
    return payout;
  }

  async markAsPaid(
    id: string,
    data: { paymentReference: string; paidAt?: string; notes?: string },
  ) {
    const [payout] = await this.db
      .update(payouts)
      .set({
        status: 'paid',
        processedAt: data.paidAt ? new Date(data.paidAt) : new Date(),
        notes:
          data.notes ??
          (data.paymentReference ? `Réf: ${data.paymentReference}` : undefined),
        updatedAt: new Date(),
      })
      .where(eq(payouts.id, id))
      .returning();
    if (!payout) throw new NotFoundException('Versement introuvable');
    return payout;
  }

  async cancel(id: string, reason?: string) {
    const [payout] = await this.db
      .update(payouts)
      .set({ status: 'cancelled', notes: reason ?? undefined, updatedAt: new Date() })
      .where(eq(payouts.id, id))
      .returning();
    if (!payout) throw new NotFoundException('Versement introuvable');
    return payout;
  }

  async getSummary() {
    const rows = await this.db
      .select({ status: payouts.status, count: sql<number>`count(*)` })
      .from(payouts)
      .groupBy(payouts.status);
    const byStatus: Record<string, number> = {};
    for (const r of rows) byStatus[r.status] = Number(r.count);
    return {
      pending: byStatus['pending'] ?? 0,
      processing: byStatus['processing'] ?? 0,
      completed: byStatus['completed'] ?? 0,
      failed: byStatus['failed'] ?? 0,
      total: rows.reduce((s, r) => s + Number(r.count), 0),
    };
  }
}
