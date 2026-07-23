import type { AdminAuditDataSource, AuditEntry, AuditQueryParams } from '../AdminAuditDataSource'
import { MOCK_AUDIT_ENTRIES } from './data/mockAudit'

let entries = [...MOCK_AUDIT_ENTRIES]

export class MockAdminAuditDataSource implements AdminAuditDataSource {
  private delay(ms = 200) { return new Promise<void>((r) => setTimeout(r, ms)) }

  async list(params?: AuditQueryParams) {
    await this.delay()
    let filtered = [...entries]
    if (params?.search) {
      const s = params.search.toLowerCase()
      filtered = filtered.filter((e) =>
        e.actorEmail.toLowerCase().includes(s) ||
        e.action.toLowerCase().includes(s) ||
        e.resource.toLowerCase().includes(s) ||
        (e.resourceId ?? '').toLowerCase().includes(s)
      )
    }
    if (params?.action) filtered = filtered.filter((e) => e.action === params.action)
    if (params?.resource) filtered = filtered.filter((e) => e.resource === params.resource)
    if (params?.actorId) filtered = filtered.filter((e) => e.actorId === params.actorId)
    if (params?.status) filtered = filtered.filter((e) => e.status === params.status)
    if (params?.from) filtered = filtered.filter((e) => e.timestamp >= params.from!)
    if (params?.to) filtered = filtered.filter((e) => e.timestamp <= params.to!)
    filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    const page = params?.page ?? 1
    const limit = params?.limit ?? 20
    const start = (page - 1) * limit
    return { data: filtered.slice(start, start + limit), total: filtered.length }
  }

  async export(params?: { from?: string; to?: string }) {
    await this.delay(500)
    let filtered = [...entries]
    if (params?.from) filtered = filtered.filter((e) => e.timestamp >= params.from!)
    if (params?.to) filtered = filtered.filter((e) => e.timestamp <= params.to!)
    const header = 'ID,Auteur,Action,Ressource,Statut,Date'
    const rows = filtered.map((e) =>
      [e.id, e.actorEmail, e.action, e.resource, e.status, e.timestamp].join(',')
    ).join('\n')
    return new Blob([header + '\n' + rows], { type: 'text/csv' })
  }
}
