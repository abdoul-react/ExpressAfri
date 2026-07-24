import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Ban, CalendarClock, CheckCircle2, ShoppingBag, Star, Users, Wallet, XCircle } from 'lucide-react'
import { useAdminCustomer, useAdminCustomerOrders } from '../hooks/useAdminCustomers'
import { useBanCustomer, useUnbanCustomer } from '../hooks/useBanCustomer'
import { useCustomerPoints, useAdjustPoints } from '@/features/loyalty/hooks/useAdminLoyalty'
import { PermissionGuard } from '@/components/guards/PermissionGuard'
import {
  PageHeader, Card, CardHeader, CardTitle, CardContent, Button, Badge, StatusBadge, StatCard,
  DataTable, LoadingBlock, EmptyState, ConfirmDialog, FormField, Input, Modal, type Column,
} from '@/components/ui'
import { ORDER_STATUS } from '@/lib/status'
import { toast } from '@/lib/toast'
import { formatPrice, formatDate } from '@/lib/format'

export function AdminCustomerDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { data: customer, isLoading, isError, error } = useAdminCustomer(id!)
  const { data: orders } = useAdminCustomerOrders(id!)
  const ban = useBanCustomer()
  const unban = useUnbanCustomer()
  const adjustPoints = useAdjustPoints()
  const { data: wallet } = useCustomerPoints(id!)
  const [confirmBan, setConfirmBan] = useState(false)
  const [walletModal, setWalletModal] = useState(false)
  const [newBalance, setNewBalance] = useState('')
  const [walletReason, setWalletReason] = useState('')

  if (isLoading) return <LoadingBlock label="Chargement du client…" />

  if (isError) {
    return (
      <Card padding="none">
        <EmptyState icon={XCircle} title="Erreur de chargement" description={(error as Error)?.message} />
      </Card>
    )
  }

  if (!customer) {
    return (
      <Card padding="none">
        <EmptyState
          icon={Users}
          title="Client introuvable"
          action={<Button variant="outline" onClick={() => navigate('/customers')}>Retour aux clients</Button>}
        />
      </Card>
    )
  }

  const c = customer

  const orderColumns: Column<any>[] = [
    {
      key: 'id',
      header: 'Commande',
      cell: (order) => <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">{order.id}</span>,
    },
    { key: 'createdAt', header: 'Date', cell: (order) => formatDate(order.createdAt) },
    {
      key: 'total', header: 'Total', align: 'right',
      cell: (order) => <span className="font-medium text-gray-900 dark:text-gray-100">{formatPrice(order.total)}</span>,
    },
    {
      key: 'status', header: 'Statut', align: 'center',
      cell: (order) => <StatusBadge map={ORDER_STATUS} value={order.status} size="sm" />,
    },
  ]

  return (
    <div>
      <PageHeader
        backHref="/customers"
        breadcrumbs={[{ label: 'Clients', href: '/customers' }, { label: c.name }]}
        title={
          <span className="flex items-center gap-3">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary-50 text-base font-bold text-primary-700 dark:bg-primary-500/10 dark:text-primary-400">
              {(c.name || '?').charAt(0).toUpperCase()}
            </span>
            {c.name || '—'}
            <Badge variant={c.isBanned ? 'danger' : 'success'} dot>{c.isBanned ? 'Banni' : 'Actif'}</Badge>
          </span>
        }
        description={c.email}
        actions={
          <PermissionGuard permission="users.update">
            <Button
              variant={c.isBanned ? 'outline' : 'danger'}
              leftIcon={c.isBanned ? CheckCircle2 : Ban}
              disabled={ban.isPending || unban.isPending}
              onClick={() => setConfirmBan(true)}
            >
              {c.isBanned ? 'Réactiver le compte' : 'Bannir le compte'}
            </Button>
          </PermissionGuard>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <StatCard label="Commandes" value={c.totalOrders} icon={ShoppingBag} tone="primary" />
        <StatCard label="Total dépensé" value={formatPrice(c.totalSpent)} icon={Wallet} tone="success" />
        <StatCard label="Points fidélité" value={(wallet?.balance ?? 0).toLocaleString('fr-FR')} icon={Star} tone="warning" />
        <StatCard label="Dernière commande" value={formatDate(c.lastOrderAt)} icon={CalendarClock} tone="neutral" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Informations</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                { label: 'Téléphone', value: c.phone || '—' },
                { label: 'Ville', value: c.city || '—' },
                { label: 'Pays', value: c.country || '—' },
                { label: 'Inscrit le', value: formatDate(c.createdAt) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-3">
                  <span className="text-gray-500 dark:text-gray-400">{label}</span>
                  <span className="text-right font-medium text-gray-900 dark:text-gray-100">{value}</span>
                </div>
              ))}
              <div className="flex justify-between gap-3">
                <span className="text-gray-500 dark:text-gray-400">Statut</span>
                <Badge variant={c.isBanned ? 'danger' : 'success'} size="sm">{c.isBanned ? 'Banni' : 'Actif'}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Wallet fidélité */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Fidélité / Wallet</CardTitle>
              <PermissionGuard permission="users.update">
                <Button size="sm" variant="outline" onClick={() => { setNewBalance(String(wallet?.balance ?? 0)); setWalletReason(''); setWalletModal(true) }}>
                  Ajuster
                </Button>
              </PermissionGuard>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                { label: 'Solde actuel', value: `${(wallet?.balance ?? 0).toLocaleString('fr-FR')} pts` },
                { label: 'Points cumulés', value: `${(wallet?.lifetimePoints ?? wallet?.balance ?? 0).toLocaleString('fr-FR')} pts` },
                { label: 'Niveau', value: (wallet as any)?.tier ?? '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-3">
                  <span className="text-gray-500 dark:text-gray-400">{label}</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card padding="none" className="overflow-hidden">
            <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
              <CardTitle>Historique des commandes</CardTitle>
            </div>
            <DataTable
              bare
              data={orders ?? []}
              columns={orderColumns}
              rowKey={(order) => order.id}
              onRowClick={(order) => navigate(`/orders/${order.id}`)}
              empty={{ icon: ShoppingBag, title: 'Aucune commande', description: "Ce client n'a pas encore passé de commande." }}
            />
          </Card>
        </div>
      </div>

      <Modal
        open={walletModal}
        onOpenChange={setWalletModal}
        title="Ajuster les points fidélité"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setWalletModal(false)}>Annuler</Button>
            <Button
              loading={adjustPoints.isPending}
              onClick={async () => {
                const balance = Number(newBalance)
                if (isNaN(balance) || balance < 0) return toast.error('Solde invalide')
                try {
                  await adjustPoints.mutateAsync({ customerId: id!, balance, reason: walletReason })
                  toast.success('Points mis à jour')
                  setWalletModal(false)
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Erreur')
                }
              }}
            >
              Enregistrer
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <FormField label="Nouveau solde (points)" htmlFor="wallet-balance">
            <Input id="wallet-balance" type="number" min="0" value={newBalance} onChange={(e) => setNewBalance(e.target.value)} />
          </FormField>
          <FormField label="Raison (optionnel)" htmlFor="wallet-reason">
            <Input id="wallet-reason" value={walletReason} onChange={(e) => setWalletReason(e.target.value)} placeholder="Correction manuelle, bonus…" />
          </FormField>
        </div>
      </Modal>

      {confirmBan && (
        <ConfirmDialog
          open
          onOpenChange={(open) => { if (!open) setConfirmBan(false) }}
          title={c.isBanned ? 'Réactiver le compte' : 'Bannir le client'}
          description={c.isBanned
            ? `Réactiver le compte de ${c.name} ? Il pourra de nouveau se connecter.`
            : `Bannir ${c.name} ? Il ne pourra plus se connecter.`}
          confirmLabel={c.isBanned ? 'Réactiver' : 'Bannir'}
          variant={c.isBanned ? 'default' : 'danger'}
          onConfirm={async () => {
            try {
              if (c.isBanned) {
                await unban.mutateAsync(c.id)
                toast.success('Compte réactivé')
              } else {
                await ban.mutateAsync(c.id)
                toast.success('Client banni')
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
