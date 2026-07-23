import { adminSettingDataSource } from '@/infrastructure/data-source'
import { toServiceError } from '@/lib/service-error'

class AdminFeatureService {
  async list() {
    try {
      return await adminSettingDataSource.listFeatureFlags()
    } catch (err) {
      throw toServiceError(err, 'Liste des fonctionnalités')
    }
  }
  async toggle(key: string, enabled: boolean) {
    try {
      return await adminSettingDataSource.toggleFeatureFlag(key, enabled)
    } catch (err) {
      throw toServiceError(err, 'Activation/désactivation de la fonctionnalité')
    }
  }
}

export const adminFeatureService = new AdminFeatureService()
