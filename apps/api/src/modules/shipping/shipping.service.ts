import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { eq, and, or, isNull } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import {
  shippingZones,
  shippingMethods,
  shippingRules,
} from '../../database/schema/shipping';

@Injectable()
export class ShippingService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  /**
   * Une ressource de livraison appartient à un gérant si elle porte SON
   * storeId. Les lignes sans storeId sont les règles globales de la
   * plateforme : visibles par tous, modifiables par la plateforme seule.
   */
  private assertOwnedBy(row: { storeId: string | null }, storeId?: string) {
    if (!storeId) return;
    if (row.storeId !== storeId) {
      throw new ForbiddenException('Ressource hors de votre boutique');
    }
  }

  /**
   * Une méthode ou une règle ne peut être rattachée qu'à une zone globale ou à
   * une zone de la boutique. Sans ce contrôle, un gérant grefferait un tarif à
   * 0 sur la zone d'un concurrent : le devis de livraison retient la méthode
   * active la moins chère de la zone.
   */
  private async assertZoneUsable(zoneId: string | undefined, storeId?: string) {
    if (!storeId || !zoneId) return;
    const zone = await this.getZone(zoneId);
    if (zone.storeId && zone.storeId !== storeId) {
      throw new ForbiddenException('Zone hors de votre boutique');
    }
  }

  async listZones(storeId?: string) {
    const where = storeId
      ? or(eq(shippingZones.storeId, storeId), isNull(shippingZones.storeId))
      : undefined;
    return this.db
      .select()
      .from(shippingZones)
      .where(where)
      .orderBy(shippingZones.priority);
  }

  async getZone(id: string, storeId?: string) {
    const [zone] = await this.db
      .select()
      .from(shippingZones)
      .where(eq(shippingZones.id, id))
      .limit(1);
    if (!zone) throw new NotFoundException('Zone introuvable');
    // Une zone globale reste consultable ; une zone d'une autre boutique, non.
    if (storeId && zone.storeId && zone.storeId !== storeId) {
      throw new ForbiddenException('Ressource hors de votre boutique');
    }
    return zone;
  }

  async createZone(data: any, storeId?: string) {
    const [zone] = await this.db
      .insert(shippingZones)
      .values(storeId ? { ...data, storeId } : data)
      .returning();
    return zone;
  }

  async updateZone(id: string, data: any, storeId?: string) {
    const current = await this.getZone(id);
    this.assertOwnedBy(current, storeId);
    const { storeId: _ignored, ...payload } = data ?? {};
    const [zone] = await this.db
      .update(shippingZones)
      .set({ ...payload, updatedAt: new Date() })
      .where(eq(shippingZones.id, id))
      .returning();
    if (!zone) throw new NotFoundException('Zone introuvable');
    return zone;
  }

  async deleteZone(id: string, storeId?: string) {
    const current = await this.getZone(id);
    this.assertOwnedBy(current, storeId);
    const [zone] = await this.db
      .delete(shippingZones)
      .where(eq(shippingZones.id, id))
      .returning();
    if (!zone) throw new NotFoundException('Zone introuvable');
    return zone;
  }

  async toggleZone(id: string, isActive: boolean, storeId?: string) {
    const current = await this.getZone(id);
    this.assertOwnedBy(current, storeId);
    const [zone] = await this.db
      .update(shippingZones)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(shippingZones.id, id))
      .returning();
    if (!zone) throw new NotFoundException('Zone introuvable');
    return zone;
  }

  async listMethods(zoneId?: string, storeId?: string) {
    const conditions = [];
    if (zoneId) conditions.push(eq(shippingMethods.zoneId, zoneId));
    if (storeId)
      conditions.push(
        or(
          eq(shippingMethods.storeId, storeId),
          isNull(shippingMethods.storeId),
        ),
      );
    return this.db
      .select()
      .from(shippingMethods)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(shippingMethods.createdAt);
  }

  async createMethod(data: any, storeId?: string) {
    await this.assertZoneUsable(data?.zoneId, storeId);
    const [method] = await this.db
      .insert(shippingMethods)
      .values(storeId ? { ...data, storeId } : data)
      .returning();
    return method;
  }

  async updateMethod(id: string, data: any, storeId?: string) {
    const [current] = await this.db
      .select()
      .from(shippingMethods)
      .where(eq(shippingMethods.id, id))
      .limit(1);
    if (!current) throw new NotFoundException('Méthode introuvable');
    this.assertOwnedBy(current, storeId);
    await this.assertZoneUsable(data?.zoneId, storeId);
    const { storeId: _ignored, ...payload } = data ?? {};
    const [method] = await this.db
      .update(shippingMethods)
      .set({ ...payload, updatedAt: new Date() })
      .where(eq(shippingMethods.id, id))
      .returning();
    return method;
  }

  async deleteMethod(id: string, storeId?: string) {
    const [current] = await this.db
      .select()
      .from(shippingMethods)
      .where(eq(shippingMethods.id, id))
      .limit(1);
    if (!current) throw new NotFoundException('Méthode introuvable');
    this.assertOwnedBy(current, storeId);
    const [method] = await this.db
      .delete(shippingMethods)
      .where(eq(shippingMethods.id, id))
      .returning();
    return method;
  }

  async listRules(zoneId?: string, storeId?: string) {
    const conditions = [];
    if (zoneId) conditions.push(eq(shippingRules.zoneId, zoneId));
    if (storeId)
      conditions.push(
        or(eq(shippingRules.storeId, storeId), isNull(shippingRules.storeId)),
      );
    return this.db
      .select()
      .from(shippingRules)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(shippingRules.createdAt);
  }

  async createRule(data: any, storeId?: string) {
    await this.assertZoneUsable(data?.zoneId, storeId);
    const [rule] = await this.db
      .insert(shippingRules)
      .values(storeId ? { ...data, storeId } : data)
      .returning();
    return rule;
  }

  async updateRule(id: string, data: any, storeId?: string) {
    const [current] = await this.db
      .select()
      .from(shippingRules)
      .where(eq(shippingRules.id, id))
      .limit(1);
    if (!current) throw new NotFoundException('Règle introuvable');
    this.assertOwnedBy(current, storeId);
    await this.assertZoneUsable(data?.zoneId, storeId);
    const { storeId: _ignored, ...payload } = data ?? {};
    const [rule] = await this.db
      .update(shippingRules)
      .set({ ...payload, updatedAt: new Date() })
      .where(eq(shippingRules.id, id))
      .returning();
    return rule;
  }

  async deleteRule(id: string, storeId?: string) {
    const [current] = await this.db
      .select()
      .from(shippingRules)
      .where(eq(shippingRules.id, id))
      .limit(1);
    if (!current) throw new NotFoundException('Règle introuvable');
    this.assertOwnedBy(current, storeId);
    const [rule] = await this.db
      .delete(shippingRules)
      .where(eq(shippingRules.id, id))
      .returning();
    return rule;
  }
}
