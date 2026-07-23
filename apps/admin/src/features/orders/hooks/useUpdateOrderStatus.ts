import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminOrderService } from '../services/adminOrderService'

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminOrderService.updateStatus(id, status),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'order', variables.id] })
    },
  })
}
