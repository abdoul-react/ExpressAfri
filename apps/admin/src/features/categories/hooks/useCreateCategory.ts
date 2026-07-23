import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminCategoryService } from '../services/adminCategoryService'

export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { name: string; parentId?: string; imageUrl?: string }) => adminCategoryService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] })
    },
  })
}
