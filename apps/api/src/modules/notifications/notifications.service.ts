import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, like, or, and, sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import {
  notificationTemplates,
  notificationLogs,
} from '../../database/schema/notifications';
import { PushService } from '../push/push.service';

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
    private push: PushService,
  ) {}

  async listTemplates(params: {
    page?: number;
    limit?: number;
    search?: string;
    channel?: string;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const offset = (page - 1) * limit;
    const conditions = [];
    if (params.search)
      conditions.push(
        or(
          like(notificationTemplates.label, `%${params.search}%`),
          like(notificationTemplates.key, `%${params.search}%`),
        ),
      );
    if (params.channel)
      conditions.push(eq(notificationTemplates.channel, params.channel));
    const where = conditions.length ? and(...conditions) : undefined;
    const [data, [{ count }]] = await Promise.all([
      this.db
        .select()
        .from(notificationTemplates)
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(notificationTemplates.createdAt),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(notificationTemplates)
        .where(where),
    ]);
    return { data, total: Number(count), page };
  }

  async getTemplateById(id: string) {
    const [tpl] = await this.db
      .select()
      .from(notificationTemplates)
      .where(eq(notificationTemplates.id, id))
      .limit(1);
    if (!tpl) throw new NotFoundException('Template introuvable');
    return tpl;
  }

  async createTemplate(data: any) {
    const [tpl] = await this.db
      .insert(notificationTemplates)
      .values(data)
      .returning();
    return tpl;
  }
  async updateTemplate(id: string, data: any) {
    const [tpl] = await this.db
      .update(notificationTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(notificationTemplates.id, id))
      .returning();
    if (!tpl) throw new NotFoundException('Template introuvable');
    return tpl;
  }
  async deleteTemplate(id: string) {
    await this.db
      .delete(notificationTemplates)
      .where(eq(notificationTemplates.id, id));
  }

  async listLogs(params: { page?: number; limit?: number; status?: string }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const offset = (page - 1) * limit;
    const conditions = [];
    if (params.status)
      conditions.push(eq(notificationLogs.status, params.status));
    const where = conditions.length ? and(...conditions) : undefined;
    const [data, [{ count }]] = await Promise.all([
      this.db
        .select()
        .from(notificationLogs)
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(notificationLogs.sentAt),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(notificationLogs)
        .where(where),
    ]);
    return { data, total: Number(count), page };
  }

  async getLogById(id: string) {
    const [log] = await this.db
      .select()
      .from(notificationLogs)
      .where(eq(notificationLogs.id, id))
      .limit(1);
    if (!log) throw new NotFoundException('Log introuvable');
    return log;
  }

  async sendTest(templateId: string, recipient: string) {
    const tpl = await this.getTemplateById(templateId);
    await this.push.sendToCustomer(recipient, {
      title: `[TEST] ${tpl.label}`,
      body: tpl.body ?? tpl.label,
      data: { type: 'test', templateId },
    });
    await this.db.insert(notificationLogs).values({
      storeId: tpl.storeId,
      templateId: tpl.id,
      channel: tpl.channel ?? 'push',
      recipient,
      subject: tpl.subject ?? undefined,
      body: tpl.body,
      status: 'sent',
    });
    return { sent: 1, failed: 0 };
  }

  async sendBatch(templateId: string, recipients: string[]) {
    if (!recipients?.length) return { sent: 0, failed: 0 };
    const tpl = await this.getTemplateById(templateId);
    let sent = 0;
    let failed = 0;
    for (const recipient of recipients) {
      try {
        await this.push.sendToCustomer(recipient, {
          title: tpl.label,
          body: tpl.body ?? tpl.label,
          data: { type: 'batch', templateId },
        });
        await this.db.insert(notificationLogs).values({
          storeId: tpl.storeId,
          templateId: tpl.id,
          channel: tpl.channel ?? 'push',
          recipient,
          subject: tpl.subject ?? undefined,
          body: tpl.body,
          status: 'sent',
        });
        sent++;
      } catch {
        failed++;
      }
    }
    return { sent, failed };
  }
}
