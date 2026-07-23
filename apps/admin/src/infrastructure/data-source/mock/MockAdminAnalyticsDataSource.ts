import type { AdminAnalyticsDataSource, AnalyticsData, AnalyticsChartDataPoint, FunnelStep, CohortRow, AbandonedCartData } from '../AdminAnalyticsDataSource'
import { MOCK_ANALYTICS_DATA } from './data/mockAnalytics'

const MOCK_FUNNEL: FunnelStep[] = [
  { step: 'Visiteurs', count: 12450, percentage: 100 },
  { step: 'Pages produits', count: 8720, percentage: 70 },
  { step: 'Ajout au panier', count: 4350, percentage: 34.9 },
  { step: 'Commencé paiement', count: 3200, percentage: 25.7 },
  { step: 'Payé', count: 2800, percentage: 22.5 },
  { step: 'Livré', count: 2650, percentage: 21.3 },
]

const MOCK_COHORTS: CohortRow[] = [
  { cohort: 'Jan 2026', size: 120, periods: [{ period: 'Mois 1', retention: 100, customers: 120 }, { period: 'Mois 2', retention: 45, customers: 54 }, { period: 'Mois 3', retention: 38, customers: 46 }, { period: 'Mois 4', retention: 32, customers: 38 }, { period: 'Mois 5', retention: 28, customers: 34 }, { period: 'Mois 6', retention: 25, customers: 30 }] },
  { cohort: 'Fév 2026', size: 95, periods: [{ period: 'Mois 1', retention: 100, customers: 95 }, { period: 'Mois 2', retention: 48, customers: 46 }, { period: 'Mois 3', retention: 40, customers: 38 }, { period: 'Mois 4', retention: 35, customers: 33 }, { period: 'Mois 5', retention: 30, customers: 28 }] },
  { cohort: 'Mar 2026', size: 140, periods: [{ period: 'Mois 1', retention: 100, customers: 140 }, { period: 'Mois 2', retention: 50, customers: 70 }, { period: 'Mois 3', retention: 42, customers: 59 }, { period: 'Mois 4', retention: 36, customers: 50 }] },
  { cohort: 'Avr 2026', size: 110, periods: [{ period: 'Mois 1', retention: 100, customers: 110 }, { period: 'Mois 2', retention: 46, customers: 51 }, { period: 'Mois 3', retention: 39, customers: 43 }] },
  { cohort: 'Mai 2026', size: 160, periods: [{ period: 'Mois 1', retention: 100, customers: 160 }, { period: 'Mois 2', retention: 52, customers: 83 }] },
  { cohort: 'Juin 2026', size: 130, periods: [{ period: 'Mois 1', retention: 100, customers: 130 }] },
]

const MOCK_ABANDONED_CART: AbandonedCartData[] = Array.from({ length: 30 }, (_, i) => {
  const date = new Date(2026, 5, 15 + i)
  const cartCount = Math.floor(Math.random() * 100) + 50
  const abandonedCount = Math.floor(cartCount * (0.3 + Math.random() * 0.3))
  return { date: date.toISOString(), cartCount, abandonedCount, rate: Math.round((abandonedCount / cartCount) * 100) }
})

export class MockAdminAnalyticsDataSource implements AdminAnalyticsDataSource {
  private delay(ms = 300) { return new Promise<void>((r) => setTimeout(r, ms)) }

  async getAnalytics(): Promise<AnalyticsData> {
    await this.delay()
    return JSON.parse(JSON.stringify(MOCK_ANALYTICS_DATA))
  }

  async getRevenueChart(): Promise<AnalyticsChartDataPoint[]> {
    await this.delay()
    return [...MOCK_ANALYTICS_DATA.revenueChart]
  }

  async getOrdersChart(): Promise<AnalyticsChartDataPoint[]> {
    await this.delay()
    return [...MOCK_ANALYTICS_DATA.ordersChart]
  }

  async getFunnelData(): Promise<FunnelStep[]> {
    await this.delay()
    return [...MOCK_FUNNEL]
  }

  async getCohortData(): Promise<CohortRow[]> {
    await this.delay()
    return JSON.parse(JSON.stringify(MOCK_COHORTS))
  }

  async getAbandonedCartData(): Promise<AbandonedCartData[]> {
    await this.delay()
    return [...MOCK_ABANDONED_CART]
  }

  async exportReport(): Promise<Blob> {
    await this.delay(500)
    const csv = [
      'Metric,Value',
      'Revenue,' + MOCK_ANALYTICS_DATA.summary.revenue.total,
      'Orders,' + MOCK_ANALYTICS_DATA.summary.orders.total,
      'Customers,' + MOCK_ANALYTICS_DATA.summary.customers.total,
    ].join('\n')
    return new Blob([csv], { type: 'text/csv' })
  }
}
