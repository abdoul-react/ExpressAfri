import { useQuery } from '@tanstack/react-query'
import { adminAnalyticsService } from '../services/adminAnalyticsService'

export function useAdminAnalytics(period: string = 'month', opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['admin', 'analytics', period],
    queryFn: () => adminAnalyticsService.getAnalytics(period),
    enabled: opts.enabled ?? true,
  })
}

export function useFunnelData(from?: string, to?: string) {
  return useQuery({ queryKey: ['admin', 'analytics', 'funnel', from, to], queryFn: () => adminAnalyticsService.getFunnelData(from, to) })
}

export function useCohortData() {
  return useQuery({ queryKey: ['admin', 'analytics', 'cohorts'], queryFn: () => adminAnalyticsService.getCohortData() })
}

export function useAbandonedCartData(from?: string, to?: string) {
  return useQuery({ queryKey: ['admin', 'analytics', 'abandoned', from, to], queryFn: () => adminAnalyticsService.getAbandonedCartData(from, to), placeholderData: (prev) => prev })
}
