import type { AdminSettingDataSource, SuperSetting, SuperFeatureFlag } from '../AdminSettingDataSource'
import { MOCK_APP_SETTINGS } from './data/mockAppSettings'
import { MOCK_FEATURE_FLAGS } from './data/mockFeatureFlags'

let settings = JSON.parse(JSON.stringify(MOCK_APP_SETTINGS))
let flags = JSON.parse(JSON.stringify(MOCK_FEATURE_FLAGS))

export class MockAdminSettingDataSource implements AdminSettingDataSource {
  private delay(ms = 200) { return new Promise<void>((r) => setTimeout(r, ms)) }

  async listSettings() {
    await this.delay()
    return [...settings] as SuperSetting[]
  }

  async updateSetting(key: string, value: string) {
    await this.delay(300)
    const idx = settings.findIndex((s: any) => s.key === key)
    if (idx === -1) throw new Error('Paramètre introuvable')
    settings[idx] = { ...settings[idx], value }
    return { ...settings[idx] } as SuperSetting
  }

  async listFeatureFlags() {
    await this.delay()
    return [...flags] as SuperFeatureFlag[]
  }

  async toggleFeatureFlag(key: string, enabled: boolean) {
    await this.delay(200)
    const idx = flags.findIndex((f: any) => f.key === key)
    if (idx === -1) throw new Error('Fonctionnalité introuvable')
    flags[idx] = { ...flags[idx], enabled }
    return { ...flags[idx] } as SuperFeatureFlag
  }
}
