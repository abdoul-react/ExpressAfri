export interface AnalyticsSummary {
  periodStart: string
  periodEnd: string
  revenue: { total: number; growth: number }
  orders: { total: number; growth: number; averageValue: number }
  customers: { total: number; new: number; growth: number }
  products: { total: number; sold: number }
  stores: { total: number; active: number }
  conversionRate: number
  averageOrderValue: number
}

export interface AnalyticsChartDataPoint {
  date: string
  value: number
  label?: string
}

export interface AnalyticsTopItem {
  id: string
  name: string
  value: number
  count: number
  growth?: number
}

export interface RevenueBreakdown {
  paymentMethod: string
  amount: number
  percentage: number
  count: number
}

export interface GeographicData {
  country: string
  code: string
  orders: number
  revenue: number
  customers: number
}

export interface AnalyticsData {
  summary: AnalyticsSummary
  revenueChart: AnalyticsChartDataPoint[]
  ordersChart: AnalyticsChartDataPoint[]
  customerChart: AnalyticsChartDataPoint[]
  topProducts: AnalyticsTopItem[]
  topCategories: AnalyticsTopItem[]
  topStores: AnalyticsTopItem[]
  revenueByPayment: RevenueBreakdown[]
  geographicData: GeographicData[]
}

export interface FunnelStep {
  step: string
  count: number
  percentage: number
}

export interface CohortRow {
  cohort: string
  periods: { period: string; retention: number; customers: number }[]
  size: number
}

export interface AbandonedCartData {
  date: string
  cartCount: number
  abandonedCount: number
  rate: number
}

export interface AdminAnalyticsDataSource {
  getAnalytics(period: string, from?: string, to?: string): Promise<AnalyticsData>
  getRevenueChart(period: string, from?: string, to?: string): Promise<AnalyticsChartDataPoint[]>
  getOrdersChart(period: string, from?: string, to?: string): Promise<AnalyticsChartDataPoint[]>
  getFunnelData(from?: string, to?: string): Promise<FunnelStep[]>
  getCohortData(): Promise<CohortRow[]>
  getAbandonedCartData(from?: string, to?: string): Promise<AbandonedCartData[]>
  exportReport(period: string, from?: string, to?: string): Promise<Blob>
}
