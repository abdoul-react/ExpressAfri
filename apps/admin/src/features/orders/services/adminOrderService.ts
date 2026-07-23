import { adminOrderDataSource } from '@/infrastructure/data-source'
import type { OrderQueryParams } from '@/infrastructure/data-source/AdminOrderDataSource'
import { updateOrderStatusSchema, cancelOrderSchema, refundOrderSchema } from '@/lib/validation'
import { validateOrThrow } from '@/lib/validate'
import { toServiceError } from '@/lib/service-error'

class AdminOrderService {
  async list(params: OrderQueryParams) {
    try {
      return await adminOrderDataSource.list(params)
    } catch (err) {
      throw toServiceError(err, 'Liste des commandes')
    }
  }

  async getById(id: string) {
    try {
      return await adminOrderDataSource.getById(id)
    } catch (err) {
      throw toServiceError(err, 'Récupération de la commande')
    }
  }

  async updateStatus(id: string, status: string) {
    try {
      validateOrThrow(updateOrderStatusSchema, { status })
      return await adminOrderDataSource.updateStatus(id, status)
    } catch (err) {
      throw toServiceError(err, 'Mise à jour du statut de la commande')
    }
  }

  async cancel(id: string, reason?: string) {
    try {
      validateOrThrow(cancelOrderSchema, { reason })
      return await adminOrderDataSource.cancel(id, reason)
    } catch (err) {
      throw toServiceError(err, 'Annulation de la commande')
    }
  }

  async refund(id: string, amount?: number) {
    try {
      validateOrThrow(refundOrderSchema, { amount })
      return await adminOrderDataSource.refund(id, amount)
    } catch (err) {
      throw toServiceError(err, 'Remboursement de la commande')
    }
  }
}

export const adminOrderService = new AdminOrderService()
