import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminContentService } from '../services/adminContentService'
import type { CreateFeedPostInput, UpdateFeedPostInput } from '@/infrastructure/data-source/AdminContentDataSource'

const KEY = ['admin', 'content', 'feed-posts']

export function useAdminFeedPosts() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => adminContentService.listFeedPosts(),
  })
}

export function useCreateFeedPost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateFeedPostInput) => adminContentService.createFeedPost(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: ['feed-posts'] })
    },
  })
}

export function useUpdateFeedPost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFeedPostInput }) =>
      adminContentService.updateFeedPost(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: ['feed-posts'] })
    },
  })
}

export function useDeleteFeedPost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminContentService.deleteFeedPost(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: ['feed-posts'] })
    },
  })
}

export function useUploadFeedMedia() {
  return useMutation({
    mutationFn: (file: File) => adminContentService.uploadFeedMedia(file),
  })
}
