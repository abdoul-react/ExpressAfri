import { adminCategoryDataSource } from '@/infrastructure/data-source'
import { toServiceError } from '@/lib/service-error'

class AdminCategoryService {
  async list() {
    try {
      return await adminCategoryDataSource.list()
    } catch (err) {
      throw toServiceError(err, 'Liste des catégories')
    }
  }

  async getById(id: string) {
    try {
      return await adminCategoryDataSource.getById(id)
    } catch (err) {
      throw toServiceError(err, 'Récupération de la catégorie')
    }
  }

  async create(data: { name: string; parentId?: string; imageUrl?: string }) {
    try {
      return await adminCategoryDataSource.create(data)
    } catch (err) {
      throw toServiceError(err, 'Création de la catégorie')
    }
  }

  async update(id: string, data: { name?: string; parentId?: string; imageUrl?: string }) {
    try {
      return await adminCategoryDataSource.update(id, data)
    } catch (err) {
      throw toServiceError(err, 'Mise à jour de la catégorie')
    }
  }

  async delete(id: string) {
    try {
      return await adminCategoryDataSource.delete(id)
    } catch (err) {
      throw toServiceError(err, 'Suppression de la catégorie')
    }
  }
}

export const adminCategoryService = new AdminCategoryService()
