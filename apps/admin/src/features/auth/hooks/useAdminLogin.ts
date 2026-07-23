import { useState, useCallback } from 'react'
import { useAdminAuth } from './useAdminAuth'

interface UseAdminLoginReturn {
  login: (email: string, password: string) => Promise<void>
  isLoading: boolean
  error: string | null
}

export function useAdminLogin(): UseAdminLoginReturn {
  const { login: authLogin } = useAdminAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true)
      setError(null)
      try {
        console.log('[useAdminLogin] calling authLogin', email)
        await authLogin(email, password)
        console.log('[useAdminLogin] authLogin succeeded')
      } catch (err: any) {
        console.log('[useAdminLogin] error', err?.message, err)
        setError(err instanceof Error ? err.message : 'Une erreur est survenue')
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [authLogin],
  )

  return { login, isLoading, error }
}
