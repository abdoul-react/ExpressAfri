import { adminAnalyticsDataSource } from '@/infrastructure/data-source'
import { toServiceError } from '@/lib/service-error'

class AdminAnalyticsService {
  async getAnalytics(period: string = 'month', from?: string, to?: string) {
    try {
      return await adminAnalyticsDataSource.getAnalytics(period, from, to)
    } catch (err) {
      throw toServiceError(err, 'Résumé des analytics')
    }
  }
  async exportReport(period: string = 'month', from?: string, to?: string) {
    try {
      return await adminAnalyticsDataSource.exportReport(period, from, to)
    } catch (err) {
      throw toServiceError(err, 'Export du rapport')
    }
  }
  async getFunnelData(from?: string, to?: string) {
    try {
      return await adminAnalyticsDataSource.getFunnelData(from, to)
    } catch (err) {
      throw toServiceError(err, 'Récupération des données d\'entonnoir')
    }
  }
  async getCohortData() {
    try {
      return await adminAnalyticsDataSource.getCohortData()
    } catch (err) {
      throw toServiceError(err, 'Récupération des données de cohorte')
    }
  }
  async getAbandonedCartData(from?: string, to?: string) {
    try {
      return await adminAnalyticsDataSource.getAbandonedCartData(from, to)
    } catch (err) {
      throw toServiceError(err, 'Récupération des paniers abandonnés')
    }
  }
}

export const adminAnalyticsService = new AdminAnalyticsService()
