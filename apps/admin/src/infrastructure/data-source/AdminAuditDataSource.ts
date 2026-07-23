export interface AuditEntry {
  id: string
  actorId: string
  actorEmail: string
  actorRole: string
  action: string
  resource: string
  resourceId?: string
  details?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  status: 'success' | 'failure'
  errorMessage?: string
  timestamp: string
}

export interface AuditQueryParams {
  page?: number
  limit?: number
  action?: string
  resource?: string
  actorId?: string
  status?: string
  from?: string
  to?: string
  search?: string
}

export interface AdminAuditDataSource {
  list(params?: AuditQueryParams): Promise<{ data: AuditEntry[]; total: number }>
  export(params?: { from?: string; to?: string }): Promise<Blob>
}
