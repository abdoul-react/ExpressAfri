import { useQuery } from '@tanstack/react-query'
import { adminOrderService } from '../services/adminOrderService'
import type { OrderQueryParams } from '@/infrastructure/data-source/AdminOrderDataSource'

export function useAdminOrders(params: OrderQueryParams) {
  return useQuery({
    queryKey: ['admin', 'orders', params],
    queryFn: () => adminOrderService.list(params),
    placeholderData: (prev) => prev,
  })
}

export function useAdminOrder(id: string) {
  return useQuery({
    queryKey: ['admin', 'order', id],
    queryFn: () => adminOrderService.getById(id),
    enabled: !!id,
  })
}
