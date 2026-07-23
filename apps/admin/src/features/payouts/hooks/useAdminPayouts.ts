import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminPayoutService } from '../services/adminPayoutService'
import type { PayoutQueryParams } from '@/infrastructure/data-source/AdminPayoutDataSource'

export function useAdminPayouts(params: PayoutQueryParams) {
  return useQuery({
    queryKey: ['admin', 'payouts', params],
    queryFn: () => adminPayoutService.list(params),
    placeholderData: (prev) => prev,
  })
}

export function useAdminPayout(id: string) {
  return useQuery({
    queryKey: ['admin', 'payout', id],
    queryFn: () => adminPayoutService.getById(id),
    enabled: !!id,
  })
}

export function usePayoutSummary() {
  return useQuery({
    queryKey: ['admin', 'payouts', 'summary'],
    queryFn: () => adminPayoutService.getSummary(),
    refetchInterval: 30000,
  })
}

export function useMarkPayoutAsPaid() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { paymentReference: string; paidAt?: string; notes?: string } }) =>
      adminPayoutService.markAsPaid(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'payouts'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'payout'] })
    },
  })
}

export function useCancelPayout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => adminPayoutService.cancel(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'payouts'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'payout'] })
    },
  })
}

export function useProcessPayout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminPayoutService.processPayout(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'payouts'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'payout'] })
    },
  })
}
