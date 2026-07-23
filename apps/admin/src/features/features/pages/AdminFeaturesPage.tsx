import { Zap } from 'lucide-react'
import { useAdminFeatures, useToggleFeature } from '../hooks/useAdminFeatures'
import { PermissionGuard } from '@/components/guards/PermissionGuard'
import {
  PageHeader, Badge, Card, CardHeader, CardTitle, Switch, LoadingBlock, EmptyState,
} from '@/components/ui'
import type { StatusVariant } from '@/lib/status'
import { toast } from '@/lib/toast'

const GROUP_ORDER = ['Paiement', 'Recherche', 'Navigation', 'Checkout', 'Marketing', 'Apparence', 'Livraison', 'Social', 'Produit']

const GROUP_VARIANTS: Record<string, StatusVariant> = {
  Paiement: 'info',
  Recherche: 'purple',
  Navigation: 'info',
  Checkout: 'warning',
  Marketing: 'primary',
  Apparence: 'purple',
  Livraison: 'info',
  Social: 'warning',
  Produit: 'success',
}

export function AdminFeaturesPage() {
  const { data: flags, isLoading } = useAdminFeatures()
  const toggleFlag = useToggleFeature()

  if (isLoading) return <LoadingBlock label="Chargement des fonctionnalités…" />

  const grouped = (flags ?? []).reduce<Record<string, NonNullable<typeof flags>>>((acc, f) => {
    if (!acc[f.group]) acc[f.group] = []
    acc[f.group].push(f)
    return acc
  }, {})

  const sortedGroups = Object.keys(grouped).sort(
    (a, b) => GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b)
  )

  function handleToggle(key: string, enabled: boolean, label: string) {
    toggleFlag.mutate(
      { key, enabled },
      {
        onSuccess: () => toast.success(`« ${label} » ${enabled ? 'activée' : 'désactivée'}`),
        onError: () => toast.error('Erreur lors de la mise à jour de la fonctionnalité'),
      },
    )
  }

  return (
    <div>
      <PageHeader
        title="Fonctionnalités"
        description="Activer ou désactiver les fonctionnalités de la plateforme"
      />

      {sortedGroups.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={Zap}
            title="Aucune fonctionnalité"
            description="Les fonctionnalités configurables de la plateforme apparaîtront ici."
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedGroups.map((group) => (
            <Card key={group}>
              <CardHeader>
                <CardTitle>{group}</CardTitle>
              </CardHeader>
              <div className="space-y-3">
                {(grouped[group] ?? []).map((flag) => (
                  <div
                    key={flag.key}
                    className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/60"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{flag.label}</span>
                        <Badge variant={GROUP_VARIANTS[group] ?? 'neutral'} size="sm">{group}</Badge>
                      </div>
                      {flag.description && (
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{flag.description}</p>
                      )}
                    </div>
                    <PermissionGuard permission="features.update">
                      <Switch
                        checked={flag.enabled}
                        onCheckedChange={(v) => handleToggle(flag.key, v, flag.label)}
                      />
                    </PermissionGuard>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
