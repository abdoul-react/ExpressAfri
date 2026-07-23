import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminOrderService } from '../services/adminOrderService'

export function useRefundOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, amount }: { id: string; amount?: number }) =>
      adminOrderService.refund(id, amount),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'order', variables.id] })
    },
  })
}
