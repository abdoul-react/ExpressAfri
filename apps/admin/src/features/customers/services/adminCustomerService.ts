import { adminUserDataSource } from '@/infrastructure/data-source'
import type { CustomerQueryParams } from '@/infrastructure/data-source/AdminUserDataSource'
import type { CustomerUpdateInput } from '@/types/dto'
import { updateCustomerSchema } from '@/lib/validation'
import { validateOrThrow } from '@/lib/validate'
import { toServiceError } from '@/lib/service-error'

class AdminCustomerService {
  async list(params: CustomerQueryParams) {
    try {
      return await adminUserDataSource.listCustomers(params)
    } catch (err) {
      throw toServiceError(err, 'Liste des clients')
    }
  }

  async getById(id: string) {
    try {
      return await adminUserDataSource.getCustomerById(id)
    } catch (err) {
      throw toServiceError(err, 'Récupération du client')
    }
  }

  async getCustomerOrders(customerId: string) {
    try {
      return await adminUserDataSource.getCustomerOrders(customerId)
    } catch (err) {
      throw toServiceError(err, 'Récupération des commandes du client')
    }
  }

  async update(id: string, data: CustomerUpdateInput) {
    try {
      const parsed = validateOrThrow(updateCustomerSchema, data)
      return await adminUserDataSource.updateCustomer(id, parsed)
    } catch (err) {
      throw toServiceError(err, 'Mise à jour du client')
    }
  }

  async ban(id: string) {
    try {
      return await adminUserDataSource.banCustomer(id)
    } catch (err) {
      throw toServiceError(err, 'Bannissement du client')
    }
  }

  async unban(id: string) {
    try {
      return await adminUserDataSource.unbanCustomer(id)
    } catch (err) {
      throw toServiceError(err, 'Levée du bannissement du client')
    }
  }

  async delete(id: string) {
    try {
      return await adminUserDataSource.deleteCustomer(id)
    } catch (err) {
      throw toServiceError(err, 'Suppression du client')
    }
  }
}

export const adminCustomerService = new AdminCustomerService()
