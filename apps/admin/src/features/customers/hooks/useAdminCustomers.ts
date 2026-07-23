import { useQuery } from '@tanstack/react-query'
import { adminCustomerService } from '../services/adminCustomerService'
import type { CustomerQueryParams } from '@/infrastructure/data-source/AdminUserDataSource'

export function useAdminCustomers(params: CustomerQueryParams) {
  return useQuery({
    queryKey: ['admin', 'customers', params],
    queryFn: () => adminCustomerService.list(params),
    placeholderData: (prev) => prev,
  })
}

export function useAdminCustomer(id: string) {
  return useQuery({
    queryKey: ['admin', 'customer', id],
    queryFn: () => adminCustomerService.getById(id),
    enabled: !!id,
  })
}

export function useAdminCustomerOrders(customerId: string) {
  return useQuery({
    queryKey: ['admin', 'customer', customerId, 'orders'],
    queryFn: () => adminCustomerService.getCustomerOrders(customerId),
    enabled: !!customerId,
  })
}
