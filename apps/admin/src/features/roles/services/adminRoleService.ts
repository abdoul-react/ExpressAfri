import { adminRoleDataSource } from '@/infrastructure/data-source'
import type { CreateRoleInput, UpdateRoleInput } from '@/infrastructure/data-source/AdminRoleDataSource'
import { toServiceError } from '@/lib/service-error'

class AdminRoleService {
  async list() {
    try {
      return await adminRoleDataSource.list()
    } catch (err) {
      throw toServiceError(err, 'Liste des rôles')
    }
  }
  async getById(id: string) {
    try {
      return await adminRoleDataSource.getById(id)
    } catch (err) {
      throw toServiceError(err, 'Récupération du rôle')
    }
  }
  async create(data: CreateRoleInput) {
    try {
      return await adminRoleDataSource.create(data)
    } catch (err) {
      throw toServiceError(err, 'Création du rôle')
    }
  }
  async update(id: string, data: UpdateRoleInput) {
    try {
      return await adminRoleDataSource.update(id, data)
    } catch (err) {
      throw toServiceError(err, 'Mise à jour du rôle')
    }
  }
  async delete(id: string) {
    try {
      return await adminRoleDataSource.delete(id)
    } catch (err) {
      throw toServiceError(err, 'Suppression du rôle')
    }
  }
}

export const adminRoleService = new AdminRoleService()
