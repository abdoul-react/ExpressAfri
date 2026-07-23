import type { AdminRoleDataSource, CreateRoleInput, UpdateRoleInput } from '../AdminRoleDataSource'
import type { Role } from '@/types/Role'
import type { RoleId } from '@/types/Role'
import { MOCK_ROLES_LIST } from './data/mockRoles'

export class MockAdminRoleDataSource implements AdminRoleDataSource {
  private delay(ms = 200) { return new Promise<void>((r) => setTimeout(r, ms)) }

  async list() {
    await this.delay()
    return MOCK_ROLES_LIST.map((r) => ({ ...r }))
  }

  async getById(id: RoleId) {
    await this.delay()
    const r = MOCK_ROLES_LIST.find((role) => role.id === id)
    if (!r) throw new Error('Rôle introuvable')
    return { ...r }
  }

  async create(data: CreateRoleInput) {
    await this.delay(300)
    const id = `custom_${data.label.toLowerCase().replace(/\s+/g, '_')}` as RoleId
    const role: Role = { id, label: data.label, description: data.description, permissions: data.permissions }
    if (id === 'super_admin') role.isSuperAdmin = true
    MOCK_ROLES_LIST.push(role)
    return { ...role }
  }

  async update(id: RoleId, data: UpdateRoleInput) {
    await this.delay()
    const idx = MOCK_ROLES_LIST.findIndex((r) => r.id === id)
    if (idx === -1) throw new Error('Rôle introuvable')
    if (id === 'super_admin' && data.permissions) throw new Error('Impossible de modifier les permissions du Super Admin')
    MOCK_ROLES_LIST[idx] = { ...MOCK_ROLES_LIST[idx], ...data }
    return { ...MOCK_ROLES_LIST[idx] }
  }

  async delete(id: RoleId) {
    await this.delay()
    const idx = MOCK_ROLES_LIST.findIndex((r) => r.id === id)
    if (idx === -1) throw new Error('Rôle introuvable')
    if (id === 'super_admin') throw new Error('Impossible de supprimer le rôle Super Admin')
    MOCK_ROLES_LIST.splice(idx, 1)
  }
}
