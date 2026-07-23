import { adminAdminDataSource } from '@/infrastructure/data-source'
import type { CreateAdminInput, UpdateAdminInput } from '@/infrastructure/data-source/AdminAdminDataSource'
import { toServiceError } from '@/lib/service-error'

class AdminAdminService {
  async list(params?: { page?: number; limit?: number; search?: string; role?: string }) {
    try {
      return await adminAdminDataSource.list(params)
    } catch (err) {
      throw toServiceError(err, 'Liste des administrateurs')
    }
  }
  async getById(id: string) {
    try {
      return await adminAdminDataSource.getById(id)
    } catch (err) {
      throw toServiceError(err, 'Récupération de l\'administrateur')
    }
  }
  async create(data: CreateAdminInput) {
    try {
      return await adminAdminDataSource.create(data)
    } catch (err) {
      throw toServiceError(err, 'Création de l\'administrateur')
    }
  }
  async update(id: string, data: UpdateAdminInput) {
    try {
      return await adminAdminDataSource.update(id, data)
    } catch (err) {
      throw toServiceError(err, 'Mise à jour de l\'administrateur')
    }
  }
  async updatePassword(id: string, password: string) {
    try {
      return await adminAdminDataSource.updatePassword(id, password)
    } catch (err) {
      throw toServiceError(err, 'Mise à jour du mot de passe')
    }
  }
  async delete(id: string) {
    try {
      return await adminAdminDataSource.delete(id)
    } catch (err) {
      throw toServiceError(err, 'Suppression de l\'administrateur')
    }
  }
}

export const adminAdminService = new AdminAdminService()
