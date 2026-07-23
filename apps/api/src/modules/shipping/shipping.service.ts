import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { eq, and, sql } from 'drizzle-orm'
import { DRIZZLE, type DrizzleDB } from '../../database/database.module'
import { shippingZones, shippingMethods, shippingRules } from '../../database/schema/shipping'
import { stores } from '../../database/schema/stores'

@Injectable()
export class ShippingService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async listZones() {
    return this.db.select().from(shippingZones).orderBy(shippingZones.priority)
  }

  async getZone(id: string) {
    const [zone] = await this.db.select().from(shippingZones).where(eq(shippingZones.id, id)).limit(1)
    if (!zone) throw new NotFoundException('Zone introuvable')
    return zone
  }

  async createZone(data: any) {
    if (!data.storeId) {
      const [firstStore] = await this.db.select().from(stores).limit(1)
      if (firstStore) data.storeId = firstStore.id
    }
    const [zone] = await this.db.insert(shippingZones).values(data).returning()
    return zone
  }

  async updateZone(id: string, data: any) {
    const [zone] = await this.db.update(shippingZones).set({ ...data, updatedAt: new Date() }).where(eq(shippingZones.id, id)).returning()
    if (!zone) throw new NotFoundException('Zone introuvable')
    return zone
  }

  async deleteZone(id: string) {
    const [zone] = await this.db.delete(shippingZones).where(eq(shippingZones.id, id)).returning()
    if (!zone) throw new NotFoundException('Zone introuvable')
    return zone
  }

  async toggleZone(id: string, isActive: boolean) {
    const [zone] = await this.db.update(shippingZones).set({ isActive, updatedAt: new Date() }).where(eq(shippingZones.id, id)).returning()
    if (!zone) throw new NotFoundException('Zone introuvable')
    return zone
  }

  async listMethods(zoneId?: string) {
    const where = zoneId ? eq(shippingMethods.zoneId, zoneId) : undefined
    return this.db.select().from(shippingMethods).where(where).orderBy(shippingMethods.createdAt)
  }

  async createMethod(data: any) {
    if (!data.storeId) {
      const [firstStore] = await this.db.select().from(stores).limit(1)
      if (firstStore) data.storeId = firstStore.id
    }
    const [method] = await this.db.insert(shippingMethods).values(data).returning()
    return method
  }

  async updateMethod(id: string, data: any) {
    const [method] = await this.db.update(shippingMethods).set({ ...data, updatedAt: new Date() }).where(eq(shippingMethods.id, id)).returning()
    if (!method) throw new NotFoundException('Méthode introuvable')
    return method
  }

  async deleteMethod(id: string) {
    const [method] = await this.db.delete(shippingMethods).where(eq(shippingMethods.id, id)).returning()
    if (!method) throw new NotFoundException('Méthode introuvable')
    return method
  }

  async listRules(zoneId?: string) {
    const where = zoneId ? eq(shippingRules.zoneId, zoneId) : undefined
    return this.db.select().from(shippingRules).where(where).orderBy(shippingRules.createdAt)
  }

  async createRule(data: any) {
    if (!data.storeId) {
      const [firstStore] = await this.db.select().from(stores).limit(1)
      if (firstStore) data.storeId = firstStore.id
    }
    const [rule] = await this.db.insert(shippingRules).values(data).returning()
    return rule
  }

  async updateRule(id: string, data: any) {
    const [rule] = await this.db.update(shippingRules).set({ ...data, updatedAt: new Date() }).where(eq(shippingRules.id, id)).returning()
    if (!rule) throw new NotFoundException('Règle introuvable')
    return rule
  }

  async deleteRule(id: string) {
    const [rule] = await this.db.delete(shippingRules).where(eq(shippingRules.id, id)).returning()
    if (!rule) throw new NotFoundException('Règle introuvable')
    return rule
  }
}
