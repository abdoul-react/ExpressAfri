import { adminDisputeDataSource } from '@/infrastructure/data-source'
import type {
  DisputeQueryParams,
  UpdateDisputeStatusPayload,
  ResolveDisputePayload,
  AddDisputeMessagePayload,
} from '@/infrastructure/data-source/AdminDisputeDataSource'
import { toServiceError } from '@/lib/service-error'

class AdminDisputeService {
  async list(params: DisputeQueryParams) {
    try {
      return await adminDisputeDataSource.list(params)
    } catch (err) {
      throw toServiceError(err, 'Liste des litiges')
    }
  }

  async getById(id: string) {
    try {
      return await adminDisputeDataSource.getById(id)
    } catch (err) {
      throw toServiceError(err, 'Récupération du litige')
    }
  }

  async updateStatus(id: string, payload: UpdateDisputeStatusPayload) {
    try {
      return await adminDisputeDataSource.updateStatus(id, payload)
    } catch (err) {
      throw toServiceError(err, 'Mise à jour du statut du litige')
    }
  }

  async resolve(id: string, payload: ResolveDisputePayload) {
    try {
      return await adminDisputeDataSource.resolve(id, payload)
    } catch (err) {
      throw toServiceError(err, 'Résolution du litige')
    }
  }

  async addMessage(id: string, payload: AddDisputeMessagePayload) {
    try {
      return await adminDisputeDataSource.addMessage(id, payload)
    } catch (err) {
      throw toServiceError(err, 'Ajout de message au litige')
    }
  }

  async assignToAdmin(id: string, adminId: string, adminName: string) {
    try {
      return await adminDisputeDataSource.assignToAdmin(id, adminId, adminName)
    } catch (err) {
      throw toServiceError(err, 'Assignation du litige')
    }
  }

  async delete(id: string) {
    try {
      return await adminDisputeDataSource.delete(id)
    } catch (err) {
      throw toServiceError(err, 'Suppression du litige')
    }
  }
}

export const adminDisputeService = new AdminDisputeService()
