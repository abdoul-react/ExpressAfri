import { adminReturnDataSource } from '@/infrastructure/data-source'
import type { ReturnQueryParams } from '@/infrastructure/data-source/AdminReturnDataSource'
import { toServiceError } from '@/lib/service-error'

class AdminReturnService {
  async list(params: ReturnQueryParams) {
    try {
      return await adminReturnDataSource.list(params)
    } catch (err) {
      throw toServiceError(err, 'Liste des retours')
    }
  }

  async getById(id: string) {
    try {
      return await adminReturnDataSource.getById(id)
    } catch (err) {
      throw toServiceError(err, 'Récupération du retour')
    }
  }

  async getSummary() {
    try {
      return await adminReturnDataSource.getSummary()
    } catch (err) {
      throw toServiceError(err, 'Résumé des retours')
    }
  }

  async approve(id: string) {
    try {
      return await adminReturnDataSource.approve(id)
    } catch (err) {
      throw toServiceError(err, 'Approbation du retour')
    }
  }

  async markAsReceived(id: string) {
    try {
      return await adminReturnDataSource.markAsReceived(id)
    } catch (err) {
      throw toServiceError(err, 'Marquage du retour comme reçu')
    }
  }

  async refund(id: string, amount?: number, method?: string) {
    try {
      return await adminReturnDataSource.refund(id, amount, method)
    } catch (err) {
      throw toServiceError(err, 'Remboursement du retour')
    }
  }

  async reject(id: string, reason?: string) {
    try {
      return await adminReturnDataSource.reject(id, reason)
    } catch (err) {
      throw toServiceError(err, 'Rejet du retour')
    }
  }

  async cancel(id: string) {
    try {
      return await adminReturnDataSource.cancel(id)
    } catch (err) {
      throw toServiceError(err, 'Annulation du retour')
    }
  }
}

export const adminReturnService = new AdminReturnService()
