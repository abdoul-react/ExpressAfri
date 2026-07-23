import type { AdminAuthDataSource, LoginRequest, LoginResponse } from '../AdminAuthDataSource'
import type { AdminUser } from '@/types/AdminUser'
import { MOCK_ADMINS, MOCK_CREDENTIALS } from './data/mockAdmins'

export class MockAdminAuthDataSource implements AdminAuthDataSource {
  private delay(ms = 600): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  async login(request: LoginRequest): Promise<LoginResponse> {
    await this.delay()

    const credential = MOCK_CREDENTIALS[request.email]
    if (!credential || credential.password !== request.password) {
      throw new Error('Email ou mot de passe incorrect')
    }

    const admin = MOCK_ADMINS.find((a) => a.id === credential.adminId)
    if (!admin) {
      throw new Error('Compte administrateur introuvable')
    }

    const accessToken = `mock_token_${admin.id}_${Date.now()}`

    return { accessToken, user: admin }
  }

  async getCurrentUser(token: string): Promise<AdminUser> {
    await this.delay(200)

    const tokenMatch = /^mock_token_(admin_\d+)_(\d+)$/.exec(token)
    if (!tokenMatch) {
      throw new Error('Token invalide ou expiré')
    }

    const adminId = tokenMatch[1]
    const admin = MOCK_ADMINS.find((a) => a.id === adminId)
    if (!admin) {
      throw new Error('Token invalide ou expiré')
    }

    return admin
  }

  async logout(): Promise<void> {
    await this.delay(200)
  }

  async verifyPassword(email: string, password: string): Promise<boolean> {
    await this.delay(400)
    const credential = MOCK_CREDENTIALS[email]
    if (!credential) return false
    return credential.password === password
  }
}
