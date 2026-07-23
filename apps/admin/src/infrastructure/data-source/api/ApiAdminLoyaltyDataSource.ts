import type { AdminLoyaltyDataSource, LoyaltyRule, LoyaltyReward, CustomerPoints, PointsTransaction, LoyaltyQueryParams, LoyaltySummary, PaginatedResult } from '../AdminLoyaltyDataSource'
import api from '@/lib/api'

function toRule(raw: any): LoyaltyRule {
  return { ...raw, points: Number(raw.points) }
}

function toReward(raw: any): LoyaltyReward {
  return { ...raw, pointsCost: Number(raw.pointsCost), value: Number(raw.value), stock: raw.stock != null ? Number(raw.stock) : undefined }
}

function toCustomer(raw: any): CustomerPoints {
  return { ...raw, points: Number(raw.points), lifetimePoints: Number(raw.lifetimePoints) }
}

export class ApiAdminLoyaltyDataSource implements AdminLoyaltyDataSource {
  async getSummary(): Promise<LoyaltySummary> {
    const { data } = await api.get('/loyalty/summary')
    return data
  }

  async listRules(): Promise<LoyaltyRule[]> {
    const { data } = await api.get('/loyalty/rules')
    return (data.data ?? data).map(toRule)
  }

  async createRule(input: Partial<LoyaltyRule>): Promise<LoyaltyRule> {
    const { data } = await api.post('/loyalty/rules', input)
    return toRule(data)
  }

  async updateRule(id: string, input: Partial<LoyaltyRule>): Promise<LoyaltyRule> {
    const { data } = await api.put(`/loyalty/rules/${id}`, input)
    return toRule(data)
  }

  async deleteRule(id: string): Promise<void> {
    await api.delete(`/loyalty/rules/${id}`)
  }

  async listRewards(): Promise<LoyaltyReward[]> {
    const { data } = await api.get('/loyalty/rewards')
    return (data.data ?? data).map(toReward)
  }

  async createReward(input: Partial<LoyaltyReward>): Promise<LoyaltyReward> {
    const { data } = await api.post('/loyalty/rewards', input)
    return toReward(data)
  }

  async updateReward(id: string, input: Partial<LoyaltyReward>): Promise<LoyaltyReward> {
    const { data } = await api.put(`/loyalty/rewards/${id}`, input)
    return toReward(data)
  }

  async deleteReward(id: string): Promise<void> {
    await api.delete(`/loyalty/rewards/${id}`)
  }

  async listCustomers(params: LoyaltyQueryParams): Promise<PaginatedResult<CustomerPoints>> {
    const { data } = await api.get('/loyalty/customers', { params })
    return { data: data.data.map(toCustomer), total: data.total, page: data.page, limit: data.limit, totalPages: data.totalPages }
  }

  async getCustomerPoints(customerId: string): Promise<CustomerPoints> {
    const { data } = await api.get(`/loyalty/customers/${customerId}`)
    return toCustomer(data)
  }

  async adjustPoints(customerId: string, points: number, reason: string): Promise<CustomerPoints> {
    const { data } = await api.put(`/loyalty/customers/${customerId}/points`, { balance: points, reason })
    return toCustomer(data)
  }

  async getTransactions(customerId: string): Promise<PointsTransaction[]> {
    const { data } = await api.get(`/loyalty/customers/${customerId}/transactions`)
    return data.data ?? data
  }
}
