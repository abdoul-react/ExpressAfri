import type { AdminReportDataSource, Report, ReportStatus } from '../AdminReportDataSource'
import { MOCK_REPORTS } from './data/mockReports'

let reports = [...MOCK_REPORTS]

export class MockAdminReportDataSource implements AdminReportDataSource {
  private delay(ms = 200) { return new Promise<void>((r) => setTimeout(r, ms)) }

  async list(params?: { page?: number; limit?: number; status?: string; type?: string; search?: string }) {
    await this.delay()
    let filtered = [...reports]
    if (params?.status) filtered = filtered.filter((r) => r.status === params.status)
    if (params?.type) filtered = filtered.filter((r) => r.type === params.type)
    if (params?.search) {
      const s = params.search.toLowerCase()
      filtered = filtered.filter((r) =>
        r.reason.toLowerCase().includes(s) ||
        r.reporterName.toLowerCase().includes(s) ||
        r.targetName.toLowerCase().includes(s) ||
        r.description.toLowerCase().includes(s)
      )
    }
    filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const page = params?.page ?? 1
    const limit = params?.limit ?? 15
    const start = (page - 1) * limit
    return { data: filtered.slice(start, start + limit), total: filtered.length }
  }

  async getById(id: string) {
    await this.delay()
    const r = reports.find((r) => r.id === id)
    if (!r) throw new Error('Signalement introuvable')
    return { ...r }
  }

  async updateStatus(id: string, status: ReportStatus, resolution?: string) {
    await this.delay(300)
    const idx = reports.findIndex((r) => r.id === id)
    if (idx > -1) reports[idx] = { ...reports[idx], status, resolution: resolution ?? reports[idx].resolution, updatedAt: new Date().toISOString() }
  }

  async assign(id: string, adminId: string) {
    await this.delay()
    const idx = reports.findIndex((r) => r.id === id)
    if (idx > -1) reports[idx] = { ...reports[idx], assignedTo: adminId, assignedToName: 'Support Agent', updatedAt: new Date().toISOString() }
  }
}
