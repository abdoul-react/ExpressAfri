import type { AdminSettingDataSource, SuperSetting, SuperFeatureFlag } from '../AdminSettingDataSource'
import api from '@/lib/api'

export class ApiAdminSettingDataSource implements AdminSettingDataSource {
  async listSettings() {
    const { data } = await api.get('/settings')
    return data as SuperSetting[]
  }

  async updateSetting(key: string, value: string) {
    const { data } = await api.put(`/settings/${key}`, { value })
    return data as SuperSetting
  }

  async listFeatureFlags() {
    const { data } = await api.get('/settings/feature-flags')
    return data as SuperFeatureFlag[]
  }

  async toggleFeatureFlag(key: string, enabled: boolean) {
    const { data } = await api.put(`/settings/${key}/toggle`, { enabled })
    return data as SuperFeatureFlag
  }
}
