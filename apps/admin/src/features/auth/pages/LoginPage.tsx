import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { Button, Card, FormField, Input } from '@/components/ui'
import { useAdminLogin } from '../hooks/useAdminLogin'
import api from '@/lib/api'

export function LoginPage() {
  const navigate = useNavigate()
  const { login, isLoading, error } = useAdminLogin()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [totpStep, setTotpStep] = useState(false)
  const [pendingToken, setPendingToken] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [totpLoading, setTotpLoading] = useState(false)
  const [totpError, setTotpError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    try {
      const result = await login(email, password)
      if (result.requiresTotp) {
        setPendingToken(result.pendingToken)
        setTotpStep(true)
      } else {
        navigate('/')
      }
    } catch {
    }
  }

  async function handleTotpSubmit(e: FormEvent) {
    e.preventDefault()
    setTotpError('')
    setTotpLoading(true)
    try {
      const { data } = await api.post('/auth/totp/login', { pendingToken, code: totpCode })
      if (data.accessToken) {
        localStorage.setItem('admin_token', data.accessToken)
        navigate('/')
      }
    } catch (err: any) {
      setTotpError(err?.response?.data?.message ?? 'Code invalide')
    } finally {
      setTotpLoading(false)
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
          {totpStep ? (
            <form onSubmit={handleTotpSubmit} className="space-y-5">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Saisissez le code à 6 chiffres de votre application d'authentification.
              </p>
              <FormField label="Code TOTP" htmlFor="totp-code">
                <Input
                  id="totp-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  required
                  className="w-full text-center text-lg tracking-[0.4em]"
                  autoComplete="one-time-code"
                  autoFocus
                />
              </FormField>
              {totpError && (
                <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  {totpError}
                </div>
              )}
              <Button type="submit" loading={totpLoading} className="w-full" size="lg">Vérifier</Button>
              <button type="button" onClick={() => setTotpStep(false)} className="w-full text-center text-sm text-gray-400 hover:text-gray-600">
                ← Retour à la connexion
              </button>
            </form>
          ) : (
          <>
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

            <div className="text-center">
              <a
                href="/forgot-password"
                className="text-sm text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
              >
                Mot de passe oublié ?
              </a>
            </div>
          </form>

          {import.meta.env.VITE_DEMO_MODE === 'true' && (
            <div className="mt-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-800/50">
              <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">Comptes de démonstration</p>
              <div className="space-y-1 text-xs text-gray-500 dark:text-gray-500">
                <p><span className="font-medium text-primary-600 dark:text-primary-400">admin@expressafri.com</span> / admin123</p>
                <p><span className="font-medium text-primary-600 dark:text-primary-400">marketing@expressafri.com</span> / admin123</p>
                <p><span className="font-medium text-primary-600 dark:text-primary-400">moderateur@expressafri.com</span> / admin123</p>
              </div>
            </div>
          )}
          </>
          )}
        </Card>
      </div>
    </div>
  )
}
