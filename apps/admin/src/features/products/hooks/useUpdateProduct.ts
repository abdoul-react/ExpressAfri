import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminProductService } from '../services/adminProductService'
import type { UpdateProductInput } from '@/infrastructure/data-source/AdminProductDataSource'

export function useUpdateProduct(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateProductInput) => adminProductService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'product', id] })
    },
  })
}
