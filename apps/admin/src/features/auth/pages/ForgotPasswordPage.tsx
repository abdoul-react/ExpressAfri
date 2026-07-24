import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, ArrowLeft, CheckCircle } from 'lucide-react'
import { Button, Card, FormField, Input } from '@/components/ui'
import api from '@/lib/api'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [devResetUrl, setDevResetUrl] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      const { data } = await api.post('/auth/request-password-reset', { email })
      if (data.resetUrl) setDevResetUrl(data.resetUrl)
      setSent(true)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Une erreur est survenue. Réessayez.')
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
            Mot de passe oublié
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Saisissez votre adresse e-mail pour recevoir un lien de réinitialisation
          </p>
        </div>

        <Card className="p-8">
          {sent ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Si un compte existe pour <strong>{email}</strong>, un e-mail de réinitialisation a été envoyé.
              </p>
              {devResetUrl && (
                <div className="w-full rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-left dark:border-yellow-500/20 dark:bg-yellow-500/10">
                  <p className="mb-1 text-xs font-semibold text-yellow-700 dark:text-yellow-400">Mode développement — lien de reset :</p>
                  <a href={devResetUrl} className="break-all text-xs text-blue-600 underline dark:text-blue-400">{devResetUrl}</a>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <FormField label="Email" htmlFor="email">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  required
                  className="w-full"
                  autoComplete="email"
                />
              </FormField>

              {error && (
                <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <Button type="submit" loading={isLoading} className="w-full" size="lg">
                Envoyer le lien
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
