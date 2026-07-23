import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDown, ArrowUp, ImageIcon, Package, Pencil, Plus, RefreshCw, Trash2, XCircle } from 'lucide-react'
import { useAdminProducts } from '../hooks/useAdminProducts'
import { useDeleteProduct } from '../hooks/useDeleteProduct'
import { useAdminCategories } from '@/features/categories'
import { resolveAdminMediaUrl } from '@/lib/resolveAdminMediaUrl'
import { PermissionGuard } from '@/components/guards/PermissionGuard'
import type { ProductQueryParams } from '@/infrastructure/data-source/AdminProductDataSource'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  EmptyState,
  PageHeader,
  SearchInput,
  Select,
  StatusBadge,
  type Column,
} from '@/components/ui'
import { PRODUCT_STATUS } from '@/lib/status'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/cn'
import { formatPrice } from '@/lib/format'

function getProductImage(product: { images?: unknown; imageUrl?: unknown }) {
  if (Array.isArray(product.images) && typeof product.images[0] === 'string') {
    return product.images[0]
  }
  return typeof product.imageUrl === 'string' ? product.imageUrl : undefined
}

const STATUS_OPTIONS = Object.entries(PRODUCT_STATUS).map(([value, meta]) => ({
  value,
  label: meta.label,
}))

type ConfirmState = {
  title: string
  description?: string
  variant?: 'danger' | 'default'
  onConfirm: () => void | Promise<void>
}

export function AdminProductListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)

  const params: ProductQueryParams = {
    page,
    limit: 10,
    search: search || undefined,
    categoryId: categoryFilter || undefined,
    status: (statusFilter as ProductQueryParams['status']) || undefined,
    sortBy,
    sortOrder,
  }

  const { data, isLoading, isError, error, refetch } = useAdminProducts(params)
  const { data: categories } = useAdminCategories()
  const deleteProduct = useDeleteProduct()

  function handleSearch(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handleDelete(id: string, name: string) {
    setConfirm({
      title: `Supprimer "${name}" ?`,
      description: "Si le produit est lié à des commandes, il sera archivé (retiré de l'app).",
      variant: 'danger',
      onConfirm: async () => {
        try {
          const result: any = await deleteProduct.mutateAsync(id)
          if (result?.archived) {
            toast.success(`"${name}" est archivé — lié à des commandes, il reste visible en filtrant "Archivé" mais n'apparaît plus dans l'app.`)
          } else {
            toast.success(`"${name}" a été supprimé définitivement.`)
          }
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression')
        }
      },
    })
  }

  const columns: Column<any>[] = [
    {
      key: 'product',
      header: 'Produit',
      cell: (product) => {
        const image = getProductImage(product)
        return (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
              {image ? (
                <img
                  src={resolveAdminMediaUrl(image)}
                  alt={`Photo de ${product.name}`}
                  className="h-full w-full object-cover"
                  onError={(event) => { event.currentTarget.style.display = 'none' }}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-400 dark:text-gray-500">
                  <ImageIcon className="h-4 w-4" />
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{product.name}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{product.sku}</p>
              {product.variants && product.variants.length > 0 && (
                <Badge variant="info" size="sm" className="mt-0.5">
                  {product.variants.length} variantes
                </Badge>
              )}
            </div>
          </div>
        )
      },
    },
    {
      key: 'price',
      header: (
        <button
          type="button"
          onClick={() => { setSortBy('price'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc') }}
          className="inline-flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-gray-700 dark:hover:text-gray-200"
        >
          Prix
          {sortBy === 'price' && (sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
        </button>
      ),
      cell: (product) => (
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatPrice(product.price)}</span>
      ),
    },
    {
      key: 'stock',
      header: 'Stock',
      cell: (product) => {
        const stock = product.totalStock ?? product.stock ?? 0
        return (
          <span
            className={cn(
              'text-sm font-medium',
              stock === 0 ? 'text-red-600 dark:text-red-400' : stock <= 5 ? 'text-orange-500 dark:text-orange-400' : 'text-gray-900 dark:text-gray-100',
            )}
          >
            {stock === 0 ? 'Épuisé' : stock}
          </span>
        )
      },
    },
    {
      key: 'category',
      header: 'Catégorie',
      hideBelow: 'md',
      cell: (product) => <span className="text-sm text-gray-500 dark:text-gray-400">{product.category}</span>,
    },
    {
      key: 'status',
      header: 'Statut',
      cell: (product) => (
        <StatusBadge map={PRODUCT_STATUS} value={product.status ?? (product.isActive ? 'active' : 'inactive')} />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (product) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <PermissionGuard permission="products.update">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={Pencil}
              onClick={() => navigate(`/products/${product.id}/edit`)}
            >
              Modifier
            </Button>
          </PermissionGuard>
          <PermissionGuard permission="products.delete">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={Trash2}
              className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
              disabled={deleteProduct.isPending}
              onClick={() => handleDelete(product.id, product.name)}
            >
              Supprimer
            </Button>
          </PermissionGuard>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Produits"
        description={data ? `${data.total} produits` : 'Chargement…'}
        actions={
          <PermissionGuard permission="products.create">
            <Button leftIcon={Plus} onClick={() => navigate('/products/new')}>
              Nouveau produit
            </Button>
          </PermissionGuard>
        }
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
          value={categoryFilter}
          onChange={(v) => { setCategoryFilter(v); setPage(1) }}
          options={(categories ?? [])
            .filter((c: any) => !c.parentId)
            .map((cat: any) => ({ value: cat.id, label: cat.name }))}
          placeholder="Toutes catégories"
        />
        <Select
          size="sm"
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); setPage(1) }}
          options={STATUS_OPTIONS}
          placeholder="Tous statuts"
        />
      </div>

      {isError ? (
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
      ) : (
        <DataTable
          data={data?.data ?? []}
          columns={columns}
          rowKey={(product) => String(product.id)}
          loading={isLoading}
          onRowClick={(product) => navigate(`/products/${product.id}`)}
          empty={{
            icon: Package,
            title: 'Aucun produit',
            description: 'Aucun produit ne correspond à vos critères de recherche.',
            action: (
              <PermissionGuard permission="products.create">
                <Button leftIcon={Plus} onClick={() => navigate('/products/new')}>
                  Nouveau produit
                </Button>
              </PermissionGuard>
            ),
          }}
          pagination={
            data
              ? { page: data.page, pageSize: 10, total: data.total, onPageChange: setPage }
              : undefined
          }
        />
      )}

      {confirm && (
        <ConfirmDialog
          open={!!confirm}
          onOpenChange={(open) => !open && setConfirm(null)}
          title={confirm.title}
          description={confirm.description}
          variant={confirm.variant}
          confirmLabel="Supprimer"
          onConfirm={confirm.onConfirm}
        />
      )}
    </div>
  )
}
