import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminCampaignService } from '../services/adminCampaignService'
import type { CreateCampaignInput, UpdateCampaignInput, CampaignQueryParams } from '@/infrastructure/data-source/AdminCampaignDataSource'

export function useAdminCampaigns(params?: CampaignQueryParams) {
  return useQuery({ queryKey: ['admin', 'campaigns', params], queryFn: () => adminCampaignService.list(params) })
}

export function useAdminCampaign(id: string) {
  return useQuery({ queryKey: ['admin', 'campaigns', id], queryFn: () => adminCampaignService.getById(id), enabled: !!id })
}

export function useCreateCampaign() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (data: CreateCampaignInput) => adminCampaignService.create(data), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'campaigns'] }) })
}

export function useUpdateCampaign(id: string) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (data: UpdateCampaignInput) => adminCampaignService.update(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'campaigns'] }); qc.invalidateQueries({ queryKey: ['admin', 'campaigns', id] }) } })
}

export function useDeleteCampaign() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: string) => adminCampaignService.delete(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'campaigns'] }) })
}
