import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Scale, Trash2 } from 'lucide-react'
import { useAdminDisputes, useDeleteDispute } from '../hooks/useAdminDisputes'
import { PermissionGuard } from '@/components/guards/PermissionGuard'
import { exportToCSV } from '@/lib/exportCSV'
import { resolveAdminMediaUrl } from '@/lib/resolveAdminMediaUrl'
import type { AdminDispute, DisputeQueryParams, DisputeStatus, DisputeReason } from '@/infrastructure/data-source/AdminDisputeDataSource'
import {
  PageHeader, Button, Badge, StatusBadge, Select, SearchInput, DataTable,
  ConfirmDialog, type Column,
} from '@/components/ui'
import { DISPUTE_STATUS, statusMeta } from '@/lib/status'
import { cn } from '@/lib/cn'
import { toast } from '@/lib/toast'
import { formatPrice, formatDate } from '@/lib/format'

// Les motifs de litige ne sont pas des statuts : libellés locaux conservés.
const REASON_LABELS: Record<DisputeReason, string> = {
  not_received:    'Non reçu',
  not_as_described:'Non conforme',
  defective:       'Défectueux',
  wrong_item:      'Mauvais article',
  damaged:         'Endommagé',
  unauthorized:    'Non autorisé',
  other:           'Autre',
}

const REASON_OPTIONS = (Object.entries(REASON_LABELS) as [DisputeReason, string][]).map(([value, label]) => ({ value, label }))

// ─── Composant ────────────────────────────────────────────────────────────────

export function AdminDisputeListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<DisputeStatus | ''>('')
  const [reasonFilter, setReasonFilter] = useState<DisputeReason | ''>('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const deleteDispute = useDeleteDispute()

  const params: DisputeQueryParams = {
    page,
    limit: 10,
    search: search || undefined,
    status: statusFilter || undefined,
    reason: reasonFilter || undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  }

  const { data, isLoading, isError, error } = useAdminDisputes(params)

  // Compteurs par statut pour les badges rapides
  const allParams: DisputeQueryParams = { limit: 200 }
  const { data: allData } = useAdminDisputes(allParams)
  const countByStatus = (allData?.data ?? []).reduce<Record<string, number>>((acc, d) => {
    acc[d.status] = (acc[d.status] ?? 0) + 1
    return acc
  }, {})

  const columns: Column<AdminDispute>[] = [
    {
      key: 'id', header: 'Litige / Commande',
      cell: (d) => (
        <div>
          <p className="font-mono text-xs font-medium text-gray-900 dark:text-gray-100">{d.id}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{d.orderRef}</p>
        </div>
      ),
    },
    {
      key: 'customerName', header: 'Client', hideBelow: 'md',
      cell: (d) => (
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{d.customerName}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{d.customerEmail}</p>
        </div>
      ),
    },
    {
      key: 'productName', header: 'Produit', hideBelow: 'lg',
      cell: (d) => (
        <div>
          <div className="flex items-center gap-2">
            {d.productImage && (
              <img src={resolveAdminMediaUrl(d.productImage)} alt="" className="h-8 w-8 flex-shrink-0 rounded-lg object-cover" />
            )}
            <p className="max-w-[160px] truncate text-sm text-gray-700 dark:text-gray-300">{d.productName}</p>
          </div>
          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{d.storeName}</p>
        </div>
      ),
    },
    {
      key: 'amount', header: 'Montant',
      cell: (d) => <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatPrice(d.amount)}</span>,
    },
    {
      key: 'reason', header: 'Motif', hideBelow: 'md',
      cell: (d) => <Badge variant="neutral" size="sm">{REASON_LABELS[d.reason]}</Badge>,
    },
    {
      key: 'status', header: 'Statut',
      cell: (d) => <StatusBadge map={DISPUTE_STATUS} value={d.status} size="sm" dot />,
    },
    {
      key: 'createdAt', header: 'Date', hideBelow: 'sm',
      cell: (d) => <span className="text-sm text-gray-500 dark:text-gray-400">{formatDate(d.createdAt)}</span>,
    },
    {
      key: 'actions', header: 'Actions', align: 'right',
      cell: (d) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" onClick={() => navigate(`/disputes/${d.id}`)}>
            Traiter
          </Button>
          <PermissionGuard permission="disputes.delete">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={Trash2}
              className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
              onClick={() => setConfirmDelete(d.id)}
            >
              Supprimer
            </Button>
          </PermissionGuard>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Litiges"
        description={data ? `${data.total} litige${data.total > 1 ? 's' : ''}` : 'Médiation et résolution des litiges'}
        actions={
          <PermissionGuard permission="disputes.export">
            <Button
              variant="outline"
              leftIcon={Download}
              onClick={() => {
                if (!data?.data) return
                const rows = data.data.map((d) => ({
                  ID: d.id,
                  Commande: d.orderRef,
                  Client: d.customerName,
                  Vendeur: d.sellerName,
                  Boutique: d.storeName,
                  Produit: d.productName,
                  Montant: d.amount,
                  Motif: REASON_LABELS[d.reason],
                  Statut: statusMeta(DISPUTE_STATUS, d.status).label,
                  Date: d.createdAt,
                }))
                exportToCSV(rows, `litiges_${new Date().toISOString().slice(0, 10)}`)
              }}
            >
              Exporter CSV
            </Button>
          </PermissionGuard>
        }
      />

      {/* Pills de filtre rapide par statut */}
      <div className="mb-4 flex flex-wrap gap-2">
        {Object.keys(DISPUTE_STATUS).map((s) => {
          const meta = statusMeta(DISPUTE_STATUS, s)
          const active = statusFilter === s
          return (
            <button
              key={s}
              type="button"
              onClick={() => { setStatusFilter(active ? '' : (s as DisputeStatus)); setPage(1) }}
              className={cn(
                'rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40',
                active && 'ring-2 ring-primary-500/50 ring-offset-1 dark:ring-offset-gray-950',
              )}
            >
              <Badge variant={active ? meta.variant : 'neutral'} dot={active} className="cursor-pointer px-3 py-1">
                {meta.label}
                {countByStatus[s] != null && (
                  <span className="text-[10px] font-bold opacity-70">{countByStatus[s]}</span>
                )}
              </Badge>
            </button>
          )
        })}
      </div>

      {/* Filtres */}
      <div className="mb-4 flex flex-wrap gap-3">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1) }}
          placeholder="Rechercher commande, client, vendeur, produit…"
          size="sm"
          className="min-w-[200px] flex-1"
        />
        <Select
          value={reasonFilter}
          onChange={(v) => { setReasonFilter(v as DisputeReason | ''); setPage(1) }}
          options={REASON_OPTIONS}
          placeholder="Tous motifs"
          size="sm"
        />
      </div>

      {isError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          Erreur : {(error as Error)?.message}
        </div>
      )}

      {!isError && (
        <DataTable<AdminDispute>
          data={data?.data ?? []}
          columns={columns}
          rowKey={(d) => d.id}
          loading={isLoading}
          onRowClick={(d) => navigate(`/disputes/${d.id}`)}
          empty={{ icon: Scale, title: 'Aucun litige trouvé', description: 'Aucun litige ne correspond à ces critères.' }}
          pagination={data ? { page, pageSize: 10, total: data.total, onPageChange: setPage } : undefined}
        />
      )}

      {/* Confirmation de suppression */}
      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => { if (!o) setConfirmDelete(null) }}
        title="Supprimer le litige ?"
        description="Cette action est irréversible. Le litige et tout son historique seront supprimés définitivement."
        confirmLabel="Supprimer"
        variant="danger"
        onConfirm={async () => {
          if (!confirmDelete) return
          try {
            await deleteDispute.mutateAsync(confirmDelete)
            toast.success('Litige supprimé')
          } catch {
            toast.error('Erreur lors de la suppression du litige')
          }
        }}
      />
    </div>
  )
}
