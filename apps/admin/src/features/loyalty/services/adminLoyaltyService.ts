import { adminLoyaltyDataSource } from '@/infrastructure/data-source'
import type { LoyaltyQueryParams } from '@/infrastructure/data-source/AdminLoyaltyDataSource'
import { createLoyaltyRuleSchema, createLoyaltyRewardSchema } from '@/lib/validation'
import { validateOrThrow } from '@/lib/validate'
import { toServiceError } from '@/lib/service-error'

class AdminLoyaltyService {
  async getSummary() {
    try {
      return await adminLoyaltyDataSource.getSummary()
    } catch (err) {
      throw toServiceError(err, 'Résumé de la fidélité')
    }
  }
  async listRules() {
    try {
      return await adminLoyaltyDataSource.listRules()
    } catch (err) {
      throw toServiceError(err, 'Liste des règles de fidélité')
    }
  }

  async createRule(data: Record<string, unknown>) {
    try {
      const parsed = validateOrThrow(createLoyaltyRuleSchema, data)
      return await adminLoyaltyDataSource.createRule(parsed)
    } catch (err) {
      throw toServiceError(err, 'Création de la règle de fidélité')
    }
  }

  async updateRule(id: string, data: Record<string, unknown>) {
    try {
      return await adminLoyaltyDataSource.updateRule(id, data)
    } catch (err) {
      throw toServiceError(err, 'Mise à jour de la règle de fidélité')
    }
  }
  async deleteRule(id: string) {
    try {
      return await adminLoyaltyDataSource.deleteRule(id)
    } catch (err) {
      throw toServiceError(err, 'Suppression de la règle de fidélité')
    }
  }
  async listRewards() {
    try {
      return await adminLoyaltyDataSource.listRewards()
    } catch (err) {
      throw toServiceError(err, 'Liste des récompenses')
    }
  }

  async createReward(data: Record<string, unknown>) {
    try {
      const parsed = validateOrThrow(createLoyaltyRewardSchema, data)
      return await adminLoyaltyDataSource.createReward(parsed)
    } catch (err) {
      throw toServiceError(err, 'Création de la récompense')
    }
  }

  async updateReward(id: string, data: Record<string, unknown>) {
    try {
      return await adminLoyaltyDataSource.updateReward(id, data)
    } catch (err) {
      throw toServiceError(err, 'Mise à jour de la récompense')
    }
  }
  async deleteReward(id: string) {
    try {
      return await adminLoyaltyDataSource.deleteReward(id)
    } catch (err) {
      throw toServiceError(err, 'Suppression de la récompense')
    }
  }
  async listCustomers(params: LoyaltyQueryParams) {
    try {
      return await adminLoyaltyDataSource.listCustomers(params)
    } catch (err) {
      throw toServiceError(err, 'Liste des clients fidélité')
    }
  }
  async getCustomerPoints(customerId: string) {
    try {
      return await adminLoyaltyDataSource.getCustomerPoints(customerId)
    } catch (err) {
      throw toServiceError(err, 'Récupération des points du client')
    }
  }
  async adjustPoints(customerId: string, points: number, reason: string) {
    try {
      return await adminLoyaltyDataSource.adjustPoints(customerId, points, reason)
    } catch (err) {
      throw toServiceError(err, 'Ajustement des points')
    }
  }
  async getTransactions(customerId: string) {
    try {
      return await adminLoyaltyDataSource.getTransactions(customerId)
    } catch (err) {
      throw toServiceError(err, 'Récupération des transactions')
    }
  }
}

export const adminLoyaltyService = new AdminLoyaltyService()
