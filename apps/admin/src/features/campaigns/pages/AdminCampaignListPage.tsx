import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, Megaphone, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  PageHeader,
  SearchInput,
  Select,
  StatusBadge,
  type Column,
} from '@/components/ui'
import { cn } from '@/lib/cn'
import { CAMPAIGN_STATUS } from '@/lib/status'
import { toast } from '@/lib/toast'
import { useAdminCampaigns, useDeleteCampaign } from '../hooks/useAdminCampaigns'
import type { Campaign, CampaignQueryParams } from '@/infrastructure/data-source/AdminCampaignDataSource'
import { formatPrice } from '@/lib/format'

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

const STATUS_OPTIONS = [
  { value: 'active', label: 'Actives' },
  { value: 'scheduled', label: 'Programmées' },
  { value: 'expired', label: 'Expirées' },
  { value: 'inactive', label: 'Inactives' },
]

export function AdminCampaignListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const params: CampaignQueryParams = { page, limit: 10, search: search || undefined, status: (statusFilter || undefined) as any }
  const { data, isLoading } = useAdminCampaigns(params)
  const deleteCamp = useDeleteCampaign()
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const columns: Column<Campaign>[] = [
    {
      key: 'name',
      header: 'Campagne',
      cell: (c) => (
        <div className="min-w-0 max-w-xs">
          <p className="truncate font-medium text-gray-900 dark:text-gray-100">{c.name}</p>
          {c.description && <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{c.description}</p>}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      cell: (c) => <StatusBadge map={CAMPAIGN_STATUS} value={getStatus(c)} dot />,
    },
    {
      key: 'type',
      header: 'Type',
      hideBelow: 'md',
      cell: (c) => <Badge variant="neutral">{TYPE_LABELS[c.type]}</Badge>,
    },
    {
      key: 'budget',
      header: 'Budget',
      hideBelow: 'md',
      cell: (c) => (
        <div>
          <p className="text-gray-900 dark:text-gray-100">{formatPrice(c.budget)}</p>
          <p
            className={cn(
              'mt-0.5 text-xs',
              c.spent > c.budget * 0.8
                ? 'font-medium text-orange-600 dark:text-orange-400'
                : 'text-gray-500 dark:text-gray-400',
            )}
          >
            Dépensé : {formatPrice(c.spent)}
            {c.budget > 0 ? ` (${Math.round((c.spent / c.budget) * 100)}%)` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'performance',
      header: 'Performance',
      hideBelow: 'lg',
      cell: (c) => (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          <p>{c.metrics.impressions.toLocaleString('fr-FR')} impressions</p>
          <p className="mt-0.5">
            {c.metrics.clicks.toLocaleString('fr-FR')} clics · {c.metrics.conversions.toLocaleString('fr-FR')} conversions
          </p>
        </div>
      ),
    },
    {
      key: 'revenue',
      header: 'Revenu',
      align: 'right',
      hideBelow: 'lg',
      cell: (c) => <span className="font-medium text-gray-900 dark:text-gray-100">{formatPrice(c.metrics.revenue)}</span>,
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      cell: (c) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Voir le détail"
            title="Voir le détail"
            onClick={(e) => { e.stopPropagation(); navigate(`/campaigns/${c.id}`) }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Modifier"
            title="Modifier"
            onClick={(e) => { e.stopPropagation(); navigate(`/campaigns/${c.id}/edit`) }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Supprimer"
            title="Supprimer"
            className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
            onClick={(e) => { e.stopPropagation(); setConfirmDelete(c.id) }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Campagnes"
        description={data ? `${data.total} campagnes` : 'Pilotez vos campagnes marketing'}
        actions={
          <Button leftIcon={Plus} onClick={() => navigate('/campaigns/new')}>
            Nouvelle campagne
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput
          className="min-w-[220px] flex-1"
          value={search}
          onChange={(v) => { setSearch(v); setPage(1) }}
          placeholder="Rechercher…"
        />
        <Select
          className="w-48"
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); setPage(1) }}
          placeholder="Tous les statuts"
          options={STATUS_OPTIONS}
        />
      </div>

      <DataTable<Campaign>
        data={data?.data ?? []}
        columns={columns}
        rowKey={(c) => c.id}
        loading={isLoading}
        onRowClick={(c) => navigate(`/campaigns/${c.id}`)}
        empty={{
          icon: Megaphone,
          title: 'Aucune campagne',
          description: 'Lancez votre première campagne pour promouvoir vos produits.',
          action: (
            <Button leftIcon={Plus} onClick={() => navigate('/campaigns/new')}>
              Nouvelle campagne
            </Button>
          ),
        }}
        pagination={
          data && data.total > 10
            ? { page, pageSize: 10, total: data.total, onPageChange: setPage }
            : undefined
        }
      />

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title="Supprimer cette campagne ?"
        description="Cette action est irréversible. La campagne sera définitivement supprimée."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="danger"
        onConfirm={async () => {
          if (!confirmDelete) return
          try {
            await deleteCamp.mutateAsync(confirmDelete)
            toast.success('Campagne supprimée')
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression')
          }
        }}
      />
    </div>
  )
}
