import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Users, XCircle } from 'lucide-react'
import { useAdminCustomers } from '../hooks/useAdminCustomers'
import { useBanCustomer, useUnbanCustomer } from '../hooks/useBanCustomer'
import { PermissionGuard } from '@/components/guards/PermissionGuard'
import { exportToCSV } from '@/lib/exportCSV'
import { resolveAdminMediaUrl } from '@/lib/resolveAdminMediaUrl'
import {
  PageHeader, SearchInput, DataTable, Badge, Button, Card, EmptyState, ConfirmDialog,
  type Column,
} from '@/components/ui'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/cn'
import { formatPrice } from '@/lib/format'

export function AdminCustomerListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [confirm, setConfirm] = useState<{ customer: any } | null>(null)
  const ban = useBanCustomer()
  const unban = useUnbanCustomer()

  const { data, isLoading, isError, error } = useAdminCustomers({
    page,
    limit: 10,
    search: search || undefined,
  })

  function handleExport() {
    if (!data?.data) return
    const rows = data.data.map((c: any) => ({
      ID: c.id,
      Nom: c.name,
      Email: c.email,
      Téléphone: c.phone ?? '',
      Ville: c.city ?? '',
      'Total commandes': c.totalOrders,
      'Total dépensé': c.totalSpent,
      Statut: c.isBanned ? 'Banni' : 'Actif',
    }))
    exportToCSV(rows, `clients_${new Date().toISOString().slice(0, 10)}`)
  }

  const columns: Column<any>[] = [
    {
      key: 'name',
      header: 'Client',
      cell: (customer) => {
        const avatarUrl = resolveAdminMediaUrl(customer.avatar)
        return (
          <div className={cn('flex items-center gap-3', customer.isBanned && 'opacity-60')}>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="h-9 w-9 flex-shrink-0 rounded-full object-cover"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
            ) : (
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-50 text-sm font-semibold text-primary-700 dark:bg-primary-500/10 dark:text-primary-400">
                {(customer.name || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{customer.name || '—'}</p>
            </div>
          </div>
        )
      },
    },
    {
      key: 'id',
      header: 'ID',
      hideBelow: 'lg',
      cell: (customer) => (
        <code className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2 py-1 text-xs font-mono text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          <span className="text-[10px] opacity-50">#</span>
          {customer.id.slice(0, 8)}
        </code>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      hideBelow: 'md',
      cell: (customer) => (
        <div>
          <p className="text-sm text-gray-900 dark:text-gray-100">{customer.email || '—'}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{customer.phone || ''}</p>
        </div>
      ),
    },
    { key: 'city', header: 'Ville', hideBelow: 'lg', cell: (customer) => customer.city || '—' },
    {
      key: 'totalOrders', header: 'Commandes', align: 'center', hideBelow: 'md',
      cell: (customer) => <span className="font-medium text-gray-900 dark:text-gray-100">{customer.totalOrders}</span>,
    },
    {
      key: 'totalSpent', header: 'Total dépensé', align: 'right', hideBelow: 'md',
      cell: (customer) => <span className="font-medium text-gray-900 dark:text-gray-100">{formatPrice(customer.totalSpent)}</span>,
    },
    {
      key: 'status', header: 'Statut', align: 'center',
      cell: (customer) => (
        <Badge variant={customer.isBanned ? 'danger' : 'success'} dot>
          {customer.isBanned ? 'Banni' : 'Actif'}
        </Badge>
      ),
    },
    {
      key: 'actions', header: 'Actions', align: 'right',
      cell: (customer) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <PermissionGuard permission="users.update">
            <Button
              variant="ghost"
              size="sm"
              disabled={ban.isPending || unban.isPending}
              className={customer.isBanned
                ? 'text-green-600 hover:bg-green-50 hover:text-green-700 dark:text-green-400 dark:hover:bg-green-500/10'
                : 'text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10'}
              onClick={() => setConfirm({ customer })}
            >
              {customer.isBanned ? 'Réactiver' : 'Bannir'}
            </Button>
          </PermissionGuard>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Clients"
        description={data ? `${data.total} client${data.total > 1 ? 's' : ''} inscrits` : 'Gestion des comptes clients'}
        actions={
          <PermissionGuard permission="users.read">
            <Button variant="outline" leftIcon={Download} onClick={handleExport}>
              Exporter CSV
            </Button>
          </PermissionGuard>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1) }}
          placeholder="Rechercher par nom, email ou téléphone…"
          size="sm"
          className="min-w-[220px] flex-1"
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
          rowKey={(customer) => customer.id}
          loading={isLoading}
          onRowClick={(customer) => navigate(`/customers/${customer.id}`)}
          empty={{
            icon: Users,
            title: 'Aucun client trouvé',
            description: search ? 'Essayez de modifier votre recherche.' : 'Les clients inscrits apparaîtront ici.',
          }}
          pagination={data ? { page: data.page, pageSize: 10, total: data.total, onPageChange: setPage } : undefined}
        />
      )}

      {confirm && (
        <ConfirmDialog
          open
          onOpenChange={(open) => { if (!open) setConfirm(null) }}
          title={confirm.customer.isBanned ? 'Réactiver le compte' : 'Bannir le client'}
          description={confirm.customer.isBanned
            ? `Réactiver le compte de ${confirm.customer.name} ? Il pourra de nouveau se connecter.`
            : `Bannir ${confirm.customer.name} ? Il ne pourra plus se connecter.`}
          confirmLabel={confirm.customer.isBanned ? 'Réactiver' : 'Bannir'}
          variant={confirm.customer.isBanned ? 'default' : 'danger'}
          onConfirm={async () => {
            const c = confirm.customer
            try {
              if (c.isBanned) {
                await unban.mutateAsync(c.id)
                toast.success(`Compte de ${c.name} réactivé`)
              } else {
                await ban.mutateAsync(c.id)
                toast.success(`${c.name} a été banni`)
              }
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Une erreur est survenue')
            }
          }}
        />
      )}
    </div>
  )
}
