import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CreditCard, Undo2, XCircle } from 'lucide-react'
import { useAdminPayment } from '../hooks/useAdminPayments'
import { useRefundPayment } from '../hooks/useRefundPayment'
import { PermissionGuard } from '@/components/guards/PermissionGuard'
import {
  PageHeader, Card, CardHeader, CardTitle, CardContent, Button, StatusBadge,
  LoadingBlock, EmptyState, ConfirmDialog, Input, FormField,
} from '@/components/ui'
import { PAYMENT_STATUS } from '@/lib/status'
import { toast } from '@/lib/toast'
import { formatPrice, formatDate } from '@/lib/format'

export function AdminPaymentDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { data: payment, isLoading, isError, error } = useAdminPayment(id!)
  const refund = useRefundPayment()
  const [showRefundInput, setShowRefundInput] = useState(false)
  const [refundReason, setRefundReason] = useState('')
  const [confirmRefund, setConfirmRefund] = useState(false)

  if (isLoading) return <LoadingBlock label="Chargement du paiement…" />
  if (isError) {
    return (
      <Card padding="none">
        <EmptyState icon={XCircle} title="Erreur de chargement" description={(error as Error)?.message} />
      </Card>
    )
  }
  if (!payment) {
    return (
      <Card padding="none">
        <EmptyState
          icon={CreditCard}
          title="Paiement introuvable"
          action={<Button variant="outline" onClick={() => navigate('/payments')}>Retour aux paiements</Button>}
        />
      </Card>
    )
  }

  const p = payment

  return (
    <div>
      <PageHeader
        backHref="/payments"
        breadcrumbs={[{ label: 'Paiements', href: '/payments' }, { label: p.id }]}
        title={
          <span className="flex items-center gap-3">
            Paiement {p.id}
            <StatusBadge map={PAYMENT_STATUS} value={p.status} dot />
          </span>
        }
        description={`Transaction ${p.transactionId}`}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Détails du paiement</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-500 dark:text-gray-400">Montant</span>
                <span className="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100">{formatPrice(p.amount)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500 dark:text-gray-400">Frais</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{formatPrice(p.fees ?? 0)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500 dark:text-gray-400">Net</span>
                <span className="font-medium text-green-600 dark:text-green-400">{formatPrice(p.amount - (p.fees ?? 0))}</span>
              </div>
              <div className="border-t border-gray-100 pt-3 dark:border-gray-800">
                <div className="flex justify-between gap-3">
                  <span className="text-gray-500 dark:text-gray-400">Méthode</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{p.method}</span>
                </div>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500 dark:text-gray-400">Commande</span>
                <span className="font-mono font-medium text-gray-900 dark:text-gray-100">{p.orderId}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Chronologie</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-primary-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Créé</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(p.createdAt)}</p>
                </div>
              </div>
              {p.paidAt && (
                <div className="flex items-start gap-3">
                  <div className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-green-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Payé</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(p.paidAt)}</p>
                  </div>
                </div>
              )}
              {p.failedAt && (
                <div className="flex items-start gap-3">
                  <div className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-red-500" />
                  <div>
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">Échoué</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(p.failedAt)}</p>
                  </div>
                </div>
              )}
              {p.status === 'refunded' && (
                <div className="flex items-start gap-3">
                  <div className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-gray-400 dark:bg-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Remboursé</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(p.refundedAt)}</p>
                    {p.refundReason && <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Motif : {p.refundReason}</p>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Client</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-gray-900 dark:text-gray-100">{p.customerName}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{p.customerEmail}</p>
            </CardContent>
          </Card>

          {p.status === 'paid' && (
            <Card>
              <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
              <CardContent>
                <PermissionGuard permission="payments.refund">
                  {!showRefundInput ? (
                    <Button variant="outline" leftIcon={Undo2} onClick={() => setShowRefundInput(true)}>
                      Rembourser {formatPrice(p.amount)}
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Remboursement de <strong className="text-gray-900 dark:text-gray-100">{formatPrice(p.amount)}</strong> via {p.method}
                      </p>
                      <FormField label="Motif du remboursement" hint="Optionnel.">
                        <Input
                          value={refundReason}
                          onChange={(e) => setRefundReason(e.target.value)}
                          placeholder="Motif du remboursement (optionnel)"
                          autoFocus
                          className="w-full"
                        />
                      </FormField>
                      <div className="flex gap-2">
                        <Button loading={refund.isPending} onClick={() => setConfirmRefund(true)}>
                          Confirmer le remboursement
                        </Button>
                        <Button variant="outline" onClick={() => { setShowRefundInput(false); setRefundReason('') }}>
                          Annuler
                        </Button>
                      </div>
                    </div>
                  )}
                </PermissionGuard>
              </CardContent>
            </Card>
          )}

          {p.status === 'refunded' && (
            <Card>
              <CardHeader><CardTitle>Remboursement</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-gray-500 dark:text-gray-400">Montant remboursé</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{formatPrice(p.refundedAmount ?? 0)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-500 dark:text-gray-400">Motif</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{p.refundReason ?? '—'}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {confirmRefund && (
        <ConfirmDialog
          open
          onOpenChange={(open) => { if (!open) setConfirmRefund(false) }}
          title="Rembourser le paiement"
          description={`Rembourser ${formatPrice(p.amount)} via ${p.method} ? Cette action est irréversible.`}
          confirmLabel="Rembourser"
          variant="danger"
          onConfirm={async () => {
            try {
              await refund.mutateAsync({ id: p.id, reason: refundReason || undefined })
              toast.success('Paiement remboursé')
              setShowRefundInput(false)
              setRefundReason('')
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Erreur lors du remboursement')
            }
          }}
        />
      )}
    </div>
  )
}
