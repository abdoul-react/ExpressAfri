import { Injectable, Inject } from '@nestjs/common';
import { eq, and, like, or, gte, lte, sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { auditLogs } from '../../database/schema/audit';

@Injectable()
export class AuditService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async list(params: {
    page?: number;
    limit?: number;
    action?: string;
    resource?: string;
    actorId?: string;
    status?: string;
    from?: string;
    to?: string;
    search?: string;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const offset = (page - 1) * limit;
    const conditions: any[] = [];

    if (params.action) conditions.push(eq(auditLogs.action, params.action));
    if (params.resource)
      conditions.push(eq(auditLogs.resource, params.resource));
    if (params.actorId) conditions.push(eq(auditLogs.actorId, params.actorId));
    if (params.status) conditions.push(eq(auditLogs.status, params.status));
    if (params.from)
      conditions.push(gte(auditLogs.createdAt, new Date(params.from)));
    if (params.to)
      conditions.push(lte(auditLogs.createdAt, new Date(params.to)));
    if (params.search) {
      conditions.push(
        or(
          like(auditLogs.action, `%${params.search}%`),
          like(auditLogs.resource, `%${params.search}%`),
          like(auditLogs.actorEmail, `%${params.search}%`),
          like(auditLogs.errorMessage, `%${params.search}%`),
        ),
      );
    }

    const where = conditions.length ? and(...conditions) : undefined;

    const [data, [{ count }]] = await Promise.all([
      this.db
        .select()
        .from(auditLogs)
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(sql`${auditLogs.createdAt} desc`),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(auditLogs)
        .where(where),
    ]);

    return { data, total: Number(count), page };
  }

  async create(data: {
    action: string;
    resource: string;
    resourceId?: string;
    actorId?: string;
    actorEmail?: string;
    actorRole?: string;
    details?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    status?: string;
    errorMessage?: string;
  }) {
    const [log] = await this.db.insert(auditLogs).values(data).returning();
    return log;
  }

  withActor(actorId: string, actorEmail?: string, actorRole?: string) {
    return {
      create: (data: Parameters<AuditService['create']>[0]) =>
        this.create({ ...data, actorId, actorEmail, actorRole }),
    };
  }
}
