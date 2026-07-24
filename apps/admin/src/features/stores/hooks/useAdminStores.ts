import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminStoreService } from '../services/adminStoreService'
import type { StoreQueryParams, UpdateStorePayload } from '@/infrastructure/data-source/AdminStoreDataSource'

export function useAdminStores(params: StoreQueryParams) {
  return useQuery({
    queryKey: ['admin', 'stores', params],
    queryFn: () => adminStoreService.list(params),
    placeholderData: (prev) => prev,
  })
}

export function useAdminStore(id: string) {
  return useQuery({
    queryKey: ['admin', 'store', id],
    queryFn: () => adminStoreService.getById(id),
    enabled: !!id,
  })
}

export function useUpdateStore() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateStorePayload }) =>
      adminStoreService.update(id, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'stores'] })
      qc.invalidateQueries({ queryKey: ['admin', 'store', id] })
    },
  })
}

export function useDeleteStore() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminStoreService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'stores'] })
    },
  })
}
