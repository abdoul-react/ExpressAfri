import { useState, useCallback } from 'react'
import type { LoginResponse } from '@/infrastructure/data-source/AdminAuthDataSource'
import { useAdminAuth } from './useAdminAuth'

interface UseAdminLoginReturn {
  login: (email: string, password: string) => Promise<LoginResponse>
  isLoading: boolean
  error: string | null
}

export function useAdminLogin(): UseAdminLoginReturn {
  const { login: authLogin } = useAdminAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResponse> => {
      setIsLoading(true)
      setError(null)
      try {
        return await authLogin(email, password)
      } catch (err: any) {
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
