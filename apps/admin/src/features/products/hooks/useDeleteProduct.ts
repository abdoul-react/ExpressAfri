import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminProductService } from '../services/adminProductService'

export function useDeleteProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => adminProductService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
    },
    onError: (error: Error) => {
      // L'erreur sera propagée via mutation.error pour l'affichage dans la page
      console.error('[useDeleteProduct] Erreur lors de la suppression :', error.message)
    },
  })
}
