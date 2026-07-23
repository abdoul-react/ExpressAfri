import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminContentService } from '../services/adminContentService'
import type { CreateFeedSectionInput, UpdateFeedSectionInput } from '@/infrastructure/data-source/AdminContentDataSource'

export function useAdminFeedSections() {
  return useQuery({
    queryKey: ['admin', 'content', 'feed-sections'],
    queryFn: () => adminContentService.listFeedSections(),
  })
}

export function useCreateFeedSection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateFeedSectionInput) => adminContentService.createFeedSection(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'feed-sections'] })
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'summary'] })
      // Invalider côté app mobile pour que les sections s'actualisent en temps réel
      qc.invalidateQueries({ queryKey: ['feed-sections'] })
    },
  })
}

export function useUpdateFeedSection(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateFeedSectionInput) => adminContentService.updateFeedSection(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'feed-sections'] })
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'summary'] })
      // Invalider côté app mobile (compteur deal, sections promo)
      qc.invalidateQueries({ queryKey: ['feed-sections'] })
    },
  })
}

export function useDeleteFeedSection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminContentService.deleteFeedSection(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'feed-sections'] })
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'summary'] })
      // Invalider côté app mobile
      qc.invalidateQueries({ queryKey: ['feed-sections'] })
    },
  })
}

export function useReorderFeedSections() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => adminContentService.reorderFeedSections(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'feed-sections'] })
      // Invalider côté app mobile
      qc.invalidateQueries({ queryKey: ['feed-sections'] })
    },
  })
}
