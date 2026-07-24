export interface Banner {
  id: string
  title: string
  subtitle?: string
  description?: string
  imageUrl: string
  linkUrl?: string
  ctaText?: string
  discountLabel?: string
  isActive: boolean
  position: number
  screen: 'home' | 'store' | 'feed' | 'account'
  backgroundColor?: string
  startDate?: string
  endDate?: string
  createdAt: string
  updatedAt: string
}

export interface ContentBlock {
  id: string
  key: string
  value: string
  type: 'text' | 'html' | 'richtext'
  group: string
  screen: string
  label: string
  description?: string
  updatedAt: string
}

export interface StaticPage {
  id: string
  slug: string
  title: string
  content: string
  type: 'text' | 'html' | 'richtext'
  isActive: boolean
  updatedAt: string
}

export interface CreateBannerInput {
  title: string
  subtitle?: string
  description?: string
  imageUrl: string
  linkUrl?: string
  ctaText?: string
  discountLabel?: string
  screen: 'home' | 'store' | 'feed' | 'account'
  position: number
  backgroundColor?: string
  isActive?: boolean
  startDate?: string
  endDate?: string
}

// À l'update, les champs optionnels acceptent null pour être explicitement vidés
// (undefined est supprimé par JSON.stringify → le backend conserverait l'ancienne valeur)
export interface UpdateBannerInput extends Partial<Omit<CreateBannerInput, 'subtitle' | 'description' | 'linkUrl' | 'ctaText' | 'discountLabel' | 'backgroundColor' | 'startDate' | 'endDate'>> {
  subtitle?: string | null
  description?: string | null
  linkUrl?: string | null
  ctaText?: string | null
  discountLabel?: string | null
  backgroundColor?: string | null
  startDate?: string | null
  endDate?: string | null
}

// ── APP SETTINGS ──
export interface AppSetting {
  key: string
  value: string
  type: 'text' | 'number' | 'boolean' | 'select' | 'color' | 'image'
  label: string
  description?: string
  group: string
  options?: string[]
}

// ── LOGOS ──
export interface Logo {
  id: string
  context: 'splash' | 'tab-bar' | 'login' | 'header' | 'favicon' | 'email' | 'notification'
  url: string
  label: string
  updatedAt: string
}

// ── FEED SECTIONS ──
export interface FeedSection {
  id: string
  title: string
  type: 'products' | 'stores' | 'banners' | 'categories' | 'inspiration' | 'custom'
  displayStyle: 'horizontal-scroll' | 'grid' | 'list' | 'card'
  position: number
  isActive: boolean
  data?: Record<string, unknown>
  updatedAt: string
}

export interface CreateFeedSectionInput {
  title: string
  type: FeedSection['type']
  displayStyle: FeedSection['displayStyle']
  position: number
  isActive?: boolean
  data?: Record<string, unknown>
}

export interface UpdateFeedSectionInput extends Partial<CreateFeedSectionInput> {}

// ── FEED POSTS (publications Inspiration) ──
export interface FeedPost {
  id: string
  title: string
  mediaType: 'image' | 'video'
  mediaUrl: string
  thumbnailUrl?: string | null
  aspectRatio: number
  duration?: string | null
  authorName: string
  authorAvatar?: string | null
  linkUrl?: string | null
  position: number
  isActive: boolean
  likes?: number
  createdAt?: string
  updatedAt?: string
}

export interface CreateFeedPostInput {
  title: string
  mediaType: 'image' | 'video'
  mediaUrl: string
  thumbnailUrl?: string | null
  aspectRatio?: number
  duration?: string | null
  authorName?: string
  authorAvatar?: string | null
  linkUrl?: string | null
  position?: number
  isActive?: boolean
}

export interface UpdateFeedPostInput extends Partial<CreateFeedPostInput> {}

// ── SHORTCUTS ──
export type ShortcutTarget = {
  /** category = filtrer par catégorie, section = ouvrir une section, screen = écran de l'app, search = recherche pré-remplie */
  type: 'category' | 'section' | 'screen' | 'search'
  value: string
} | null

export interface Shortcut {
  id: string
  label: string
  icon: string
  target?: ShortcutTarget
  isActive: boolean
  key: string
  updatedAt: string
}

// ── FEATURE FLAGS ──
export interface FeatureFlag {
  key: string
  enabled: boolean
  label: string
  description?: string
  group: string
}

// ── SOCIAL LINKS ──
export interface SocialLink {
  platform: string
  url: string
  label: string
  icon: string
  isActive: boolean
}

// ── SEO ──
export interface SEOMetadata {
  page: string
  title: string
  description: string
  keywords: string
  ogImage?: string
}

// ── PAYMENT METHODS ──
export interface PaymentMethod {
  id: string
  code: string
  name: string
  description?: string
  logoUrl: string
  type: 'mobile-money' | 'card' | 'wallet' | 'cod'
  isActive: boolean
  position: number
  feePercent: number
  feeFixed: number
  minAmount?: number
  maxAmount?: number
  supportedCountries: string[]
  apiKey?: string
  apiSecret?: string
  apiEndpoint?: string
  isSandbox: boolean
  createdAt: string
  updatedAt: string
}

export interface CreatePaymentMethodInput {
  code: string
  name: string
  description?: string
  logoUrl: string
  type: PaymentMethod['type']
  position: number
  isActive?: boolean
  feePercent?: number
  feeFixed?: number
  minAmount?: number
  maxAmount?: number
  supportedCountries?: string[]
  apiKey?: string
  apiSecret?: string
  apiEndpoint?: string
  isSandbox?: boolean
}

export interface UpdatePaymentMethodInput extends Partial<CreatePaymentMethodInput> {}

export interface ContentSummary {
  totalBanners: number
  activeBanners: number
  totalContentBlocks: number
  totalStaticPages: number
  totalFeedSections: number
  totalSettings: number
  totalLogos: number
  totalPaymentMethods: number
  groups: { name: string; count: number }[]
}

export interface AdminContentDataSource {
  getSummary(): Promise<ContentSummary>

  listBanners(): Promise<Banner[]>
  getBannerById(id: string): Promise<Banner>
  createBanner(data: CreateBannerInput): Promise<Banner>
  updateBanner(id: string, data: UpdateBannerInput): Promise<Banner>
  deleteBanner(id: string): Promise<void>
  uploadBannerImage(file: File): Promise<{ url: string }>

  listContentBlocks(group?: string): Promise<ContentBlock[]>
  getContentBlock(id: string): Promise<ContentBlock>
  updateContentBlock(id: string, value: string): Promise<ContentBlock>
  getContentGroups(): Promise<string[]>

  listStaticPages(): Promise<StaticPage[]>
  getStaticPage(id: string): Promise<StaticPage>
  updateStaticPage(id: string, data: { title?: string; content: string }): Promise<StaticPage>
  createStaticPage(data: { title: string; content: string }): Promise<StaticPage>
  deleteStaticPage(id: string): Promise<void>

  // ── App Settings ──
  getAppSettings(): Promise<AppSetting[]>
  updateAppSetting(key: string, value: string): Promise<AppSetting>

  // ── Logos ──
  listLogos(): Promise<Logo[]>
  updateLogo(id: string, url: string): Promise<Logo>
  uploadLogo(id: string, file: File): Promise<Logo>

  // ── Feed Sections ──
  listFeedSections(): Promise<FeedSection[]>
  createFeedSection(data: CreateFeedSectionInput): Promise<FeedSection>
  updateFeedSection(id: string, data: UpdateFeedSectionInput): Promise<FeedSection>
  deleteFeedSection(id: string): Promise<void>
  reorderFeedSections(ids: string[]): Promise<void>

  // ── Feed Posts ──
  listFeedPosts(): Promise<FeedPost[]>
  createFeedPost(data: CreateFeedPostInput): Promise<FeedPost>
  updateFeedPost(id: string, data: UpdateFeedPostInput): Promise<FeedPost>
  deleteFeedPost(id: string): Promise<void>
  uploadFeedMedia(file: File): Promise<{ url: string; mediaType: 'image' | 'video' }>

  // ── Shortcuts ──
  listShortcuts(): Promise<Shortcut[]>
  createShortcut(data: { label: string; icon: string; target?: ShortcutTarget }): Promise<Shortcut>
  updateShortcut(id: string, data: { label?: string; icon?: string; isActive?: boolean; target?: ShortcutTarget }): Promise<Shortcut>
  deleteShortcut(id: string): Promise<void>
  reorderShortcuts(ids: string[]): Promise<void>

  // ── Feature Flags ──
  listFeatureFlags(): Promise<FeatureFlag[]>
  toggleFeatureFlag(key: string, enabled: boolean): Promise<FeatureFlag>

  // ── Social Links ──
  listSocialLinks(): Promise<SocialLink[]>
  updateSocialLink(platform: string, data: { url?: string; label?: string; isActive?: boolean }): Promise<SocialLink>

  // ── SEO ──
  listSEOMetadata(): Promise<SEOMetadata[]>
  updateSEOMetadata(page: string, data: { title?: string; description?: string; keywords?: string; ogImage?: string }): Promise<SEOMetadata>

  // ── Payment Methods ──
  listPaymentMethods(): Promise<PaymentMethod[]>
  getPaymentMethod(id: string): Promise<PaymentMethod>
  createPaymentMethod(data: CreatePaymentMethodInput): Promise<PaymentMethod>
  updatePaymentMethod(id: string, data: UpdatePaymentMethodInput): Promise<PaymentMethod>
  deletePaymentMethod(id: string): Promise<void>
  uploadPaymentMethodLogo(id: string, file: File): Promise<PaymentMethod>

  // ── Reviews ──
  listReviews(params: Record<string, string>): Promise<any>
  moderateReview(id: string, isActive: boolean): Promise<any>
}
