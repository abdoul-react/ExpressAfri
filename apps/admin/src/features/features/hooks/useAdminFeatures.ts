import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminFeatureService } from '../services/adminFeatureService'

export function useAdminFeatures() {
  return useQuery({
    queryKey: ['admin', 'features'],
    queryFn: () => adminFeatureService.list(),
  })
}

export function useToggleFeature() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) => adminFeatureService.toggle(key, enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'features'] }),
  })
}
