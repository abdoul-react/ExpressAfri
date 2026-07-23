import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminContentService } from '../services/adminContentService'

export function useAdminAppSettings() {
  return useQuery({
    queryKey: ['admin', 'content', 'settings'],
    queryFn: () => adminContentService.getAppSettings(),
  })
}

export function useUpdateAppSetting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      adminContentService.updateAppSetting(key, value),
    onSuccess: () => {
      // Invalider côté admin
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'settings'] })
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'summary'] })
      // Invalider côté app mobile pour que les changements de textes/branding soient immédiats
      qc.invalidateQueries({ queryKey: ['app-settings'] })
    },
  })
}
