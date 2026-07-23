import { adminReportDataSource } from '@/infrastructure/data-source'
import { toServiceError } from '@/lib/service-error'

class AdminReportService {
  async list(params?: { page?: number; limit?: number; status?: string; type?: string; search?: string }) {
    try {
      return await adminReportDataSource.list(params)
    } catch (err) {
      throw toServiceError(err, 'Liste des signalements')
    }
  }
  async getById(id: string) {
    try {
      return await adminReportDataSource.getById(id)
    } catch (err) {
      throw toServiceError(err, 'Récupération du signalement')
    }
  }
  async updateStatus(id: string, status: string, resolution?: string) {
    try {
      return await adminReportDataSource.updateStatus(id, status, resolution)
    } catch (err) {
      throw toServiceError(err, 'Mise à jour du statut du signalement')
    }
  }
  async assign(id: string, adminId: string) {
    try {
      return await adminReportDataSource.assign(id, adminId)
    } catch (err) {
      throw toServiceError(err, 'Assignation du signalement')
    }
  }
}

export const adminReportService = new AdminReportService()
