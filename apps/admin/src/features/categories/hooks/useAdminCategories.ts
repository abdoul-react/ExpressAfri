import { useQuery } from '@tanstack/react-query'
import { adminCategoryService } from '../services/adminCategoryService'

export function useAdminCategories(params?: { storeId?: string }) {
  return useQuery({
    queryKey: ['admin', 'categories', params ?? {}],
    queryFn: () => adminCategoryService.list(params),
  })
}
