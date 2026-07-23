import { adminCampaignDataSource } from '@/infrastructure/data-source'
import type { CreateCampaignInput, UpdateCampaignInput, CampaignQueryParams } from '@/infrastructure/data-source/AdminCampaignDataSource'
import { toServiceError } from '@/lib/service-error'

class AdminCampaignService {
  async list(params?: CampaignQueryParams) {
    try {
      return await adminCampaignDataSource.list(params)
    } catch (err) {
      throw toServiceError(err, 'Liste des campagnes')
    }
  }
  async getById(id: string) {
    try {
      return await adminCampaignDataSource.getById(id)
    } catch (err) {
      throw toServiceError(err, 'Récupération de la campagne')
    }
  }
  async create(data: CreateCampaignInput) {
    try {
      return await adminCampaignDataSource.create(data)
    } catch (err) {
      throw toServiceError(err, 'Création de la campagne')
    }
  }
  async update(id: string, data: UpdateCampaignInput) {
    try {
      return await adminCampaignDataSource.update(id, data)
    } catch (err) {
      throw toServiceError(err, 'Mise à jour de la campagne')
    }
  }
  async delete(id: string) {
    try {
      return await adminCampaignDataSource.delete(id)
    } catch (err) {
      throw toServiceError(err, 'Suppression de la campagne')
    }
  }
}

export const adminCampaignService = new AdminCampaignService()
