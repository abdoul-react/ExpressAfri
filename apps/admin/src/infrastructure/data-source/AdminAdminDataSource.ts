import type { AdminUser } from '@/types/AdminUser'

export interface CreateAdminInput {
  email: string
  name: string
  password: string
  role: string
}

export interface UpdateAdminInput {
  email?: string
  name?: string
  role?: string
}

export interface AdminAdminDataSource {
  list(params?: { page?: number; limit?: number; search?: string; role?: string }): Promise<{ data: AdminUser[]; total: number }>
  getById(id: string): Promise<AdminUser>
  create(data: CreateAdminInput): Promise<AdminUser>
  update(id: string, data: UpdateAdminInput): Promise<AdminUser>
  updatePassword(id: string, password: string): Promise<void>
  delete(id: string): Promise<void>
}
