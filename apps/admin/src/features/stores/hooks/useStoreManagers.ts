import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminStoreService } from '../services/adminStoreService'

export type { StoreManager } from '@/infrastructure/data-source/AdminStoreDataSource'

export function useStoreManagers(storeId: string) {
  return useQuery({
    queryKey: ['admin', 'store-managers', storeId],
    queryFn: () => adminStoreService.listManagers(storeId),
    enabled: !!storeId,
  })
}

export function useCreateStoreManager(storeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { email: string; name: string; password: string }) =>
      adminStoreService.createManager(storeId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'store-managers', storeId] })
    },
  })
}

export function useSetManagerActive(storeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ managerId, isActive }: { managerId: string; isActive: boolean }) =>
      adminStoreService.setManagerActive(storeId, managerId, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'store-managers', storeId] })
    },
  })
}

export function useResetManagerPassword(storeId: string) {
  return useMutation({
    mutationFn: ({ managerId, password }: { managerId: string; password: string }) =>
      adminStoreService.resetManagerPassword(storeId, managerId, { password }),
  })
}
