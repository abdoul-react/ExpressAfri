import { useAdminCategories } from '@/features/categories'
import { useAdminProducts } from '@/features/products'
import { useAdminStores } from '@/features/stores/hooks/useAdminStores'

export type TargetType = 'all' | 'category' | 'store' | 'product'

interface TargetSelectorProps {
  target: TargetType
  targetId: string
  onTargetChange: (target: TargetType) => void
  onSelectionChange: (id: string, name: string) => void
  targetLabel?: string
}

export function TargetSelector({
  target,
  targetId,
  onTargetChange,
  onSelectionChange,
  targetLabel = 'Cible',
}: TargetSelectorProps) {
  const { data: categories } = useAdminCategories()
  const { data: stores } = useAdminStores({ page: 1, limit: 100, status: 'approved' })
  const { data: products } = useAdminProducts({ page: 1, limit: 100 })

  const options = target === 'category'
    ? (categories ?? []).map((category: any) => ({ id: category.id, name: category.name }))
    : target === 'store'
      ? (stores?.data ?? []).map((store: any) => ({ id: store.id, name: store.name }))
      : target === 'product'
        ? (products?.data ?? []).map((product: any) => ({ id: product.id, name: product.name }))
        : []

  const selectionLabel = target === 'category' ? 'Catégorie' : target === 'store' ? 'Boutique' : 'Produit'

  return (
    <>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{targetLabel}</label>
        <select
          value={target}
          onChange={(event) => onTargetChange(event.target.value as TargetType)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
        >
          <option value="all">Tous les produits</option>
          <option value="category">Catégorie</option>
          <option value="store">Boutique</option>
          <option value="product">Produit</option>
        </select>
      </div>

      {target !== 'all' && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{selectionLabel} ciblé(e) *</label>
          <select
            value={targetId}
            onChange={(event) => {
              const selected = options.find((option) => option.id === event.target.value)
              onSelectionChange(selected?.id ?? '', selected?.name ?? '')
            }}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          >
            <option value="" className="text-gray-500">Sélectionner {selectionLabel.toLowerCase()}</option>
            {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
          </select>
        </div>
      )}
    </>
  )
}
