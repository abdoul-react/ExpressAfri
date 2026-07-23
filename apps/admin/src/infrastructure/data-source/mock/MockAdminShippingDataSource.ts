import type { AdminShippingDataSource, ShippingZone, ShippingMethod, ShippingRule } from '../AdminShippingDataSource'
import { MOCK_ZONES, MOCK_METHODS, MOCK_RULES } from './data/mockShipping'

let zones = JSON.parse(JSON.stringify(MOCK_ZONES)) as ShippingZone[]
let methods = JSON.parse(JSON.stringify(MOCK_METHODS)) as ShippingMethod[]
let rules = JSON.parse(JSON.stringify(MOCK_RULES)) as ShippingRule[]
let nextZoneId = 5, nextMethodId = 9, nextRuleId = 13

export class MockAdminShippingDataSource implements AdminShippingDataSource {
  private delay(ms = 200) { return new Promise<void>((r) => setTimeout(r, ms)) }

  async listZones() { await this.delay(); return [...zones] }
  async getZone(id: string) { await this.delay(); const z = zones.find((z) => z.id === id); if (!z) throw new Error('Zone introuvable'); return { ...z } }

  async createZone(data: { name: string; countries: string[]; priority?: number }) {
    await this.delay(300)
    const zone: ShippingZone = { id: `zone_${String(nextZoneId++).padStart(3, '0')}`, name: data.name, countries: data.countries, isActive: true, priority: data.priority ?? 99 }
    zones.push(zone)
    return { ...zone }
  }

  async updateZone(id: string, data: Partial<ShippingZone>) {
    await this.delay()
    const idx = zones.findIndex((z) => z.id === id)
    if (idx === -1) throw new Error('Zone introuvable')
    zones[idx] = { ...zones[idx], ...data }
    return { ...zones[idx] }
  }

  async deleteZone(id: string) { await this.delay(); zones = zones.filter((z) => z.id !== id); methods = methods.filter((m) => m.zoneId !== id); rules = rules.filter((r) => r.zoneId !== id) }
  async toggleZone(id: string, isActive: boolean) {
    await this.delay()
    const idx = zones.findIndex((z) => z.id === id)
    if (idx > -1) zones[idx].isActive = isActive
  }

  async listMethods(zoneId?: string) { await this.delay(); return methods.filter((m) => !zoneId || m.zoneId === zoneId) }
  async createMethod(data: Omit<ShippingMethod, 'id'>) {
    await this.delay(300)
    const method: ShippingMethod = { id: `meth_${String(nextMethodId++).padStart(3, '0')}`, ...data }
    methods.push(method)
    return method
  }
  async updateMethod(id: string, data: Partial<ShippingMethod>) { await this.delay(); const idx = methods.findIndex((m) => m.id === id); if (idx > -1) methods[idx] = { ...methods[idx], ...data }; return methods[idx] }
  async deleteMethod(id: string) { await this.delay(); methods = methods.filter((m) => m.id !== id) }

  async listRules(zoneId?: string) { await this.delay(); return rules.filter((r) => !zoneId || r.zoneId === zoneId) }
  async createRule(data: Omit<ShippingRule, 'id'>) {
    await this.delay(300)
    const rule: ShippingRule = { id: `rule_${String(nextRuleId++).padStart(3, '0')}`, ...data }
    rules.push(rule)
    return rule
  }
  async updateRule(id: string, data: Partial<ShippingRule>) { await this.delay(); const idx = rules.findIndex((r) => r.id === id); if (idx > -1) rules[idx] = { ...rules[idx], ...data }; return rules[idx] }
  async deleteRule(id: string) { await this.delay(); rules = rules.filter((r) => r.id !== id) }
}
