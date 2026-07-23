import { adminAuditDataSource } from '@/infrastructure/data-source'
import type { AuditQueryParams } from '@/infrastructure/data-source/AdminAuditDataSource'
import { toServiceError } from '@/lib/service-error'

class AdminAuditService {
  async list(params?: AuditQueryParams) {
    try {
      return await adminAuditDataSource.list(params)
    } catch (err) {
      throw toServiceError(err, 'Liste des audits')
    }
  }
  async export(params?: { from?: string; to?: string }) {
    try {
      return await adminAuditDataSource.export(params)
    } catch (err) {
      throw toServiceError(err, 'Export des audits')
    }
  }
}

export const adminAuditService = new AdminAuditService()
