import { adminSettingDataSource } from '@/infrastructure/data-source'
import { toServiceError } from '@/lib/service-error'

class AdminSettingService {
  async listSettings() {
    try {
      return await adminSettingDataSource.listSettings()
    } catch (err) {
      throw toServiceError(err, 'Liste des paramètres')
    }
  }
  async updateSetting(key: string, value: string) {
    try {
      return await adminSettingDataSource.updateSetting(key, value)
    } catch (err) {
      throw toServiceError(err, 'Mise à jour du paramètre')
    }
  }
}

export const adminSettingService = new AdminSettingService()
