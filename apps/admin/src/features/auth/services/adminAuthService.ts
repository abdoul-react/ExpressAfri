import { adminAuthDataSource } from '@/infrastructure/data-source'
import type { LoginRequest, LoginResponse } from '@/infrastructure/data-source/AdminAuthDataSource'
import type { AdminUser } from '@/types/AdminUser'
import { TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY } from '@/lib/api'
import { toServiceError } from '@/lib/service-error'

class AdminAuthService {
  async login(request: LoginRequest): Promise<LoginResponse> {
    try {
      return await adminAuthDataSource.login(request)
    } catch (err) {
      throw toServiceError(err, 'Connexion')
    }
  }

  async getCurrentUser(token: string): Promise<AdminUser> {
    try {
      return await adminAuthDataSource.getCurrentUser(token)
    } catch (err) {
      throw toServiceError(err, 'Récupération de l\'utilisateur')
    }
  }

  async logout(): Promise<void> {
    try {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      return await adminAuthDataSource.logout()
    } catch (err) {
      throw toServiceError(err, 'Déconnexion')
    }
  }

  async verifyPassword(email: string, password: string): Promise<boolean> {
    try {
      return await adminAuthDataSource.verifyPassword(email, password)
    } catch (err) {
      throw toServiceError(err, 'Vérification du mot de passe')
    }
  }

  getStoredToken(): string | null {
    return localStorage.getItem(TOKEN_KEY)
  }

  getStoredUser(): AdminUser | null {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  persistAuth(token: string, user: AdminUser): void {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  }
}

export const adminAuthService = new AdminAuthService()
