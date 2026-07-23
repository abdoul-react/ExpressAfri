import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminContentService } from '../services/adminContentService'
import type { CreateBannerInput, UpdateBannerInput } from '@/infrastructure/data-source/AdminContentDataSource'

export function useAdminBanners() {
  return useQuery({
    queryKey: ['admin', 'content', 'banners'],
    queryFn: () => adminContentService.listBanners(),
  })
}

export function useAdminBanner(id: string) {
  return useQuery({
    queryKey: ['admin', 'content', 'banners', id],
    queryFn: () => adminContentService.getBannerById(id),
    enabled: !!id,
  })
}

export function useCreateBanner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateBannerInput) => adminContentService.createBanner(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'banners'] })
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'summary'] })
      // Invalider côté app mobile (bannières affichées dans l'écran home/account)
      qc.invalidateQueries({ queryKey: ['banners'] })
    },
  })
}

export function useUpdateBanner(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateBannerInput) => adminContentService.updateBanner(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'banners'] })
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'banners', id] })
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'summary'] })
      // Invalider côté app mobile
      qc.invalidateQueries({ queryKey: ['banners'] })
    },
  })
}

export function useDeleteBanner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminContentService.deleteBanner(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'banners'] })
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'summary'] })
      // Invalider côté app mobile
      qc.invalidateQueries({ queryKey: ['banners'] })
    },
  })
}
