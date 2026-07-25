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

  async launch(id: string) {
    try {
      return await adminCampaignDataSource.launch(id)
    } catch (err) {
      throw toServiceError(err, 'Lancement de la campagne')
    }
  }

  async pause(id: string) {
    try {
      return await adminCampaignDataSource.pause(id)
    } catch (err) {
      throw toServiceError(err, 'Mise en pause de la campagne')
    }
  }

  async getSummary() {
    try {
      return await adminCampaignDataSource.getSummary()
    } catch (err) {
      throw toServiceError(err, 'Résumé des campagnes')
    }
  }
}

export const adminCampaignService = new AdminCampaignService()
