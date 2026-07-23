import { useQuery } from '@tanstack/react-query'
import { adminProductService } from '../services/adminProductService'
import type { ProductQueryParams } from '@/infrastructure/data-source/AdminProductDataSource'

export function useAdminProducts(params: ProductQueryParams) {
  return useQuery({
    queryKey: ['admin', 'products', params],
    queryFn: () => adminProductService.list(params),
    placeholderData: (prev) => prev,
  })
}

export function useAdminProduct(id: string) {
  return useQuery({
    queryKey: ['admin', 'product', id],
    queryFn: () => adminProductService.getById(id),
    enabled: !!id,
  })
}
