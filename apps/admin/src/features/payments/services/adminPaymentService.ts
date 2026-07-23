import { adminPaymentDataSource } from '@/infrastructure/data-source'
import type { PaymentQueryParams } from '@/infrastructure/data-source/AdminPaymentDataSource'
import { refundPaymentSchema } from '@/lib/validation'
import { validateOrThrow } from '@/lib/validate'
import { toServiceError } from '@/lib/service-error'

class AdminPaymentService {
  async list(params: PaymentQueryParams) {
    try {
      return await adminPaymentDataSource.list(params)
    } catch (err) {
      throw toServiceError(err, 'Liste des paiements')
    }
  }

  async getById(id: string) {
    try {
      return await adminPaymentDataSource.getById(id)
    } catch (err) {
      throw toServiceError(err, 'Récupération du paiement')
    }
  }

  async refund(id: string, amount?: number, reason?: string) {
    try {
      validateOrThrow(refundPaymentSchema, { amount, reason })
      return await adminPaymentDataSource.refund(id, amount, reason)
    } catch (err) {
      throw toServiceError(err, 'Remboursement du paiement')
    }
  }
}

export const adminPaymentService = new AdminPaymentService()
