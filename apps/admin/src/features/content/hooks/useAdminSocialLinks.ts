import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminContentService } from '../services/adminContentService'

export function useAdminSocialLinks() {
  return useQuery({
    queryKey: ['admin', 'content', 'social-links'],
    queryFn: () => adminContentService.listSocialLinks(),
  })
}

export function useUpdateSocialLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ platform, data }: { platform: string; data: { url?: string; label?: string; isActive?: boolean } }) =>
      adminContentService.updateSocialLink(platform, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'social-links'] })
    },
  })
}
