import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminStoreService } from '../services/adminStoreService'
import type { StoreQueryParams, UpdateStorePayload, StoreMediaType } from '@/infrastructure/data-source/AdminStoreDataSource'

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

export function useStoreMedia(storeId: string) {
  return useQuery({
    queryKey: ['admin', 'store', storeId, 'media'],
    queryFn: () => adminStoreService.listMedia(storeId),
    enabled: !!storeId,
  })
}

/** Invalide la liste et le détail : logo et coverUrl y sont affichés. */
function useMediaInvalidation(storeId: string) {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['admin', 'store', storeId, 'media'] })
    qc.invalidateQueries({ queryKey: ['admin', 'store', storeId] })
    qc.invalidateQueries({ queryKey: ['admin', 'stores'] })
  }
}

export function useUploadStoreMedia(storeId: string) {
  const invalidate = useMediaInvalidation(storeId)
  return useMutation({
    mutationFn: ({ file, type, alt }: { file: File; type: StoreMediaType; alt?: string }) =>
      adminStoreService.uploadMedia(storeId, file, type, alt),
    onSuccess: invalidate,
  })
}

export function useReorderStoreMedia(storeId: string) {
  const invalidate = useMediaInvalidation(storeId)
  return useMutation({
    mutationFn: (ids: string[]) => adminStoreService.reorderMedia(storeId, ids),
    onSuccess: invalidate,
  })
}

export function useDeleteStoreMedia(storeId: string) {
  const invalidate = useMediaInvalidation(storeId)
  return useMutation({
    mutationFn: (mediaId: string) => adminStoreService.deleteMedia(storeId, mediaId),
    onSuccess: invalidate,
  })
}
