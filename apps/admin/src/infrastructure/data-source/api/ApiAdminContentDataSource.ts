import type {
  AdminContentDataSource,
  Banner, ContentBlock, StaticPage, ContentSummary,
  CreateBannerInput, UpdateBannerInput,
  AppSetting, Logo, FeedSection, CreateFeedSectionInput, UpdateFeedSectionInput,
  FeedPost, CreateFeedPostInput, UpdateFeedPostInput,
  FeatureFlag, SocialLink, SEOMetadata, Shortcut, ShortcutTarget,
  PaymentMethod, CreatePaymentMethodInput, UpdatePaymentMethodInput,
} from '../AdminContentDataSource'
import api from '@/lib/api'

export class ApiAdminContentDataSource implements AdminContentDataSource {
  async getSummary(): Promise<ContentSummary> {
    const { data } = await api.get('/content/summary')
    return data as ContentSummary
  }

  async listBanners(): Promise<Banner[]> {
    const { data } = await api.get('/content/banners')
    return (data.data ?? data) as Banner[]
  }

  async getBannerById(id: string): Promise<Banner> {
    const { data } = await api.get(`/content/banners/${id}`)
    return data as Banner
  }

  async createBanner(input: CreateBannerInput): Promise<Banner> {
    const { data } = await api.post('/content/banners', input)
    return data as Banner
  }

  async updateBanner(id: string, input: UpdateBannerInput): Promise<Banner> {
    const { data } = await api.put(`/content/banners/${id}`, input)
    return data as Banner
  }

  async deleteBanner(id: string): Promise<void> {
    await api.delete(`/content/banners/${id}`)
  }

  async uploadBannerImage(file: File): Promise<{ url: string }> {
    const formData = new FormData()
    formData.append('file', file)
    const token = localStorage.getItem('admin_token')
    const baseURL = import.meta.env.VITE_API_URL ?? '/api'
    const res = await fetch(`${baseURL}/content/banners/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.message || `Upload failed (${res.status})`)
    }
    return res.json() as Promise<{ url: string }>
  }

  async listContentBlocks(group?: string): Promise<ContentBlock[]> {
    const { data } = await api.get('/content/blocks', { params: group ? { group } : undefined })
    const blocks = (data.data ?? data) as any[]
    // L'API Drizzle retourne `groupName` (camelCase), le type frontend attend `group`
    return blocks.map((b) => ({ ...b, group: b.group ?? b.groupName ?? '' })) as ContentBlock[]
  }

  async getContentBlock(id: string): Promise<ContentBlock> {
    const { data } = await api.get(`/content/blocks/${id}`)
    return { ...data, group: data.group ?? data.groupName ?? '' } as ContentBlock
  }

  async updateContentBlock(id: string, value: string): Promise<ContentBlock> {
    const { data } = await api.put(`/content/blocks/${id}`, { value })
    return { ...data, group: data.group ?? data.groupName ?? '' } as ContentBlock
  }

  async getContentGroups(): Promise<string[]> {
    const { data } = await api.get('/content/groups')
    return data as string[]
  }

  async listStaticPages(): Promise<StaticPage[]> {
    const { data } = await api.get('/content/pages')
    return (data.data ?? data) as StaticPage[]
  }

  async getStaticPage(id: string): Promise<StaticPage> {
    const { data } = await api.get(`/content/pages/${id}`)
    return data as StaticPage
  }

  async updateStaticPage(id: string, input: { title?: string; content: string }): Promise<StaticPage> {
    const { data } = await api.put(`/content/pages/${id}`, input)
    return data as StaticPage
  }

  async createStaticPage(input: { title: string; content: string }): Promise<StaticPage> {
    const { data } = await api.post('/content/pages', input)
    return data as StaticPage
  }

  async deleteStaticPage(id: string): Promise<void> {
    await api.delete(`/content/pages/${id}`)
  }

  async getAppSettings(): Promise<AppSetting[]> {
    const { data } = await api.get('/content/settings')
    return (data.data ?? data) as AppSetting[]
  }

  async updateAppSetting(key: string, value: string): Promise<AppSetting> {
    const { data } = await api.put(`/content/settings/${key}`, { value })
    return data as AppSetting
  }

  async listLogos(): Promise<Logo[]> {
    const { data } = await api.get('/content/logos')
    return (data.data ?? data) as Logo[]
  }

  async updateLogo(id: string, url: string): Promise<Logo> {
    const { data } = await api.put(`/content/logos/${id}`, { url })
    return data as Logo
  }

  async uploadLogo(id: string, file: File): Promise<Logo> {
    const formData = new FormData()
    formData.append('file', file)
    const token = localStorage.getItem('admin_token')
    const baseURL = import.meta.env.VITE_API_URL ?? '/api'
    const res = await fetch(`${baseURL}/content/logos/${id}/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.message || `Upload failed (${res.status})`)
    }
    return res.json() as Promise<Logo>
  }

  async listFeedSections(): Promise<FeedSection[]> {
    const { data } = await api.get('/content/feed-sections')
    return (data.data ?? data) as FeedSection[]
  }

  async createFeedSection(input: CreateFeedSectionInput): Promise<FeedSection> {
    const { data } = await api.post('/content/feed-sections', input)
    return data as FeedSection
  }

  async updateFeedSection(id: string, input: UpdateFeedSectionInput): Promise<FeedSection> {
    const { data } = await api.put(`/content/feed-sections/${id}`, input)
    return data as FeedSection
  }

  async deleteFeedSection(id: string): Promise<void> {
    await api.delete(`/content/feed-sections/${id}`)
  }

  async reorderFeedSections(ids: string[]): Promise<void> {
    await api.put('/content/feed-sections/reorder', { ids })
  }

  async listFeedPosts(): Promise<FeedPost[]> {
    const { data } = await api.get('/content/feed-posts')
    return (data.data ?? data) as FeedPost[]
  }

  async createFeedPost(input: CreateFeedPostInput): Promise<FeedPost> {
    const { data } = await api.post('/content/feed-posts', input)
    return data as FeedPost
  }

  async updateFeedPost(id: string, input: UpdateFeedPostInput): Promise<FeedPost> {
    const { data } = await api.put(`/content/feed-posts/${id}`, input)
    return data as FeedPost
  }

  async deleteFeedPost(id: string): Promise<void> {
    await api.delete(`/content/feed-posts/${id}`)
  }

  async uploadFeedMedia(file: File): Promise<{ url: string; mediaType: 'image' | 'video' }> {
    const formData = new FormData()
    formData.append('file', file)
    const token = localStorage.getItem('admin_token')
    const baseURL = import.meta.env.VITE_API_URL ?? '/api'
    const res = await fetch(`${baseURL}/content/feed-posts/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })
    if (!res.ok) throw new Error(`Upload échoué (${res.status})`)
    return res.json()
  }

  async listShortcuts(): Promise<Shortcut[]> {
    const { data } = await api.get('/content/shortcuts')
    return (data.data ?? data) as Shortcut[]
  }
  async createShortcut(input: { label: string; icon: string; target?: ShortcutTarget }): Promise<Shortcut> {
    const { data } = await api.post('/content/shortcuts', input)
    return data as Shortcut
  }
  async updateShortcut(id: string, input: { label?: string; icon?: string; isActive?: boolean; target?: ShortcutTarget }): Promise<Shortcut> {
    const { data } = await api.put(`/content/shortcuts/${id}`, input)
    return data as Shortcut
  }
  async deleteShortcut(id: string): Promise<void> {
    await api.delete(`/content/shortcuts/${id}`)
  }
  async reorderShortcuts(ids: string[]): Promise<void> {
    await api.put('/content/shortcuts/reorder', { ids })
  }

  async listFeatureFlags(): Promise<FeatureFlag[]> {
    const { data } = await api.get('/content/feature-flags')
    return (data.data ?? data) as FeatureFlag[]
  }

  async toggleFeatureFlag(key: string, enabled: boolean): Promise<FeatureFlag> {
    const { data } = await api.put(`/content/feature-flags/${key}`, { enabled })
    return data as FeatureFlag
  }

  async listSocialLinks(): Promise<SocialLink[]> {
    const { data } = await api.get('/content/social-links')
    return (data.data ?? data) as SocialLink[]
  }

  async updateSocialLink(platform: string, input: { url?: string; label?: string; isActive?: boolean }): Promise<SocialLink> {
    const { data } = await api.put(`/content/social-links/${platform}`, input)
    return data as SocialLink
  }

  async listSEOMetadata(): Promise<SEOMetadata[]> {
    const { data } = await api.get('/content/seo')
    return (data.data ?? data) as SEOMetadata[]
  }

  async updateSEOMetadata(page: string, input: { title?: string; description?: string; keywords?: string; ogImage?: string }): Promise<SEOMetadata> {
    const { data } = await api.put(`/content/seo/${page}`, input)
    return data as SEOMetadata
  }

  async listPaymentMethods(): Promise<PaymentMethod[]> {
    const { data } = await api.get('/content/payment-methods')
    return (data.data ?? data) as PaymentMethod[]
  }

  async getPaymentMethod(id: string): Promise<PaymentMethod> {
    const { data } = await api.get(`/content/payment-methods/${id}`)
    return data as PaymentMethod
  }

  async createPaymentMethod(input: CreatePaymentMethodInput): Promise<PaymentMethod> {
    const { data } = await api.post('/content/payment-methods', input)
    return data as PaymentMethod
  }

  async updatePaymentMethod(id: string, input: UpdatePaymentMethodInput): Promise<PaymentMethod> {
    const { data } = await api.put(`/content/payment-methods/${id}`, input)
    return data as PaymentMethod
  }

  async deletePaymentMethod(id: string): Promise<void> {
    await api.delete(`/content/payment-methods/${id}`)
  }

  async uploadPaymentMethodLogo(id: string, file: File): Promise<PaymentMethod> {
    const formData = new FormData()
    formData.append('file', file)
    const token = localStorage.getItem('admin_token')
    const baseURL = import.meta.env.VITE_API_URL ?? '/api'
    const res = await fetch(`${baseURL}/content/payment-methods/${id}/logo`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.message || `Upload failed (${res.status})`)
    }
    return res.json() as Promise<PaymentMethod>
  }
}
