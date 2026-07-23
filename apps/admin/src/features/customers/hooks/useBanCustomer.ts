import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminCustomerService } from '../services/adminCustomerService'

export function useBanCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => adminCustomerService.ban(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'customer'] })
    },
  })
}

export function useUnbanCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => adminCustomerService.unban(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'customer'] })
    },
  })
}
