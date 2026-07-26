import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, like, or, and, sql, inArray } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { stores, storeKyc, storeMedia } from '../../database/schema/stores';
import {
  storeSections,
  storeSectionItems,
} from '../../database/schema/store-sections';
import { products } from '../../database/schema/products';
import { admins, roles } from '../../database/schema/auth';

@Injectable()
export class StoresService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  /**
   * Colonnes de boutique enrichies des agrégats attendus par l'Admin.
   * Les compteurs sont calculés en SQL : jamais de valeur en dur côté client.
   *
   * `stores.id` est écrit en SQL brut et non interpolé : Drizzle le rendrait en
   * `"id"` non qualifié, qui résoudrait vers la colonne `id` de la sous-requête
   * au lieu de celle de la requête englobante — les compteurs remonteraient 0.
   */
  private storeColumns() {
    return {
      id: stores.id,
      name: stores.name,
      email: stores.email,
      phone: stores.phone,
      country: stores.country,
      city: stores.city,
      description: stores.description,
      status: stores.status,
      commissionRate: stores.commissionRate,
      createdAt: stores.createdAt,
      updatedAt: stores.updatedAt,
      logoUrl: sql<
        string | null
      >`(select sm.url from store_media sm where sm.store_id = stores.id and sm.type = 'logo' and sm.is_active = true limit 1)`,
      coverUrl: sql<
        string | null
      >`(select sm.url from store_media sm where sm.store_id = stores.id and sm.type = 'cover' and sm.is_active = true limit 1)`,
      productCount: sql<number>`(select count(*)::int from products p where p.store_id = stores.id and p.status = 'active')`,
      totalOrders: sql<number>`(select count(*)::int from orders o where o.store_id = stores.id and o.status not in ('cancelled', 'refunded'))`,
      revenue: sql<number>`(select coalesce(sum(o.total::numeric), 0)::float8 from orders o where o.store_id = stores.id and o.status not in ('cancelled', 'refunded'))`,
    };
  }

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
        .select(this.storeColumns())
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
      .select(this.storeColumns())
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

  // ====== MÉDIAS ======

  async listMedia(storeId: string) {
    return this.db
      .select()
      .from(storeMedia)
      .where(and(eq(storeMedia.storeId, storeId), eq(storeMedia.isActive, true)))
      .orderBy(storeMedia.type, storeMedia.sortOrder, storeMedia.createdAt);
  }

  async addMedia(
    storeId: string,
    data: { type: string; url: string; alt?: string },
  ) {
    const type = data.type;
    if (!['logo', 'cover', 'gallery'].includes(type)) {
      throw new BadRequestException('Type attendu : logo, cover ou gallery');
    }
    const [store] = await this.db
      .select({ id: stores.id })
      .from(stores)
      .where(eq(stores.id, storeId))
      .limit(1);
    if (!store) throw new NotFoundException('Boutique introuvable');

    // L'index unique partiel n'autorise qu'un logo/cover actif : on désactive l'ancien
    if (type === 'logo' || type === 'cover') {
      await this.db
        .update(storeMedia)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(storeMedia.storeId, storeId),
            eq(storeMedia.type, type),
            eq(storeMedia.isActive, true),
          ),
        );
    }

    const [{ maxOrder }] = await this.db
      .select({ maxOrder: sql<number>`coalesce(max(sort_order), -1)::int` })
      .from(storeMedia)
      .where(and(eq(storeMedia.storeId, storeId), eq(storeMedia.type, type)));

    const [media] = await this.db
      .insert(storeMedia)
      .values({
        storeId,
        type,
        url: data.url,
        alt: data.alt ?? null,
        sortOrder: Number(maxOrder ?? -1) + 1,
      })
      .returning();
    return media;
  }

  async reorderMedia(storeId: string, ids: string[]) {
    if (!ids.length) return { ok: true };
    // Le where borne sur storeId : impossible de réordonner les médias d'une autre boutique
    await Promise.all(
      ids.map((id, index) =>
        this.db
          .update(storeMedia)
          .set({ sortOrder: index, updatedAt: new Date() })
          .where(
            and(eq(storeMedia.id, id), eq(storeMedia.storeId, storeId)),
          ),
      ),
    );
    return { ok: true };
  }

  async deleteMedia(storeId: string, mediaId: string) {
    const [deleted] = await this.db
      .delete(storeMedia)
      .where(and(eq(storeMedia.id, mediaId), eq(storeMedia.storeId, storeId)))
      .returning({ id: storeMedia.id });
    if (!deleted)
      throw new NotFoundException('Média introuvable pour cette boutique');
    return { ok: true };
  }

  // ====== SECTIONS DE CATALOGUE ======
  // Chaque requête est bornée sur storeId : une section d'une autre boutique
  // est introuvable, jamais modifiable.

  private static readonly SECTION_LAYOUTS = [
    'grid',
    'rail',
    'list',
    'showcase',
  ];

  private assertLayout(layout?: string) {
    if (layout && !StoresService.SECTION_LAYOUTS.includes(layout)) {
      throw new BadRequestException(
        `Format attendu : ${StoresService.SECTION_LAYOUTS.join(', ')}`,
      );
    }
  }

  async listSections(storeId: string) {
    const rows = await this.db
      .select({
        id: storeSections.id,
        title: storeSections.title,
        subtitle: storeSections.subtitle,
        layout: storeSections.layout,
        sortOrder: storeSections.sortOrder,
        isActive: storeSections.isActive,
        productCount: sql<number>`(select count(*)::int from store_section_items si where si.section_id = store_sections.id)`,
      })
      .from(storeSections)
      .where(eq(storeSections.storeId, storeId))
      .orderBy(storeSections.sortOrder, storeSections.createdAt);
    return rows.map((r) => ({ ...r, productCount: Number(r.productCount ?? 0) }));
  }

  async createSection(
    storeId: string,
    data: { title?: string; subtitle?: string; layout?: string },
  ) {
    if (!data?.title?.trim())
      throw new BadRequestException('Titre de section requis');
    this.assertLayout(data.layout);
    const [{ maxOrder }] = await this.db
      .select({ maxOrder: sql<number>`coalesce(max(sort_order), -1)::int` })
      .from(storeSections)
      .where(eq(storeSections.storeId, storeId));
    const [section] = await this.db
      .insert(storeSections)
      .values({
        storeId,
        title: data.title.trim(),
        subtitle: data.subtitle?.trim() || null,
        layout: data.layout ?? 'grid',
        sortOrder: Number(maxOrder ?? -1) + 1,
      })
      .returning();
    return section;
  }

  async updateSection(
    storeId: string,
    sectionId: string,
    data: {
      title?: string;
      subtitle?: string | null;
      layout?: string;
      isActive?: boolean;
    },
  ) {
    this.assertLayout(data?.layout);
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (data?.title !== undefined) {
      if (!data.title.trim())
        throw new BadRequestException('Titre de section requis');
      patch.title = data.title.trim();
    }
    if (data?.subtitle !== undefined)
      patch.subtitle = data.subtitle?.trim() || null;
    if (data?.layout !== undefined) patch.layout = data.layout;
    if (data?.isActive !== undefined) patch.isActive = data.isActive;

    const [section] = await this.db
      .update(storeSections)
      .set(patch)
      .where(
        and(
          eq(storeSections.id, sectionId),
          eq(storeSections.storeId, storeId),
        ),
      )
      .returning();
    if (!section)
      throw new NotFoundException('Section introuvable pour cette boutique');
    return section;
  }

  async deleteSection(storeId: string, sectionId: string) {
    const [deleted] = await this.db
      .delete(storeSections)
      .where(
        and(
          eq(storeSections.id, sectionId),
          eq(storeSections.storeId, storeId),
        ),
      )
      .returning({ id: storeSections.id });
    if (!deleted)
      throw new NotFoundException('Section introuvable pour cette boutique');
    return { ok: true };
  }

  async reorderSections(storeId: string, ids: string[]) {
    if (!ids.length) return { ok: true };
    await Promise.all(
      ids.map((id, index) =>
        this.db
          .update(storeSections)
          .set({ sortOrder: index, updatedAt: new Date() })
          .where(
            and(
              eq(storeSections.id, id),
              eq(storeSections.storeId, storeId),
            ),
          ),
      ),
    );
    return { ok: true };
  }

  /** Vérifie que la section appartient bien à la boutique appelante. */
  private async assertSectionOwned(storeId: string, sectionId: string) {
    const [section] = await this.db
      .select({ id: storeSections.id })
      .from(storeSections)
      .where(
        and(
          eq(storeSections.id, sectionId),
          eq(storeSections.storeId, storeId),
        ),
      )
      .limit(1);
    if (!section)
      throw new NotFoundException('Section introuvable pour cette boutique');
  }

  async listSectionItems(storeId: string, sectionId: string) {
    await this.assertSectionOwned(storeId, sectionId);
    return this.db
      .select({
        id: storeSectionItems.id,
        productId: products.id,
        name: products.name,
        price: products.price,
        status: products.status,
        sortOrder: storeSectionItems.sortOrder,
        // Les images vivent dans product_images : première image par sortOrder
        imageUrl: sql<
          string | null
        >`(select pi.url from product_images pi where pi.product_id = products.id order by pi.sort_order limit 1)`,
      })
      .from(storeSectionItems)
      .innerJoin(products, eq(storeSectionItems.productId, products.id))
      .where(eq(storeSectionItems.sectionId, sectionId))
      .orderBy(storeSectionItems.sortOrder);
  }

  async addSectionItems(
    storeId: string,
    sectionId: string,
    productIds: string[],
  ) {
    await this.assertSectionOwned(storeId, sectionId);
    if (!productIds?.length) return { ok: true, added: 0 };

    // Seuls les produits de CETTE boutique sont affectables : sinon un gérant
    // mettrait en vitrine le catalogue d'un concurrent.
    const owned = await this.db
      .select({ id: products.id })
      .from(products)
      .where(
        and(eq(products.storeId, storeId), inArray(products.id, productIds)),
      );
    if (!owned.length)
      throw new BadRequestException(
        'Aucun produit de cette boutique dans la sélection',
      );

    const [{ maxOrder }] = await this.db
      .select({ maxOrder: sql<number>`coalesce(max(sort_order), -1)::int` })
      .from(storeSectionItems)
      .where(eq(storeSectionItems.sectionId, sectionId));

    let next = Number(maxOrder ?? -1) + 1;
    await this.db
      .insert(storeSectionItems)
      .values(
        owned.map((p) => ({
          sectionId,
          productId: p.id,
          sortOrder: next++,
        })),
      )
      // L'index unique empêche le doublon : on ignore silencieusement les
      // produits déjà présents dans la section.
      .onConflictDoNothing();
    return { ok: true, added: owned.length };
  }

  async removeSectionItem(
    storeId: string,
    sectionId: string,
    itemId: string,
  ) {
    await this.assertSectionOwned(storeId, sectionId);
    const [deleted] = await this.db
      .delete(storeSectionItems)
      .where(
        and(
          eq(storeSectionItems.id, itemId),
          eq(storeSectionItems.sectionId, sectionId),
        ),
      )
      .returning({ id: storeSectionItems.id });
    if (!deleted) throw new NotFoundException('Produit introuvable dans la section');
    return { ok: true };
  }

  async reorderSectionItems(
    storeId: string,
    sectionId: string,
    ids: string[],
  ) {
    await this.assertSectionOwned(storeId, sectionId);
    if (!ids.length) return { ok: true };
    await Promise.all(
      ids.map((id, index) =>
        this.db
          .update(storeSectionItems)
          .set({ sortOrder: index })
          .where(
            and(
              eq(storeSectionItems.id, id),
              eq(storeSectionItems.sectionId, sectionId),
            ),
          ),
      ),
    );
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
