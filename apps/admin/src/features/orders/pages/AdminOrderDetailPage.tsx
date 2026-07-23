import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { ImageIcon, RefreshCw, XCircle } from 'lucide-react'
import { useAdminOrder } from '../hooks/useAdminOrders'
import { useUpdateOrderStatus } from '../hooks/useUpdateOrderStatus'
import { useCancelOrder } from '../hooks/useCancelOrder'
import { useRefundOrder } from '../hooks/useRefundOrder'
import { PermissionGuard } from '@/components/guards/PermissionGuard'
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  DataTable,
  EmptyState,
  FormField,
  Input,
  LoadingBlock,
  Modal,
  PageHeader,
  StatusBadge,
  type Column,
} from '@/components/ui'
import { ORDER_STATUS, PAYMENT_STATUS, statusMeta } from '@/lib/status'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/cn'
import { resolveAdminMediaUrl } from '@/lib/resolveAdminMediaUrl'
import { formatPrice, formatDate } from '@/lib/format'

// Logique métier : transitions de statut autorisées (à conserver).
const STATUS_FLOW: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
}

const TIMELINE_DOT: Record<string, string> = {
  delivered: 'bg-green-500',
  cancelled: 'bg-red-500',
}

type ConfirmState = {
  title: string
  description?: string
  variant?: 'danger' | 'default'
  onConfirm: () => void | Promise<void>
}

export function AdminOrderDetailPage() {
  const { id } = useParams()
  const { data: order, isLoading, isError, error, refetch } = useAdminOrder(id!)
  const updateStatus = useUpdateOrderStatus()
  const cancelOrder = useCancelOrder()
  const refundOrder = useRefundOrder()
  const [cancelReason, setCancelReason] = useState('')
  const [showCancelInput, setShowCancelInput] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)

  if (isLoading) {
    return <LoadingBlock label="Chargement de la commande…" />
  }

  if (isError) {
    return (
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
    )
  }

  if (!order) {
    return (
      <Card padding="none">
        <EmptyState title="Commande introuvable" description="Cette commande n'existe pas ou a été supprimée." />
      </Card>
    )
  }

  const safeOrder = order!
  const nextStatuses = STATUS_FLOW[safeOrder.status] ?? []

  function handleStatusChange(newStatus: string) {
    const label = statusMeta(ORDER_STATUS, newStatus).label
    setConfirm({
      title: 'Changer le statut',
      description: `Passer la commande au statut "${label}" ?`,
      onConfirm: async () => {
        try {
          await updateStatus.mutateAsync({ id: safeOrder.id, status: newStatus })
          toast.success(`Commande passée au statut "${label}"`)
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour du statut')
        }
      },
    })
  }

  function handleCancel() {
    const reason = showCancelInput ? cancelReason : undefined
    cancelOrder.mutate(
      { id: safeOrder.id, reason },
      {
        onSuccess: () => toast.success('Commande annulée'),
        onError: (err: Error) => toast.error(err.message || "Erreur lors de l'annulation"),
      },
    )
    setShowCancelInput(false)
    setCancelReason('')
  }

  function handleRefund() {
    setConfirm({
      title: 'Rembourser la commande',
      description: `Rembourser ${formatPrice(safeOrder.total)} ?`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await refundOrder.mutateAsync({ id: safeOrder.id })
          toast.success('Commande remboursée')
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Erreur lors du remboursement')
        }
      },
    })
  }

  const items = (safeOrder.items ?? []).map((item: any, i: number) => ({ ...item, _key: String(i) }))

  const itemColumns: Column<any>[] = [
    {
      key: 'product',
      header: 'Produit',
      cell: (item) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
            {item.imageUrl ? (
              <img
                src={resolveAdminMediaUrl(item.imageUrl)}
                alt={`Photo de ${item.label ?? 'l’article'}`}
                className="h-full w-full object-cover"
                onError={(event) => { event.currentTarget.style.display = 'none' }}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400 dark:text-gray-500">
                <ImageIcon className="h-4 w-4" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
              {item.label ?? item.productId}
            </p>
            {/* Déclinaison choisie par le client (couleur, taille…) — indispensable
                pour préparer le colis conformément à la commande */}
            {item.sku && (
              <p className="truncate text-xs text-gray-500 dark:text-gray-400">{item.sku}</p>
            )}
          </div>
        </div>
      ),
    },
    { key: 'quantity', header: 'Qté' },
    {
      key: 'unitPrice',
      header: 'Prix',
      align: 'right',
      cell: (item) => formatPrice(Number(item.unitPrice ?? item.price ?? 0)),
    },
    {
      key: 'lineTotal',
      header: 'Total',
      align: 'right',
      cell: (item) => (
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {formatPrice(Number(item.totalPrice ?? Number(item.unitPrice ?? item.price ?? 0) * (item.quantity ?? 0)))}
        </span>
      ),
    },
  ]

  const statusLog = ((safeOrder as any).statusLog ?? []) as { fromStatus: string; toStatus: string; createdAt: string; reason?: string }[]
  const timeline = [
    { status: 'pending', date: safeOrder.createdAt, reason: undefined },
    ...statusLog.map((entry) => ({
      status: entry.toStatus,
      date: entry.createdAt,
      reason: entry.reason,
    })),
  ]

  return (
    <div>
      <PageHeader
        title={`Commande ${order.orderNumber || order.id}`}
        description={`Créée le ${formatDate(order.createdAt)}`}
        breadcrumbs={[{ label: 'Commandes', href: '/orders' }, { label: order.orderNumber || `#${order.id}` }]}
        backHref="/orders"
        actions={<StatusBadge map={ORDER_STATUS} value={order.status} dot />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card padding="none" className="overflow-hidden">
            <div className="px-6 py-4">
              <CardTitle>Articles</CardTitle>
            </div>
            <DataTable
              bare
              data={items}
              columns={itemColumns}
              rowKey={(item) => item._key}
              empty={{ title: 'Aucun article' }}
              footer={
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Total</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {formatPrice(order.total)}
                  </span>
                </div>
              }
            />
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Historique des statuts</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              {timeline.map((entry, i) => (
                <div key={`${entry.status}-${i}`} className="flex items-start gap-3">
                  <div
                    className={cn(
                      'mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full',
                      TIMELINE_DOT[entry.status] ?? 'bg-primary-500',
                    )}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {statusMeta(ORDER_STATUS, entry.status).label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(entry.date)}
                      {entry.reason && <span className="ml-2 italic">— {entry.reason}</span>}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Client</CardTitle>
            </CardHeader>
            <div className="space-y-2">
              <p className="text-sm text-gray-900 dark:text-gray-100">{order.customerName}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{order.customerEmail}</p>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Livraison</CardTitle>
            </CardHeader>
            {safeOrder.shippingAddress ? (
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                <p>{String(safeOrder.shippingAddress.street ?? '')}</p>
                <p>{String(safeOrder.shippingAddress.city ?? '')}</p>
                <p>{String(safeOrder.shippingAddress.region ?? '')}, {String(safeOrder.shippingAddress.country ?? '')}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500">Non renseignée</p>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Paiement</CardTitle>
            </CardHeader>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">Méthode</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{order.paymentMethod}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">Statut</span>
                <StatusBadge map={PAYMENT_STATUS} value={order.paymentStatus} size="sm" />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <div className="space-y-3">
              {nextStatuses
                .filter((s) => s !== 'cancelled' && s !== 'refunded')
                .map((status) => (
                  <PermissionGuard key={status} permission="orders.update">
                    <Button
                      className="w-full"
                      loading={updateStatus.isPending}
                      onClick={() => handleStatusChange(status)}
                    >
                      Marquer comme {statusMeta(ORDER_STATUS, status).label.toLowerCase()}
                    </Button>
                  </PermissionGuard>
                ))}

              {nextStatuses.includes('cancelled') && (
                <PermissionGuard permission="orders.cancel">
                  <Button
                    variant="outline"
                    className="w-full border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                    onClick={() => setShowCancelInput(true)}
                  >
                    Annuler la commande
                  </Button>
                </PermissionGuard>
              )}

              {nextStatuses.includes('refunded') && (
                <PermissionGuard permission="orders.refund">
                  <Button
                    variant="danger"
                    className="w-full"
                    loading={refundOrder.isPending}
                    onClick={handleRefund}
                  >
                    Rembourser {formatPrice(order.total)}
                  </Button>
                </PermissionGuard>
              )}

              {nextStatuses.length === 0 && (
                <p className="py-2 text-center text-sm text-gray-400 dark:text-gray-500">
                  Aucune action disponible
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={showCancelInput}
        onOpenChange={(open) => {
          if (!open) {
            setShowCancelInput(false)
            setCancelReason('')
          }
        }}
        title="Annuler la commande"
        description="Cette action est irréversible."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => { setShowCancelInput(false); setCancelReason('') }}>
              Retour
            </Button>
            <Button variant="danger" loading={cancelOrder.isPending} onClick={handleCancel}>
              Confirmer l'annulation
            </Button>
          </>
        }
      >
        <FormField label="Motif d'annulation" htmlFor="cancel-reason" hint="Facultatif — visible par le client.">
          <Input
            id="cancel-reason"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Motif d'annulation…"
          />
        </FormField>
      </Modal>

      {confirm && (
        <ConfirmDialog
          open={!!confirm}
          onOpenChange={(open) => !open && setConfirm(null)}
          title={confirm.title}
          description={confirm.description}
          variant={confirm.variant}
          onConfirm={confirm.onConfirm}
        />
      )}
    </div>
  )
}
