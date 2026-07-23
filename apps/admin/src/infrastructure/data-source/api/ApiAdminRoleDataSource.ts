import type { AdminRoleDataSource, CreateRoleInput, UpdateRoleInput } from '../AdminRoleDataSource'
import type { Role, RoleId } from '@/types/Role'
import api from '@/lib/api'

export class ApiAdminRoleDataSource implements AdminRoleDataSource {
  async list() {
    const { data } = await api.get('/auth/roles')
    return data as Role[]
  }

  async getById(id: RoleId) {
    const { data } = await api.get(`/auth/roles/${id}`)
    return data as Role
  }

  async create(input: CreateRoleInput) {
    const { data } = await api.post('/auth/roles', input)
    return data as Role
  }

  async update(id: RoleId, input: UpdateRoleInput) {
    const { data } = await api.put(`/auth/roles/${id}`, input)
    return data as Role
  }

  async delete(id: RoleId) {
    await api.delete(`/auth/roles/${id}`)
  }
}
