export interface SuperSetting {
  key: string
  value: string
  type: 'text' | 'boolean' | 'number' | 'select' | 'color' | 'image'
  label: string
  group: string
  description?: string
  options?: string[]
}

export interface SuperFeatureFlag {
  key: string
  label: string
  description?: string
  group: string
  enabled: boolean
}

export interface AdminSettingDataSource {
  listSettings(): Promise<SuperSetting[]>
  updateSetting(key: string, value: string): Promise<SuperSetting>
  listFeatureFlags(): Promise<SuperFeatureFlag[]>
  toggleFeatureFlag(key: string, enabled: boolean): Promise<SuperFeatureFlag>
}
