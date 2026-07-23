import { useQuery } from '@tanstack/react-query'
import { adminPaymentService } from '../services/adminPaymentService'
import type { PaymentQueryParams } from '@/infrastructure/data-source/AdminPaymentDataSource'

export function useAdminPayments(params: PaymentQueryParams) {
  return useQuery({
    queryKey: ['admin', 'payments', params],
    queryFn: () => adminPaymentService.list(params),
    placeholderData: (prev) => prev,
  })
}

export function useAdminPayment(id: string) {
  return useQuery({
    queryKey: ['admin', 'payment', id],
    queryFn: () => adminPaymentService.getById(id),
    enabled: !!id,
  })
}
