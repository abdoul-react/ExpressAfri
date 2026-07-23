import { useState } from 'react'
import { Ban, Check, CheckCircle2, Ticket } from 'lucide-react'
import {
  Badge, Button, Card, CardContent, CardHeader, CardTitle, CardDescription,
  DataTable, EmptyState, Pagination, StatusBadge, Tabs, TabsContent, TabsList, TabsTrigger,
  type Column, ConfirmDialog,
} from '@/components/ui'
import { formatPrice } from '@/lib/format'
import { COMMISSION_STATUS, type StatusMap } from '@/lib/status'

const AFFILIATE_STATUS: StatusMap = {
  pending: { label: 'En attente', variant: 'warning' },
  active: { label: 'Actif', variant: 'success' },
  suspended: { label: 'Suspendu', variant: 'danger' },
  banned: { label: 'Banni', variant: 'neutral' },
}

interface CommissionRow {
  id: string
  orderId: string
  customerName: string
  code: string
  orderAmount: number
  commissionAmount: number
  commissionRate: number
  status: string
  paidAt?: string
  createdAt: string
}

interface CouponRow {
  id: string
  code: string
  isActive: boolean
  type: string
  value: number
  usedCount: number
  usageLimitTotal?: number
  minPurchase?: number
  name: string
  startDate: string
  endDate: string
}

interface Paginated<T> {
  data: T[]
  page: number
  total: number
}

interface AffiliateDetailCardProps {
  affiliate: {
    id: string
    name: string
    email: string
    phone: string
    country: string
    status: string
    defaultCommissionRate: number
    totalEarned: number
    totalPending: number
    totalPaid: number
    totalReferrals: number
    paymentMethod: string
    paymentDetails: string
    notes?: string
    createdAt: string
  }
  commissions: Paginated<CommissionRow> | undefined
  affiliateCoupons: Paginated<CouponRow> | undefined
  commPage: number
  cp: number
  onCommPageChange: (p: number) => void
  onCpChange: (p: number) => void
  onStatusChange: (id: string, status: string, message: string) => Promise<void>
  onApproveCommission: (id: string) => Promise<void>
  onRejectCommission: (id: string) => Promise<void>
}

export function AffiliateDetailCard({
  affiliate, commissions, affiliateCoupons,
  commPage, cp, onCommPageChange, onCpChange,
  onStatusChange, onApproveCommission, onRejectCommission,
}: AffiliateDetailCardProps) {
  const [tab, setTab] = useState<'info' | 'coupons' | 'commissions'>('info')
  const [confirm, setConfirm] = useState<{ title: string; description: string; confirmLabel: string; onConfirm: () => void } | null>(null)

  const commissionColumns: Column<CommissionRow>[] = [
    { key: 'orderId', header: 'Commande', cell: (c) => <span className="font-mono text-xs text-gray-700 dark:text-gray-300">{c.orderId.toUpperCase()}</span> },
    { key: 'customerName', header: 'Client', hideBelow: 'md', cell: (c) => <span className="text-gray-700 dark:text-gray-300">{c.customerName}</span> },
    { key: 'code', header: 'Code', hideBelow: 'lg', cell: (c) => <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{c.code}</span> },
    { key: 'orderAmount', header: 'Montant', hideBelow: 'md', cell: (c) => <span className="text-gray-700 dark:text-gray-300">{formatPrice(c.orderAmount)}</span> },
    {
      key: 'commissionAmount', header: 'Commission',
      cell: (c) => (
        <span className="font-medium text-green-600 dark:text-green-400">
          {formatPrice(c.commissionAmount)} <span className="text-xs font-normal text-gray-400 dark:text-gray-500">({c.commissionRate}%)</span>
        </span>
      ),
    },
    { key: 'status', header: 'Statut', cell: (c) => <StatusBadge map={COMMISSION_STATUS} value={c.status} size="sm" /> },
    { key: 'createdAt', header: 'Date', hideBelow: 'lg', cell: (c) => <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(c.createdAt).toLocaleDateString('fr-FR')}</span> },
    {
      key: 'actions', header: '', align: 'right',
      cell: (c) => (
        <>
          {c.status === 'pending' && (
            <div className="flex justify-end gap-1.5">
              <Button size="sm" variant="secondary" onClick={() => onApproveCommission(c.id)}>Approuver</Button>
              <Button size="sm" variant="danger" onClick={() => setConfirm({
                title: 'Rejeter la commission',
                description: `Rejeter la commission de ${formatPrice(c.commissionAmount)} sur la commande ${c.orderId.toUpperCase()} ? Cette action est irréversible.`,
                confirmLabel: 'Rejeter',
                onConfirm: () => onRejectCommission(c.id),
              })}>Rejeter</Button>
            </div>
          )}
          {c.status === 'paid' && (
            <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <Check className="h-3.5 w-3.5" />
              {c.paidAt ? new Date(c.paidAt).toLocaleDateString('fr-FR') : ''}
            </span>
          )}
        </>
      ),
    },
  ]

  return (
    <>
      <Card padding="none" className="mt-6">
        <CardHeader className="mb-0 border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <CardTitle>{affiliate.name}</CardTitle>
              <StatusBadge map={AFFILIATE_STATUS} value={affiliate.status} dot />
            </div>
            <CardDescription>{affiliate.email} · {affiliate.phone} · {affiliate.country}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {affiliate.status === 'pending' && (
              <Button size="sm" onClick={() => onStatusChange(affiliate.id, 'active', 'Affilié activé')}>Activer</Button>
            )}
            {affiliate.status === 'active' && (
              <Button size="sm" variant="danger" onClick={() => setConfirm({
                title: "Suspendre l'affilié",
                description: `Suspendre « ${affiliate.name} » ? Ses coupons ne généreront plus de commissions.`,
                confirmLabel: 'Suspendre',
                onConfirm: () => onStatusChange(affiliate.id, 'suspended', 'Affilié suspendu'),
              })}>Suspendre</Button>
            )}
            {affiliate.status === 'suspended' && (
              <Button size="sm" onClick={() => onStatusChange(affiliate.id, 'active', 'Affilié réactivé')}>Réactiver</Button>
            )}
            {affiliate.status !== 'banned' && (
              <Button size="sm" variant="outline" leftIcon={Ban} onClick={() => setConfirm({
                title: "Bannir l'affilié",
                description: `Bannir définitivement « ${affiliate.name} » ? Cette action est irréversible.`,
                confirmLabel: 'Bannir',
                onConfirm: () => onStatusChange(affiliate.id, 'banned', 'Affilié banni'),
              })}>Bannir</Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { label: 'Commission', value: `${affiliate.defaultCommissionRate}%` },
              { label: 'Gagné', value: formatPrice(affiliate.totalEarned) },
              { label: 'En attente', value: formatPrice(affiliate.totalPending) },
              { label: 'Payé', value: formatPrice(affiliate.totalPaid) },
              { label: 'Références', value: affiliate.totalReferrals },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-gray-200 bg-gray-50/50 p-3 dark:border-gray-800 dark:bg-gray-900/50">
                <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
                <p className="mt-0.5 truncate text-base font-semibold text-gray-900 dark:text-gray-100">{s.value}</p>
              </div>
            ))}
          </div>

          {affiliate.notes && <p className="mb-3 text-sm italic text-gray-500 dark:text-gray-400">Note : {affiliate.notes}</p>}
          <p className="mb-4 text-xs text-gray-400 dark:text-gray-500">Moyen de paiement : {affiliate.paymentMethod} — {affiliate.paymentDetails}</p>

          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList variant="pills">
              <TabsTrigger value="info">Infos</TabsTrigger>
              <TabsTrigger value="coupons">Coupons</TabsTrigger>
              <TabsTrigger value="commissions">Commissions</TabsTrigger>
            </TabsList>

            <TabsContent value="info">
              <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
                {[
                  { label: 'Email', value: affiliate.email },
                  { label: 'Téléphone', value: affiliate.phone },
                  { label: 'Pays', value: affiliate.country },
                  { label: 'Commission par défaut', value: `${affiliate.defaultCommissionRate}%` },
                  { label: 'Méthode de paiement', value: affiliate.paymentMethod },
                  { label: 'Infos paiement', value: affiliate.paymentDetails },
                  { label: 'Inscrit le', value: new Date(affiliate.createdAt).toLocaleDateString('fr-FR') },
                  ...(affiliate.notes ? [{ label: 'Notes', value: affiliate.notes }] : []),
                ].map((row) => (
                  <div key={row.label} className="flex items-baseline justify-between gap-4 border-b border-gray-100 pb-2 dark:border-gray-800">
                    <dt className="text-gray-500 dark:text-gray-400">{row.label}</dt>
                    <dd className="text-right font-medium text-gray-900 dark:text-gray-100">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </TabsContent>

            <TabsContent value="coupons">
              <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">Coupons liés à cet affilié</p>
              {affiliateCoupons && affiliateCoupons.data.length > 0 ? (
                <div className="space-y-2">
                  {affiliateCoupons.data.map((c: CouponRow) => (
                    <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900/50">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-primary-600 dark:text-primary-400">{c.code}</span>
                          <Badge variant={c.isActive ? 'success' : 'neutral'} size="sm" dot>{c.isActive ? 'Actif' : 'Inactif'}</Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                          {c.type === 'percentage' ? `${c.value}%` : c.type === 'fixed' ? formatPrice(c.value) : 'Livraison gratuite'} · {c.usedCount}/{c.usageLimitTotal ?? '∞'} utilisations{c.minPurchase ? ` · min ${formatPrice(c.minPurchase)}` : ''}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                          {c.name} — {new Date(c.startDate).toLocaleDateString('fr-FR')} au {new Date(c.endDate).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 dark:text-gray-500">{c.usedCount} utilisé(s)</span>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={`/coupons/${c.id}`}>Modifier</a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={Ticket} title="Aucun coupon" description="Aucun coupon lié à cet affilié." />
              )}
              {affiliateCoupons && (
                <Pagination className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-800" page={affiliateCoupons.page} pageSize={10} total={affiliateCoupons.total} onPageChange={onCpChange} />
              )}
            </TabsContent>

            <TabsContent value="commissions">
              <Card padding="none" className="overflow-hidden">
                <DataTable bare data={commissions?.data ?? []} columns={commissionColumns} rowKey={(c) => c.id} empty={{ icon: CheckCircle2, title: 'Aucune commission', description: 'Aucune commission pour cet affilié.' }} pagination={commissions ? { page: commissions.page, pageSize: 10, total: commissions.total, onPageChange: onCommPageChange } : undefined} />
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <ConfirmDialog open={confirm !== null} onOpenChange={(o) => { if (!o) setConfirm(null) }} title={confirm?.title ?? ''} description={confirm?.description} confirmLabel={confirm?.confirmLabel} variant="danger" onConfirm={async () => { confirm?.onConfirm(); setConfirm(null) }} />
    </>
  )
}
