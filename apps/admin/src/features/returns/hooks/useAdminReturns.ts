import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminReturnService } from '../services/adminReturnService'
import type { ReturnQueryParams } from '@/infrastructure/data-source/AdminReturnDataSource'

export function useAdminReturns(params: ReturnQueryParams) {
  return useQuery({
    queryKey: ['admin', 'returns', params],
    queryFn: () => adminReturnService.list(params),
    placeholderData: (prev) => prev,
  })
}

export function useReturnSummary() {
  return useQuery({
    queryKey: ['admin', 'returns', 'summary'],
    queryFn: () => adminReturnService.getSummary(),
    refetchInterval: 30000,
  })
}

export function useApproveReturn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminReturnService.approve(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'returns'] }) },
  })
}

export function useMarkReturnReceived() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminReturnService.markAsReceived(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'returns'] }) },
  })
}

export function useRefundReturn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, amount, method }: { id: string; amount?: number; method?: string }) =>
      adminReturnService.refund(id, amount, method),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'returns'] }) },
  })
}

export function useRejectReturn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      adminReturnService.reject(id, reason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'returns'] }) },
  })
}
