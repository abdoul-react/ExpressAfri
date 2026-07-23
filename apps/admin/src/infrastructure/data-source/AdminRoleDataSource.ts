import type { Permission } from '@/types/Permission'
import type { Role } from '@/types/Role'

export interface CreateRoleInput {
  label: string
  description: string
  permissions: Permission[]
}

export interface UpdateRoleInput {
  label?: string
  description?: string
  permissions?: Permission[]
}

export interface AdminRoleDataSource {
  list(): Promise<Role[]>
  getById(id: string): Promise<Role>
  create(data: CreateRoleInput): Promise<Role>
  update(id: string, data: UpdateRoleInput): Promise<Role>
  delete(id: string): Promise<void>
}
