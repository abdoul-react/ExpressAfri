import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminProductService } from '../services/adminProductService'
import type { CreateProductInput } from '@/infrastructure/data-source/AdminProductDataSource'

export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateProductInput) => adminProductService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
    },
  })
}
