import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminContentService } from '../services/adminContentService'

export function useAdminStaticPages() {
  return useQuery({
    queryKey: ['admin', 'content', 'pages'],
    queryFn: () => adminContentService.listStaticPages(),
  })
}

export function useAdminStaticPage(id: string) {
  return useQuery({
    queryKey: ['admin', 'content', 'pages', id],
    queryFn: () => adminContentService.getStaticPage(id),
    enabled: !!id,
  })
}

export function useUpdateStaticPage(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { title?: string; content: string }) =>
      adminContentService.updateStaticPage(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'pages'] })
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'pages', id] })
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'summary'] })
    },
  })
}

export function useCreateStaticPage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { title: string; content: string }) =>
      adminContentService.createStaticPage(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'pages'] })
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'summary'] })
    },
  })
}

export function useDeleteStaticPage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminContentService.deleteStaticPage(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'pages'] })
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'summary'] })
    },
  })
}
