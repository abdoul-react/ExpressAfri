import type { AdminUser } from '@/types/AdminUser'

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  user: AdminUser
}

export interface AdminAuthDataSource {
  login(request: LoginRequest): Promise<LoginResponse>
  getCurrentUser(token: string): Promise<AdminUser>
  logout(): Promise<void>
  /** Vérifie le mot de passe de l'admin connecté sans créer de nouvelle session */
  verifyPassword(email: string, password: string): Promise<boolean>
}
