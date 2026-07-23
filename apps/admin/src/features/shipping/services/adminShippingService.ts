import { adminShippingDataSource } from '@/infrastructure/data-source'
import { createShippingZoneSchema, createShippingMethodSchema, createShippingRuleSchema } from '@/lib/validation'
import { validateOrThrow } from '@/lib/validate'
import { toServiceError } from '@/lib/service-error'

class AdminShippingService {
  async listZones() {
    try {
      return await adminShippingDataSource.listZones()
    } catch (err) {
      throw toServiceError(err, 'Liste des zones de livraison')
    }
  }
  async getZone(id: string) {
    try {
      return await adminShippingDataSource.getZone(id)
    } catch (err) {
      throw toServiceError(err, 'Récupération de la zone')
    }
  }

  async createZone(data: { name: string; countries: string[]; priority?: number }) {
    try {
      const parsed = validateOrThrow(createShippingZoneSchema, data)
      return await adminShippingDataSource.createZone(parsed)
    } catch (err) {
      throw toServiceError(err, 'Création de la zone')
    }
  }

  async updateZone(id: string, data: Record<string, unknown>) {
    try {
      return await adminShippingDataSource.updateZone(id, data)
    } catch (err) {
      throw toServiceError(err, 'Mise à jour de la zone')
    }
  }
  async deleteZone(id: string) {
    try {
      return await adminShippingDataSource.deleteZone(id)
    } catch (err) {
      throw toServiceError(err, 'Suppression de la zone')
    }
  }
  async toggleZone(id: string, isActive: boolean) {
    try {
      return await adminShippingDataSource.toggleZone(id, isActive)
    } catch (err) {
      throw toServiceError(err, 'Activation/désactivation de la zone')
    }
  }
  async listMethods(zoneId?: string) {
    try {
      return await adminShippingDataSource.listMethods(zoneId)
    } catch (err) {
      throw toServiceError(err, 'Liste des méthodes de livraison')
    }
  }

  async createMethod(data: Record<string, unknown>) {
    try {
      const parsed = validateOrThrow(createShippingMethodSchema, data)
      return await adminShippingDataSource.createMethod(parsed)
    } catch (err) {
      throw toServiceError(err, 'Création de la méthode de livraison')
    }
  }

  async updateMethod(id: string, data: Record<string, unknown>) {
    try {
      return await adminShippingDataSource.updateMethod(id, data)
    } catch (err) {
      throw toServiceError(err, 'Mise à jour de la méthode de livraison')
    }
  }
  async deleteMethod(id: string) {
    try {
      return await adminShippingDataSource.deleteMethod(id)
    } catch (err) {
      throw toServiceError(err, 'Suppression de la méthode de livraison')
    }
  }
  async listRules(zoneId?: string) {
    try {
      return await adminShippingDataSource.listRules(zoneId)
    } catch (err) {
      throw toServiceError(err, 'Liste des règles de livraison')
    }
  }

  async createRule(data: Record<string, unknown>) {
    try {
      const parsed = validateOrThrow(createShippingRuleSchema, data)
      return await adminShippingDataSource.createRule(parsed)
    } catch (err) {
      throw toServiceError(err, 'Création de la règle de livraison')
    }
  }

  async updateRule(id: string, data: Record<string, unknown>) {
    try {
      return await adminShippingDataSource.updateRule(id, data)
    } catch (err) {
      throw toServiceError(err, 'Mise à jour de la règle de livraison')
    }
  }
  async deleteRule(id: string) {
    try {
      return await adminShippingDataSource.deleteRule(id)
    } catch (err) {
      throw toServiceError(err, 'Suppression de la règle de livraison')
    }
  }
}

export const adminShippingService = new AdminShippingService()
