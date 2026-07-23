import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminCategoryService } from '../services/adminCategoryService'

export function useUpdateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; parentId?: string; imageUrl?: string } }) =>
      adminCategoryService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] })
    },
  })
}
