import { useState } from 'react'
import { CheckCircle2, Clock, Undo2, Wallet, XCircle } from 'lucide-react'
import { useAdminReturns, useReturnSummary, useApproveReturn, useMarkReturnReceived, useRefundReturn, useRejectReturn } from '../hooks/useAdminReturns'
import {
  PageHeader, SearchInput, Select, DataTable, StatusBadge, StatCard, Button, Card, CardHeader, CardTitle, CardContent,
  EmptyState, ConfirmDialog, Modal, FormField, Input, Textarea,
  type Column,
} from '@/components/ui'
import { RETURN_STATUS } from '@/lib/status'
import { toast } from '@/lib/toast'
import type { ReturnQueryParams } from '@/infrastructure/data-source/AdminReturnDataSource'
import { formatPrice } from '@/lib/format'

export function AdminReturnListPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedRet, setSelectedRet] = useState<any>(null)
  const [confirmAction, setConfirmAction] = useState<{ type: 'approve' | 'receive' | 'reject' | 'refund'; id: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [refundAmount, setRefundAmount] = useState('')
  const [refundMethod, setRefundMethod] = useState('Orange Money')

  const params: ReturnQueryParams = {
    page, limit: 10,
    search: search || undefined,
    status: (statusFilter as any) || undefined,
    sortBy: 'createdAt', sortOrder: 'desc',
  }

  const { data, isLoading, isError, error } = useAdminReturns(params)
  const { data: summary } = useReturnSummary()
  const approve = useApproveReturn()
  const markReceived = useMarkReturnReceived()
  const refund = useRefundReturn()
  const reject = useRejectReturn()

  function handleSearch(value: string) { setSearch(value); setPage(1) }

  async function handleReject() {
    if (!confirmAction) return
    try {
      await reject.mutateAsync({ id: confirmAction.id, reason: rejectReason || undefined })
      toast.success('Retour rejeté')
      setConfirmAction(null)
      setRejectReason('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors du rejet')
    }
  }

  async function handleRefund() {
    if (!confirmAction) return
    try {
      await refund.mutateAsync({ id: confirmAction.id, amount: Number(refundAmount) || undefined, method: refundMethod })
      toast.success('Client remboursé')
      setConfirmAction(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors du remboursement')
    }
  }

  const columns: Column<any>[] = [
    {
      key: 'id',
      header: 'Retour',
      cell: (ret) => (
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{ret.id.toUpperCase()}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Cmd: {ret.orderId.toUpperCase()}</p>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Client',
      hideBelow: 'md',
      cell: (ret) => (
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{ret.customerName}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{ret.customerEmail}</p>
        </div>
      ),
    },
    {
      key: 'items', header: 'Articles', hideBelow: 'lg',
      cell: (ret) => `${ret.items?.length ?? 0} article(s)`,
    },
    {
      key: 'reason', header: 'Motif', hideBelow: 'lg',
      cell: (ret) => <span className="block max-w-[200px] truncate">{ret.reason}</span>,
    },
    {
      key: 'status', header: 'Statut',
      cell: (ret) => <StatusBadge map={RETURN_STATUS} value={ret.status} />,
    },
    {
      key: 'createdAt', header: 'Date', hideBelow: 'md',
      cell: (ret) => new Date(ret.createdAt).toLocaleDateString('fr-FR'),
    },
    {
      key: 'actions', header: 'Actions', align: 'right',
      cell: (ret) => (
        <div className="flex flex-wrap justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {ret.status === 'pending' && (
            <>
              <Button variant="ghost" size="sm"
                className="text-green-600 hover:bg-green-50 hover:text-green-700 dark:text-green-400 dark:hover:bg-green-500/10"
                onClick={() => setConfirmAction({ type: 'approve', id: ret.id })}>
                Approuver
              </Button>
              <Button variant="ghost" size="sm"
                className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10"
                onClick={() => { setRejectReason(''); setConfirmAction({ type: 'reject', id: ret.id }) }}>
                Rejeter
              </Button>
            </>
          )}
          {ret.status === 'approved' && (
            <Button variant="ghost" size="sm"
              className="text-purple-600 hover:bg-purple-50 hover:text-purple-700 dark:text-purple-400 dark:hover:bg-purple-500/10"
              onClick={() => setConfirmAction({ type: 'receive', id: ret.id })}>
              Marquer reçu
            </Button>
          )}
          {ret.status === 'received' && (
            <Button variant="ghost" size="sm"
              className="text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-500/10"
              onClick={() => {
                setRefundAmount(String(ret.items.reduce((s: number, i: any) => s + i.price * i.quantity, 0)))
                setRefundMethod('Orange Money')
                setConfirmAction({ type: 'refund', id: ret.id })
              }}>
              Rembourser
            </Button>
          )}
          {(ret.status === 'refunded' || ret.status === 'rejected' || ret.status === 'cancelled') && (
            <span className="text-xs italic text-gray-400 dark:text-gray-500">Aucune action</span>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Retours produits"
        description={data ? `${data.total} demande${data.total > 1 ? 's' : ''} de retour` : 'Gestion des demandes de retour'}
      />

      {summary && (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="En attente" value={summary.pending} icon={Clock} tone="warning" />
          <StatCard label="Approuvés" value={summary.approved + summary.received} icon={CheckCircle2} tone="info" />
          <StatCard label="Remboursés" value={summary.refunded} icon={Undo2} tone="success" />
          <StatCard label="Remb. ce mois" value={formatPrice(summary.totalRefundedThisMonth)} icon={Wallet} tone="neutral" />
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={handleSearch}
          placeholder="Rechercher par ID, client, motif…"
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
            { value: 'approved', label: 'Approuvé' },
            { value: 'received', label: 'Reçu' },
            { value: 'refunded', label: 'Remboursé' },
            { value: 'rejected', label: 'Rejeté' },
            { value: 'cancelled', label: 'Annulé' },
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
          rowKey={(ret) => ret.id}
          loading={isLoading}
          onRowClick={(ret) => setSelectedRet(selectedRet?.id === ret.id ? null : ret)}
          empty={{
            icon: Undo2,
            title: 'Aucun retour trouvé',
            description: search || statusFilter
              ? 'Essayez de modifier vos filtres de recherche.'
              : 'Les demandes de retour des clients apparaîtront ici.',
          }}
          pagination={data ? { page: data.page, pageSize: 10, total: data.total, onPageChange: setPage } : undefined}
        />
      )}

      {selectedRet && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Détail retour {selectedRet.id.toUpperCase()}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setSelectedRet(null)}>Fermer</Button>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Commande :</span>
              <p className="font-medium text-gray-900 dark:text-gray-100">{selectedRet.orderId.toUpperCase()}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Client :</span>
              <p className="font-medium text-gray-900 dark:text-gray-100">{selectedRet.customerName} ({selectedRet.customerEmail})</p>
            </div>
            <div className="col-span-2">
              <span className="text-gray-500 dark:text-gray-400">Motif :</span>
              <p className="font-medium text-gray-900 dark:text-gray-100">{selectedRet.reason}</p>
            </div>
            {selectedRet.rejectionReason && (
              <div className="col-span-2">
                <span className="text-red-500 dark:text-red-400">Motif du rejet :</span>
                <p className="font-medium text-red-600 dark:text-red-300">{selectedRet.rejectionReason}</p>
              </div>
            )}
            {selectedRet.refundAmount && (
              <div className="col-span-2">
                <span className="text-gray-500 dark:text-gray-400">Remboursement :</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {formatPrice(selectedRet.refundAmount)} via {selectedRet.refundMethod ?? 'N/A'}
                </p>
              </div>
            )}
            <div className="col-span-2">
              <span className="text-gray-500 dark:text-gray-400">Articles :</span>
              <ul className="mt-1 space-y-1">
                {selectedRet.items?.map((item: any, idx: number) => (
                  <li key={idx} className="text-gray-900 dark:text-gray-100">
                    {item.productName} x{item.quantity} — {formatPrice(item.price * item.quantity)}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation approbation */}
      {confirmAction?.type === 'approve' && (
        <ConfirmDialog
          open
          onOpenChange={(open) => { if (!open) setConfirmAction(null) }}
          title="Approuver le retour"
          description="Confirmer l'approbation de cette demande de retour ?"
          confirmLabel="Approuver"
          onConfirm={async () => {
            try {
              await approve.mutateAsync(confirmAction.id)
              toast.success('Retour approuvé')
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Erreur lors de l'approbation")
            }
          }}
        />
      )}

      {/* Confirmation réception */}
      {confirmAction?.type === 'receive' && (
        <ConfirmDialog
          open
          onOpenChange={(open) => { if (!open) setConfirmAction(null) }}
          title="Marquer comme reçu"
          description="Confirmer que le ou les articles retournés ont bien été reçus."
          confirmLabel="Confirmer"
          onConfirm={async () => {
            try {
              await markReceived.mutateAsync(confirmAction.id)
              toast.success('Retour marqué comme reçu')
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Une erreur est survenue')
            }
          }}
        />
      )}

      {/* Modale rejet */}
      <Modal
        open={confirmAction?.type === 'reject'}
        onOpenChange={(open) => { if (!open) { setConfirmAction(null); setRejectReason('') } }}
        title="Rejeter le retour"
        description="Le client sera informé du rejet de sa demande."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => { setConfirmAction(null); setRejectReason('') }}>Annuler</Button>
            <Button variant="danger" loading={reject.isPending} onClick={handleReject}>Rejeter</Button>
          </>
        }
      >
        <FormField label="Motif du rejet" hint="Optionnel — communiqué au client." htmlFor="return-reject-reason">
          <Textarea
            id="return-reject-reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            placeholder="Produit non conforme…"
            className="w-full"
          />
        </FormField>
      </Modal>

      {/* Modale remboursement */}
      <Modal
        open={confirmAction?.type === 'refund'}
        onOpenChange={(open) => { if (!open) setConfirmAction(null) }}
        title="Rembourser le client"
        description="Le montant sera reversé au client via la méthode choisie."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>Annuler</Button>
            <Button loading={refund.isPending} onClick={handleRefund}>Rembourser</Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Montant (FCFA)" htmlFor="return-refund-amount">
            <Input
              id="return-refund-amount"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value.replace(/[^\d]/g, ''))}
              className="w-full"
            />
          </FormField>
          <FormField label="Méthode" htmlFor="return-refund-method">
            <Select
              id="return-refund-method"
              value={refundMethod}
              onChange={setRefundMethod}
              options={[
                { value: 'Orange Money', label: 'Orange Money' },
                { value: 'Wave', label: 'Wave' },
                { value: 'Mobile Money', label: 'Mobile Money' },
                { value: 'Carte Visa', label: 'Carte Visa' },
                { value: 'Virement bancaire', label: 'Virement bancaire' },
              ]}
              className="w-full"
            />
          </FormField>
        </div>
      </Modal>
    </div>
  )
}
