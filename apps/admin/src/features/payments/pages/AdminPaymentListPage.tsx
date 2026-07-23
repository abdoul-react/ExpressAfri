import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, XCircle } from 'lucide-react'
import { useAdminPayments } from '../hooks/useAdminPayments'
import {
  PageHeader, SearchInput, Select, Input, DataTable, StatusBadge, Card, EmptyState,
  type Column,
} from '@/components/ui'
import { PAYMENT_STATUS } from '@/lib/status'
import type { PaymentQueryParams } from '@/infrastructure/data-source/AdminPaymentDataSource'
import { formatPrice, formatDate } from '@/lib/format'

const MOCK_METHODS = ['Orange Money', 'Wave', 'Carte Visa', 'Mobile Money']

export function AdminPaymentListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [methodFilter, setMethodFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  const params: PaymentQueryParams = {
    page, limit: 10,
    search: search || undefined,
    status: (statusFilter as PaymentQueryParams['status']) || undefined,
    method: methodFilter || undefined,
    dateFrom: dateFilter || undefined,
    dateTo: dateFilter || undefined,
  }

  const { data, isLoading, isError, error } = useAdminPayments(params)

  const columns: Column<any>[] = [
    {
      key: 'transaction',
      header: 'Transaction',
      cell: (payment) => (
        <div>
          <p className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">{payment.id}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{payment.transactionId}</p>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Client',
      hideBelow: 'md',
      cell: (payment) => (
        <div>
          <p className="text-sm text-gray-900 dark:text-gray-100">{payment.customerName}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{payment.customerEmail}</p>
        </div>
      ),
    },
    { key: 'method', header: 'Méthode', hideBelow: 'lg', cell: (payment) => payment.method },
    {
      key: 'amount', header: 'Montant', align: 'right',
      cell: (payment) => <span className="font-medium text-gray-900 dark:text-gray-100">{formatPrice(payment.amount)}</span>,
    },
    {
      key: 'fees', header: 'Frais', align: 'right', hideBelow: 'lg',
      cell: (payment) => formatPrice(payment.fees),
    },
    {
      key: 'status', header: 'Statut', align: 'center',
      cell: (payment) => <StatusBadge map={PAYMENT_STATUS} value={payment.status} />,
    },
    {
      key: 'date', header: 'Date', align: 'center', hideBelow: 'md',
      cell: (payment) => formatDate(payment.paidAt ?? payment.createdAt),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Paiements"
        description={data ? `${data.total} transaction${data.total > 1 ? 's' : ''}` : 'Suivi des transactions clients'}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1) }}
          placeholder="Rechercher par ID, commande, transaction ou client…"
          size="sm"
          className="min-w-[220px] flex-1"
        />
        <Select
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); setPage(1) }}
          size="sm"
          placeholder="Tous statuts"
          options={[
            { value: 'paid', label: 'Payé' },
            { value: 'pending', label: 'En attente' },
            { value: 'failed', label: 'Échoué' },
            { value: 'refunded', label: 'Remboursé' },
          ]}
        />
        <Select
          value={methodFilter}
          onChange={(v) => { setMethodFilter(v); setPage(1) }}
          size="sm"
          placeholder="Tous moyens"
          options={MOCK_METHODS.map((m) => ({ value: m, label: m }))}
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
          <EmptyState icon={XCircle} title="Erreur de chargement" description={(error as Error)?.message} />
        </Card>
      ) : (
        <DataTable
          data={data?.data ?? []}
          columns={columns}
          rowKey={(payment) => payment.id}
          loading={isLoading}
          onRowClick={(payment) => navigate(`/payments/${payment.id}`)}
          empty={{
            icon: CreditCard,
            title: 'Aucun paiement trouvé',
            description: search || statusFilter || methodFilter || dateFilter
              ? 'Essayez de modifier vos filtres de recherche.'
              : 'Les transactions clients apparaîtront ici.',
          }}
          pagination={data ? { page: data.page, pageSize: 10, total: data.total, onPageChange: setPage } : undefined}
        />
      )}
    </div>
  )
}
