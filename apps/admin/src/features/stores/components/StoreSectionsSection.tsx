import { useState } from 'react'
import { ArrowDown, ArrowUp, LayoutGrid, Package, Plus, Trash2, X } from 'lucide-react'
import {
  useStoreSections, useCreateStoreSection, useUpdateStoreSection,
  useDeleteStoreSection, useReorderStoreSections,
  useStoreSectionItems, useAddStoreSectionItems,
  useRemoveStoreSectionItem, useReorderStoreSectionItems,
} from '../hooks/useAdminStores'
import { useAdminProducts } from '@/features/products/hooks/useAdminProducts'
import type { StoreSection, StoreSectionLayout } from '@/infrastructure/data-source/AdminStoreDataSource'
import {
  Card, CardHeader, CardTitle, CardContent, Button, ConfirmDialog, LoadingBlock,
  EmptyState, Modal, Input, Select, Switch, SearchInput, FormField,
} from '@/components/ui'
import { resolveAdminMediaUrl } from '@/lib/resolveAdminMediaUrl'
import { formatPrice } from '@/lib/format'
import { toast } from '@/lib/toast'

const LAYOUT_OPTIONS: { value: StoreSectionLayout; label: string; hint: string }[] = [
  { value: 'grid', label: 'Grille', hint: 'Deux colonnes, format standard du catalogue' },
  { value: 'rail', label: 'Rail horizontal', hint: 'Défilement latéral, cartes compactes' },
  { value: 'list', label: 'Liste', hint: 'Une ligne par produit, vignette + détails' },
  { value: 'showcase', label: 'Vitrine', hint: 'Un produit héros puis une grille' },
]

const LAYOUT_LABELS = Object.fromEntries(LAYOUT_OPTIONS.map((o) => [o.value, o.label])) as Record<StoreSectionLayout, string>

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

/**
 * Sections de catalogue d'une boutique. Chaque section a son propre format de
 * cartes : c'est `layout` qui pilote le rendu côté application mobile.
 */
export function StoreSectionsSection({ storeId }: { storeId: string }) {
  const { data: sections, isLoading } = useStoreSections(storeId)
  const create = useCreateStoreSection(storeId)
  const update = useUpdateStoreSection(storeId)
  const remove = useDeleteStoreSection(storeId)
  const reorder = useReorderStoreSections(storeId)

  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [layout, setLayout] = useState<StoreSectionLayout>('grid')
  const [confirmDelete, setConfirmDelete] = useState<StoreSection | null>(null)
  const [openSection, setOpenSection] = useState<StoreSection | null>(null)

  const list = sections ?? []

  async function handleCreate() {
    if (!title.trim()) {
      toast.error('Le titre est obligatoire')
      return
    }
    try {
      await create.mutateAsync({ title: title.trim(), subtitle: subtitle.trim() || undefined, layout })
      toast.success('Section créée')
      setCreating(false)
      setTitle('')
      setSubtitle('')
      setLayout('grid')
    } catch (err) {
      toast.error(errorMessage(err, 'Échec de la création'))
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= list.length) return
    const ids = list.map((s) => s.id)
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    try {
      await reorder.mutateAsync(ids)
    } catch (err) {
      toast.error(errorMessage(err, 'Échec du réordonnancement'))
    }
  }

  async function setLayoutOf(section: StoreSection, next: StoreSectionLayout) {
    try {
      await update.mutateAsync({ sectionId: section.id, payload: { layout: next } })
    } catch (err) {
      toast.error(errorMessage(err, 'Échec de la modification'))
    }
  }

  async function setActiveOf(section: StoreSection, isActive: boolean) {
    try {
      await update.mutateAsync({ sectionId: section.id, payload: { isActive } })
    } catch (err) {
      toast.error(errorMessage(err, 'Échec de la modification'))
    }
  }

  if (isLoading) return <LoadingBlock />

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            Sections du catalogue
            {list.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">({list.length})</span>
            )}
          </CardTitle>
          <Button size="sm" leftIcon={Plus} onClick={() => setCreating(true)}>
            Nouvelle section
          </Button>
        </CardHeader>
        <CardContent>
          {list.length > 0 ? (
            <div className="space-y-3">
              {list.map((section, index) => (
                <div
                  key={section.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-100 p-3 dark:border-gray-800"
                >
                  <div className="flex flex-col">
                    <button
                      type="button"
                      aria-label="Monter la section"
                      disabled={index === 0 || reorder.isPending}
                      onClick={() => move(index, -1)}
                      className="rounded p-0.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-800"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Descendre la section"
                      disabled={index === list.length - 1 || reorder.isPending}
                      onClick={() => move(index, 1)}
                      className="rounded p-0.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-800"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="min-w-[10rem] flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{section.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {section.subtitle ? `${section.subtitle} · ` : ''}
                      {section.productCount} produit{section.productCount > 1 ? 's' : ''} · {LAYOUT_LABELS[section.layout]}
                    </p>
                  </div>

                  <Select
                    size="sm"
                    value={section.layout}
                    onChange={(v) => setLayoutOf(section, v as StoreSectionLayout)}
                    options={LAYOUT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                  />

                  <Switch
                    checked={section.isActive}
                    onCheckedChange={(v) => setActiveOf(section, v)}
                    label={section.isActive ? 'Visible' : 'Masquée'}
                  />

                  <Button size="sm" variant="outline" leftIcon={Package} onClick={() => setOpenSection(section)}>
                    Produits
                  </Button>

                  <button
                    type="button"
                    aria-label="Supprimer la section"
                    onClick={() => setConfirmDelete(section)}
                    className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={LayoutGrid}
              title="Aucune section"
              description="Créez des sections pour mettre en avant une sélection de produits sur la page boutique."
            />
          )}
        </CardContent>
      </Card>

      <Modal
        open={creating}
        onOpenChange={setCreating}
        title="Nouvelle section"
        description="Le format détermine l'apparence des cartes produit dans l'application."
        footer={
          <>
            <Button variant="outline" onClick={() => setCreating(false)}>Annuler</Button>
            <Button loading={create.isPending} onClick={handleCreate}>Créer</Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Titre" required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nouveautés" />
          </FormField>
          <FormField label="Sous-titre">
            <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Les dernières arrivées" />
          </FormField>
          <FormField label="Format des cartes" hint={LAYOUT_OPTIONS.find((o) => o.value === layout)?.hint}>
            <Select
              value={layout}
              onChange={(v) => setLayout(v as StoreSectionLayout)}
              options={LAYOUT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            />
          </FormField>
        </div>
      </Modal>

      {openSection && (
        <SectionItemsModal
          storeId={storeId}
          section={openSection}
          onClose={() => setOpenSection(null)}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(open) => { if (!open) setConfirmDelete(null) }}
        title="Supprimer la section ?"
        description="Les produits ne sont pas supprimés, seule la section disparaît de la page boutique."
        variant="danger"
        confirmLabel="Supprimer"
        onConfirm={async () => {
          if (!confirmDelete) return
          try {
            await remove.mutateAsync(confirmDelete.id)
            toast.success('Section supprimée')
          } catch (err) {
            toast.error(errorMessage(err, 'Échec de la suppression'))
          } finally {
            setConfirmDelete(null)
          }
        }}
      />
    </div>
  )
}

/** Composition d'une section : produits retenus à gauche, catalogue à droite. */
function SectionItemsModal({
  storeId, section, onClose,
}: {
  storeId: string
  section: StoreSection
  onClose: () => void
}) {
  const { data: items, isLoading } = useStoreSectionItems(storeId, section.id)
  const add = useAddStoreSectionItems(storeId, section.id)
  const removeItem = useRemoveStoreSectionItem(storeId, section.id)
  const reorderItems = useReorderStoreSectionItems(storeId, section.id)

  const [search, setSearch] = useState('')
  // Le catalogue est borné à la boutique : impossible d'y piocher le stock d'un concurrent.
  const { data: catalog } = useAdminProducts({ storeId, search: search || undefined, limit: 20, page: 1 })

  const list = items ?? []
  const chosen = new Set(list.map((i) => i.productId))

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= list.length) return
    const ids = list.map((i) => i.id)
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    try {
      await reorderItems.mutateAsync(ids)
    } catch (err) {
      toast.error(errorMessage(err, 'Échec du réordonnancement'))
    }
  }

  return (
    <Modal
      open
      onOpenChange={(open) => { if (!open) onClose() }}
      title={`Produits — ${section.title}`}
      description="L'ordre défini ici est celui affiché dans l'application."
      size="lg"
      footer={<Button variant="outline" onClick={onClose}>Fermer</Button>}
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">
            Dans la section ({list.length})
          </p>
          {isLoading ? (
            <LoadingBlock />
          ) : list.length > 0 ? (
            <ul className="space-y-2">
              {list.map((item, index) => (
                <li
                  key={item.id}
                  className="flex items-center gap-2 rounded-lg border border-gray-100 p-2 dark:border-gray-800"
                >
                  <div className="flex flex-col">
                    <button
                      type="button"
                      aria-label="Monter le produit"
                      disabled={index === 0 || reorderItems.isPending}
                      onClick={() => move(index, -1)}
                      className="rounded p-0.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-800"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Descendre le produit"
                      disabled={index === list.length - 1 || reorderItems.isPending}
                      onClick={() => move(index, 1)}
                      className="rounded p-0.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-800"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {item.imageUrl ? (
                    <img
                      src={resolveAdminMediaUrl(item.imageUrl)}
                      alt={item.name}
                      className="h-10 w-10 flex-shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-gray-100 dark:bg-gray-800">
                      <Package className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-gray-900 dark:text-gray-100">{item.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatPrice(Number(item.price))}</p>
                  </div>
                  <button
                    type="button"
                    aria-label="Retirer de la section"
                    onClick={async () => {
                      try {
                        await removeItem.mutateAsync(item.id)
                      } catch (err) {
                        toast.error(errorMessage(err, 'Échec du retrait'))
                      }
                    }}
                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Package} title="Section vide" description="Ajoutez des produits depuis le catalogue." />
          )}
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">Catalogue de la boutique</p>
          <SearchInput size="sm" value={search} onChange={setSearch} placeholder="Rechercher un produit…" />
          <ul className="mt-2 max-h-80 space-y-2 overflow-y-auto">
            {(catalog?.data ?? []).map((product) => (
              <li
                key={product.id}
                className="flex items-center gap-2 rounded-lg border border-gray-100 p-2 dark:border-gray-800"
              >
                {product.imageUrl ? (
                  <img
                    src={resolveAdminMediaUrl(product.imageUrl)}
                    alt={product.name}
                    className="h-10 w-10 flex-shrink-0 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-gray-100 dark:bg-gray-800">
                    <Package className="h-4 w-4 text-gray-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-gray-900 dark:text-gray-100">{product.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatPrice(product.price)}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={Plus}
                  disabled={chosen.has(product.id) || add.isPending}
                  onClick={async () => {
                    try {
                      await add.mutateAsync([product.id])
                    } catch (err) {
                      toast.error(errorMessage(err, "Échec de l'ajout"))
                    }
                  }}
                >
                  {chosen.has(product.id) ? 'Ajouté' : 'Ajouter'}
                </Button>
              </li>
            ))}
            {(catalog?.data ?? []).length === 0 && (
              <li className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">Aucun produit trouvé</li>
            )}
          </ul>
        </div>
      </div>
    </Modal>
  )
}
