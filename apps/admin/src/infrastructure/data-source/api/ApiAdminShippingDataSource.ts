import type { AdminShippingDataSource, ShippingZone, ShippingMethod, ShippingRule } from '../AdminShippingDataSource'
import api from '@/lib/api'

function toZone(raw: any): ShippingZone {
  return { ...raw, priority: Number(raw.priority) }
}

function toMethod(raw: any): ShippingMethod {
  return {
    ...raw,
    baseRate: Number(raw.baseRate),
    freeThreshold: raw.freeThreshold != null ? Number(raw.freeThreshold) : undefined,
    estimatedDaysMin: Number(raw.estimatedDaysMin),
    estimatedDaysMax: Number(raw.estimatedDaysMax),
  }
}

function toRule(raw: any): ShippingRule {
  return {
    ...raw,
    minValue: Number(raw.minValue),
    maxValue: raw.maxValue != null ? Number(raw.maxValue) : undefined,
    rate: Number(raw.rate),
  }
}

export class ApiAdminShippingDataSource implements AdminShippingDataSource {
  async listZones(): Promise<ShippingZone[]> {
    const { data } = await api.get('/shipping/zones')
    return (data.data ?? data).map(toZone)
  }

  async getZone(id: string): Promise<ShippingZone> {
    const { data } = await api.get(`/shipping/zones/${id}`)
    return toZone(data)
  }

  async createZone(input: { name: string; countries: string[]; priority?: number }): Promise<ShippingZone> {
    const { data } = await api.post('/shipping/zones', input)
    return toZone(data.data ?? data)
  }

  async updateZone(id: string, input: Partial<ShippingZone>): Promise<ShippingZone> {
    const { data } = await api.put(`/shipping/zones/${id}`, input)
    return toZone(data)
  }

  async deleteZone(id: string): Promise<void> {
    await api.delete(`/shipping/zones/${id}`)
  }

  async toggleZone(id: string, isActive: boolean): Promise<void> {
    await api.put(`/shipping/zones/${id}/toggle`, { isActive })
  }

  async listMethods(zoneId?: string): Promise<ShippingMethod[]> {
    const { data } = await api.get('/shipping/methods', { params: { zoneId } })
    return (data.data ?? data).map(toMethod)
  }

  async createMethod(input: Omit<ShippingMethod, 'id'>): Promise<ShippingMethod> {
    const { data } = await api.post('/shipping/methods', input)
    return toMethod(data)
  }

  async updateMethod(id: string, input: Partial<ShippingMethod>): Promise<ShippingMethod> {
    const { data } = await api.put(`/shipping/methods/${id}`, input)
    return toMethod(data)
  }

  async deleteMethod(id: string): Promise<void> {
    await api.delete(`/shipping/methods/${id}`)
  }

  async listRules(zoneId?: string): Promise<ShippingRule[]> {
    const { data } = await api.get('/shipping/rules', { params: { zoneId } })
    return (data.data ?? data).map(toRule)
  }

  async createRule(input: Omit<ShippingRule, 'id'>): Promise<ShippingRule> {
    const { data } = await api.post('/shipping/rules', input)
    return toRule(data)
  }

  async updateRule(id: string, input: Partial<ShippingRule>): Promise<ShippingRule> {
    const { data } = await api.put(`/shipping/rules/${id}`, input)
    return toRule(data)
  }

  async deleteRule(id: string): Promise<void> {
    await api.delete(`/shipping/rules/${id}`)
  }
}
