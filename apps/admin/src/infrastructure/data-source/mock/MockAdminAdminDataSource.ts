import type { AdminAdminDataSource, CreateAdminInput, UpdateAdminInput } from '../AdminAdminDataSource'
import type { AdminUser } from '@/types/AdminUser'
import type { RoleId } from '@/types/Role'
import { MOCK_ADMINS, MOCK_CREDENTIALS } from './data/mockAdmins'
import { MOCK_ROLES_LIST } from './data/mockRoles'

// Keep one shared collection so changes made in the administration UI are also
// visible to the mock authentication data source.
let admins = MOCK_ADMINS
let nextId = 7

function getRole(roleId: string) {
  const role = MOCK_ROLES_LIST.find((item) => item.id === roleId)
  if (!role) throw new Error('Rôle introuvable')
  return role
}

function roleAccess(roleId: string): Pick<AdminUser, 'role' | 'permissions' | 'isSuperAdmin'> {
  const role = getRole(roleId)
  return {
    role: role.id as RoleId,
    permissions: role.permissions === '*' ? '*' as const : [...role.permissions],
    isSuperAdmin: role.isSuperAdmin ?? false,
  }
}

export class MockAdminAdminDataSource implements AdminAdminDataSource {
  private delay(ms = 200) { return new Promise<void>((r) => setTimeout(r, ms)) }

  async list(params?: { page?: number; limit?: number; search?: string; role?: string }) {
    await this.delay()
    let filtered = [...admins]
    if (params?.search) {
      const s = params.search.toLowerCase()
      filtered = filtered.filter((a) => a.name.toLowerCase().includes(s) || a.email.toLowerCase().includes(s))
    }
    if (params?.role) filtered = filtered.filter((a) => a.role === params.role)
    const page = params?.page ?? 1
    const limit = params?.limit ?? 10
    const start = (page - 1) * limit
    return { data: filtered.slice(start, start + limit), total: filtered.length }
  }

  async getById(id: string) {
    await this.delay()
    const a = admins.find((a) => a.id === id)
    if (!a) throw new Error('Admin introuvable')
    return { ...a }
  }

  async create(data: CreateAdminInput) {
    await this.delay(300)
    const email = data.email.trim().toLowerCase()
    if (admins.some((admin) => admin.email.toLowerCase() === email)) {
      throw new Error('Un administrateur utilise déjà cet email')
    }

    const id = `admin_${String(nextId++).padStart(3, '0')}` as const
    const admin: AdminUser = {
      id,
      email,
      name: data.name.trim(),
      ...roleAccess(data.role),
    }
    admins.push(admin)
    MOCK_CREDENTIALS[email] = { password: data.password, adminId: id }
    return { ...admin }
  }

  async update(id: string, data: UpdateAdminInput) {
    await this.delay()
    const idx = admins.findIndex((a) => a.id === id)
    if (idx === -1) throw new Error('Admin introuvable')
    const roleData = data.role ? roleAccess(data.role) : {}
    admins[idx] = {
      ...admins[idx],
      ...data,
      name: data.name?.trim() || admins[idx].name,
      ...roleData,
    } as AdminUser
    return { ...admins[idx] }
  }

  async updatePassword(id: string, password: string) {
    await this.delay()
    const admin = admins.find((item) => item.id === id)
    if (!admin) throw new Error('Admin introuvable')
    MOCK_CREDENTIALS[admin.email] = { password, adminId: id }
  }

  async delete(id: string) {
    await this.delay()
    const idx = admins.findIndex((a) => a.id === id)
    if (idx === -1) throw new Error('Admin introuvable')
    if (admins[idx].isSuperAdmin) throw new Error('Impossible de supprimer le Super Admin')
    delete MOCK_CREDENTIALS[admins[idx].email]
    admins.splice(idx, 1)
  }
}
