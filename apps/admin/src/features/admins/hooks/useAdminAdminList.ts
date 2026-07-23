import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminAdminService } from '../services/adminAdminService'
import type { CreateAdminInput, UpdateAdminInput } from '@/infrastructure/data-source/AdminAdminDataSource'

export function useAdminAdminList(params?: { page?: number; limit?: number; search?: string; role?: string }) {
  return useQuery({
    queryKey: ['admin', 'admins', params],
    queryFn: () => adminAdminService.list(params),
  })
}

export function useCreateAdmin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateAdminInput) => adminAdminService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'admins'] }),
  })
}

export function useUpdateAdmin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAdminInput }) => adminAdminService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'admins'] }),
  })
}

export function useUpdateAdminPassword() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => adminAdminService.updatePassword(id, password),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'admins'] }),
  })
}

export function useDeleteAdmin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminAdminService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'admins'] }),
  })
}
