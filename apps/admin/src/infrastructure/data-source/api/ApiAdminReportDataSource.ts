import type { AdminReportDataSource, Report, ReportStatus } from '../AdminReportDataSource'
import api from '@/lib/api'

export class ApiAdminReportDataSource implements AdminReportDataSource {
  async list(params?: { page?: number; limit?: number; status?: string; type?: string; search?: string }): Promise<{ data: Report[]; total: number }> {
    const { data } = await api.get('/reports', { params })
    return data
  }

  async getById(id: string): Promise<Report> {
    const { data } = await api.get(`/reports/${id}`)
    return data
  }

  async updateStatus(id: string, status: ReportStatus, resolution?: string): Promise<void> {
    await api.put(`/reports/${id}/status`, { status, resolution })
  }

  async assign(id: string, adminId: string): Promise<void> {
    await api.put(`/reports/${id}/assign`, { adminId })
  }
}
