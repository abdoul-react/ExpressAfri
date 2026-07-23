import { useQuery, useQueryClient } from '@tanstack/react-query'
import { adminAuditService } from '../services/adminAuditService'
import type { AuditQueryParams } from '@/infrastructure/data-source/AdminAuditDataSource'

export function useAdminAudit(params?: AuditQueryParams) {
  return useQuery({
    queryKey: ['admin', 'audit', params],
    queryFn: () => adminAuditService.list(params),
  })
}

export function useExportAudit() {
  const qc = useQueryClient()
  return async (params?: { from?: string; to?: string }) => {
    const blob = await adminAuditService.export(params)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
}
