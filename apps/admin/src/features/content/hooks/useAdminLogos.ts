import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminContentService } from '../services/adminContentService'

export function useAdminLogos() {
  return useQuery({
    queryKey: ['admin', 'content', 'logos'],
    queryFn: () => adminContentService.listLogos(),
  })
}

export function useUpdateLogo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, url }: { id: string; url: string }) =>
      adminContentService.updateLogo(id, url),
    onSuccess: () => {
      // Invalider côté admin
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'logos'] })
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'summary'] })
      // Invalider côté app mobile pour que les changements soient immédiats
      qc.invalidateQueries({ queryKey: ['app-logos'] })
    },
  })
}

export function useUploadLogo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      adminContentService.uploadLogo(id, file),
    onSuccess: () => {
      // Invalider côté admin
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'logos'] })
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'summary'] })
      // Invalider côté app mobile pour que les changements soient immédiats
      qc.invalidateQueries({ queryKey: ['app-logos'] })
    },
  })
}
