import { useQuery } from '@tanstack/react-query'
import { adminStoreService } from '../services/adminStoreService'
import type { StoreQueryParams } from '@/infrastructure/data-source/AdminStoreDataSource'

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
