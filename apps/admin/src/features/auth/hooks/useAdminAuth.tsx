import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { AdminUser } from '@/types/AdminUser'
import type { Permission } from '@/types/Permission'
import type { LoginResponse } from '@/infrastructure/data-source/AdminAuthDataSource'
import { adminAuthService } from '../services/adminAuthService'
import { hasPermission as checkPermission } from '@/lib/permissions'

interface AdminAuthContextValue {
  admin: AdminUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<LoginResponse>
  logout: () => Promise<void>
  hasPermission: (permission: Permission) => boolean
  hasAnyPermission: (permissions: Permission[]) => boolean
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null)

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Au démarrage : si un token existe, recharger le profil depuis l'API
  // pour avoir les permissions fraîches (évite le stale localStorage si le rôle a changé)
  useEffect(() => {
    const token = adminAuthService.getStoredToken()
    if (!token) {
      setIsLoading(false)
      return
    }

    adminAuthService.getCurrentUser(token)
      .then((freshUser) => {
        // Mettre à jour le localStorage avec les données fraîches
        adminAuthService.persistAuth(token, freshUser)
        setAdmin(freshUser)
      })
      .catch(() => {
        // Token invalide ou expiré → nettoyer le localStorage et déconnecter
        adminAuthService.logout()
        setAdmin(null)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<LoginResponse> => {
    const result = await adminAuthService.login({ email, password })
    if (!result.requiresTotp) {
      adminAuthService.persistAuth(result.accessToken, result.user)
      setAdmin(result.user)
    }
    return result
  }, [])

  const logout = useCallback(async () => {
    await adminAuthService.logout()
    setAdmin(null)
  }, [])

  const hasPermission = useCallback(
    (permission: Permission): boolean => {
      if (!admin) return false
      return checkPermission(admin.permissions, permission)
    },
    [admin],
  )

  const hasAnyPermission = useCallback(
    (permissions: Permission[]): boolean => {
      if (!admin) return false
      return permissions.some((p) => checkPermission(admin.permissions, p))
    },
    [admin],
  )

  return (
    <AdminAuthContext.Provider
      value={{
        admin,
        isAuthenticated: !!admin,
        isLoading,
        login,
        logout,
        hasPermission,
        hasAnyPermission,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth(): AdminAuthContextValue {
  const context = useContext(AdminAuthContext)
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider')
  }
  return context
}
