import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { Button, Card, FormField, Input } from '@/components/ui'
import { useAdminLogin } from '../hooks/useAdminLogin'

export function LoginPage() {
  const navigate = useNavigate()
  const { login, isLoading, error } = useAdminLogin()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    try {
      await login(email, password)
      navigate('/')
    } catch {
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-50 px-4 dark:bg-gray-950">
      {/* Halo orange subtil */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-primary-500/10 blur-3xl dark:bg-primary-500/5" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 text-lg font-bold text-white shadow-md">
            E
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
            ExpressAfri
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Panneau d'administration</p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <FormField label="Email" htmlFor="email">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="super@expressafri.com"
                required
                className="w-full"
                autoComplete="email"
              />
            </FormField>

            <FormField label="Mot de passe" htmlFor="password">
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full"
                autoComplete="current-password"
              />
            </FormField>

            {error && (
              <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <Button type="submit" loading={isLoading} className="w-full" size="lg">
              Se connecter
            </Button>
          </form>

          <div className="mt-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-800/50">
            <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">Comptes de démonstration</p>
            <div className="space-y-1 text-xs text-gray-500 dark:text-gray-500">
              <p><span className="font-medium text-primary-600 dark:text-primary-400">admin@expressafri.com</span> / admin123</p>
              <p><span className="font-medium text-primary-600 dark:text-primary-400">marketing@expressafri.com</span> / admin123</p>
              <p><span className="font-medium text-primary-600 dark:text-primary-400">moderateur@expressafri.com</span> / admin123</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
