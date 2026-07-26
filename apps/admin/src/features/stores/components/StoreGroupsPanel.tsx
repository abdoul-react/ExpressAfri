import { useState } from 'react'
import { ArrowDown, ArrowUp, LayoutGrid, Plus, Store, Trash2, X } from 'lucide-react'
import {
  useStoreGroups, useCreateStoreGroup, useUpdateStoreGroup,
  useDeleteStoreGroup, useReorderStoreGroups,
  useStoreGroupItems, useAddStoreGroupItems,
  useRemoveStoreGroupItem, useReorderStoreGroupItems,
  useAdminStores,
} from '../hooks/useAdminStores'
import type { StoreGroup } from '@/infrastructure/data-source/AdminStoreDataSource'
import { PermissionGuard } from '@/components/guards/PermissionGuard'
import {
  Card, CardHeader, CardTitle, CardContent, Button, ConfirmDialog, LoadingBlock,
  EmptyState, Modal, Input, Switch, SearchInput, FormField,
} from '@/components/ui'
import { resolveAdminMediaUrl } from '@/lib/resolveAdminMediaUrl'
import { toast } from '@/lib/toast'

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

/**
 * Sections de la vitrine : regroupent des BOUTIQUES par thème sur la page liste
 * de l'application. À ne pas confondre avec `StoreSectionsSection`, qui regroupe
 * les PRODUITS à l'intérieur d'une boutique. Ces sections sont transverses et
 * relèvent de l'admin central — un gérant de boutique n'y a pas accès.
 */
export function StoreGroupsPanel() {
  const { data: groups, isLoading } = useStoreGroups()
  const create = useCreateStoreGroup()
  const update = useUpdateStoreGroup()
  const remove = useDeleteStoreGroup()
  const reorder = useReorderStoreGroups()

  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<StoreGroup | null>(null)
  const [openGroup, setOpenGroup] = useState<StoreGroup | null>(null)

  const list = groups ?? []

  async function handleCreate() {
    if (!title.trim()) {
      toast.error('Le titre est obligatoire')
      return
    }
    try {
      await create.mutateAsync({ title: title.trim(), subtitle: subtitle.trim() || undefined })
      toast.success('Section créée')
      setCreating(false)
      setTitle('')
      setSubtitle('')
    } catch (err) {
      toast.error(errorMessage(err, 'Échec de la création'))
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= list.length) return
    const ids = list.map((g) => g.id)
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    try {
      await reorder.mutateAsync(ids)
    } catch (err) {
      toast.error(errorMessage(err, 'Échec du réordonnancement'))
    }
  }

  async function setActiveOf(group: StoreGroup, isActive: boolean) {
    try {
      await update.mutateAsync({ groupId: group.id, payload: { isActive } })
    } catch (err) {
      toast.error(errorMessage(err, 'Échec de la modification'))
    }
  }

  if (isLoading) return <LoadingBlock />

  return (
    <div className="mb-6">
      <Card>
        <CardHeader>
          <CardTitle>
            Sections de la vitrine
            {list.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">({list.length})</span>
            )}
          </CardTitle>
          <PermissionGuard permission="stores.manage">
            <Button size="sm" leftIcon={Plus} onClick={() => setCreating(true)}>
              Nouvelle section
            </Button>
          </PermissionGuard>
        </CardHeader>
        <CardContent>
          {list.length > 0 ? (
            <div className="space-y-3">
              {list.map((group, index) => (
                <div
                  key={group.id}
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
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{group.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {group.subtitle ? `${group.subtitle} · ` : ''}
                      {group.storeCount} boutique{group.storeCount > 1 ? 's' : ''}
                    </p>
                  </div>

                  <PermissionGuard permission="stores.manage">
                    <Switch
                      checked={group.isActive}
                      onCheckedChange={(v) => setActiveOf(group, v)}
                      label={group.isActive ? 'Visible' : 'Masquée'}
                    />
                  </PermissionGuard>

                  <Button size="sm" variant="outline" leftIcon={Store} onClick={() => setOpenGroup(group)}>
                    Boutiques
                  </Button>

                  <PermissionGuard permission="stores.manage">
                    <button
                      type="button"
                      aria-label="Supprimer la section"
                      onClick={() => setConfirmDelete(group)}
                      className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </PermissionGuard>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={LayoutGrid}
              title="Aucune section de vitrine"
              description="Créez des sections thématiques (« Vêtements homme », « Électronique »…) puis assignez-y les boutiques. Elles structurent la page Boutiques de l'application."
            />
          )}
        </CardContent>
      </Card>

      <Modal
        open={creating}
        onOpenChange={setCreating}
        title="Nouvelle section de vitrine"
        description="Le titre est affiché tel quel en tête de section dans l'application."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreating(false)}>Annuler</Button>
            <Button loading={create.isPending} onClick={handleCreate}>Créer</Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Titre" required>
            <Input size="sm" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Vêtements homme" />
          </FormField>
          <FormField label="Sous-titre">
            <Input size="sm" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Prêt-à-porter masculin" />
          </FormField>
        </div>
      </Modal>

      {openGroup && (
        <GroupStoresModal group={openGroup} onClose={() => setOpenGroup(null)} />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(open) => { if (!open) setConfirmDelete(null) }}
        title="Supprimer la section ?"
        description="Les boutiques ne sont pas supprimées, seule la section disparaît de la vitrine."
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

/** Composition d'une section : boutiques retenues à gauche, annuaire à droite. */
function GroupStoresModal({ group, onClose }: { group: StoreGroup; onClose: () => void }) {
  const { data: items, isLoading } = useStoreGroupItems(group.id)
  const add = useAddStoreGroupItems(group.id)
  const removeItem = useRemoveStoreGroupItem(group.id)
  const reorderItems = useReorderStoreGroupItems(group.id)

  const [search, setSearch] = useState('')
  // Seules les boutiques approuvées ont vocation à figurer en vitrine : proposer
  // une boutique en attente reviendrait à préparer une section qui reste vide.
  const { data: catalog } = useAdminStores({ search: search || undefined, status: 'approved', limit: 20, page: 1 })

  const list = items ?? []
  const chosen = new Set(list.map((i) => i.storeId))

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
      title={`Boutiques — ${group.title}`}
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
                      aria-label="Monter la boutique"
                      disabled={index === 0 || reorderItems.isPending}
                      onClick={() => move(index, -1)}
                      className="rounded p-0.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-800"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Descendre la boutique"
                      disabled={index === list.length - 1 || reorderItems.isPending}
                      onClick={() => move(index, 1)}
                      className="rounded p-0.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-800"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {item.logoUrl ? (
                    <img
                      src={resolveAdminMediaUrl(item.logoUrl)}
                      alt=""
                      className="h-10 w-10 flex-shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                      <Store className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-gray-900 dark:text-gray-100">{item.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {[item.city, item.country].filter(Boolean).join(', ') || '—'}
                    </p>
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
            <EmptyState icon={Store} title="Section vide" description="Ajoutez des boutiques depuis l'annuaire." />
          )}
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">Boutiques approuvées</p>
          <SearchInput size="sm" value={search} onChange={setSearch} placeholder="Rechercher une boutique…" />
          <ul className="mt-2 max-h-80 space-y-2 overflow-y-auto">
            {(catalog?.data ?? []).map((store) => (
              <li
                key={store.id}
                className="flex items-center gap-2 rounded-lg border border-gray-100 p-2 dark:border-gray-800"
              >
                {store.logoUrl ? (
                  <img
                    src={resolveAdminMediaUrl(store.logoUrl)}
                    alt=""
                    className="h-10 w-10 flex-shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                    <Store className="h-4 w-4 text-gray-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-gray-900 dark:text-gray-100">{store.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {[store.city, store.country].filter(Boolean).join(', ') || '—'}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={Plus}
                  disabled={chosen.has(store.id) || add.isPending}
                  onClick={async () => {
                    try {
                      await add.mutateAsync([store.id])
                    } catch (err) {
                      toast.error(errorMessage(err, "Échec de l'ajout"))
                    }
                  }}
                >
                  {chosen.has(store.id) ? 'Ajoutée' : 'Ajouter'}
                </Button>
              </li>
            ))}
            {(catalog?.data ?? []).length === 0 && (
              <li className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">Aucune boutique trouvée</li>
            )}
          </ul>
        </div>
      </div>
    </Modal>
  )
}
