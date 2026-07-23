import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminPaymentService } from '../services/adminPaymentService'

export function useRefundPayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, amount, reason }: { id: string; amount?: number; reason?: string }) =>
      adminPaymentService.refund(id, amount, reason),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'payment', variables.id] })
    },
  })
}
