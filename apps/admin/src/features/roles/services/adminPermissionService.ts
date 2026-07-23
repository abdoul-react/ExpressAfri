import { adminPermissionDataSource } from '@/infrastructure/data-source'
import { toServiceError } from '@/lib/service-error'

class AdminPermissionService {
  async list() {
    try {
      return await adminPermissionDataSource.list()
    } catch (err) {
      throw toServiceError(err, 'Liste des permissions')
    }
  }
}

export const adminPermissionService = new AdminPermissionService()
