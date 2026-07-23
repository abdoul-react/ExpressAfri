export interface Campaign {
  id: string
  name: string
  description?: string
  type: 'seasonal' | 'flash_sale' | 'new_arrival' | 'clearance' | 'custom'
  startDate: string
  endDate: string
  isActive: boolean
  budget: number
  spent: number
  target: 'all' | 'category' | 'store' | 'product'
  targetId?: string
  targetName?: string
  promotionIds: string[]
  metrics: {
    impressions: number
    clicks: number
    conversions: number
    revenue: number
  }
  createdAt: string
  updatedAt: string
}

export interface CreateCampaignInput {
  name: string
  description?: string
  type: Campaign['type']
  startDate: string
  endDate: string
  isActive?: boolean
  budget?: number
  target?: Campaign['target']
  targetId?: string
  targetName?: string
  promotionIds?: string[]
}

export interface UpdateCampaignInput extends Partial<CreateCampaignInput> {}

export interface CampaignQueryParams {
  page?: number
  limit?: number
  search?: string
  status?: 'active' | 'inactive' | 'scheduled' | 'expired'
  type?: string
}

export interface PaginatedCampaigns {
  data: Campaign[]
  total: number
  page: number
}

export interface AdminCampaignDataSource {
  list(params?: CampaignQueryParams): Promise<PaginatedCampaigns>
  getById(id: string): Promise<Campaign>
  create(data: CreateCampaignInput): Promise<Campaign>
  update(id: string, data: UpdateCampaignInput): Promise<Campaign>
  delete(id: string): Promise<void>
}
