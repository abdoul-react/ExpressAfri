import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Gift, Pencil, Plus, Trash2 } from 'lucide-react'
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
import { COUPON_STATUS } from '@/lib/status'
import { toast } from '@/lib/toast'
import { useAdminCoupons, useDeleteCoupon } from '../hooks/useAdminCoupons'
import type { Coupon, CouponQueryParams } from '@/infrastructure/data-source/AdminCouponDataSource'
import { formatPrice, formatDate } from '@/lib/format'

function getStatus(c: { isActive: boolean; startDate: string; endDate: string }) {
  const now = new Date()
  if (!c.isActive) return 'inactive'
  if (new Date(c.startDate) > now) return 'scheduled'
  if (new Date(c.endDate) < now) return 'expired'
  return 'active'
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Actifs' },
  { value: 'scheduled', label: 'Programmés' },
  { value: 'expired', label: 'Expirés' },
  { value: 'inactive', label: 'Inactifs' },
]

export function AdminCouponListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const params: CouponQueryParams = { page, limit: 10, search: search || undefined, status: (statusFilter || undefined) as any }
  const { data, isLoading } = useAdminCoupons(params)
  const deleteCoupon = useDeleteCoupon()
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const columns: Column<Coupon>[] = [
    {
      key: 'code',
      header: 'Code',
      cell: (c) => <span className="font-mono text-sm font-medium text-primary-600 dark:text-primary-400">{c.code}</span>,
    },
    {
      key: 'name',
      header: 'Nom',
      cell: (c) => <span className="font-medium text-gray-900 dark:text-gray-100">{c.name}</span>,
    },
    {
      key: 'value',
      header: 'Valeur',
      cell: (c) => (c.type === 'percentage' ? `${c.value}%` : c.type === 'fixed' ? formatPrice(c.value) : 'Livraison'),
    },
    {
      key: 'status',
      header: 'Statut',
      cell: (c) => <StatusBadge map={COUPON_STATUS} value={getStatus(c)} dot />,
    },
    {
      key: 'usage',
      header: 'Utilisé',
      hideBelow: 'md',
      cell: (c) => (
        <span className="text-gray-500 dark:text-gray-400">
          {c.usedCount}/{c.usageLimitTotal ?? '∞'}
        </span>
      ),
    },
    {
      key: 'period',
      header: 'Période',
      hideBelow: 'lg',
      cell: (c) => (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          <p>{formatDate(c.startDate)}</p>
          <p>{formatDate(c.endDate)}</p>
        </div>
      ),
    },
    {
      key: 'kind',
      header: 'Type',
      hideBelow: 'md',
      cell: (c) =>
        c.affiliateId ? (
          <span title={`Affilié : ${c.affiliateName}`}>
            <Badge variant="purple">Affilié</Badge>
          </span>
        ) : (
          <span className="text-xs text-gray-400 dark:text-gray-500">Standard</span>
        ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      cell: (c) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" aria-label="Modifier" title="Modifier" onClick={() => navigate(`/coupons/${c.id}`)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Supprimer"
            title="Supprimer"
            className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
            onClick={() => setConfirmDelete(c.id)}
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
        title="Coupons"
        description={data ? `${data.total} coupons` : 'Gérez vos codes de réduction'}
        actions={
          <Button leftIcon={Plus} onClick={() => navigate('/coupons/new')}>
            Nouveau coupon
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput
          className="min-w-[220px] flex-1"
          value={search}
          onChange={(v) => { setSearch(v); setPage(1) }}
          placeholder="Rechercher par code ou nom…"
        />
        <Select
          className="w-48"
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); setPage(1) }}
          placeholder="Tous les statuts"
          options={STATUS_OPTIONS}
        />
      </div>

      <DataTable<Coupon>
        data={data?.data ?? []}
        columns={columns}
        rowKey={(c) => c.id}
        loading={isLoading}
        empty={{
          icon: Gift,
          title: 'Aucun coupon',
          description: 'Créez votre premier coupon pour offrir des réductions à vos clients.',
          action: (
            <Button leftIcon={Plus} onClick={() => navigate('/coupons/new')}>
              Nouveau coupon
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
        title="Supprimer ce coupon ?"
        description="Cette action est irréversible. Le coupon sera définitivement supprimé."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="danger"
        onConfirm={async () => {
          if (!confirmDelete) return
          try {
            await deleteCoupon.mutateAsync(confirmDelete)
            toast.success('Coupon supprimé')
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression')
          }
        }}
      />
    </div>
  )
}
