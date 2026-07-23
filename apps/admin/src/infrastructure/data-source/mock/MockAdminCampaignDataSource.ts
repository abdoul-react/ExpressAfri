import type { AdminCampaignDataSource, Campaign, CampaignQueryParams, PaginatedCampaigns, CreateCampaignInput, UpdateCampaignInput } from '../AdminCampaignDataSource'
import { MOCK_CAMPAIGNS } from './data/mockCampaigns'

let idCounter = MOCK_CAMPAIGNS.length + 1

export class MockAdminCampaignDataSource implements AdminCampaignDataSource {
  private items: Campaign[] = [...MOCK_CAMPAIGNS]
  private delay(ms = 300) { return new Promise<void>((r) => setTimeout(r, ms)) }

  async list(params?: CampaignQueryParams): Promise<PaginatedCampaigns> {
    await this.delay()
    let filtered = [...this.items]
    if (params?.search) {
      const s = params.search.toLowerCase()
      filtered = filtered.filter((x) => x.name.toLowerCase().includes(s) || x.description?.toLowerCase().includes(s))
    }
    if (params?.status) {
      const now = new Date()
      filtered = filtered.filter((x) => {
        if (params.status === 'active') return x.isActive && new Date(x.startDate) <= now && new Date(x.endDate) >= now
        if (params.status === 'inactive') return !x.isActive
        if (params.status === 'scheduled') return x.isActive && new Date(x.startDate) > now
        if (params.status === 'expired') return x.isActive && new Date(x.endDate) < now
        return true
      })
    }
    if (params?.type) filtered = filtered.filter((x) => x.type === params.type)
    const page = params?.page ?? 1
    const limit = params?.limit ?? 10
    const start = (page - 1) * limit
    return { data: filtered.slice(start, start + limit), total: filtered.length, page }
  }

  async getById(id: string): Promise<Campaign> {
    await this.delay()
    const item = this.items.find((x) => x.id === id)
    if (!item) throw new Error('Campagne introuvable')
    return item
  }

  async create(data: CreateCampaignInput): Promise<Campaign> {
    await this.delay()
    const now = new Date().toISOString()
    const item: Campaign = {
      id: `camp_${String(idCounter++).padStart(3, '0')}`,
      ...data,
      target: data.target ?? 'all',
      isActive: data.isActive ?? true,
      budget: data.budget ?? 0,
      promotionIds: data.promotionIds ?? [],
      spent: 0,
      metrics: { impressions: 0, clicks: 0, conversions: 0, revenue: 0 },
      createdAt: now,
      updatedAt: now,
    }
    this.items.push(item)
    return item
  }

  async update(id: string, data: UpdateCampaignInput): Promise<Campaign> {
    await this.delay()
    const idx = this.items.findIndex((x) => x.id === id)
    if (idx === -1) throw new Error('Campagne introuvable')
    this.items[idx] = { ...this.items[idx], ...data, updatedAt: new Date().toISOString() }
    return this.items[idx]
  }

  async delete(id: string): Promise<void> {
    await this.delay()
    const idx = this.items.findIndex((x) => x.id === id)
    if (idx === -1) throw new Error('Campagne introuvable')
    this.items.splice(idx, 1)
  }
}
