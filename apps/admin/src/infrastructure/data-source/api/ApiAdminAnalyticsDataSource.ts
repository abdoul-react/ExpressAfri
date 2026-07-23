import type { AdminAnalyticsDataSource, AnalyticsData, AnalyticsChartDataPoint, FunnelStep, CohortRow, AbandonedCartData } from '../AdminAnalyticsDataSource'
import api from '@/lib/api'

export class ApiAdminAnalyticsDataSource implements AdminAnalyticsDataSource {
  async getAnalytics(period: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom', from?: string, to?: string): Promise<AnalyticsData> {
    const params: any = { period }
    if (from) params.from = from
    if (to) params.to = to
    const { data } = await api.get('/analytics/dashboard', { params })
    return data as AnalyticsData
  }

  async getRevenueChart(_period: string, _from?: string, _to?: string): Promise<AnalyticsChartDataPoint[]> {
    return []
  }

  async getOrdersChart(_period: string, _from?: string, _to?: string): Promise<AnalyticsChartDataPoint[]> {
    return []
  }

  async getFunnelData(_from?: string, _to?: string): Promise<FunnelStep[]> {
    return []
  }

  async getCohortData(): Promise<CohortRow[]> {
    return []
  }

  async getAbandonedCartData(_from?: string, _to?: string): Promise<AbandonedCartData[]> {
    return []
  }

  async exportReport(_period: string, _from?: string, _to?: string): Promise<Blob> {
    throw new Error('Export not yet available via API')
  }
}
