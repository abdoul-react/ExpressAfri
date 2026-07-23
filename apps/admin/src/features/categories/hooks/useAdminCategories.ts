import { useQuery } from '@tanstack/react-query'
import { adminCategoryService } from '../services/adminCategoryService'

export function useAdminCategories() {
  return useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () => adminCategoryService.list(),
  })
}
