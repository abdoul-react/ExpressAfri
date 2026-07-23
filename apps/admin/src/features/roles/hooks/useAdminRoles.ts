import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminRoleService } from '../services/adminRoleService'
import type { CreateRoleInput, UpdateRoleInput } from '@/infrastructure/data-source/AdminRoleDataSource'

export function useAdminRoles() {
  return useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: () => adminRoleService.list(),
  })
}

export function useAdminRole(id: string) {
  return useQuery({
    queryKey: ['admin', 'roles', id],
    queryFn: () => adminRoleService.getById(id),
    enabled: !!id,
  })
}

export function useCreateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateRoleInput) => adminRoleService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'roles'] }),
  })
}

export function useUpdateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRoleInput }) => adminRoleService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'roles'] }),
  })
}

export function useDeleteRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminRoleService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'roles'] }),
  })
}
