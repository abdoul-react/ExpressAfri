import { useNavigate } from 'react-router-dom'
import { SearchX } from 'lucide-react'
import { Button, EmptyState } from '@/components/ui'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <EmptyState
        icon={SearchX}
        title="404 — Page introuvable"
        description="La page que vous recherchez n'existe pas ou a été déplacée."
        action={<Button onClick={() => navigate('/')}>Retour au tableau de bord</Button>}
      />
    </div>
  )
}
