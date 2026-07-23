import { adminPayoutDataSource } from '@/infrastructure/data-source'
import type { PayoutQueryParams } from '@/infrastructure/data-source/AdminPayoutDataSource'
import { toServiceError } from '@/lib/service-error'

class AdminPayoutService {
  async list(params: PayoutQueryParams) {
    try {
      return await adminPayoutDataSource.list(params)
    } catch (err) {
      throw toServiceError(err, 'Liste des paiements')
    }
  }
  async getById(id: string) {
    try {
      return await adminPayoutDataSource.getById(id)
    } catch (err) {
      throw toServiceError(err, 'Récupération du paiement')
    }
  }
  async getSummary() {
    try {
      return await adminPayoutDataSource.getSummary()
    } catch (err) {
      throw toServiceError(err, 'Résumé des paiements')
    }
  }
  async markAsPaid(id: string, payload: { paymentReference: string; paidAt?: string; notes?: string }) {
    try {
      return await adminPayoutDataSource.markAsPaid(id, payload)
    } catch (err) {
      throw toServiceError(err, 'Marquage comme payé')
    }
  }
  async cancel(id: string, reason?: string) {
    try {
      return await adminPayoutDataSource.cancel(id, reason)
    } catch (err) {
      throw toServiceError(err, 'Annulation du paiement')
    }
  }
  async processPayout(id: string) {
    try {
      return await adminPayoutDataSource.processPayout(id)
    } catch (err) {
      throw toServiceError(err, 'Traitement du paiement')
    }
  }
  async getPayoutsByStore(storeId: string) {
    try {
      return await adminPayoutDataSource.getPayoutsByStore(storeId)
    } catch (err) {
      throw toServiceError(err, 'Récupération des paiements par boutique')
    }
  }
}

export const adminPayoutService = new AdminPayoutService()
