import { useState } from 'react'
import { CheckCircle2, ImageIcon, Package, RefreshCw, XCircle } from 'lucide-react'
import { useAdminProducts } from '../hooks/useAdminProducts'
import { useModerateProduct } from '../hooks/useModerateProduct'
import type { ProductQueryParams } from '@/infrastructure/data-source/AdminProductDataSource'
import { resolveAdminMediaUrl } from '@/lib/resolveAdminMediaUrl'
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  FormField,
  LoadingBlock,
  Modal,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  StatusBadge,
  Textarea,
} from '@/components/ui'
import { MODERATION_STATUS } from '@/lib/status'
import { toast } from '@/lib/toast'
import { formatPrice } from '@/lib/format'

const STATUS_OPTIONS = [
  { value: 'pending', label: 'En attente' },
  { value: 'approved', label: 'Approuvés' },
  { value: 'rejected', label: 'Rejetés' },
]

type ConfirmState = {
  title: string
  description?: string
  variant?: 'danger' | 'default'
  onConfirm: () => void | Promise<void>
}

export function AdminProductModerationPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [detailProduct, setDetailProduct] = useState<any>(null)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)

  const params: ProductQueryParams = {
    page,
    limit: 10,
    search: search || undefined,
    status: (statusFilter as ProductQueryParams['status']) || undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  }

  const { data, isLoading, isError, error, refetch } = useAdminProducts(params)
  const { approve, reject } = useModerateProduct()

  function handleSearch(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handleApprove(id: string, name: string) {
    setConfirm({
      title: 'Approuver le produit',
      description: `Approuver "${name}" ? Il sera visible dans l'application.`,
      onConfirm: async () => {
        try {
          await approve.mutateAsync(id)
          toast.success(`"${name}" a été approuvé`)
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Erreur lors de l'approbation")
        }
      },
    })
  }

  function handleRejectOpen(id: string, name: string) {
    setRejectReason('')
    setRejectModal({ id, name })
  }

  function handleRejectConfirm() {
    if (!rejectModal) return
    const name = rejectModal.name
    reject.mutate(
      { id: rejectModal.id, reason: rejectReason || undefined },
      {
        onSuccess: () => toast.success(`"${name}" a été rejeté`),
        onError: (err: Error) => toast.error(err.message || 'Erreur lors du rejet'),
        onSettled: () => setRejectModal(null),
      },
    )
  }

  return (
    <div>
      <PageHeader
        title="Modération Produits"
        description={data ? `${data.total} produit(s) en attente` : 'Chargement…'}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={handleSearch}
          placeholder="Rechercher par nom ou SKU…"
          className="w-full sm:max-w-xs"
        />
        <Select
          size="sm"
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); setPage(1) }}
          options={STATUS_OPTIONS}
        />
      </div>

      {isLoading && <LoadingBlock label="Chargement des produits…" />}

      {isError && (
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
      )}

      {data && (
        <div className="space-y-4">
          {data.data.map((product: any) => {
            const image = Array.isArray(product.images) && typeof product.images[0] === 'string'
              ? product.images[0]
              : typeof product.imageUrl === 'string'
                ? product.imageUrl
                : undefined

            return (
              <Card key={product.id} padding="sm" className="transition-colors hover:border-gray-300 dark:hover:border-gray-700">
                <div className="flex items-start justify-between">
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                      {image ? (
                        <img
                          src={resolveAdminMediaUrl(image)}
                          alt={product.name}
                          className="h-full w-full object-cover"
                          onError={(e) => { e.currentTarget.style.display = 'none' }}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-gray-400 dark:text-gray-500">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3
                          className="cursor-pointer text-sm font-semibold text-gray-900 hover:text-primary-600 dark:text-gray-100 dark:hover:text-primary-400"
                          onClick={() => setDetailProduct(detailProduct?.id === product.id ? null : product)}
                        >
                          {product.name}
                        </h3>
                        <StatusBadge map={MODERATION_STATUS} value={product.moderationStatus ?? 'pending'} size="sm" dot />
                      </div>
                      <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">SKU: {product.sku}</p>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                        <span>{formatPrice(product.price)}</span>
                        <span>Stock: {product.stock}</span>
                        <span>Catégorie: {product.category}</span>
                        <span>Vendeur: {product.storeName ?? product.storeId}</span>
                        <span>Soumis le: {new Date(product.createdAt).toLocaleDateString('fr-FR')}</span>
                      </div>
                      {product.rejectionReason && product.moderationStatus === 'rejected' && (
                        <p className="mt-1 text-xs text-red-500 dark:text-red-400">
                          Motif : {product.rejectionReason}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 flex flex-shrink-0 items-center gap-2">
                    {product.moderationStatus === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          leftIcon={CheckCircle2}
                          loading={approve.isPending}
                          onClick={() => handleApprove(product.id, product.name)}
                        >
                          Approuver
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={XCircle}
                          className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                          disabled={reject.isPending}
                          onClick={() => handleRejectOpen(product.id, product.name)}
                        >
                          Rejeter
                        </Button>
                      </>
                    )}
                    {product.moderationStatus === 'approved' && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approuvé
                      </span>
                    )}
                    {product.moderationStatus === 'rejected' && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500 dark:text-red-400">
                        <XCircle className="h-3.5 w-3.5" /> Rejeté
                      </span>
                    )}
                  </div>
                </div>

                {detailProduct?.id === product.id && (
                  <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
                    <p className="text-sm text-gray-700 dark:text-gray-300">{product.description}</p>
                  </div>
                )}
              </Card>
            )
          })}

          {data.data.length === 0 && (
            <Card padding="none">
              <EmptyState
                icon={Package}
                title="Aucun produit"
                description="Aucun produit trouvé dans cette catégorie."
              />
            </Card>
          )}

          {data.totalPages > 1 && (
            <Card padding="sm">
              <Pagination page={data.page} pageSize={10} total={data.total} onPageChange={setPage} />
            </Card>
          )}
        </div>
      )}

      <Modal
        open={!!rejectModal}
        onOpenChange={(open) => !open && setRejectModal(null)}
        title="Rejeter le produit"
        description={rejectModal ? `Produit : ${rejectModal.name}` : undefined}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setRejectModal(null)}>
              Annuler
            </Button>
            <Button variant="danger" loading={reject.isPending} onClick={handleRejectConfirm}>
              Rejeter
            </Button>
          </>
        }
      >
        <FormField label="Motif du rejet" htmlFor="reject-reason" hint="Facultatif — communiqué au vendeur.">
          <Textarea
            id="reject-reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            placeholder="Produit non conforme…"
            className="w-full"
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
          confirmLabel="Approuver"
          onConfirm={confirm.onConfirm}
        />
      )}
    </div>
  )
}
