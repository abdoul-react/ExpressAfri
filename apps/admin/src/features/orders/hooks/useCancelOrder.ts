import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminOrderService } from '../services/adminOrderService'

export function useCancelOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      adminOrderService.cancel(id, reason),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'order', variables.id] })
    },
  })
}
