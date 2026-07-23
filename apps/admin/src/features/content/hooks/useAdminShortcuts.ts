import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminContentService } from '../services/adminContentService'

export function useAdminShortcuts() {
  return useQuery({
    queryKey: ['admin', 'content', 'shortcuts'],
    queryFn: () => adminContentService.listShortcuts(),
  })
}

export function useCreateShortcut() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { label: string; icon: string; target?: import('@/infrastructure/data-source/AdminContentDataSource').ShortcutTarget }) => adminContentService.createShortcut(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'shortcuts'] })
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'summary'] })
      qc.invalidateQueries({ queryKey: ['admin', 'shortcuts'] })
    },
  })
}

export function useUpdateShortcut(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { label?: string; icon?: string; isActive?: boolean; target?: import('@/infrastructure/data-source/AdminContentDataSource').ShortcutTarget }) => adminContentService.updateShortcut(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'shortcuts'] })
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'summary'] })
      qc.invalidateQueries({ queryKey: ['admin', 'shortcuts'] })
      qc.invalidateQueries({ queryKey: ['shortcuts'] })
    },
  })
}

export function useDeleteShortcut() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminContentService.deleteShortcut(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'shortcuts'] })
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'summary'] })
    },
  })
}

export function useReorderShortcuts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => adminContentService.reorderShortcuts(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'shortcuts'] })
      qc.invalidateQueries({ queryKey: ['shortcuts'] })
    },
  })
}
