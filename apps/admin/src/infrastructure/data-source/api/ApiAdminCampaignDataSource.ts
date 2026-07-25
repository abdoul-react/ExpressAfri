import type { AdminCampaignDataSource, Campaign, CampaignQueryParams, PaginatedCampaigns, CampaignSummary, CreateCampaignInput, UpdateCampaignInput } from '../AdminCampaignDataSource'
import api from '@/lib/api'

export class ApiAdminCampaignDataSource implements AdminCampaignDataSource {
  async list(params?: CampaignQueryParams): Promise<PaginatedCampaigns> {
    const { data } = await api.get('/campaigns', { params })
    return data as PaginatedCampaigns
  }

  async getById(id: string): Promise<Campaign> {
    const { data } = await api.get(`/campaigns/${id}`)
    return data as Campaign
  }

  async create(input: CreateCampaignInput): Promise<Campaign> {
    const { data } = await api.post('/campaigns', input)
    return data as Campaign
  }

  async update(id: string, input: UpdateCampaignInput): Promise<Campaign> {
    const { data } = await api.put(`/campaigns/${id}`, input)
    return data as Campaign
  }

  async delete(id: string): Promise<void> {
    await api.delete(`/campaigns/${id}`)
  }

  async launch(id: string): Promise<Campaign> {
    const { data } = await api.put(`/campaigns/${id}/launch`)
    return data as Campaign
  }

  async pause(id: string): Promise<Campaign> {
    const { data } = await api.put(`/campaigns/${id}/pause`)
    return data as Campaign
  }

  async getSummary(): Promise<CampaignSummary> {
    const { data } = await api.get('/campaigns/summary')
    return data as CampaignSummary
  }
}