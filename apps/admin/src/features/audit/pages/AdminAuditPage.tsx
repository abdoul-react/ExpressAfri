import { useState } from 'react'
import { ScrollText, Download } from 'lucide-react'
import { useAdminAudit, useExportAudit } from '../hooks/useAdminAudit'
import type { AuditEntry } from '@/infrastructure/data-source/AdminAuditDataSource'
import {
  PageHeader, Button, Badge, DataTable, type Column, Modal, SearchInput, Select,
} from '@/components/ui'
import type { StatusVariant } from '@/lib/status'

function actionVariant(action: string): StatusVariant {
  if (action === 'login.failed' || action.endsWith('.delete') || action.endsWith('.ban') ||
    action.endsWith('.reject') || action.endsWith('.cancel') || action.endsWith('.deactivate')) return 'danger'
  if (action.endsWith('.create') || action.endsWith('.approve') || action.endsWith('.unban') ||
    action.endsWith('.activate')) return 'success'
  if (action.endsWith('.refund')) return 'warning'
  if (action === 'login' || action.endsWith('.update') || action.endsWith('.change')) return 'info'
  return 'neutral'
}

function formatTimestamp(ts: string) {
  const d = new Date(ts)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/** Temps relatif en français (« il y a 5 min », « il y a 3 j »). */
function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return "à l'instant"
  if (min < 60) return `il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `il y a ${h} h`
  const d = Math.floor(h / 24)
  if (d < 30) return `il y a ${d} j`
  return formatTimestamp(ts)
}

export function AdminAuditPage() {
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState<AuditEntry | null>(null)
  const { data, isLoading } = useAdminAudit({ page, search: search || undefined, action: actionFilter || undefined, status: statusFilter || undefined, limit: 20 })
  const exportAudit = useExportAudit()

  const allActions = [
    'login', 'login.failed', 'admin.create', 'admin.update', 'admin.delete',
    'role.create', 'role.update', 'role.delete', 'product.create', 'product.update',
    'product.delete', 'order.cancel', 'order.refund', 'order.status.change',
    'payment.refund', 'store.approve', 'store.reject', 'user.ban', 'user.unban',
    'setting.update', 'feature.activate', 'feature.deactivate',
  ]

  const columns: Column<AuditEntry>[] = [
    {
      key: 'action',
      header: 'Action',
      cell: (entry) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={actionVariant(entry.action)} size="sm">{entry.action}</Badge>
          <Badge variant={entry.status === 'success' ? 'success' : 'danger'} size="sm" dot>
            {entry.status === 'success' ? 'Succès' : 'Échec'}
          </Badge>
        </div>
      ),
    },
    {
      key: 'actor',
      header: 'Acteur',
      cell: (entry) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            {entry.actorEmail[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{entry.actorEmail}</p>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">{entry.actorRole}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'resource',
      header: 'Ressource',
      hideBelow: 'md',
      cell: (entry) => (
        <span className="text-gray-600 dark:text-gray-300">
          {entry.resource}
          {entry.resourceId && <span className="ml-1 font-mono text-xs text-gray-400 dark:text-gray-500">#{entry.resourceId}</span>}
        </span>
      ),
    },
    {
      key: 'timestamp',
      header: 'Date',
      align: 'right',
      cell: (entry) => (
        <div className="whitespace-nowrap text-right">
          <p className="text-sm text-gray-700 dark:text-gray-300">{timeAgo(entry.timestamp)}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{formatTimestamp(entry.timestamp)}</p>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="Journal de toutes les actions sensibles"
        actions={
          <Button variant="outline" leftIcon={Download} onClick={() => exportAudit()}>
            Exporter CSV
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <SearchInput
          className="min-w-[220px] flex-1"
          value={search}
          onChange={(v) => { setSearch(v); setPage(1) }}
          placeholder="Rechercher par email, action, ressource…"
        />
        <Select
          size="sm"
          value={actionFilter}
          onChange={(v) => { setActionFilter(v); setPage(1) }}
          placeholder="Toutes les actions"
          options={allActions.map((a) => ({ value: a, label: a }))}
        />
        <Select
          size="sm"
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); setPage(1) }}
          placeholder="Tous les statuts"
          options={[
            { value: 'success', label: 'Succès' },
            { value: 'failure', label: 'Échec' },
          ]}
        />
      </div>

      <DataTable<AuditEntry>
        data={data?.data ?? []}
        columns={columns}
        rowKey={(entry) => entry.id}
        loading={isLoading}
        skeletonRows={8}
        onRowClick={(entry) => setDetail(entry)}
        empty={{
          icon: ScrollText,
          title: "Aucune entrée d'audit trouvée",
          description: 'Ajustez vos filtres ou revenez plus tard.',
        }}
        pagination={{
          page,
          pageSize: 20,
          total: data?.total ?? 0,
          onPageChange: setPage,
        }}
      />

      <Modal
        open={!!detail}
        onOpenChange={(o) => { if (!o) setDetail(null) }}
        title="Détails de l'entrée"
        description={detail ? `${detail.action} · ${formatTimestamp(detail.timestamp)}` : undefined}
        size="lg"
      >
        {detail && (
          <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <span className="block text-xs font-medium text-gray-500 dark:text-gray-400">ID Entrée</span>
              <span className="font-mono text-gray-700 dark:text-gray-300">{detail.id}</span>
            </div>
            <div>
              <span className="block text-xs font-medium text-gray-500 dark:text-gray-400">Acteur</span>
              <span className="text-gray-700 dark:text-gray-300">{detail.actorEmail} ({detail.actorRole})</span>
            </div>
            <div>
              <span className="block text-xs font-medium text-gray-500 dark:text-gray-400">Ressource</span>
              <span className="text-gray-700 dark:text-gray-300">
                {detail.resource}
                {detail.resourceId && <span className="ml-1 font-mono text-xs">#{detail.resourceId}</span>}
              </span>
            </div>
            <div>
              <span className="block text-xs font-medium text-gray-500 dark:text-gray-400">Statut</span>
              <Badge variant={detail.status === 'success' ? 'success' : 'danger'} size="sm" dot>
                {detail.status === 'success' ? 'Succès' : 'Échec'}
              </Badge>
            </div>
            {detail.ipAddress && (
              <div>
                <span className="block text-xs font-medium text-gray-500 dark:text-gray-400">IP</span>
                <span className="font-mono text-gray-700 dark:text-gray-300">{detail.ipAddress}</span>
              </div>
            )}
            {detail.userAgent && (
              <div>
                <span className="block text-xs font-medium text-gray-500 dark:text-gray-400">User Agent</span>
                <span className="block truncate text-xs text-gray-700 dark:text-gray-300">{detail.userAgent}</span>
              </div>
            )}
            {detail.details && (
              <div className="sm:col-span-2">
                <span className="block text-xs font-medium text-gray-500 dark:text-gray-400">Détails</span>
                <pre className="mt-1 overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
                  {JSON.stringify(detail.details, null, 2)}
                </pre>
              </div>
            )}
            {detail.errorMessage && (
              <div className="sm:col-span-2">
                <span className="block text-xs font-medium text-red-500 dark:text-red-400">Erreur</span>
                <span className="text-red-600 dark:text-red-400">{detail.errorMessage}</span>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
