import type { AdminAnalyticsDataSource, AnalyticsData, AnalyticsChartDataPoint, FunnelStep, CohortRow, AbandonedCartData, StoreDashboardData } from '../AdminAnalyticsDataSource'
import api from '@/lib/api'

export class ApiAdminAnalyticsDataSource implements AdminAnalyticsDataSource {
  async getAnalytics(period: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom', from?: string, to?: string): Promise<AnalyticsData> {
    const params: any = { period }
    if (from) params.from = from
    if (to) params.to = to
    const { data } = await api.get('/analytics/dashboard', { params })
    return data as AnalyticsData
  }

  async getRevenueChart(
    period: string,
    _from?: string,
    _to?: string,
  ): Promise<AnalyticsChartDataPoint[]> {
    const { data } = await api.get('/analytics/dashboard', { params: { period } })
    return (data.revenueChart ?? []) as AnalyticsChartDataPoint[]
  }

  async getOrdersChart(
    period: string,
    _from?: string,
    _to?: string,
  ): Promise<AnalyticsChartDataPoint[]> {
    const { data } = await api.get('/analytics/dashboard', { params: { period } })
    return (data.ordersChart ?? []) as AnalyticsChartDataPoint[]
  }

  async getFunnelData(_from?: string, _to?: string): Promise<FunnelStep[]> {
    const { data } = await api.get('/analytics/funnel')
    const steps: { name: string; count: number }[] = data.steps ?? data
    const total = steps[0]?.count ?? 1
    return steps.map((s) => ({
      step: s.name,
      count: s.count,
      percentage: total > 0 ? Math.round((s.count / total) * 1000) / 10 : 0,
    }))
  }

  async getCohortData(): Promise<CohortRow[]> {
    const { data } = await api.get('/analytics/cohorts')
    return Array.isArray(data) ? data : []
  }

  async getAbandonedCartData(from?: string, to?: string): Promise<AbandonedCartData[]> {
    const params: any = {}
    if (from) params.from = from
    if (to) params.to = to
    const { data } = await api.get('/analytics/abandoned-carts', { params })
    return Array.isArray(data) ? data : []
  }

  async getStoreDashboard(): Promise<StoreDashboardData> {
    const { data } = await api.get('/analytics/store-dashboard')
    return data
  }

  async exportReport(_period: string, _from?: string, _to?: string): Promise<Blob> {
    throw new Error('Export not yet available via API')
  }
}
