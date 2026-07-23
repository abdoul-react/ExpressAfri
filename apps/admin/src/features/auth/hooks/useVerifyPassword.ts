import { useState, useCallback } from 'react'
import { adminAuthService } from '../services/adminAuthService'
import { useAdminAuth } from './useAdminAuth'

interface UseVerifyPasswordReturn {
  verify: (password: string) => Promise<boolean>
  isLoading: boolean
  error: string | null
  clearError: () => void
}

/**
 * Hook pour vérifier le mot de passe de l'admin connecté.
 * Utilisé par SensitiveActionGuard pour protéger les sections critiques.
 * Ne crée pas de nouvelle session — vérifie uniquement les credentials.
 */
export function useVerifyPassword(): UseVerifyPasswordReturn {
  const { admin } = useAdminAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const verify = useCallback(
    async (password: string): Promise<boolean> => {
      if (!admin?.email) {
        setError('Aucune session active')
        return false
      }
      if (!password.trim()) {
        setError('Le mot de passe est requis')
        return false
      }

      setIsLoading(true)
      setError(null)

      try {
        const isValid = await adminAuthService.verifyPassword(admin.email, password)
        if (!isValid) {
          setError('Mot de passe incorrect')
        }
        return isValid
      } catch {
        setError('Erreur lors de la vérification')
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [admin?.email],
  )

  const clearError = useCallback(() => setError(null), [])

  return { verify, isLoading, error, clearError }
}
