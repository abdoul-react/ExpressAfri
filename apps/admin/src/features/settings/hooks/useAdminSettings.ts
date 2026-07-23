import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminSettingService } from '../services/adminSettingService'

export function useAdminSettings() {
  return useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => adminSettingService.listSettings(),
  })
}

export function useUpdateSetting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => adminSettingService.updateSetting(key, value),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'settings'] }),
  })
}
