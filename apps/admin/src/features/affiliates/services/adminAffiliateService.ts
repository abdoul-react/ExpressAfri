import { adminAffiliateDataSource } from '@/infrastructure/data-source'
import type { AffiliateQueryParams, CommissionQueryParams } from '@/infrastructure/data-source/AdminAffiliateDataSource'
import { createAffiliateSchema, updateAffiliateSchema } from '@/lib/validation'
import { validateOrThrow } from '@/lib/validate'
import { toServiceError } from '@/lib/service-error'

class AdminAffiliateService {
  async list(params: AffiliateQueryParams) {
    try {
      return await adminAffiliateDataSource.list(params)
    } catch (err) {
      throw toServiceError(err, 'Liste des affiliés')
    }
  }

  async getById(id: string) {
    try {
      return await adminAffiliateDataSource.getById(id)
    } catch (err) {
      throw toServiceError(err, 'Récupération de l\'affilié')
    }
  }

  async create(data: Record<string, unknown>) {
    try {
      const parsed = validateOrThrow(createAffiliateSchema, data)
      return await adminAffiliateDataSource.create(parsed)
    } catch (err) {
      throw toServiceError(err, 'Création de l\'affilié')
    }
  }

  async update(id: string, data: Record<string, unknown>) {
    try {
      const parsed = validateOrThrow(updateAffiliateSchema, data)
      return await adminAffiliateDataSource.update(id, parsed)
    } catch (err) {
      throw toServiceError(err, 'Mise à jour de l\'affilié')
    }
  }

  async updateStatus(id: string, status: string) {
    try {
      return await adminAffiliateDataSource.updateStatus(id, status)
    } catch (err) {
      throw toServiceError(err, 'Mise à jour du statut de l\'affilié')
    }
  }

  async listCodes(affiliateId: string) {
    try {
      return await adminAffiliateDataSource.listCodes(affiliateId)
    } catch (err) {
      throw toServiceError(err, 'Liste des codes')
    }
  }

  async createCode(affiliateId: string, data: Record<string, unknown>) {
    try {
      return await adminAffiliateDataSource.createCode(affiliateId, data)
    } catch (err) {
      throw toServiceError(err, 'Création du code')
    }
  }

  async updateCode(id: string, data: Record<string, unknown>) {
    try {
      return await adminAffiliateDataSource.updateCode(id, data)
    } catch (err) {
      throw toServiceError(err, 'Mise à jour du code')
    }
  }

  async toggleCode(id: string, isActive: boolean) {
    try {
      return await adminAffiliateDataSource.toggleCode(id, isActive)
    } catch (err) {
      throw toServiceError(err, 'Activation/désactivation du code')
    }
  }

  async listCommissions(params: CommissionQueryParams) {
    try {
      return await adminAffiliateDataSource.listCommissions(params)
    } catch (err) {
      throw toServiceError(err, 'Liste des commissions')
    }
  }

  async approveCommission(id: string) {
    try {
      return await adminAffiliateDataSource.approveCommission(id)
    } catch (err) {
      throw toServiceError(err, 'Approbation de la commission')
    }
  }

  async rejectCommission(id: string) {
    try {
      return await adminAffiliateDataSource.rejectCommission(id)
    } catch (err) {
      throw toServiceError(err, 'Rejet de la commission')
    }
  }

  async getSummary() {
    try {
      return await adminAffiliateDataSource.getSummary()
    } catch (err) {
      throw toServiceError(err, 'Résumé des affiliés')
    }
  }
}

export const adminAffiliateService = new AdminAffiliateService()
