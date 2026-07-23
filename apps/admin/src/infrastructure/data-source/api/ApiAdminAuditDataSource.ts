import type { AdminAuditDataSource, AuditEntry, AuditQueryParams } from '../AdminAuditDataSource'
import api from '@/lib/api'

export class ApiAdminAuditDataSource implements AdminAuditDataSource {
  async list(params?: AuditQueryParams): Promise<{ data: AuditEntry[]; total: number }> {
    const { data } = await api.get('/audit', { params })
    return data
  }

  async export(params?: { from?: string; to?: string }): Promise<Blob> {
    const { data } = await api.get('/audit/export', { params, responseType: 'blob' })
    return data
  }
}
