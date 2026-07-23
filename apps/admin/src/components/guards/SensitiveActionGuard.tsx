import { useState, useEffect, useRef, type ReactNode } from 'react'
import { useVerifyPassword } from '@/features/auth/hooks/useVerifyPassword'

/**
 * SensitiveActionGuard — verrou de sécurité pour les sections critiques.
 *
 * Affiche une modale de resaisie du mot de passe avant de révéler le contenu.
 * Une fois vérifié, l'accès est maintenu pendant `sessionDurationMs` (15 min par défaut).
 * Passé ce délai, le verrou se réactive automatiquement.
 *
 * Usage :
 *   <SensitiveActionGuard label="Configuration des paiements">
 *     <PaymentMethodsTab />
 *   </SensitiveActionGuard>
 */

interface SensitiveActionGuardProps {
  children: ReactNode
  /** Titre affiché dans la modale de confirmation */
  label?: string
  /** Durée en ms avant que le verrou se réactive. Défaut : 15 min */
  sessionDurationMs?: number
}

export function SensitiveActionGuard({
  children,
  label = 'cette section sensible',
  sessionDurationMs = 15 * 60 * 1000,
}: SensitiveActionGuardProps) {
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [password, setPassword] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const { verify, isLoading, error, clearError } = useVerifyPassword()
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Remet le focus sur l'input à chaque affichage de la modale
  useEffect(() => {
    if (!isUnlocked) {
      const t = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [isUnlocked])

  // Réinitialise le verrou après l'expiration de la session
  useEffect(() => {
    if (isUnlocked) {
      timerRef.current = setTimeout(() => {
        setIsUnlocked(false)
        setPassword('')
        setSubmitted(false)
      }, sessionDurationMs)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isUnlocked, sessionDurationMs])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    if (!password.trim()) return

    const ok = await verify(password)
    if (ok) {
      setIsUnlocked(true)
      setPassword('')
      setSubmitted(false)
    }
  }

  function handlePasswordChange(value: string) {
    setPassword(value)
    if (submitted) setSubmitted(false)
    if (error) clearError()
  }

  if (isUnlocked) {
    return (
      <div>
        {/* Bandeau de rappel : session active avec bouton pour reverrouiller */}
        <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 dark:border-amber-700/50 dark:bg-amber-900/20">
          <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
            <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
            <span>Accès déverrouillé — session active 15 min</span>
          </div>
          <button
            type="button"
            onClick={() => { setIsUnlocked(false); setPassword(''); setSubmitted(false) }}
            className="text-xs font-medium text-amber-700 underline-offset-2 hover:underline dark:text-amber-400"
          >
            Reverrouiller
          </button>
        </div>
        {children}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        {/* Icône cadenas */}
        <div className="mb-5 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <svg className="h-7 w-7 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zM10 11V7a2 2 0 114 0v4" />
            </svg>
          </div>
        </div>

        <h2 className="mb-1 text-center text-lg font-semibold text-gray-900 dark:text-white">
          Accès restreint
        </h2>
        <p className="mb-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Confirmez votre identité pour accéder à{' '}
          <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Mot de passe administrateur
            </label>
            <input
              ref={inputRef}
              type="password"
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className={`w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 ${
                error || (submitted && !password.trim())
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-200 dark:border-red-500 dark:focus:ring-red-900/40'
                  : 'border-gray-300 focus:border-primary-500 focus:ring-primary-200 dark:border-gray-600 dark:focus:ring-primary-900/40'
              }`}
            />
            {(error || (submitted && !password.trim())) && (
              <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                {submitted && !password.trim() ? 'Le mot de passe est requis' : error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-primary-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-gray-800"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Vérification…
              </span>
            ) : (
              'Confirmer l\'accès'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
