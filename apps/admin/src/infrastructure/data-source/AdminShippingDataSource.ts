export interface ShippingZone {
  id: string
  name: string
  countries: string[]
  isActive: boolean
  priority: number
}

export interface ShippingMethod {
  id: string
  zoneId: string
  name: string
  description?: string
  baseRate: number
  freeThreshold?: number
  estimatedDaysMin: number
  estimatedDaysMax: number
  isActive: boolean
}

export interface ShippingRule {
  id: string
  zoneId: string
  name: string
  type: 'weight' | 'price' | 'quantity'
  minValue: number
  maxValue?: number
  rate: number
  isActive: boolean
}

export interface AdminShippingDataSource {
  listZones(): Promise<ShippingZone[]>
  getZone(id: string): Promise<ShippingZone>
  createZone(data: { name: string; countries: string[]; priority?: number }): Promise<ShippingZone>
  updateZone(id: string, data: Partial<ShippingZone>): Promise<ShippingZone>
  deleteZone(id: string): Promise<void>
  toggleZone(id: string, isActive: boolean): Promise<void>

  listMethods(zoneId?: string): Promise<ShippingMethod[]>
  createMethod(data: Omit<ShippingMethod, 'id'>): Promise<ShippingMethod>
  updateMethod(id: string, data: Partial<ShippingMethod>): Promise<ShippingMethod>
  deleteMethod(id: string): Promise<void>

  listRules(zoneId?: string): Promise<ShippingRule[]>
  createRule(data: Omit<ShippingRule, 'id'>): Promise<ShippingRule>
  updateRule(id: string, data: Partial<ShippingRule>): Promise<ShippingRule>
  deleteRule(id: string): Promise<void>
}
