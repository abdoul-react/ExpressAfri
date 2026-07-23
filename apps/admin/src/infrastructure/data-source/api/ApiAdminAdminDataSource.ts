import type { AdminAdminDataSource, CreateAdminInput, UpdateAdminInput } from '../AdminAdminDataSource'
import type { AdminUser } from '@/types/AdminUser'
import api from '@/lib/api'

export class ApiAdminAdminDataSource implements AdminAdminDataSource {
  async list(params?: { page?: number; limit?: number; search?: string; role?: string }) {
    const { data } = await api.get('/auth/admins', { params })
    return data as { data: AdminUser[]; total: number }
  }

  async getById(id: string) {
    const { data } = await api.get(`/auth/admins/${id}`)
    return data as AdminUser
  }

  async create(input: CreateAdminInput) {
    const { data } = await api.post('/auth/admins', input)
    return data as AdminUser
  }

  async update(id: string, input: UpdateAdminInput) {
    const { data } = await api.put(`/auth/admins/${id}`, input)
    return data as AdminUser
  }

  async updatePassword(id: string, password: string) {
    await api.put(`/auth/admins/${id}/password`, { password })
  }

  async delete(id: string) {
    await api.delete(`/auth/admins/${id}`)
  }
}
