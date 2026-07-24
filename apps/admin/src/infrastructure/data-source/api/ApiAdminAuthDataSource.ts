import type { AdminAuthDataSource, LoginRequest, LoginResponse } from '../AdminAuthDataSource'
import type { AdminUser } from '@/types/AdminUser'
import api from '@/lib/api'

function toAdminUser(raw: any): AdminUser {
  return {
    id: raw.id,
    email: raw.email,
    name: raw.name,
    role: raw.role,
    isSuperAdmin: raw.isSuperAdmin ?? false,
    permissions: raw.permissions ?? (raw.isSuperAdmin ? '*' : []),
    storeId: raw.storeId ?? null,
    totpEnabled: raw.totpEnabled ?? false,
  }
}

export class ApiAdminAuthDataSource implements AdminAuthDataSource {
  async login(request: LoginRequest): Promise<LoginResponse> {
    try {
      const res = await api.post('/auth/login', request)
      if (res.data.requiresTotp) {
        return { requiresTotp: true, pendingToken: res.data.pendingToken }
      }
      return {
        accessToken: res.data.accessToken,
        user: toAdminUser(res.data.admin),
      }
    } catch (err: any) {
      if (err.response?.data?.message) {
        throw new Error(err.response.data.message)
      }
      if (err.message?.includes('Network Error')) {
        throw new Error('Impossible de contacter le serveur. Vérifie que l\'API tourne sur http://localhost:3000')
      }
      throw err
    }
  }

  async getCurrentUser(token: string): Promise<AdminUser> {
    const { data } = await api.get('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    return toAdminUser(data)
  }

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout')
    } catch {
      // on ignore les erreurs réseau — le nettoyage local se fait quoi qu'il arrive
    } finally {
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_refresh_token')
    }
  }

  async verifyPassword(email: string, password: string): Promise<boolean> {
    try {
      await api.post('/auth/verify-password', { email, password })
      return true
    } catch {
      return false
    }
  }
}
