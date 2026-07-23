import type { AdminPermissionDataSource, PermissionEntry } from '../AdminPermissionDataSource'
import api from '@/lib/api'

export class ApiAdminPermissionDataSource implements AdminPermissionDataSource {
  async list() {
    const { data } = await api.get('/auth/permissions')
    return data as PermissionEntry[]
  }
}
