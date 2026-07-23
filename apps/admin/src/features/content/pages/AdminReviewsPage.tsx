import { useState } from 'react'
import { Eye, EyeOff, Star } from 'lucide-react'
import {
  Badge, Button, Card, ConfirmDialog, DataTable, PageHeader, Select, type Column,
} from '@/components/ui'
import { toast } from '@/lib/toast'
import { useAdminReviews, useModerateReview, type Review } from '../hooks/useAdminReviews'

const STARS = [1, 2, 3, 4, 5]

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Tous les avis' },
  { value: 'active', label: 'Visibles' },
  { value: 'inactive', label: 'Masqués' },
]

function StarDisplay({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {STARS.map((s) => (
        <Star
          key={s}
          className={s <= rating
            ? 'h-4 w-4 fill-current text-amber-400'
            : 'h-4 w-4 text-gray-300 dark:text-gray-600'}
        />
      ))}
    </span>
  )
}

export function AdminReviewsPage() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [confirmHide, setConfirmHide] = useState<Review | null>(null)
  const limit = 20

  const { data, isLoading, isError } = useAdminReviews(page, limit, statusFilter)
  const moderateMutation = useModerateReview()

  const reviews: Review[] = data?.data ?? []
  const total = data?.total ?? 0

  async function moderate(id: string, isActive: boolean) {
    try {
      await moderateMutation.mutateAsync({ id, isActive })
      toast.success(isActive ? 'Avis affiché' : 'Avis masqué')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la modération')
    }
  }

  const columns: Column<Review>[] = [
    {
      key: 'review', header: 'Avis',
      cell: (review) => (
        <div className="max-w-sm">
          {review.title && <p className="truncate font-medium text-gray-900 dark:text-gray-100">{review.title}</p>}
          {review.body && <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{review.body}</p>}
          <p className="mt-0.5 truncate font-mono text-xs text-gray-400 dark:text-gray-500">Produit : {review.productId.slice(0, 8)}…</p>
        </div>
      ),
    },
    {
      key: 'rating', header: 'Note',
      cell: (review) => (
        <div className="flex items-center gap-1.5">
          <StarDisplay rating={review.rating} />
          <span className="text-xs text-gray-500 dark:text-gray-400">{review.rating}/5</span>
        </div>
      ),
    },
    {
      key: 'date', header: 'Date', hideBelow: 'md',
      cell: (review) => (
        <span className="whitespace-nowrap text-gray-500 dark:text-gray-400">
          {new Date(review.createdAt).toLocaleDateString('fr-FR')}
        </span>
      ),
    },
    {
      key: 'status', header: 'Statut',
      cell: (review) => (
        <Badge variant={review.isActive ? 'success' : 'danger'} dot>
          {review.isActive ? 'Visible' : 'Masqué'}
        </Badge>
      ),
    },
    {
      key: 'actions', header: 'Action', align: 'right',
      cell: (review) => review.isActive ? (
        <Button variant="outline" size="sm" leftIcon={EyeOff} className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300" disabled={moderateMutation.isPending} onClick={() => setConfirmHide(review)}>
          Masquer
        </Button>
      ) : (
        <Button variant="outline" size="sm" leftIcon={Eye} disabled={moderateMutation.isPending} onClick={() => moderate(review.id, true)}>
          Afficher
        </Button>
      ),
    },
  ]

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Avis clients" description="Modération des avis laissés par les clients." />
        <Card><p className="text-sm text-red-600 dark:text-red-400">Erreur de chargement des avis.</p></Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Avis clients"
        description={`${total} avis au total — approuvez ou masquez les avis clients.`}
        actions={
          <Select value={statusFilter} onChange={(v) => { setStatusFilter(v as typeof statusFilter); setPage(1) }} options={STATUS_FILTER_OPTIONS} size="sm" className="w-44" />
        }
      />

      <DataTable<Review>
        data={reviews}
        columns={columns}
        rowKey={(review) => review.id}
        loading={isLoading}
        skeletonRows={5}
        empty={{ icon: Star, title: 'Aucun avis trouvé.', description: 'Les avis apparaissent ici quand des clients laissent des évaluations sur les produits.' }}
        pagination={{ page, pageSize: limit, total, onPageChange: setPage }}
      />

      <ConfirmDialog
        open={confirmHide !== null}
        onOpenChange={(o) => { if (!o) setConfirmHide(null) }}
        title="Masquer cet avis ?"
        description={confirmHide ? `L'avis${confirmHide.title ? ` « ${confirmHide.title} »` : ''} ne sera plus visible par les clients dans l'application.` : undefined}
        confirmLabel="Masquer"
        variant="danger"
        onConfirm={async () => { if (!confirmHide) return; await moderate(confirmHide.id, false) }}
      />
    </div>
  )
}
