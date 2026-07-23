import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminProductService } from '../services/adminProductService'

export function useModerateProduct() {
  const queryClient = useQueryClient()

  const approve = useMutation({
    mutationFn: (id: string) => adminProductService.moderateApprove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
    },
  })

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      adminProductService.moderateReject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
    },
  })

  return { approve, reject }
}
