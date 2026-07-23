import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminCategoryService } from '../services/adminCategoryService'

export function useDeleteCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => adminCategoryService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] })
    },
  })
}
