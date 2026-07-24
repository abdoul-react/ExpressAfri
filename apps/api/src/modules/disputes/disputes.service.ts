import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, like, or, and, sql, desc } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import {
  disputes,
  disputeMessages,
  disputeTimeline,
} from '../../database/schema/disputes';

@Injectable()
export class DisputesService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async list(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    reason?: string;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const offset = (page - 1) * limit;
    const conditions = [];
    if (params.search)
      conditions.push(
        or(
          like(disputes.customerName, `%${params.search}%`),
          like(disputes.productName, `%${params.search}%`),
          like(disputes.reason, `%${params.search}%`),
        ),
      );
    if (params.status) conditions.push(eq(disputes.status, params.status));
    if (params.reason) conditions.push(eq(disputes.reason, params.reason));
    const where = conditions.length ? and(...conditions) : undefined;
    const [data, [{ count }]] = await Promise.all([
      this.db
        .select()
        .from(disputes)
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(disputes.createdAt)),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(disputes)
        .where(where),
    ]);
    return { data, total: Number(count), page };
  }

  async getById(id: string) {
    const [dispute] = await this.db
      .select()
      .from(disputes)
      .where(eq(disputes.id, id))
      .limit(1);
    if (!dispute) throw new NotFoundException('Litige introuvable');
    const messages = await this.db
      .select()
      .from(disputeMessages)
      .where(eq(disputeMessages.disputeId, id))
      .orderBy(disputeMessages.createdAt);
    const timeline = await this.db
      .select()
      .from(disputeTimeline)
      .where(eq(disputeTimeline.disputeId, id))
      .orderBy(disputeTimeline.createdAt);
    return { ...dispute, messages, timeline };
  }

  async create(data: any) {
    const { actorId, actorName, actorRole, ...disputeData } = data;
    const [dispute] = await this.db
      .insert(disputes)
      .values(disputeData)
      .returning();
    await this.db.insert(disputeTimeline).values({
      disputeId: dispute.id,
      status: dispute.status,
      note: 'Litige créé',
      actorId,
      actorName,
      actorRole: actorRole ?? 'system',
    });
    return this.getById(dispute.id);
  }

  async updateStatus(
    id: string,
    status: string,
    data?: {
      note?: string;
      actorId?: string;
      actorName?: string;
      actorRole?: string;
    },
  ) {
    const [dispute] = await this.db
      .update(disputes)
      .set({ status, updatedAt: new Date() })
      .where(eq(disputes.id, id))
      .returning();
    if (!dispute) throw new NotFoundException('Litige introuvable');
    await this.db.insert(disputeTimeline).values({
      disputeId: id,
      status,
      note: data?.note,
      actorId: data?.actorId,
      actorName: data?.actorName,
      actorRole: data?.actorRole ?? 'system',
    });
    return this.getById(id);
  }

  async resolve(
    id: string,
    data: {
      resolution: string;
      resolutionAmount?: string;
      resolutionNote: string;
      actorId?: string;
      actorName?: string;
      actorRole?: string;
    },
  ) {
    const [dispute] = await this.db
      .update(disputes)
      .set({
        status: 'resolved',
        resolution: data.resolution,
        resolutionAmount: data.resolutionAmount,
        resolutionNote: data.resolutionNote,
        updatedAt: new Date(),
      })
      .where(eq(disputes.id, id))
      .returning();
    if (!dispute) throw new NotFoundException('Litige introuvable');
    await this.db.insert(disputeTimeline).values({
      disputeId: id,
      status: 'resolved',
      note: data.resolutionNote,
      actorId: data?.actorId,
      actorName: data?.actorName,
      actorRole: data?.actorRole ?? 'system',
    });
    return this.getById(id);
  }

  async addMessage(
    id: string,
    data: {
      content: string;
      authorId?: string;
      authorName?: string;
      authorRole?: string;
    },
  ) {
    const [dispute] = await this.db
      .select()
      .from(disputes)
      .where(eq(disputes.id, id))
      .limit(1);
    if (!dispute) throw new NotFoundException('Litige introuvable');
    const [message] = await this.db
      .insert(disputeMessages)
      .values({
        disputeId: id,
        content: data.content,
        authorId: data.authorId,
        authorName: data.authorName,
        authorRole: data.authorRole ?? 'customer',
      })
      .returning();
    return message;
  }

  async assignToAdmin(
    id: string,
    data: { adminId: string; adminName?: string },
  ) {
    const [dispute] = await this.db
      .update(disputes)
      .set({
        assignedAdminId: data.adminId,
        updatedAt: new Date(),
      })
      .where(eq(disputes.id, id))
      .returning();
    if (!dispute) throw new NotFoundException('Litige introuvable');
    await this.db.insert(disputeTimeline).values({
      disputeId: id,
      status: dispute.status,
      note: data.adminName
        ? `Assigné à ${data.adminName}`
        : `Assigné (${data.adminId})`,
      actorRole: 'system',
    });
    return this.getById(id);
  }

  async delete(id: string) {
    const [dispute] = await this.db
      .select()
      .from(disputes)
      .where(eq(disputes.id, id))
      .limit(1);
    if (!dispute) throw new NotFoundException('Litige introuvable');
    await this.db.delete(disputes).where(eq(disputes.id, id));
  }

  async getSummary() {
    const rows = await this.db
      .select({ status: disputes.status, count: sql<number>`count(*)` })
      .from(disputes)
      .groupBy(disputes.status);
    const byStatus: Record<string, number> = {};
    for (const r of rows) byStatus[r.status] = Number(r.count);
    return {
      open: byStatus['open'] ?? 0,
      under_review: byStatus['under_review'] ?? 0,
      resolved: byStatus['resolved'] ?? 0,
      closed: byStatus['closed'] ?? 0,
      total: rows.reduce((s, r) => s + Number(r.count), 0),
    };
  }
}
