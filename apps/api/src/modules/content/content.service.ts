import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import {
  contentBlocks,
  banners,
  staticPages,
  logos,
  feedSections,
  feedPosts,
  feedPostLikes,
  socialLinks,
  seoMetadata,
  paymentMethods,
} from '../../database/schema';
import { appSettings, featureFlags } from '../../database/schema/settings';

const SYSTEM_STORE_ID = '00000000-0000-0000-0000-000000000001';

@Injectable()
export class ContentService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  // ── Summary ──
  async getSummary() {
    const [bannerCount] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(banners);
    const [activeBanners] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(banners)
      .where(eq(banners.isActive, true));
    const [blockCount] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(contentBlocks);
    const [pageCount] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(staticPages);
    const [sectionCount] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(feedSections);
    const [settingCount] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(appSettings);
    const [logoCount] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(logos);
    const [paymentMethodCount] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(paymentMethods);
    const groups = await this.db
      .select({ name: contentBlocks.groupName, count: sql<number>`count(*)` })
      .from(contentBlocks)
      .groupBy(contentBlocks.groupName)
      .orderBy(contentBlocks.groupName);
    return {
      totalBanners: Number(bannerCount.count),
      activeBanners: Number(activeBanners.count),
      totalContentBlocks: Number(blockCount.count),
      totalStaticPages: Number(pageCount.count),
      totalFeedSections: Number(sectionCount.count),
      totalSettings: Number(settingCount.count),
      totalLogos: Number(logoCount.count),
      totalPaymentMethods: Number(paymentMethodCount.count),
      groups: groups.map((g) => ({ name: g.name, count: Number(g.count) })),
    };
  }

  // ── Banners ──
  async listBanners() {
    return this.db
      .select()
      .from(banners)
      .orderBy(banners.position, banners.createdAt);
  }

  async getBannerById(id: string) {
    const [banner] = await this.db
      .select()
      .from(banners)
      .where(eq(banners.id, id))
      .limit(1);
    if (!banner) throw new NotFoundException('Bannière introuvable');
    return banner;
  }

  async createBanner(data: any) {
    const [banner] = await this.db
      .insert(banners)
      .values(this.toBannerRow(data))
      .returning();
    return banner;
  }

  async updateBanner(id: string, data: any) {
    const [banner] = await this.db
      .update(banners)
      .set({ ...this.toBannerRow(data), updatedAt: new Date() })
      .where(eq(banners.id, id))
      .returning();
    if (!banner) throw new NotFoundException('Bannière introuvable');
    return banner;
  }

  // Convertit les dates ISO (chaînes) du client en Date pour Drizzle ; null passe tel quel (vide la colonne)
  private toBannerRow(data: any) {
    const row: any = { ...data };
    if ('startDate' in row)
      row.startDate = row.startDate ? new Date(row.startDate) : null;
    if ('endDate' in row)
      row.endDate = row.endDate ? new Date(row.endDate) : null;
    return row;
  }

  async deleteBanner(id: string) {
    const deleted = await this.db
      .delete(banners)
      .where(eq(banners.id, id))
      .returning({ id: banners.id });
    if (deleted.length === 0)
      throw new NotFoundException('Bannière introuvable');
  }

  // ── Content Blocks ──
  async listContentBlocks(group?: string) {
    const conditions = group ? [eq(contentBlocks.groupName, group)] : undefined;
    return this.db
      .select()
      .from(contentBlocks)
      .where(conditions ? and(...conditions) : undefined)
      .orderBy(contentBlocks.groupName, contentBlocks.key);
  }

  async getContentBlock(id: string) {
    const [block] = await this.db
      .select()
      .from(contentBlocks)
      .where(eq(contentBlocks.id, id))
      .limit(1);
    if (!block) throw new NotFoundException('Bloc introuvable');
    return block;
  }

  async updateContentBlock(id: string, value: string) {
    const [block] = await this.db
      .update(contentBlocks)
      .set({ value, updatedAt: new Date() })
      .where(eq(contentBlocks.id, id))
      .returning();
    if (!block) throw new NotFoundException('Bloc introuvable');
    return block;
  }

  async createContentBlock(data: any) {
    const [block] = await this.db
      .insert(contentBlocks)
      .values(data)
      .returning();
    return block;
  }

  async deleteContentBlock(id: string) {
    await this.db.delete(contentBlocks).where(eq(contentBlocks.id, id));
  }

  async getContentGroups() {
    const rows = await this.db
      .select({ name: contentBlocks.groupName })
      .from(contentBlocks)
      .groupBy(contentBlocks.groupName)
      .orderBy(contentBlocks.groupName);
    return rows.map((r) => r.name).filter(Boolean);
  }

  // ── Raccourcis accueil (content_blocks, groupe 'shortcuts') ──
  // Stockage : key = shortcut_NN (ordre d'affichage),
  // value = JSON {id, labelKey, icon, target:{type:'category'|'section'|'screen'|'search', value}}
  private parseShortcutValue(value: string): {
    id?: string;
    labelKey?: string;
    icon?: string;
    target?: { type: string; value: string } | null;
  } {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }

  async listShortcuts() {
    const rows = await this.db
      .select()
      .from(contentBlocks)
      .where(eq(contentBlocks.groupName, 'shortcuts'))
      .orderBy(contentBlocks.key);
    return rows.map((r) => {
      const v = this.parseShortcutValue(r.value);
      return {
        id: r.id,
        label: v.labelKey ?? '',
        icon: v.icon ?? 'tag',
        target: v.target ?? null,
        isActive: r.isActive ?? true,
        key: r.key,
        updatedAt: r.updatedAt,
      };
    });
  }

  async createShortcut(data: {
    label: string;
    icon: string;
    target?: { type: string; value: string } | null;
  }) {
    const rows = await this.db
      .select({ key: contentBlocks.key })
      .from(contentBlocks)
      .where(eq(contentBlocks.groupName, 'shortcuts'));
    // max des suffixes numériques + 1 (robuste après suppressions)
    const maxN = rows.reduce((max, r) => {
      const n = parseInt(r.key.replace(/^shortcut_/, ''), 10);
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);
    const key = `shortcut_${String(maxN + 1).padStart(2, '0')}`;
    const [block] = await this.db
      .insert(contentBlocks)
      .values({
        storeId: SYSTEM_STORE_ID,
        key,
        value: JSON.stringify({
          id: key,
          labelKey: data.label,
          icon: data.icon,
          target: data.target ?? null,
        }),
        type: 'json',
        groupName: 'shortcuts',
        label: `Raccourci — ${data.label}`,
        isActive: true,
      })
      .returning();
    return block;
  }

  async updateShortcut(
    id: string,
    data: {
      label?: string;
      icon?: string;
      isActive?: boolean;
      target?: { type: string; value: string } | null;
    },
  ) {
    const [row] = await this.db
      .select()
      .from(contentBlocks)
      .where(
        and(eq(contentBlocks.id, id), eq(contentBlocks.groupName, 'shortcuts')),
      )
      .limit(1);
    if (!row) throw new NotFoundException('Raccourci introuvable');
    const v = this.parseShortcutValue(row.value);
    const next = {
      id: v.id ?? row.key,
      labelKey: data.label ?? v.labelKey ?? '',
      icon: data.icon ?? v.icon ?? 'tag',
      // target explicitement passé (même null) → remplace ; sinon conserve
      target: data.target !== undefined ? data.target : (v.target ?? null),
    };
    const [block] = await this.db
      .update(contentBlocks)
      .set({
        value: JSON.stringify(next),
        label: `Raccourci — ${next.labelKey}`,
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        updatedAt: new Date(),
      })
      .where(eq(contentBlocks.id, id))
      .returning();
    return block;
  }

  async deleteShortcut(id: string) {
    await this.db
      .delete(contentBlocks)
      .where(
        and(eq(contentBlocks.id, id), eq(contentBlocks.groupName, 'shortcuts')),
      );
  }

  async reorderShortcuts(ids: string[]) {
    // Réécrit les clés shortcut_NN selon le nouvel ordre (le mobile trie par clé)
    await this.db.transaction(async (tx) => {
      // Passage par des clés temporaires pour éviter toute collision pendant le renommage
      for (let i = 0; i < ids.length; i++) {
        await tx
          .update(contentBlocks)
          .set({ key: `shortcut_tmp_${i}` })
          .where(
            and(
              eq(contentBlocks.id, ids[i]),
              eq(contentBlocks.groupName, 'shortcuts'),
            ),
          );
      }
      for (let i = 0; i < ids.length; i++) {
        await tx
          .update(contentBlocks)
          .set({
            key: `shortcut_${String(i + 1).padStart(2, '0')}`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(contentBlocks.id, ids[i]),
              eq(contentBlocks.groupName, 'shortcuts'),
            ),
          );
      }
    });
  }

  // ── Static Pages ──
  async listStaticPages() {
    return this.db.select().from(staticPages).orderBy(staticPages.title);
  }

  async getStaticPage(id: string) {
    const [page] = await this.db
      .select()
      .from(staticPages)
      .where(eq(staticPages.id, id))
      .limit(1);
    if (!page) throw new NotFoundException('Page introuvable');
    return page;
  }

  async updateStaticPage(
    id: string,
    data: { title?: string; content: string },
  ) {
    const [page] = await this.db
      .update(staticPages)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(staticPages.id, id))
      .returning();
    if (!page) throw new NotFoundException('Page introuvable');
    return page;
  }

  async createStaticPage(data: {
    title: string;
    content: string;
    slug?: string;
    type?: string;
  }) {
    if (!data.title?.trim())
      throw new BadRequestException('Le titre est requis');
    if (!data.content?.trim())
      throw new BadRequestException('Le contenu est requis');
    // Slug lisible auto-généré depuis le titre (l'admin n'a pas à le connaître)
    const slug = (
      data.slug?.trim() ||
      data.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '') // accents
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    ).slice(0, 80);
    const [existing] = await this.db
      .select({ id: staticPages.id })
      .from(staticPages)
      .where(eq(staticPages.slug, slug))
      .limit(1);
    if (existing)
      throw new BadRequestException('Une page avec ce titre existe déjà');
    const [page] = await this.db
      .insert(staticPages)
      .values({
        slug,
        title: data.title.trim(),
        content: data.content,
        type: (data.type as any) ?? 'html',
        isActive: true,
      })
      .returning();
    return page;
  }

  async deleteStaticPage(id: string) {
    const deleted = await this.db
      .delete(staticPages)
      .where(eq(staticPages.id, id))
      .returning({ id: staticPages.id });
    if (deleted.length === 0) throw new NotFoundException('Page introuvable');
  }

  // ── Settings (delegate to app_settings table) ──
  async getAppSettings() {
    return this.db
      .select()
      .from(appSettings)
      .orderBy(appSettings.group, appSettings.key);
  }

  async updateAppSetting(key: string, value: string) {
    const [updated] = await this.db
      .update(appSettings)
      .set({ value, updatedAt: new Date() })
      .where(eq(appSettings.key, key))
      .returning();
    if (!updated) throw new NotFoundException('Paramètre introuvable');
    return updated;
  }

  // ── Logos ──
  async listLogos() {
    return this.db.select().from(logos).orderBy(logos.context);
  }

  async updateLogo(id: string, url: string) {
    const [logo] = await this.db
      .update(logos)
      .set({ url, updatedAt: new Date() })
      .where(eq(logos.id, id))
      .returning();
    if (!logo) throw new NotFoundException('Logo introuvable');
    return logo;
  }

  // ── Feed Posts (publications Inspiration) ──
  async listFeedPosts() {
    const rows = await this.db
      .select({
        post: feedPosts,
        likes: sql<number>`(select count(*) from ${feedPostLikes} where ${feedPostLikes.postId} = ${feedPosts.id})`,
      })
      .from(feedPosts)
      .orderBy(feedPosts.position, feedPosts.createdAt);
    return rows.map((r) => ({ ...r.post, likes: Number(r.likes) }));
  }

  async createFeedPost(data: any) {
    const [post] = await this.db
      .insert(feedPosts)
      .values({
        title: data.title,
        mediaType: data.mediaType ?? 'image',
        mediaUrl: data.mediaUrl,
        thumbnailUrl: data.thumbnailUrl ?? null,
        aspectRatio: Number(data.aspectRatio) || 1,
        duration: data.duration ?? null,
        authorName: data.authorName || 'AfriExpress',
        authorAvatar: data.authorAvatar ?? null,
        linkUrl: data.linkUrl ?? null,
        position: Number(data.position) || 0,
        isActive: data.isActive ?? true,
      })
      .returning();
    return post;
  }

  async updateFeedPost(id: string, data: any) {
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    for (const k of [
      'title',
      'mediaType',
      'mediaUrl',
      'thumbnailUrl',
      'duration',
      'authorName',
      'authorAvatar',
      'linkUrl',
      'isActive',
    ] as const) {
      if (data[k] !== undefined) patch[k] = data[k];
    }
    if (data.aspectRatio !== undefined)
      patch.aspectRatio = Number(data.aspectRatio) || 1;
    if (data.position !== undefined)
      patch.position = Number(data.position) || 0;
    const [post] = await this.db
      .update(feedPosts)
      .set(patch)
      .where(eq(feedPosts.id, id))
      .returning();
    if (!post) throw new NotFoundException('Publication introuvable');
    return post;
  }

  async deleteFeedPost(id: string) {
    const deleted = await this.db
      .delete(feedPosts)
      .where(eq(feedPosts.id, id))
      .returning({ id: feedPosts.id });
    if (deleted.length === 0)
      throw new NotFoundException('Publication introuvable');
  }

  // ── Feed Sections ──
  async listFeedSections() {
    return this.db.select().from(feedSections).orderBy(feedSections.position);
  }

  /**
   * Une seule section peut être la source du « Vous aimerez aussi » du panier :
   * quand elle est cochée sur une section, on la retire des autres.
   */
  private async clearOtherCartRecommendations(exceptId?: string) {
    const all = await this.db.select().from(feedSections);
    for (const s of all) {
      if (s.id === exceptId) continue;
      const d = s.data as any;
      if (d?.cartRecommendations === true) {
        const { cartRecommendations: _drop, ...rest } = d;
        await this.db
          .update(feedSections)
          .set({
            data: Object.keys(rest).length ? rest : null,
            updatedAt: new Date(),
          })
          .where(eq(feedSections.id, s.id));
      }
    }
  }

  async createFeedSection(data: any) {
    const [section] = await this.db
      .insert(feedSections)
      .values(data)
      .returning();
    if (data?.data?.cartRecommendations === true) {
      await this.clearOtherCartRecommendations(section.id);
    }
    return section;
  }

  async updateFeedSection(id: string, data: any) {
    const [section] = await this.db
      .update(feedSections)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(feedSections.id, id))
      .returning();
    if (!section) throw new NotFoundException('Section introuvable');
    if (data?.data?.cartRecommendations === true) {
      await this.clearOtherCartRecommendations(id);
    }
    return section;
  }

  async deleteFeedSection(id: string) {
    const deleted = await this.db
      .delete(feedSections)
      .where(eq(feedSections.id, id))
      .returning({ id: feedSections.id });
    if (deleted.length === 0)
      throw new NotFoundException('Section introuvable');
  }

  async reorderFeedSections(ids: string[]) {
    // Transaction : évite un ordre à moitié appliqué si une mise à jour échoue
    await this.db.transaction(async (tx) => {
      for (let i = 0; i < ids.length; i++) {
        await tx
          .update(feedSections)
          .set({ position: i, updatedAt: new Date() })
          .where(eq(feedSections.id, ids[i]));
      }
    });
  }

  // ── Feature Flags (delegate to feature_flags table) ──
  async listFeatureFlags() {
    return this.db
      .select()
      .from(featureFlags)
      .orderBy(featureFlags.group, featureFlags.key);
  }

  async toggleFeatureFlag(key: string, enabled: boolean) {
    const [flag] = await this.db
      .update(featureFlags)
      .set({ enabled, updatedAt: new Date() })
      .where(eq(featureFlags.key, key))
      .returning();
    if (!flag) throw new NotFoundException('Fonctionnalité introuvable');
    return flag;
  }

  // ── Social Links ──
  async listSocialLinks() {
    return this.db.select().from(socialLinks).orderBy(socialLinks.platform);
  }

  async updateSocialLink(
    platform: string,
    data: { url?: string; label?: string; isActive?: boolean },
  ) {
    const [link] = await this.db
      .update(socialLinks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(socialLinks.platform, platform))
      .returning();
    if (!link) throw new NotFoundException('Lien introuvable');
    return link;
  }

  // ── SEO Metadata ──
  async listSEOMetadata() {
    return this.db.select().from(seoMetadata).orderBy(seoMetadata.page);
  }

  async updateSEOMetadata(
    page: string,
    data: {
      title?: string;
      description?: string;
      keywords?: string;
      ogImage?: string;
    },
  ) {
    const [seo] = await this.db
      .update(seoMetadata)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(seoMetadata.page, page))
      .returning();
    if (!seo) throw new NotFoundException('SEO introuvable pour cette page');
    return seo;
  }

  // ── Payment Methods ──
  async listPaymentMethods() {
    return this.db
      .select()
      .from(paymentMethods)
      .orderBy(paymentMethods.position);
  }

  async getPaymentMethod(id: string) {
    const [method] = await this.db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.id, id))
      .limit(1);
    if (!method) throw new NotFoundException('Méthode de paiement introuvable');
    return method;
  }

  async createPaymentMethod(data: any) {
    const [method] = await this.db
      .insert(paymentMethods)
      .values(data)
      .returning();
    return method;
  }

  async updatePaymentMethod(id: string, data: any) {
    const [method] = await this.db
      .update(paymentMethods)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(paymentMethods.id, id))
      .returning();
    if (!method) throw new NotFoundException('Méthode de paiement introuvable');
    return method;
  }

  async deletePaymentMethod(id: string) {
    await this.db.delete(paymentMethods).where(eq(paymentMethods.id, id));
  }
}
