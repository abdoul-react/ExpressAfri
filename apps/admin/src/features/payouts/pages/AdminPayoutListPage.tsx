import { useState } from 'react'
import { CheckCircle2, Clock, Info, Percent, Wallet } from 'lucide-react'
import { useAdminPayouts, usePayoutSummary, useMarkPayoutAsPaid, useCancelPayout, useProcessPayout } from '../hooks/useAdminPayouts'
import { PermissionGuard } from '@/components/guards/PermissionGuard'
import {
  PageHeader, SearchInput, Select, DataTable, StatusBadge, StatCard, Button, Modal, FormField, Input, Textarea,
  type Column,
} from '@/components/ui'
import { PAYOUT_STATUS } from '@/lib/status'
import { toast } from '@/lib/toast'
import { formatPrice, formatDate } from '@/lib/format'

// Libellés des méthodes de versement (pas un statut — reste local).
const METHOD_LABELS: Record<string, string> = { bank_transfer: 'Virement', mobile_money: 'Mobile Money', wave: 'Wave', orange_money: 'Orange Money' }

export function AdminPayoutListPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [selectedPayout, setSelectedPayout] = useState<string | null>(null)
  const [showPayModal, setShowPayModal] = useState(false)
  const [payRef, setPayRef] = useState('')
  const [payNotes, setPayNotes] = useState('')
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  const { data: summary } = usePayoutSummary()
  const { data, isLoading } = useAdminPayouts({ page, limit: 15, search: search || undefined, status: statusFilter || undefined })
  const markPaid = useMarkPayoutAsPaid()
  const cancelPayout = useCancelPayout()
  const processPayout = useProcessPayout()

  const payouts = data?.data ?? []
  const total = data?.total ?? 0

  function closePayModal() {
    setShowPayModal(false)
    setSelectedPayout(null)
    setPayRef('')
    setPayNotes('')
  }

  async function handleConfirmPay() {
    if (!selectedPayout || !payRef.trim()) return
    try {
      await markPaid.mutateAsync({ id: selectedPayout, payload: { paymentReference: payRef.trim(), notes: payNotes || undefined } })
      toast.success('Versement marqué comme payé')
      closePayModal()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la confirmation du paiement')
    }
  }

  async function handleConfirmCancel() {
    if (!cancellingId) return
    try {
      await cancelPayout.mutateAsync({ id: cancellingId, reason: cancelReason || undefined })
      toast.success('Versement annulé')
      setCancellingId(null)
      setCancelReason('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'annulation")
    }
  }

  function handleProcess(id: string) {
    processPayout.mutate(id, {
      onSuccess: () => toast.success('Versement en cours de traitement'),
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Erreur lors du traitement'),
    })
  }

  const columns: Column<any>[] = [
    {
      key: 'storeName', header: 'Boutique',
      cell: (p) => <span className="whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{p.storeName}</span>,
    },
    {
      key: 'period', header: 'Période', hideBelow: 'lg',
      cell: (p) => <span className="whitespace-nowrap">{formatDate(p.periodStart)} — {formatDate(p.periodEnd)}</span>,
    },
    {
      key: 'amount', header: 'Montant', align: 'right', hideBelow: 'md',
      cell: (p) => <span className="whitespace-nowrap text-gray-900 dark:text-gray-100">{formatPrice(p.amount)}</span>,
    },
    {
      key: 'commission', header: 'Commission', align: 'right', hideBelow: 'lg',
      cell: (p) => (
        <span className="whitespace-nowrap">
          {formatPrice(p.commissionAmount)} <span className="text-xs text-gray-400 dark:text-gray-500">({p.commissionRate}%)</span>
        </span>
      ),
    },
    {
      key: 'netAmount', header: 'Net', align: 'right',
      cell: (p) => <span className="whitespace-nowrap font-medium text-gray-900 dark:text-gray-100">{formatPrice(p.netAmount)}</span>,
    },
    {
      key: 'method', header: 'Méthode', hideBelow: 'lg',
      cell: (p) => <span className="whitespace-nowrap">{METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod}</span>,
    },
    {
      key: 'status', header: 'Statut',
      cell: (p) => <StatusBadge map={PAYOUT_STATUS} value={p.status} />,
    },
    {
      key: 'reference', header: 'Réf.', hideBelow: 'lg',
      cell: (p) => <span className="whitespace-nowrap">{p.paymentReference ?? '—'}</span>,
    },
    {
      key: 'createdAt', header: 'Date', hideBelow: 'md',
      cell: (p) => <span className="whitespace-nowrap">{formatDate(p.createdAt)}</span>,
    },
    {
      key: 'actions', header: 'Actions', align: 'right',
      cell: (p) => (
        <div className="flex items-center justify-end gap-1">
          {p.status === 'pending' && (
            <>
              <PermissionGuard permission="stores.update">
                <Button size="sm" variant="outline" disabled={processPayout.isPending} onClick={() => handleProcess(p.id)}>
                  Traiter
                </Button>
              </PermissionGuard>
              <PermissionGuard permission="stores.update">
                <Button size="sm" onClick={() => { setSelectedPayout(p.id); setShowPayModal(true) }}>
                  Payer
                </Button>
              </PermissionGuard>
              <PermissionGuard permission="stores.update">
                <Button size="sm" variant="ghost"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10"
                  onClick={() => { setCancelReason(''); setCancellingId(p.id) }}>
                  Annuler
                </Button>
              </PermissionGuard>
            </>
          )}
          {p.status === 'processing' && (
            <PermissionGuard permission="stores.update">
              <Button size="sm" leftIcon={CheckCircle2} onClick={() => { setSelectedPayout(p.id); setShowPayModal(true) }}>
                Confirmer paiement
              </Button>
            </PermissionGuard>
          )}
          {p.notes && (
            <span title={p.notes} className="ml-1 cursor-help text-gray-400 dark:text-gray-500">
              <Info className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="Versements vendeurs" description="Gestion des paiements aux vendeurs" />

      {/* Résumé */}
      {summary && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="En attente"
            value={formatPrice(summary.totalPending)}
            sub={`${summary.pendingCount} versement(s)`}
            icon={Clock}
            tone="warning"
          />
          <StatCard
            label="Payé ce mois"
            value={formatPrice(summary.totalPaidThisMonth)}
            icon={CheckCircle2}
            tone="success"
          />
          <StatCard
            label="Commission collectée"
            value={formatPrice(summary.totalCommissionCollected)}
            icon={Percent}
            tone="primary"
          />
          <StatCard
            label="Total versé"
            value={formatPrice(summary.totalPaidThisMonth)}
            sub="ce mois-ci"
            icon={Wallet}
            tone="neutral"
          />
        </div>
      )}

      {/* Filtres */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1) }}
          placeholder="Rechercher par boutique, référence…"
          size="sm"
          className="min-w-[220px] flex-1"
        />
        <Select
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); setPage(1) }}
          size="sm"
          placeholder="Tous les statuts"
          options={[
            { value: 'pending', label: 'En attente' },
            { value: 'processing', label: 'En cours' },
            { value: 'paid', label: 'Payé' },
            { value: 'cancelled', label: 'Annulé' },
          ]}
        />
      </div>

      <DataTable
        data={payouts}
        columns={columns}
        rowKey={(p) => p.id}
        loading={isLoading}
        empty={{
          icon: Wallet,
          title: 'Aucun versement trouvé',
          description: search || statusFilter
            ? 'Essayez de modifier vos filtres de recherche.'
            : 'Les versements aux vendeurs apparaîtront ici.',
        }}
        pagination={data ? { page, pageSize: 15, total, onPageChange: setPage } : undefined}
      />

      {/* Modale Confirmer Paiement */}
      <Modal
        open={showPayModal && selectedPayout !== null}
        onOpenChange={(open) => { if (!open) closePayModal() }}
        title="Confirmer le paiement"
        description="Renseignez la référence du paiement effectué au vendeur."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={closePayModal}>Annuler</Button>
            <Button disabled={!payRef.trim()} loading={markPaid.isPending} onClick={handleConfirmPay}>
              Confirmer le paiement
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Référence de paiement" required htmlFor="payout-pay-ref">
            <Input
              id="payout-pay-ref"
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
              placeholder="VIR-2026-07-XXX"
              autoFocus
              className="w-full"
            />
          </FormField>
          <FormField label="Notes" hint="Optionnel." htmlFor="payout-pay-notes">
            <Textarea
              id="payout-pay-notes"
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              rows={2}
              placeholder="Notes sur ce versement…"
              className="w-full"
            />
          </FormField>
        </div>
      </Modal>

      {/* Modale Annuler versement */}
      <Modal
        open={cancellingId !== null}
        onOpenChange={(open) => { if (!open) { setCancellingId(null); setCancelReason('') } }}
        title="Annuler le versement"
        description="Le versement sera marqué comme annulé."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => { setCancellingId(null); setCancelReason('') }}>Retour</Button>
            <Button variant="danger" loading={cancelPayout.isPending} onClick={handleConfirmCancel}>
              Annuler le versement
            </Button>
          </>
        }
      >
        <FormField label="Motif de l'annulation" hint="Optionnel." htmlFor="payout-cancel-reason">
          <Input
            id="payout-cancel-reason"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Motif…"
            autoFocus
            className="w-full"
          />
        </FormField>
      </Modal>
    </div>
  )
}
