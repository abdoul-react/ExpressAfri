import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { stores } from '../../database/schema/stores';
import {
  storeGroups,
  storeGroupItems,
} from '../../database/schema/store-groups';

/**
 * Sections de la LISTE des boutiques — la vitrine de la marketplace.
 *
 * Ce service est le pendant *transverse* des sections de catalogue : là où
 * `StoresService.listSections()` borne tout sur un `storeId`, ici il n'y a
 * volontairement aucun cloisonnement par boutique, puisque ces sections
 * appartiennent à la plateforme. Le cloisonnement se fait donc au niveau du
 * contrôleur : seul l'admin central y accède, jamais un gérant de boutique.
 */
@Injectable()
export class StoreGroupsService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  /** Vue admin : toutes les sections, actives ou non, avec leur effectif. */
  async list() {
    const rows = await this.db
      .select({
        id: storeGroups.id,
        title: storeGroups.title,
        subtitle: storeGroups.subtitle,
        icon: storeGroups.icon,
        sortOrder: storeGroups.sortOrder,
        isActive: storeGroups.isActive,
        storeCount: sql<number>`(select count(*)::int from store_group_items gi where gi.group_id = store_groups.id)`,
      })
      .from(storeGroups)
      .orderBy(storeGroups.sortOrder, storeGroups.createdAt);
    return rows.map((r) => ({ ...r, storeCount: Number(r.storeCount ?? 0) }));
  }

  async create(data: { title?: string; subtitle?: string; icon?: string }) {
    if (!data?.title?.trim())
      throw new BadRequestException('Titre de section requis');
    const [{ maxOrder }] = await this.db
      .select({ maxOrder: sql<number>`coalesce(max(sort_order), -1)::int` })
      .from(storeGroups);
    const [group] = await this.db
      .insert(storeGroups)
      .values({
        title: data.title.trim(),
        subtitle: data.subtitle?.trim() || null,
        icon: data.icon?.trim() || null,
        sortOrder: Number(maxOrder ?? -1) + 1,
      })
      .returning();
    return group;
  }

  async update(
    groupId: string,
    data: {
      title?: string;
      subtitle?: string | null;
      icon?: string | null;
      isActive?: boolean;
    },
  ) {
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (data?.title !== undefined) {
      if (!data.title.trim())
        throw new BadRequestException('Titre de section requis');
      patch.title = data.title.trim();
    }
    if (data?.subtitle !== undefined)
      patch.subtitle = data.subtitle?.trim() || null;
    if (data?.icon !== undefined) patch.icon = data.icon?.trim() || null;
    if (data?.isActive !== undefined) patch.isActive = data.isActive;

    const [group] = await this.db
      .update(storeGroups)
      .set(patch)
      .where(eq(storeGroups.id, groupId))
      .returning();
    if (!group) throw new NotFoundException('Section introuvable');
    return group;
  }

  async remove(groupId: string) {
    const [deleted] = await this.db
      .delete(storeGroups)
      .where(eq(storeGroups.id, groupId))
      .returning({ id: storeGroups.id });
    if (!deleted) throw new NotFoundException('Section introuvable');
    return { ok: true };
  }

  async reorder(ids: string[]) {
    if (!ids.length) return { ok: true };
    await Promise.all(
      ids.map((id, index) =>
        this.db
          .update(storeGroups)
          .set({ sortOrder: index, updatedAt: new Date() })
          .where(eq(storeGroups.id, id)),
      ),
    );
    return { ok: true };
  }

  private async assertGroup(groupId: string) {
    const [group] = await this.db
      .select({ id: storeGroups.id })
      .from(storeGroups)
      .where(eq(storeGroups.id, groupId))
      .limit(1);
    if (!group) throw new NotFoundException('Section introuvable');
  }

  /** Boutiques affectées à la section, dans l'ordre choisi par l'admin. */
  async listItems(groupId: string) {
    await this.assertGroup(groupId);
    return this.db
      .select({
        id: storeGroupItems.id,
        storeId: stores.id,
        name: stores.name,
        city: stores.city,
        country: stores.country,
        status: stores.status,
        sortOrder: storeGroupItems.sortOrder,
        logoUrl: sql<
          string | null
        >`(select sm.url from store_media sm where sm.store_id = stores.id and sm.type = 'logo' and sm.is_active = true limit 1)`,
      })
      .from(storeGroupItems)
      .innerJoin(stores, eq(storeGroupItems.storeId, stores.id))
      .where(eq(storeGroupItems.groupId, groupId))
      .orderBy(storeGroupItems.sortOrder);
  }

  async addItems(groupId: string, storeIds: string[]) {
    await this.assertGroup(groupId);
    if (!storeIds?.length) return { ok: true, added: 0 };

    // On n'affecte que des boutiques réellement existantes : un id inventé
    // dans le corps de requête ne doit pas créer de ligne orpheline.
    const found = await this.db
      .select({ id: stores.id })
      .from(stores)
      .where(inArray(stores.id, storeIds));
    if (!found.length)
      throw new BadRequestException('Aucune boutique valide dans la sélection');

    const [{ maxOrder }] = await this.db
      .select({ maxOrder: sql<number>`coalesce(max(sort_order), -1)::int` })
      .from(storeGroupItems)
      .where(eq(storeGroupItems.groupId, groupId));

    let next = Number(maxOrder ?? -1) + 1;
    await this.db
      .insert(storeGroupItems)
      .values(
        found.map((s) => ({ groupId, storeId: s.id, sortOrder: next++ })),
      )
      // L'index unique gère le doublon : réaffecter une boutique déjà présente
      // est sans effet plutôt qu'une erreur.
      .onConflictDoNothing();
    return { ok: true, added: found.length };
  }

  async removeItem(groupId: string, itemId: string) {
    await this.assertGroup(groupId);
    const [deleted] = await this.db
      .delete(storeGroupItems)
      .where(
        and(
          eq(storeGroupItems.id, itemId),
          eq(storeGroupItems.groupId, groupId),
        ),
      )
      .returning({ id: storeGroupItems.id });
    if (!deleted)
      throw new NotFoundException('Boutique introuvable dans cette section');
    return { ok: true };
  }

  async reorderItems(groupId: string, ids: string[]) {
    await this.assertGroup(groupId);
    if (!ids.length) return { ok: true };
    await Promise.all(
      ids.map((id, index) =>
        this.db
          .update(storeGroupItems)
          .set({ sortOrder: index })
          .where(
            and(
              eq(storeGroupItems.id, id),
              eq(storeGroupItems.groupId, groupId),
            ),
          ),
      ),
    );
    return { ok: true };
  }
}
