import { useQuery } from '@tanstack/react-query'
import { adminPermissionService } from '../services/adminPermissionService'

export function useAdminPermissions() {
  return useQuery({
    queryKey: ['admin', 'permissions'],
    queryFn: () => adminPermissionService.list(),
  })
}
