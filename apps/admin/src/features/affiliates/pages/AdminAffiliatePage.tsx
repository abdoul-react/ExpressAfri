import { useState } from 'react'
import { Plus, Share2 } from 'lucide-react'
import { SearchInput, Select, DataTable, PageHeader, StatusBadge, Button, type Column } from '@/components/ui'
import { toast } from '@/lib/toast'
import { type StatusMap } from '@/lib/status'
import { useAdminAffiliates, useAdminAffiliate, useCreateAffiliate, useUpdateAffiliateStatus, useAffiliateCommissions, useApproveCommission, useRejectCommission, useAffiliateSummary } from '../hooks/useAdminAffiliates'
import type { AffiliateQueryParams, CommissionQueryParams } from '@/infrastructure/data-source/AdminAffiliateDataSource'
import type { CouponQueryParams } from '@/infrastructure/data-source/AdminCouponDataSource'
import { useAdminCoupons } from '@/features/coupons/hooks/useAdminCoupons'
import { formatPrice } from '@/lib/format'
import { AffiliateStatsCards } from '../components/AffiliateStatsCards'
import { AffiliateCreateModal } from '../components/AffiliateCreateModal'
import { AffiliateDetailCard } from '../components/AffiliateDetailCard'

const AFFILIATE_STATUS: StatusMap = {
  pending: { label: 'En attente', variant: 'warning' },
  active: { label: 'Actif', variant: 'success' },
  suspended: { label: 'Suspendu', variant: 'danger' },
  banned: { label: 'Banni', variant: 'neutral' },
}

const STATUS_FILTER_OPTIONS = [
  { value: 'active', label: 'Actif' },
  { value: 'pending', label: 'En attente' },
  { value: 'suspended', label: 'Suspendu' },
  { value: 'banned', label: 'Banni' },
]

export function AdminAffiliatePage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [commPage, setCommPage] = useState(1)
  const [cp, setCp] = useState(1)

  const aParams: AffiliateQueryParams = { page, limit: 10, search: search || undefined, status: (statusFilter || undefined) as any }
  const { data: affiliates, isLoading } = useAdminAffiliates(aParams)
  const { data: affiliate } = useAdminAffiliate(selectedId ?? '')
  const { data: summary } = useAffiliateSummary()
  const cParamsCoupon: CouponQueryParams = { page: cp, limit: 10, affiliateId: selectedId ?? undefined }
  const { data: affiliateCoupons } = useAdminCoupons(selectedId ? cParamsCoupon : undefined)
  const cParams: CommissionQueryParams = { page: commPage, limit: 10, affiliateId: selectedId ?? undefined }
  const { data: commissions } = useAffiliateCommissions(cParams)

  const createAffiliate = useCreateAffiliate()
  const updateStatus = useUpdateAffiliateStatus()
  const approveCom = useApproveCommission()
  const rejectCom = useRejectCommission()

  const affiliateColumns: Column<any>[] = [
    {
      key: 'affiliate', header: 'Affilié',
      cell: (a) => (
        <div className="flex items-center gap-2">
          {selectedId === a.id && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-500" />}
          <div>
            <p className={`text-sm font-medium ${selectedId === a.id ? 'text-primary-600 dark:text-primary-400' : 'text-gray-900 dark:text-gray-100'}`}>{a.name}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{a.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'country', header: 'Pays', hideBelow: 'md', cell: (a) => <span className="text-sm text-gray-500 dark:text-gray-400">{a.country}</span> },
    { key: 'rate', header: 'Commission', cell: (a) => <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{a.defaultCommissionRate}%</span> },
    { key: 'earned', header: 'Gagné', hideBelow: 'md', cell: (a) => <span className="text-sm font-medium text-green-600 dark:text-green-400">{formatPrice(a.totalEarned)}</span> },
    { key: 'pending', header: 'En attente', hideBelow: 'lg', cell: (a) => <span className="text-sm font-medium text-amber-600 dark:text-amber-400">{formatPrice(a.totalPending)}</span> },
    { key: 'referrals', header: 'Réf.', hideBelow: 'lg', align: 'center', cell: (a) => <span className="text-sm text-gray-700 dark:text-gray-300">{a.totalReferrals}</span> },
    { key: 'status', header: 'Statut', cell: (a) => <StatusBadge map={AFFILIATE_STATUS} value={a.status} dot /> },
  ]

  async function handleCreateAffiliate(data: any) {
    await createAffiliate.mutateAsync(data)
    toast.success('Affilié créé')
  }

  async function handleStatusChange(id: string, status: string, successMessage: string) {
    await updateStatus.mutateAsync({ id, status: status as any })
    toast.success(successMessage)
  }

  return (
    <div>
      <PageHeader
        title="Programme d'affiliation"
        description={affiliates ? `${affiliates.total} affilié(s)` : 'Chargement...'}
        actions={<Button leftIcon={Plus} onClick={() => { setShowForm(true); setSelectedId(null) }}>Nouvel affilié</Button>}
      />

      <AffiliateStatsCards summary={summary} />

      <div className="mb-4 flex flex-wrap gap-3">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Rechercher par nom, email, pays..." className="min-w-[200px] flex-1" />
        <Select value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1) }} placeholder="Tous statuts" options={STATUS_FILTER_OPTIONS} />
      </div>

      <DataTable
        data={affiliates?.data ?? []}
        columns={affiliateColumns}
        rowKey={(a) => a.id}
        loading={isLoading}
        onRowClick={(a) => { setSelectedId(selectedId === a.id ? null : a.id); setCommPage(1); setCp(1) }}
        empty={{ icon: Share2, title: 'Aucun affilié', description: 'Aucun affilié ne correspond à ces critères.' }}
        pagination={affiliates ? { page: affiliates.page, pageSize: 10, total: affiliates.total, onPageChange: setPage } : undefined}
      />

      {selectedId && affiliate && (
        <AffiliateDetailCard
          affiliate={affiliate}
          commissions={commissions}
          affiliateCoupons={affiliateCoupons}
          commPage={commPage}
          cp={cp}
          onCommPageChange={setCommPage}
          onCpChange={setCp}
          onStatusChange={handleStatusChange}
          onApproveCommission={async (id) => { await approveCom.mutateAsync(id); toast.success('Commission approuvée') }}
          onRejectCommission={async (id) => { await rejectCom.mutateAsync(id); toast.success('Commission rejetée') }}
        />
      )}

      <AffiliateCreateModal open={showForm} onOpenChange={setShowForm} onSave={handleCreateAffiliate} />
    </div>
  )
}
