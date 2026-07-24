import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, like, or, and, sql } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { stores, storeKyc } from '../../database/schema/stores';
import { admins, roles } from '../../database/schema/auth';

@Injectable()
export class StoresService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async list(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (params.search)
      conditions.push(
        or(
          like(stores.name, `%${params.search}%`),
          like(stores.email, `%${params.search}%`),
        ),
      );
    if (params.status) conditions.push(eq(stores.status, params.status));

    const where = conditions.length ? and(...conditions) : undefined;
    const [data, [{ count }]] = await Promise.all([
      this.db
        .select()
        .from(stores)
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(stores.createdAt),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(stores)
        .where(where),
    ]);
    return { data, total: Number(count), page };
  }

  async getById(id: string) {
    const [store] = await this.db
      .select()
      .from(stores)
      .where(eq(stores.id, id))
      .limit(1);
    return store;
  }

  async create(data: any) {
    const [store] = await this.db.insert(stores).values(data).returning();
    return store;
  }

  async update(id: string, data: any) {
    const allowed: Record<string, unknown> = {}
    if (data.name !== undefined) allowed.name = data.name
    if (data.email !== undefined) allowed.email = data.email
    if (data.phone !== undefined) allowed.phone = data.phone
    if (data.country !== undefined) allowed.country = data.country
    if (data.city !== undefined) allowed.city = data.city
    if (data.description !== undefined) allowed.description = data.description
    if (data.status !== undefined) allowed.status = data.status
    if (data.commissionRate !== undefined) allowed.commissionRate = data.commissionRate
    const [store] = await this.db
      .update(stores)
      .set({ ...allowed, updatedAt: new Date() })
      .where(eq(stores.id, id))
      .returning();
    if (!store) throw new NotFoundException('Boutique introuvable');
    return store;
  }

  async delete(id: string) {
    // Détacher les admins rattachés à cette boutique avant suppression
    await this.db
      .update(admins)
      .set({ storeId: null })
      .where(eq(admins.storeId, id));

    const [store] = await this.db
      .delete(stores)
      .where(eq(stores.id, id))
      .returning();
    if (!store) throw new NotFoundException('Boutique introuvable');
    return store;
  }

  // ====== GÉRANTS DE BOUTIQUE ======
  // Un gérant est un compte admin rattaché à la boutique (admins.store_id).
  // Il se connecte au même panneau, mais ne voit que sa boutique.

  /** Le rôle « Gérant de boutique » (seedé en migration) — retrouvé par son label. */
  private async getManagerRoleId(): Promise<string> {
    const [role] = await this.db
      .select()
      .from(roles)
      .where(eq(roles.label, 'Gérant de boutique'))
      .limit(1);
    if (!role)
      throw new NotFoundException(
        'Rôle « Gérant de boutique » introuvable — exécutez les migrations',
      );
    return role.id;
  }

  async listManagers(storeId: string) {
    return this.db
      .select({
        id: admins.id,
        email: admins.email,
        name: admins.name,
        isActive: admins.isActive,
        createdAt: admins.createdAt,
      })
      .from(admins)
      .where(eq(admins.storeId, storeId))
      .orderBy(admins.createdAt);
  }

  async createManager(
    storeId: string,
    data: { email: string; name: string; password: string },
  ) {
    if (!data.email?.trim() || !data.name?.trim())
      throw new BadRequestException('Email et nom requis');
    if (!data.password || data.password.length < 8) {
      throw new BadRequestException(
        'Le mot de passe doit contenir au moins 8 caractères',
      );
    }
    const [store] = await this.db
      .select()
      .from(stores)
      .where(eq(stores.id, storeId))
      .limit(1);
    if (!store) throw new NotFoundException('Boutique introuvable');

    const [existing] = await this.db
      .select()
      .from(admins)
      .where(eq(admins.email, data.email.trim()))
      .limit(1);
    if (existing)
      throw new ConflictException('Un compte existe déjà avec cet email');

    const roleId = await this.getManagerRoleId();
    const passwordHash = await bcrypt.hash(data.password, 10);
    const [manager] = await this.db
      .insert(admins)
      .values({
        email: data.email.trim(),
        name: data.name.trim(),
        passwordHash,
        role: roleId,
        isSuperAdmin: false,
        isActive: true,
        storeId,
      })
      .returning();

    return {
      id: manager.id,
      email: manager.email,
      name: manager.name,
      isActive: manager.isActive,
      createdAt: manager.createdAt,
    };
  }

  async setManagerActive(
    storeId: string,
    managerId: string,
    isActive: boolean,
  ) {
    const [updated] = await this.db
      .update(admins)
      .set({ isActive, updatedAt: new Date() })
      // Le where inclut storeId : impossible de (dés)activer un compte d'une autre boutique
      .where(and(eq(admins.id, managerId), eq(admins.storeId, storeId)))
      .returning({ id: admins.id, isActive: admins.isActive });
    if (!updated)
      throw new NotFoundException('Gérant introuvable pour cette boutique');
    return updated;
  }

  async resetManagerPassword(
    storeId: string,
    managerId: string,
    password: string,
  ) {
    if (!password || password.length < 8) {
      throw new BadRequestException(
        'Le mot de passe doit contenir au moins 8 caractères',
      );
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const [updated] = await this.db
      .update(admins)
      .set({ passwordHash, updatedAt: new Date() })
      .where(and(eq(admins.id, managerId), eq(admins.storeId, storeId)))
      .returning({ id: admins.id });
    if (!updated)
      throw new NotFoundException('Gérant introuvable pour cette boutique');
    return { ok: true };
  }

  async getKyc(storeId: string) {
    const [kyc] = await this.db
      .select()
      .from(storeKyc)
      .where(eq(storeKyc.storeId, storeId))
      .limit(1);
    return kyc;
  }

  async upsertKyc(storeId: string, data: any) {
    const existing = await this.getKyc(storeId);
    if (existing) {
      const [kyc] = await this.db
        .update(storeKyc)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(storeKyc.storeId, storeId))
        .returning();
      return kyc;
    }
    const [kyc] = await this.db
      .insert(storeKyc)
      .values({ ...data, storeId })
      .returning();
    return kyc;
  }

  async approveKyc(storeId: string, adminId: string) {
    const [kyc] = await this.db
      .update(storeKyc)
      .set({
        status: 'approved',
        reviewedBy: adminId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(storeKyc.storeId, storeId))
      .returning();
    return kyc;
  }

  async rejectKyc(storeId: string, adminId: string, reason?: string) {
    const [kyc] = await this.db
      .update(storeKyc)
      .set({
        status: 'rejected',
        rejectionReason: reason ?? 'Documents non conformes',
        reviewedBy: adminId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(storeKyc.storeId, storeId))
      .returning();
    return kyc;
  }
}
