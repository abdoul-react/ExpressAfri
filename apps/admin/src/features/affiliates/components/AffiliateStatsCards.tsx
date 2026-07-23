import { Users, UserCheck, Clock, Wallet } from 'lucide-react'
import { StatCard } from '@/components/ui'
import { formatPrice } from '@/lib/format'

interface AffiliateSummary {
  totalAffiliates: number
  activeAffiliates: number
  totalCommissionsPending: number
  totalPaidThisMonth: number
}

export function AffiliateStatsCards({ summary }: { summary: AffiliateSummary | undefined }) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="Total affiliés" value={summary?.totalAffiliates ?? '—'} icon={Users} tone="primary" loading={!summary} />
      <StatCard label="Actifs" value={summary?.activeAffiliates ?? '—'} icon={UserCheck} tone="success" loading={!summary} />
      <StatCard label="Com. en attente" value={summary ? formatPrice(summary.totalCommissionsPending) : '—'} icon={Clock} tone="warning" loading={!summary} />
      <StatCard label="Payé ce mois" value={summary ? formatPrice(summary.totalPaidThisMonth) : '—'} icon={Wallet} tone="info" loading={!summary} />
    </div>
  )
}
