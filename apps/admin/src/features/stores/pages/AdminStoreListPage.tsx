import { useState } from 'react'
import type React from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Store, XCircle, Pencil, Trash2 } from 'lucide-react'
import { useAdminStores, useUpdateStore, useDeleteStore } from '../hooks/useAdminStores'
import { useApproveStore, useRejectStore, useCreateStore } from '../hooks/useStoreActions'
import { PermissionGuard } from '@/components/guards/PermissionGuard'
import {
  PageHeader, SearchInput, Select, DataTable, StatusBadge, Button, Card, EmptyState, ConfirmDialog,
  Modal, FormField, Input, type Column,
} from '@/components/ui'
import { STORE_STATUS } from '@/lib/status'
import { toast } from '@/lib/toast'
import type { StoreQueryParams } from '@/infrastructure/data-source/AdminStoreDataSource'
import { formatPrice, formatDate } from '@/lib/format'
import { WORLD_COUNTRIES } from '@/lib/countries'

interface ConfirmState {
  title: string
  description: string
  variant?: 'danger' | 'default'
  confirmLabel: string
  onConfirm: () => Promise<void>
}

type EditForm = { name: string; email: string; phone: string; city: string; country: string; description: string }

export function AdminStoreListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', email: '', phone: '', country: 'Niger', commissionRate: '0' })
  const [editStore, setEditStore] = useState<{ id: string; form: EditForm } | null>(null)
  const approve = useApproveStore()
  const reject = useRejectStore()
  const createStore = useCreateStore()
  const updateStore = useUpdateStore()
  const deleteStore = useDeleteStore()

  const params: StoreQueryParams = {
    page, limit: 10,
    search: search || undefined,
    status: (statusFilter as StoreQueryParams['status']) || undefined,
  }

  const { data, isLoading, isError, error } = useAdminStores(params)

  function askApprove(id: string, name: string) {
    setConfirm({
      title: 'Approuver la boutique',
      description: `Approuver la boutique « ${name} » ? Elle deviendra visible sur la plateforme.`,
      confirmLabel: 'Approuver',
      onConfirm: async () => {
        try {
          await approve.mutateAsync(id)
          toast.success(`Boutique « ${name} » approuvée`)
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Erreur lors de l'approbation")
        }
      },
    })
  }

  function askReject(id: string, name: string) {
    setConfirm({
      title: 'Rejeter la boutique',
      description: `Rejeter la boutique « ${name} » ? Le vendeur en sera informé.`,
      variant: 'danger',
      confirmLabel: 'Rejeter',
      onConfirm: async () => {
        try {
          await reject.mutateAsync({ id })
          toast.success(`Boutique « ${name} » rejetée`)
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Erreur lors du rejet')
        }
      },
    })
  }

  const columns: Column<any>[] = [
    {
      key: 'name',
      header: 'Boutique',
      cell: (store) => (
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{store.name}</p>
      ),
    },
    {
      key: 'owner',
      header: 'Propriétaire',
      cell: (store) => (
        <div>
          <p className="text-sm text-gray-900 dark:text-gray-100">{store.ownerName}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{store.ownerEmail}</p>
        </div>
      ),
    },
    { key: 'city', header: 'Ville', hideBelow: 'lg', cell: (store) => store.city },
    {
      key: 'productCount', header: 'Produits', align: 'center', hideBelow: 'md',
      cell: (store) => <span className="font-medium text-gray-900 dark:text-gray-100">{store.productCount}</span>,
    },
    {
      key: 'revenue', header: 'Revenu', align: 'right', hideBelow: 'md',
      cell: (store) => <span className="font-medium text-gray-900 dark:text-gray-100">{formatPrice(store.revenue)}</span>,
    },
    {
      key: 'status', header: 'Statut', align: 'center',
      cell: (store) => <StatusBadge map={STORE_STATUS} value={store.status} />,
    },
    { key: 'createdAt', header: 'Date', align: 'center', hideBelow: 'lg', cell: (store) => formatDate(store.createdAt) },
    {
      key: 'actions', header: 'Actions', align: 'right',
      cell: (store) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {store.status === 'pending' && (
            <>
              <PermissionGuard permission="stores.approve">
                <Button variant="ghost" size="sm" className="text-green-600 hover:bg-green-50 hover:text-green-700 dark:text-green-400 dark:hover:bg-green-500/10"
                  disabled={approve.isPending} onClick={() => askApprove(store.id, store.name)}>
                  Approuver
                </Button>
              </PermissionGuard>
              <PermissionGuard permission="stores.reject">
                <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10"
                  disabled={reject.isPending} onClick={() => askReject(store.id, store.name)}>
                  Rejeter
                </Button>
              </PermissionGuard>
            </>
          )}
          <PermissionGuard permission="stores.update">
            <Button variant="ghost" size="sm" leftIcon={Pencil}
              onClick={() => setEditStore({
                id: store.id,
                form: { name: store.name, email: store.ownerEmail, phone: store.phone, city: store.city, country: store.country, description: store.description },
              })}>
              Modifier
            </Button>
          </PermissionGuard>
          <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-700 dark:text-primary-400"
            onClick={() => navigate(`/stores/${store.id}`)}>
            Détail
          </Button>
          <PermissionGuard permission="stores.delete">
            <Button variant="ghost" size="sm" leftIcon={Trash2}
              className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10"
              onClick={() => setConfirm({
                title: 'Supprimer la boutique',
                description: `La boutique « ${store.name} » et tous ses gérants associés seront supprimés définitivement. Cette action est irréversible.`,
                variant: 'danger',
                confirmLabel: 'Supprimer',
                onConfirm: async () => {
                  try {
                    await deleteStore.mutateAsync(store.id)
                    toast.success(`Boutique « ${store.name} » supprimée`)
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression')
                  }
                },
              })}>
              Supprimer
            </Button>
          </PermissionGuard>
        </div>
      ),
    },
  ]

  return (
    <div>
      <Modal
        open={createOpen}
        onOpenChange={(o) => { if (!o) { setCreateOpen(false); setCreateForm({ name: '', email: '', phone: '', country: 'Niger', commissionRate: '0' }) } }}
        title="Créer une boutique"
        description="La boutique sera créée en statut « En attente » — vous pourrez l'approuver ensuite depuis son détail."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button
              loading={createStore.isPending}
              onClick={async () => {
                if (!createForm.name.trim() || !createForm.email.trim()) {
                  toast.error('Nom et email de la boutique requis')
                  return
                }
                try {
                  const store = await createStore.mutateAsync({
                    name: createForm.name.trim(),
                    email: createForm.email.trim(),
                    phone: createForm.phone.trim() || undefined,
                    country: createForm.country.trim() || 'Niger',
                    commissionRate: parseFloat(createForm.commissionRate) || 0,
                  })
                  toast.success(`Boutique « ${store.name} » créée`)
                  setCreateOpen(false)
                  setCreateForm({ name: '', email: '', phone: '', country: 'Niger', commissionRate: '0' })
                  navigate(`/stores/${store.id}`)
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Erreur lors de la création')
                }
              }}
            >
              Créer
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Nom de la boutique" required>
            <Input required size="sm" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} placeholder="Ex : Boutique Mode Sahel" />
          </FormField>
          <FormField label="Email de contact" required hint="Email principal de la boutique (pas du gérant)">
            <Input required type="email" size="sm" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} placeholder="contact@boutique.com" />
          </FormField>
          <FormField label="Téléphone">
            <Input size="sm" value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} placeholder="+227 9X XX XX XX" />
          </FormField>
          <FormField label="Pays">
            <Select
              size="sm"
              className="w-full"
              value={createForm.country}
              onChange={(v) => setCreateForm({ ...createForm, country: v })}
              options={WORLD_COUNTRIES.map((c) => ({ value: c.name, label: `${c.flag} ${c.name}` }))}
            />
          </FormField>
          <FormField label="Taux de commission (%)" hint="Pourcentage prélevé sur chaque vente">
            <Input type="number" min="0" max="100" step="0.5" size="sm" value={createForm.commissionRate} onChange={(e) => setCreateForm({ ...createForm, commissionRate: e.target.value })} />
          </FormField>
        </div>
      </Modal>

      {editStore && (
        <Modal
          open={!!editStore}
          onOpenChange={(o) => { if (!o) setEditStore(null) }}
          title="Modifier la boutique"
          size="sm"
          footer={
            <>
              <Button variant="outline" onClick={() => setEditStore(null)}>Annuler</Button>
              <Button
                loading={updateStore.isPending}
                onClick={async () => {
                  try {
                    await updateStore.mutateAsync({ id: editStore.id, payload: editStore.form })
                    toast.success('Boutique mise à jour')
                    setEditStore(null)
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour')
                  }
                }}
              >
                Enregistrer
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <FormField label="Nom de la boutique" required>
              <Input size="sm" value={editStore.form.name} onChange={(e) => setEditStore({ ...editStore, form: { ...editStore.form, name: e.target.value } })} placeholder="Nom de la boutique" />
            </FormField>
            <FormField label="Email de contact">
              <Input type="email" size="sm" value={editStore.form.email} onChange={(e) => setEditStore({ ...editStore, form: { ...editStore.form, email: e.target.value } })} placeholder="contact@boutique.com" />
            </FormField>
            <FormField label="Téléphone">
              <Input size="sm" value={editStore.form.phone} onChange={(e) => setEditStore({ ...editStore, form: { ...editStore.form, phone: e.target.value } })} placeholder="+227 9X XX XX XX" />
            </FormField>
            <FormField label="Ville">
              <Input size="sm" value={editStore.form.city} onChange={(e) => setEditStore({ ...editStore, form: { ...editStore.form, city: e.target.value } })} placeholder="Niamey" />
            </FormField>
            <FormField label="Pays">
              <Select
                size="sm"
                className="w-full"
                value={editStore.form.country}
                onChange={(v) => setEditStore({ ...editStore, form: { ...editStore.form, country: v } })}
                options={WORLD_COUNTRIES.map((c) => ({ value: c.name, label: `${c.flag} ${c.name}` }))}
              />
            </FormField>
            <FormField label="Description">
              <Input size="sm" value={editStore.form.description} onChange={(e) => setEditStore({ ...editStore, form: { ...editStore.form, description: e.target.value } })} placeholder="Description de la boutique" />
            </FormField>
          </div>
        </Modal>
      )}

      <PageHeader
        title="Boutiques"
        description={data ? `${data.total} boutique${data.total > 1 ? 's' : ''} sur la plateforme` : 'Gestion des boutiques vendeurs'}
        actions={
          <PermissionGuard permission="stores.create">
            <Button leftIcon={Plus} onClick={() => setCreateOpen(true)}>
              Créer une boutique
            </Button>
          </PermissionGuard>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1) }}
          placeholder="Rechercher par nom, propriétaire ou ville…"
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
            { value: 'approved', label: 'Approuvée' },
            { value: 'rejected', label: 'Rejetée' },
            { value: 'suspended', label: 'Suspendue' },
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
          rowKey={(store) => store.id}
          loading={isLoading}
          onRowClick={(store) => navigate(`/stores/${store.id}`)}
          empty={{
            icon: Store,
            title: 'Aucune boutique trouvée',
            description: search || statusFilter ? 'Essayez de modifier vos filtres de recherche.' : 'Les boutiques créées par les vendeurs apparaîtront ici.',
          }}
          pagination={data ? { page: data.page, pageSize: 10, total: data.total, onPageChange: setPage } : undefined}
        />
      )}

      {confirm && (
        <ConfirmDialog
          open
          onOpenChange={(open) => { if (!open) setConfirm(null) }}
          title={confirm.title}
          description={confirm.description}
          confirmLabel={confirm.confirmLabel}
          variant={confirm.variant}
          onConfirm={confirm.onConfirm}
        />
      )}
    </div>
  )
}
