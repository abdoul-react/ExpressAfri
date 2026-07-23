import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Store, XCircle } from 'lucide-react'
import { useAdminStores } from '../hooks/useAdminStores'
import { useApproveStore, useRejectStore } from '../hooks/useStoreActions'
import { PermissionGuard } from '@/components/guards/PermissionGuard'
import {
  PageHeader, SearchInput, Select, DataTable, StatusBadge, Button, Card, EmptyState, ConfirmDialog,
  type Column,
} from '@/components/ui'
import { STORE_STATUS } from '@/lib/status'
import { toast } from '@/lib/toast'
import type { StoreQueryParams } from '@/infrastructure/data-source/AdminStoreDataSource'
import { formatPrice, formatDate } from '@/lib/format'

interface ConfirmState {
  title: string
  description: string
  variant?: 'danger' | 'default'
  confirmLabel: string
  onConfirm: () => Promise<void>
}

export function AdminStoreListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const approve = useApproveStore()
  const reject = useRejectStore()

  const params: StoreQueryParams = {
    page, limit: 10,
    search: search || undefined,
    status: (statusFilter as StoreQueryParams['status']) || undefined,
  }

  const { data, isLoading, isError, error } = useAdminStores(params)

  function askApprove(id: string, name: string) {
    setConfirm({
      title: 'Approuver la boutique',
      description: `Approuver la boutique « ${name} » ? Elle deviendra visible sur la plateforme.`,
      confirmLabel: 'Approuver',
      onConfirm: async () => {
        try {
          await approve.mutateAsync(id)
          toast.success(`Boutique « ${name} » approuvée`)
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Erreur lors de l'approbation")
        }
      },
    })
  }

  function askReject(id: string, name: string) {
    setConfirm({
      title: 'Rejeter la boutique',
      description: `Rejeter la boutique « ${name} » ? Le vendeur en sera informé.`,
      variant: 'danger',
      confirmLabel: 'Rejeter',
      onConfirm: async () => {
        try {
          await reject.mutateAsync({ id })
          toast.success(`Boutique « ${name} » rejetée`)
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Erreur lors du rejet')
        }
      },
    })
  }

  const columns: Column<any>[] = [
    {
      key: 'name',
      header: 'Boutique',
      cell: (store) => (
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{store.name}</p>
      ),
    },
    {
      key: 'owner',
      header: 'Propriétaire',
      cell: (store) => (
        <div>
          <p className="text-sm text-gray-900 dark:text-gray-100">{store.ownerName}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{store.ownerEmail}</p>
        </div>
      ),
    },
    { key: 'city', header: 'Ville', hideBelow: 'lg', cell: (store) => store.city },
    {
      key: 'productCount', header: 'Produits', align: 'center', hideBelow: 'md',
      cell: (store) => <span className="font-medium text-gray-900 dark:text-gray-100">{store.productCount}</span>,
    },
    {
      key: 'revenue', header: 'Revenu', align: 'right', hideBelow: 'md',
      cell: (store) => <span className="font-medium text-gray-900 dark:text-gray-100">{formatPrice(store.revenue)}</span>,
    },
    {
      key: 'status', header: 'Statut', align: 'center',
      cell: (store) => <StatusBadge map={STORE_STATUS} value={store.status} />,
    },
    { key: 'createdAt', header: 'Date', align: 'center', hideBelow: 'lg', cell: (store) => formatDate(store.createdAt) },
    {
      key: 'actions', header: 'Actions', align: 'right',
      cell: (store) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {store.status === 'pending' && (
            <>
              <PermissionGuard permission="stores.approve">
                <Button variant="ghost" size="sm" className="text-green-600 hover:bg-green-50 hover:text-green-700 dark:text-green-400 dark:hover:bg-green-500/10"
                  disabled={approve.isPending} onClick={() => askApprove(store.id, store.name)}>
                  Approuver
                </Button>
              </PermissionGuard>
              <PermissionGuard permission="stores.reject">
                <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10"
                  disabled={reject.isPending} onClick={() => askReject(store.id, store.name)}>
                  Rejeter
                </Button>
              </PermissionGuard>
            </>
          )}
          <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-700 dark:text-primary-400"
            onClick={() => navigate(`/stores/${store.id}`)}>
            Détail
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Boutiques"
        description={data ? `${data.total} boutique${data.total > 1 ? 's' : ''} sur la plateforme` : 'Gestion des boutiques vendeurs'}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1) }}
          placeholder="Rechercher par nom, propriétaire ou ville…"
          size="sm"
          className="min-w-[220px] flex-1"
        />
        <Select
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); setPage(1) }}
          size="sm"
          placeholder="Tous statuts"
          options={[
            { value: 'pending', label: 'En attente' },
            { value: 'approved', label: 'Approuvée' },
            { value: 'rejected', label: 'Rejetée' },
            { value: 'suspended', label: 'Suspendue' },
          ]}
        />
      </div>

      {isError ? (
        <Card padding="none">
          <EmptyState icon={XCircle} title="Erreur de chargement" description={(error as Error)?.message} />
        </Card>
      ) : (
        <DataTable
          data={data?.data ?? []}
          columns={columns}
          rowKey={(store) => store.id}
          loading={isLoading}
          onRowClick={(store) => navigate(`/stores/${store.id}`)}
          empty={{
            icon: Store,
            title: 'Aucune boutique trouvée',
            description: search || statusFilter ? 'Essayez de modifier vos filtres de recherche.' : 'Les boutiques créées par les vendeurs apparaîtront ici.',
          }}
          pagination={data ? { page: data.page, pageSize: 10, total: data.total, onPageChange: setPage } : undefined}
        />
      )}

      {confirm && (
        <ConfirmDialog
          open
          onOpenChange={(open) => { if (!open) setConfirm(null) }}
          title={confirm.title}
          description={confirm.description}
          confirmLabel={confirm.confirmLabel}
          variant={confirm.variant}
          onConfirm={confirm.onConfirm}
        />
      )}
    </div>
  )
}
