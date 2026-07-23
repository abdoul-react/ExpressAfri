import type { Permission } from '@/types/Permission'

export interface PermissionEntry {
  key: Permission
  label: string
}

export interface AdminPermissionDataSource {
  list(): Promise<PermissionEntry[]>
}
