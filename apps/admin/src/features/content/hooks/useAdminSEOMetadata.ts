import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminContentService } from '../services/adminContentService'

export function useAdminSEOMetadata() {
  return useQuery({
    queryKey: ['admin', 'content', 'seo'],
    queryFn: () => adminContentService.listSEOMetadata(),
  })
}

export function useUpdateSEOMetadata(page: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { title?: string; description?: string; keywords?: string; ogImage?: string }) =>
      adminContentService.updateSEOMetadata(page, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'seo'] })
    },
  })
}
