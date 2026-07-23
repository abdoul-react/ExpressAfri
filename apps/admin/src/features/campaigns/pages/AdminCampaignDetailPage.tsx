import { useParams, useNavigate } from 'react-router-dom'
import { Eye, Megaphone, MousePointerClick, Pencil, ShoppingCart, Wallet } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  LoadingBlock,
  PageHeader,
  StatCard,
  StatusBadge,
} from '@/components/ui'
import { cn } from '@/lib/cn'
import { CAMPAIGN_STATUS } from '@/lib/status'
import { useAdminCampaign } from '../hooks/useAdminCampaigns'
import { formatPrice, formatDate } from '@/lib/format'

const TYPE_LABELS: Record<string, string> = {
  seasonal: 'Saisonnière', flash_sale: 'Flash', new_arrival: 'Nouveauté',
  clearance: 'Écoulement', custom: 'Personnalisée',
}

function getStatus(c: { isActive: boolean; startDate: string; endDate: string }) {
  const now = new Date()
  if (!c.isActive) return 'inactive'
  if (new Date(c.startDate) > now) return 'scheduled'
  if (new Date(c.endDate) < now) return 'expired'
  return 'active'
}

export function AdminCampaignDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: camp, isLoading } = useAdminCampaign(id!)

  if (isLoading) return <LoadingBlock label="Chargement de la campagne…" />
  if (!camp) {
    return (
      <EmptyState
        icon={Megaphone}
        title="Campagne introuvable"
        description="Cette campagne n'existe pas ou a été supprimée."
        action={<Button variant="outline" onClick={() => navigate('/campaigns')}>Retour aux campagnes</Button>}
      />
    )
  }

  const spentPct = camp.budget > 0 ? Math.round((camp.spent / camp.budget) * 100) : 0
  const ctr = camp.metrics.impressions > 0 ? ((camp.metrics.clicks / camp.metrics.impressions) * 100).toFixed(1) : '0'

  return (
    <div>
      <PageHeader
        backHref="/campaigns"
        breadcrumbs={[{ label: 'Campagnes', href: '/campaigns' }, { label: camp.name }]}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {camp.name}
            <StatusBadge map={CAMPAIGN_STATUS} value={getStatus(camp)} dot />
            <Badge variant="neutral">{TYPE_LABELS[camp.type]}</Badge>
          </span>
        }
        description={`Du ${formatDate(camp.startDate)} au ${formatDate(camp.endDate)}`}
        actions={
          <Button leftIcon={Pencil} onClick={() => navigate(`/campaigns/${camp.id}/edit`)}>
            Modifier
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Impressions"
          value={camp.metrics.impressions.toLocaleString('fr-FR')}
          icon={Eye}
          tone="info"
        />
        <StatCard
          label="Clics"
          value={camp.metrics.clicks.toLocaleString('fr-FR')}
          sub={`CTR : ${ctr}%`}
          icon={MousePointerClick}
          tone="primary"
        />
        <StatCard
          label="Conversions"
          value={camp.metrics.conversions.toLocaleString('fr-FR')}
          icon={ShoppingCart}
          tone="purple"
        />
        <StatCard
          label="Revenu"
          value={formatPrice(camp.metrics.revenue)}
          sub={camp.spent > 0 ? `ROI : ${(((camp.metrics.revenue - camp.spent) / camp.spent) * 100).toFixed(0)}%` : undefined}
          icon={Wallet}
          tone="success"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {camp.description && (
              <div>
                <span className="text-gray-400 dark:text-gray-500">Description : </span>
                <span className="text-gray-700 dark:text-gray-300">{camp.description}</span>
              </div>
            )}
            <div>
              <span className="text-gray-400 dark:text-gray-500">Du </span>
              <span className="text-gray-700 dark:text-gray-300">{formatDate(camp.startDate)}</span>
              <span className="text-gray-400 dark:text-gray-500"> au </span>
              <span className="text-gray-700 dark:text-gray-300">{formatDate(camp.endDate)}</span>
            </div>
            <div>
              <span className="text-gray-400 dark:text-gray-500">Cible : </span>
              <span className="text-gray-700 dark:text-gray-300">
                {camp.target === 'all' ? 'Tous' : `${camp.targetName ?? camp.target} (${camp.targetId})`}
              </span>
            </div>
            <div>
              <span className="text-gray-400 dark:text-gray-500">Promotions liées : </span>
              <span className="text-gray-700 dark:text-gray-300">
                {camp.promotionIds.length > 0 ? camp.promotionIds.join(', ') : 'Aucune'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Budget</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400 dark:text-gray-500">Budget total</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{formatPrice(camp.budget)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400 dark:text-gray-500">Dépensé</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{formatPrice(camp.spent)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400 dark:text-gray-500">Restant</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{formatPrice(camp.budget - camp.spent)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  spentPct > 80 ? 'bg-red-500' : spentPct > 50 ? 'bg-orange-500' : 'bg-primary-500',
                )}
                style={{ width: `${Math.min(spentPct, 100)}%` }}
              />
            </div>
            <p className="text-right text-xs text-gray-400 dark:text-gray-500">{spentPct}% utilisé</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
