export type ReportStatus = 'pending' | 'investigating' | 'resolved' | 'dismissed'
export type ReportType = 'product' | 'seller' | 'user' | 'other'

export interface Report {
  id: string
  type: ReportType
  reporterId: string
  reporterName: string
  reporterEmail: string
  targetId: string
  targetName: string
  reason: string
  description: string
  status: ReportStatus
  assignedTo?: string
  assignedToName?: string
  resolution?: string
  evidence?: { name: string; url: string }[]
  createdAt: string
  updatedAt: string
}

export interface AdminReportDataSource {
  list(params?: { page?: number; limit?: number; status?: string; type?: string; search?: string }): Promise<{ data: Report[]; total: number }>
  getById(id: string): Promise<Report>
  updateStatus(id: string, status: string, resolution?: string): Promise<void>
  assign(id: string, adminId: string): Promise<void>
}
