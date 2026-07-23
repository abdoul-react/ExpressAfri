import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Eye, RefreshCw, ShoppingCart, XCircle } from 'lucide-react'
import { useAdminOrders } from '../hooks/useAdminOrders'
import { PermissionGuard } from '@/components/guards/PermissionGuard'
import type { OrderQueryParams } from '@/infrastructure/data-source/AdminOrderDataSource'
import { exportToCSV } from '@/lib/exportCSV'
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  Input,
  PageHeader,
  SearchInput,
  Select,
  StatusBadge,
  type Column,
} from '@/components/ui'
import { ORDER_STATUS } from '@/lib/status'
import { cn } from '@/lib/cn'
import { formatPrice, formatDate } from '@/lib/format'

const STATUS_OPTIONS = Object.entries(ORDER_STATUS).map(([value, meta]) => ({
  value,
  label: meta.label,
}))

export function AdminOrderListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  const params: OrderQueryParams = {
    page,
    limit: 10,
    search: search || undefined,
    status: statusFilter || undefined,
    dateFrom: dateFilter || undefined,
    dateTo: dateFilter || undefined,
  }

  const { data, isLoading, isError, error, refetch } = useAdminOrders(params)

  const columns: Column<any>[] = [
    {
      key: 'orderNumber',
      header: 'Commande',
      cell: (order) => (
        <span className="font-mono text-sm font-medium tracking-wide text-gray-900 dark:text-gray-100">{order.orderNumber || order.id}</span>
      ),
    },
    {
      key: 'customer',
      header: 'Client',
      cell: (order) => (
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{order.customerName}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{order.customerEmail}</p>
        </div>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      cell: (order) => (
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatPrice(order.total)}</span>
      ),
    },
    {
      key: 'paymentMethod',
      header: 'Paiement',
      hideBelow: 'lg',
      cell: (order) => <span className="text-sm text-gray-500 dark:text-gray-400">{order.paymentMethod}</span>,
    },
    {
      key: 'status',
      header: 'Statut',
      cell: (order) => <StatusBadge map={ORDER_STATUS} value={order.status} dot />,
    },
    {
      key: 'createdAt',
      header: 'Date',
      hideBelow: 'md',
      cell: (order) => (
        <span className={cn('text-sm text-gray-500 dark:text-gray-400')}>{formatDate(order.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (order) => (
        <PermissionGuard permission="orders.update">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={Eye}
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/orders/${order.id}`)
            }}
          >
            Détail
          </Button>
        </PermissionGuard>
      ),
    },
  ]

  function handleExport() {
    if (!data?.data) return
    const rows = data.data.map((o: any) => ({
      Commande: o.orderNumber || o.id,
      Client: o.customerName ?? '',
      Email: o.customerEmail ?? '',
      Total: o.total,
      Paiement: o.paymentMethod ?? '',
      Statut: o.status,
      Date: o.createdAt,
    }))
    exportToCSV(rows, `commandes_${new Date().toISOString().slice(0, 10)}`)
  }

  return (
    <div>
      <PageHeader
        title="Commandes"
        description={data ? `${data.total} commandes` : 'Chargement…'}
        actions={
          <PermissionGuard permission="orders.read">
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
          placeholder="Rechercher par ID, client ou email…"
          className="w-full sm:max-w-xs"
        />
        <Select
          size="sm"
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); setPage(1) }}
          options={STATUS_OPTIONS}
          placeholder="Tous statuts"
        />
        <Input
          type="date"
          size="sm"
          value={dateFilter}
          onChange={(e) => { setDateFilter(e.target.value); setPage(1) }}
        />
      </div>

      {isError ? (
        <Card padding="none">
          <EmptyState
            icon={XCircle}
            title="Erreur de chargement"
            description={(error as Error)?.message}
            action={
              <Button variant="outline" leftIcon={RefreshCw} onClick={() => refetch()}>
                Réessayer
              </Button>
            }
          />
        </Card>
      ) : (
        <DataTable
          data={data?.data ?? []}
          columns={columns}
          rowKey={(order) => String(order.id)}
          loading={isLoading}
          onRowClick={(order) => navigate(`/orders/${order.id}`)}
          empty={{
            icon: ShoppingCart,
            title: 'Aucune commande',
            description: 'Aucune commande ne correspond à vos critères de recherche.',
          }}
          pagination={
            data
              ? { page: data.page, pageSize: 10, total: data.total, onPageChange: setPage }
              : undefined
          }
        />
      )}
    </div>
  )
}
