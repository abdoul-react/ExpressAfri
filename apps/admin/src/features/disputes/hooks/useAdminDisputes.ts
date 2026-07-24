import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminDisputeService } from '../services/adminDisputeService'
import api from '@/lib/api'
import type {
  DisputeQueryParams,
  UpdateDisputeStatusPayload,
  ResolveDisputePayload,
  AddDisputeMessagePayload,
} from '@/infrastructure/data-source/AdminDisputeDataSource'

// ─── Clés de cache ────────────────────────────────────────────────────────────

const KEYS = {
  all: ['admin', 'disputes'] as const,
  list: (params: DisputeQueryParams) => ['admin', 'disputes', 'list', params] as const,
  detail: (id: string) => ['admin', 'disputes', id] as const,
}

// ─── Lecture ──────────────────────────────────────────────────────────────────

export function useAdminDisputesSummary() {
  return useQuery({
    queryKey: ['admin', 'disputes', 'summary'],
    queryFn: async () => {
      const { data } = await api.get('/disputes/summary')
      return data as { open: number; under_review: number; resolved: number; closed: number; total: number }
    },
    staleTime: 30_000,
  })
}

export function useAdminDisputes(params: DisputeQueryParams) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: () => adminDisputeService.list(params),
    placeholderData: (prev) => prev,
  })
}

export function useAdminDispute(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () => adminDisputeService.getById(id),
    enabled: !!id,
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useUpdateDisputeStatus(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateDisputeStatusPayload) =>
      adminDisputeService.updateStatus(id, payload),
    onSuccess: (updated) => {
      qc.setQueryData(KEYS.detail(id), updated)
      qc.invalidateQueries({ queryKey: KEYS.all })
    },
  })
}

export function useResolveDispute(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: ResolveDisputePayload) =>
      adminDisputeService.resolve(id, payload),
    onSuccess: (updated) => {
      qc.setQueryData(KEYS.detail(id), updated)
      qc.invalidateQueries({ queryKey: KEYS.all })
    },
  })
}

export function useAddDisputeMessage(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: AddDisputeMessagePayload) =>
      adminDisputeService.addMessage(id, payload),
    onSuccess: (updated) => {
      qc.setQueryData(KEYS.detail(id), updated)
    },
  })
}

export function useDeleteDispute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminDisputeService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all })
    },
  })
}

export function useAssignDispute(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (adminId: string) => api.put(`/disputes/${id}/assign`, { adminId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.detail(id) })
      qc.invalidateQueries({ queryKey: KEYS.all })
    },
  })
}
