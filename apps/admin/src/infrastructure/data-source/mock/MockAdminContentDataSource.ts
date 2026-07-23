import type {
  AdminContentDataSource,
  Banner, ContentBlock, StaticPage, ContentSummary,
  CreateBannerInput, UpdateBannerInput,
  AppSetting, Logo, FeedSection, CreateFeedSectionInput, UpdateFeedSectionInput,
  FeatureFlag, SocialLink, SEOMetadata, Shortcut,
  PaymentMethod, CreatePaymentMethodInput, UpdatePaymentMethodInput,
} from '../AdminContentDataSource'
import { MOCK_BANNERS } from './data/mockBanners'
import { MOCK_CONTENT_BLOCKS } from './data/mockContentBlocks'
import { MOCK_STATIC_PAGES } from './data/mockStaticPages'
import { MOCK_APP_SETTINGS } from './data/mockAppSettings'
import { MOCK_LOGOS } from './data/mockLogos'
import { MOCK_FEED_SECTIONS } from './data/mockFeedSections'
import { MOCK_FEATURE_FLAGS } from './data/mockFeatureFlags'
import { MOCK_SOCIAL_LINKS } from './data/mockSocialLinks'
import { MOCK_SEO_METADATA } from './data/mockSEOMetadata'
import { MOCK_PAYMENT_METHODS } from './data/mockPaymentMethods'

let bannerIdCounter = MOCK_BANNERS.length + 1
let feedSectionIdCounter = MOCK_FEED_SECTIONS.length + 1
let paymentMethodIdCounter = MOCK_PAYMENT_METHODS.length + 1

export class MockAdminContentDataSource implements AdminContentDataSource {
  private banners: Banner[] = [...MOCK_BANNERS]
  private contentBlocks: ContentBlock[] = [...MOCK_CONTENT_BLOCKS]
  private staticPages: StaticPage[] = [...MOCK_STATIC_PAGES]
  private settings: AppSetting[] = [...MOCK_APP_SETTINGS as AppSetting[]]
  private logos: Logo[] = [...MOCK_LOGOS]
  private feedSections: FeedSection[] = [...MOCK_FEED_SECTIONS]
  private featureFlags: FeatureFlag[] = [...MOCK_FEATURE_FLAGS]
  private socialLinks: SocialLink[] = [...MOCK_SOCIAL_LINKS]
  private seoMetadata: SEOMetadata[] = [...MOCK_SEO_METADATA]
  private paymentMethods: PaymentMethod[] = [...MOCK_PAYMENT_METHODS]

  private delay(ms = 300): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  async getSummary(): Promise<ContentSummary> {
    await this.delay()
    const activeBanners = this.banners.filter((b) => b.isActive).length
    const groups = [...new Set(this.contentBlocks.map((b) => b.group))].map((name) => ({
      name,
      count: this.contentBlocks.filter((b) => b.group === name).length,
    }))
    return {
      totalBanners: this.banners.length,
      activeBanners,
      totalContentBlocks: this.contentBlocks.length,
      totalStaticPages: this.staticPages.length,
      totalFeedSections: this.feedSections.length,
      totalSettings: this.settings.length,
      totalLogos: this.logos.length,
      totalPaymentMethods: this.paymentMethods.length,
      groups,
    }
  }

  // ── Banners ──
  async listBanners(): Promise<Banner[]> { await this.delay(); return [...this.banners] }
  async getBannerById(id: string): Promise<Banner> {
    await this.delay()
    const b = this.banners.find((x) => x.id === id)
    if (!b) throw new Error('Bannière introuvable')
    return b
  }
  async createBanner(data: CreateBannerInput): Promise<Banner> {
    await this.delay()
    const now = new Date().toISOString()
    const banner: Banner = { id: `banner_${String(bannerIdCounter++).padStart(3, '0')}`, ...data, isActive: data.isActive ?? true, createdAt: now, updatedAt: now }
    this.banners.push(banner)
    return banner
  }
  async updateBanner(id: string, data: UpdateBannerInput): Promise<Banner> {
    await this.delay()
    const idx = this.banners.findIndex((x) => x.id === id)
    if (idx === -1) throw new Error('Bannière introuvable')
    // null = vider explicitement le champ (comme l'API réelle) → undefined dans le modèle local
    const normalized = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === null ? undefined : v]),
    ) as Partial<Banner>
    this.banners[idx] = { ...this.banners[idx], ...normalized, updatedAt: new Date().toISOString() }
    return this.banners[idx]
  }
  async deleteBanner(id: string): Promise<void> {
    await this.delay()
    const idx = this.banners.findIndex((x) => x.id === id)
    if (idx === -1) throw new Error('Bannière introuvable')
    this.banners.splice(idx, 1)
  }

  async uploadBannerImage(file: File): Promise<{ url: string }> {
    await this.delay()
    return { url: `/uploads/banners/mock_${file.name}` }
  }

  // ── Content Blocks ──
  async listContentBlocks(group?: string): Promise<ContentBlock[]> {
    await this.delay()
    let r = [...this.contentBlocks]
    if (group) r = r.filter((x) => x.group === group)
    return r
  }
  async getContentBlock(id: string): Promise<ContentBlock> {
    await this.delay()
    const b = this.contentBlocks.find((x) => x.id === id)
    if (!b) throw new Error('Bloc introuvable')
    return b
  }
  async updateContentBlock(id: string, value: string): Promise<ContentBlock> {
    await this.delay()
    const idx = this.contentBlocks.findIndex((x) => x.id === id)
    if (idx === -1) throw new Error('Bloc introuvable')
    this.contentBlocks[idx] = { ...this.contentBlocks[idx], value, updatedAt: new Date().toISOString() }
    return this.contentBlocks[idx]
  }
  async getContentGroups(): Promise<string[]> {
    await this.delay()
    return [...new Set(this.contentBlocks.map((x) => x.group))]
  }

  // ── Static Pages ──
  async listStaticPages(): Promise<StaticPage[]> { await this.delay(); return [...this.staticPages] }
  async getStaticPage(id: string): Promise<StaticPage> {
    await this.delay()
    const p = this.staticPages.find((x) => x.id === id)
    if (!p) throw new Error('Page introuvable')
    return p
  }
  async updateStaticPage(id: string, data: { title?: string; content: string }): Promise<StaticPage> {
    await this.delay()
    const idx = this.staticPages.findIndex((x) => x.id === id)
    if (idx === -1) throw new Error('Page introuvable')
    this.staticPages[idx] = { ...this.staticPages[idx], ...data, updatedAt: new Date().toISOString() }
    return this.staticPages[idx]
  }
  async createStaticPage(data: { title: string; content: string }): Promise<StaticPage> {
    await this.delay()
    const page: StaticPage = {
      id: `page_${Date.now()}`,
      slug: data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
      title: data.title,
      content: data.content,
      type: 'html',
      isActive: true,
      updatedAt: new Date().toISOString(),
    } as StaticPage
    this.staticPages.push(page)
    return page
  }
  async deleteStaticPage(id: string): Promise<void> {
    await this.delay()
    this.staticPages = this.staticPages.filter((x) => x.id !== id)
  }

  // ── App Settings ──
  async getAppSettings(): Promise<AppSetting[]> { await this.delay(); return [...this.settings] }
  async updateAppSetting(key: string, value: string): Promise<AppSetting> {
    await this.delay()
    const idx = this.settings.findIndex((x) => x.key === key)
    if (idx === -1) throw new Error('Paramètre introuvable')
    this.settings[idx] = { ...this.settings[idx], value }
    return this.settings[idx]
  }

  // ── Logos ──
  async listLogos(): Promise<Logo[]> { await this.delay(); return [...this.logos] }
  async updateLogo(id: string, url: string): Promise<Logo> {
    await this.delay()
    const idx = this.logos.findIndex((x) => x.id === id)
    if (idx === -1) throw new Error('Logo introuvable')
    this.logos[idx] = { ...this.logos[idx], url, updatedAt: new Date().toISOString() }
    return this.logos[idx]
  }
  async uploadLogo(id: string, _file: File): Promise<Logo> {
    return this.updateLogo(id, URL.createObjectURL(_file))
  }

  // ── Feed Sections ──
  async listFeedSections(): Promise<FeedSection[]> { await this.delay(); return [...this.feedSections] }
  async createFeedSection(data: CreateFeedSectionInput): Promise<FeedSection> {
    await this.delay()
    const section: FeedSection = {
      id: `fs_${String(feedSectionIdCounter++).padStart(3, '0')}`,
      ...data,
      isActive: data.isActive ?? true,
      updatedAt: new Date().toISOString(),
    }
    this.feedSections.push(section)
    return section
  }
  async updateFeedSection(id: string, data: UpdateFeedSectionInput): Promise<FeedSection> {
    await this.delay()
    const idx = this.feedSections.findIndex((x) => x.id === id)
    if (idx === -1) throw new Error('Section introuvable')
    this.feedSections[idx] = { ...this.feedSections[idx], ...data, updatedAt: new Date().toISOString() }
    return this.feedSections[idx]
  }
  async deleteFeedSection(id: string): Promise<void> {
    await this.delay()
    const idx = this.feedSections.findIndex((x) => x.id === id)
    if (idx === -1) throw new Error('Section introuvable')
    this.feedSections.splice(idx, 1)
  }
  async reorderFeedSections(ids: string[]): Promise<void> {
    await this.delay()
    const map = new Map(this.feedSections.map((s) => [s.id, s]))
    this.feedSections = ids.map((id, i) => {
      const s = map.get(id)
      if (!s) throw new Error(`Section ${id} introuvable`)
      return { ...s, position: i + 1 }
    })
  }

  // ── Feed Posts ──
  private feedPosts: import('../AdminContentDataSource').FeedPost[] = []
  async listFeedPosts() { await this.delay(); return [...this.feedPosts] }
  async createFeedPost(data: import('../AdminContentDataSource').CreateFeedPostInput) {
    await this.delay()
    const post: import('../AdminContentDataSource').FeedPost = {
      id: `fp_${Date.now()}`,
      title: data.title,
      mediaType: data.mediaType,
      mediaUrl: data.mediaUrl,
      thumbnailUrl: data.thumbnailUrl ?? null,
      aspectRatio: data.aspectRatio ?? 1,
      duration: data.duration ?? null,
      authorName: data.authorName ?? 'AfriExpress',
      authorAvatar: data.authorAvatar ?? null,
      linkUrl: data.linkUrl ?? null,
      position: data.position ?? 0,
      isActive: data.isActive ?? true,
      likes: 0,
    }
    this.feedPosts.push(post)
    return post
  }
  async updateFeedPost(id: string, data: import('../AdminContentDataSource').UpdateFeedPostInput) {
    await this.delay()
    const idx = this.feedPosts.findIndex((p) => p.id === id)
    if (idx < 0) throw new Error('Publication introuvable')
    this.feedPosts[idx] = { ...this.feedPosts[idx], ...data }
    return this.feedPosts[idx]
  }
  async deleteFeedPost(id: string) {
    await this.delay()
    this.feedPosts = this.feedPosts.filter((p) => p.id !== id)
  }
  async uploadFeedMedia(_file: File) {
    await this.delay(300)
    return { url: '/uploads/feed/mock.jpg', mediaType: 'image' as const }
  }

  // ── Feature Flags ──
  async listFeatureFlags(): Promise<FeatureFlag[]> { await this.delay(); return [...this.featureFlags] }
  async toggleFeatureFlag(key: string, enabled: boolean): Promise<FeatureFlag> {
    await this.delay()
    const idx = this.featureFlags.findIndex((x) => x.key === key)
    if (idx === -1) throw new Error('Fonctionnalité introuvable')
    this.featureFlags[idx] = { ...this.featureFlags[idx], enabled }
    return this.featureFlags[idx]
  }

  // ── Shortcuts ──
  private shortcuts: Shortcut[] = [
    { id: 's1', label: 'Électronique', icon: 'laptop', isActive: true, key: 'shortcut_01', updatedAt: new Date().toISOString() },
    { id: 's2', label: 'Mode', icon: 'tshirtCrew', isActive: true, key: 'shortcut_02', updatedAt: new Date().toISOString() },
    { id: 's3', label: 'Beauté', icon: 'lipstick', isActive: true, key: 'shortcut_03', updatedAt: new Date().toISOString() },
    { id: 's4', label: 'Maison', icon: 'home', isActive: true, key: 'shortcut_04', updatedAt: new Date().toISOString() },
    { id: 's5', label: 'Sport', icon: 'basketball', isActive: true, key: 'shortcut_05', updatedAt: new Date().toISOString() },
    { id: 's6', label: 'Téléphones', icon: 'cellphone', isActive: true, key: 'shortcut_06', updatedAt: new Date().toISOString() },
    { id: 's7', label: 'Auto', icon: 'car', isActive: true, key: 'shortcut_07', updatedAt: new Date().toISOString() },
    { id: 's8', label: 'Supermarché', icon: 'cart', isActive: true, key: 'shortcut_08', updatedAt: new Date().toISOString() },
  ]
  private shortcutIdCounter = 9

  async listShortcuts(): Promise<Shortcut[]> { await this.delay(); return [...this.shortcuts] }
  async createShortcut(data: { label: string; icon: string; target?: import('../AdminContentDataSource').ShortcutTarget }): Promise<Shortcut> {
    await this.delay()
    const n = this.shortcutIdCounter++
    const s: Shortcut = {
      id: `s${n}`, label: data.label, icon: data.icon,
      isActive: true, key: `shortcut_${String(n).padStart(2, '0')}`,
      updatedAt: new Date().toISOString(),
    }
    this.shortcuts.push(s)
    return s
  }
  async updateShortcut(id: string, data: { label?: string; icon?: string; isActive?: boolean; target?: import('../AdminContentDataSource').ShortcutTarget }): Promise<Shortcut> {
    await this.delay()
    const idx = this.shortcuts.findIndex((x) => x.id === id)
    if (idx === -1) throw new Error('Raccourci introuvable')
    this.shortcuts[idx] = { ...this.shortcuts[idx], ...data, updatedAt: new Date().toISOString() }
    return this.shortcuts[idx]
  }
  async deleteShortcut(id: string): Promise<void> {
    await this.delay()
    const idx = this.shortcuts.findIndex((x) => x.id === id)
    if (idx === -1) throw new Error('Raccourci introuvable')
    this.shortcuts.splice(idx, 1)
  }
  async reorderShortcuts(ids: string[]): Promise<void> {
    await this.delay()
    const map = new Map(this.shortcuts.map((s) => [s.id, s]))
    this.shortcuts = ids.map((id, i) => {
      const s = map.get(id)
      if (!s) throw new Error(`Raccourci ${id} introuvable`)
      return { ...s, key: `shortcut_${String(i + 1).padStart(2, '0')}` }
    })
  }

  // ── Social Links ──
  async listSocialLinks(): Promise<SocialLink[]> { await this.delay(); return [...this.socialLinks] }
  async updateSocialLink(platform: string, data: { url?: string; label?: string; isActive?: boolean }): Promise<SocialLink> {
    await this.delay()
    const idx = this.socialLinks.findIndex((x) => x.platform === platform)
    if (idx === -1) throw new Error('Lien social introuvable')
    this.socialLinks[idx] = { ...this.socialLinks[idx], ...data }
    return this.socialLinks[idx]
  }

  // ── SEO ──
  async listSEOMetadata(): Promise<SEOMetadata[]> { await this.delay(); return [...this.seoMetadata] }
  async updateSEOMetadata(page: string, data: { title?: string; description?: string; keywords?: string; ogImage?: string }): Promise<SEOMetadata> {
    await this.delay()
    const idx = this.seoMetadata.findIndex((x) => x.page === page)
    if (idx === -1) throw new Error('Page SEO introuvable')
    this.seoMetadata[idx] = { ...this.seoMetadata[idx], ...data }
    return this.seoMetadata[idx]
  }

  // ── Payment Methods ──
  async listPaymentMethods(): Promise<PaymentMethod[]> { await this.delay(); return [...this.paymentMethods] }
  async getPaymentMethod(id: string): Promise<PaymentMethod> {
    await this.delay()
    const pm = this.paymentMethods.find((x) => x.id === id)
    if (!pm) throw new Error('Méthode de paiement introuvable')
    return pm
  }
  async createPaymentMethod(data: CreatePaymentMethodInput): Promise<PaymentMethod> {
    await this.delay()
    const now = new Date().toISOString()
    const pm: PaymentMethod = {
      id: `pm_${String(paymentMethodIdCounter++).padStart(3, '0')}`,
      code: data.code,
      name: data.name,
      description: data.description ?? '',
      logoUrl: data.logoUrl,
      type: data.type,
      isActive: data.isActive ?? true,
      position: data.position,
      feePercent: data.feePercent ?? 0,
      feeFixed: data.feeFixed ?? 0,
      minAmount: data.minAmount,
      maxAmount: data.maxAmount,
      supportedCountries: data.supportedCountries ?? ['*'],
      apiKey: data.apiKey ?? '',
      apiSecret: data.apiSecret ?? '',
      apiEndpoint: data.apiEndpoint ?? '',
      isSandbox: data.isSandbox ?? true,
      createdAt: now,
      updatedAt: now,
    }
    this.paymentMethods.push(pm)
    return pm
  }
  async updatePaymentMethod(id: string, data: UpdatePaymentMethodInput): Promise<PaymentMethod> {
    await this.delay()
    const idx = this.paymentMethods.findIndex((x) => x.id === id)
    if (idx === -1) throw new Error('Méthode de paiement introuvable')
    this.paymentMethods[idx] = { ...this.paymentMethods[idx], ...data, updatedAt: new Date().toISOString() }
    return this.paymentMethods[idx]
  }
  async deletePaymentMethod(id: string): Promise<void> {
    await this.delay()
    const idx = this.paymentMethods.findIndex((x) => x.id === id)
    if (idx === -1) throw new Error('Méthode de paiement introuvable')
    this.paymentMethods.splice(idx, 1)
  }
  async uploadPaymentMethodLogo(id: string, _file: File): Promise<PaymentMethod> {
    await this.delay()
    const idx = this.paymentMethods.findIndex((x) => x.id === id)
    if (idx === -1) throw new Error('Méthode de paiement introuvable')
    this.paymentMethods[idx].logoUrl = '/uploads/payment-logos/mock.png'
    return this.paymentMethods[idx]
  }
}
