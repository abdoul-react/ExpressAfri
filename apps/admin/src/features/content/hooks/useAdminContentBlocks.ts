import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminContentService } from '../services/adminContentService'

export function useAdminContentBlocks(group?: string) {
  return useQuery({
    queryKey: ['admin', 'content', 'blocks', group],
    queryFn: () => adminContentService.listContentBlocks(group),
  })
}

export function useAdminContentGroups() {
  return useQuery({
    queryKey: ['admin', 'content', 'groups'],
    queryFn: () => adminContentService.getContentGroups(),
  })
}

export function useUpdateContentBlock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, value }: { id: string; value: string }) =>
      adminContentService.updateContentBlock(id, value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'blocks'] })
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'summary'] })
    },
  })
}
