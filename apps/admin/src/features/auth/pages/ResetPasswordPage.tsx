import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft, CheckCircle } from 'lucide-react'
import { Button, Card, FormField, Input } from '@/components/ui'
import api from '@/lib/api'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }
    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return }
    setError('')
    setIsLoading(true)
    try {
      await api.post('/auth/reset-password', { token, password })
      setDone(true)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Lien invalide ou expiré.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-50 px-4 dark:bg-gray-950">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-primary-500/10 blur-3xl dark:bg-primary-500/5" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 text-lg font-bold text-white shadow-md">
            E
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
            Nouveau mot de passe
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Choisissez un mot de passe sécurisé pour votre compte
          </p>
        </div>

        <Card className="p-8">
          {done ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Mot de passe réinitialisé avec succès.
              </p>
              <Link
                to="/login"
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                Se connecter
              </Link>
            </div>
          ) : !token ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <AlertCircle className="h-10 w-10 text-red-500" />
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Lien de réinitialisation invalide ou manquant.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <FormField label="Nouveau mot de passe" htmlFor="password">
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="w-full"
                  autoComplete="new-password"
                  autoFocus
                />
              </FormField>

              <FormField label="Confirmer le mot de passe" htmlFor="confirm">
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full"
                  autoComplete="new-password"
                />
              </FormField>

              {error && (
                <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <Button type="submit" loading={isLoading} className="w-full" size="lg">
                Enregistrer le mot de passe
              </Button>
            </form>
          )}

          <div className="mt-6 flex justify-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour à la connexion
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
