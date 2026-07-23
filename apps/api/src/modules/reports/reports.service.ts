import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { eq, like, or, and, sql } from 'drizzle-orm'
import { DRIZZLE, type DrizzleDB } from '../../database/database.module'
import { reports } from '../../database/schema/reports'

@Injectable()
export class ReportsService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async list(params: { page?: number; limit?: number; search?: string; status?: string; type?: string }) {
    const page = params.page ?? 1
    const limit = params.limit ?? 10
    const offset = (page - 1) * limit

    const conditions = []
    if (params.search) conditions.push(or(like(reports.reason, `%${params.search}%`), like(reports.description, `%${params.search}%`), like(reports.reporterName, `%${params.search}%`)))
    if (params.type) conditions.push(eq(reports.type, params.type))
    if (params.status) conditions.push(eq(reports.status, params.status))

    const where = conditions.length ? and(...conditions) : undefined
    const [data, [{ count }]] = await Promise.all([
      this.db.select().from(reports).where(where).limit(limit).offset(offset).orderBy(reports.createdAt),
      this.db.select({ count: sql<number>`count(*)` }).from(reports).where(where),
    ])
    return { data, total: Number(count), page }
  }

  async getById(id: string) {
    const [report] = await this.db.select().from(reports).where(eq(reports.id, id)).limit(1)
    if (!report) throw new NotFoundException('Signalement introuvable')
    return report
  }

  async create(data: any) {
    const [report] = await this.db.insert(reports).values(data).returning()
    return report
  }

  async updateStatus(id: string, body: { status: string; resolution?: string }) {
    const [report] = await this.db.update(reports).set({ status: body.status, resolution: body.resolution, updatedAt: new Date() }).where(eq(reports.id, id)).returning()
    if (!report) throw new NotFoundException('Signalement introuvable')
    return report
  }

  async assign(id: string, body: { adminId: string }) {
    const [report] = await this.db.update(reports).set({ assignedTo: body.adminId, updatedAt: new Date() }).where(eq(reports.id, id)).returning()
    if (!report) throw new NotFoundException('Signalement introuvable')
    return report
  }
}
