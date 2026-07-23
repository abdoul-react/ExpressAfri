import { useNavigate } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { Button, EmptyState } from '@/components/ui'

export function UnauthorizedPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <EmptyState
        icon={ShieldAlert}
        title="403 — Accès non autorisé"
        description="Vous n'avez pas les permissions nécessaires pour accéder à cette page."
        action={<Button onClick={() => navigate('/')}>Retour au tableau de bord</Button>}
      />
    </div>
  )
}
