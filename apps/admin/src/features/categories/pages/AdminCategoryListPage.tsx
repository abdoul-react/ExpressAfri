import { useState } from 'react'
import { Folder, FolderTree, ImageIcon, Pencil, Plus, RefreshCw, Tags, Trash2, XCircle } from 'lucide-react'
import { useAdminCategories } from '../hooks/useAdminCategories'
import { useCreateCategory } from '../hooks/useCreateCategory'
import { useUpdateCategory } from '../hooks/useUpdateCategory'
import { useDeleteCategory } from '../hooks/useDeleteCategory'
import { resolveAdminMediaUrl } from '@/lib/resolveAdminMediaUrl'
import { PermissionGuard } from '@/components/guards/PermissionGuard'
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  EmptyState,
  FormField,
  Input,
  LoadingBlock,
  Modal,
  PageHeader,
  Select,
  StatCard,
} from '@/components/ui'
import { toast } from '@/lib/toast'

type CategoryModalState = {
  mode: 'create' | 'edit'
  id?: string
  name: string
  parentId: string
  imageUrl: string
}

type ConfirmState = {
  title: string
  description?: string
  variant?: 'danger' | 'default'
  onConfirm: () => void | Promise<void>
}

export function AdminCategoryListPage() {
  const { data: categories, isLoading, isError, error, refetch } = useAdminCategories()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()

  const [modal, setModal] = useState<CategoryModalState | null>(null)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)

  const parentCategories = categories?.filter((c: any) => !c.parentId) ?? []
  const childCategories = categories?.filter((c: any) => c.parentId) ?? []

  const isSaving = createCategory.isPending || updateCategory.isPending

  function startCreate(parentId?: string) {
    setModal({ mode: 'create', name: '', parentId: parentId ?? '', imageUrl: '' })
  }

  function startEdit(cat: any) {
    setModal({
      mode: 'edit',
      id: cat.id,
      name: cat.name,
      parentId: cat.parentId ?? '',
      imageUrl: cat.imageUrl ?? '',
    })
  }

  function handleSave() {
    if (!modal || !modal.name.trim()) return
    const data = {
      name: modal.name.trim(),
      parentId: modal.parentId || undefined,
      imageUrl: modal.imageUrl || undefined,
    }
    if (modal.mode === 'create') {
      createCategory.mutate(data, {
        onSuccess: () => {
          toast.success(`Catégorie "${data.name}" créée`)
          setModal(null)
        },
        onError: (err: Error) => toast.error(err.message || 'Erreur lors de la création'),
      })
    } else {
      updateCategory.mutate(
        { id: modal.id!, data },
        {
          onSuccess: () => {
            toast.success(`Catégorie "${data.name}" mise à jour`)
            setModal(null)
          },
          onError: (err: Error) => toast.error(err.message || 'Erreur lors de la mise à jour'),
        },
      )
    }
  }

  function handleDelete(id: string, name: string) {
    const subCount = childCategories.filter((c: any) => c.parentId === id).length
    setConfirm({
      title: `Supprimer "${name}" ?`,
      description: subCount > 0
        ? `${subCount} sous-catégorie(s) seront également supprimées.`
        : 'Cette action est irréversible.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteCategory.mutateAsync(id)
          toast.success(`Catégorie "${name}" supprimée`)
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression')
        }
      },
    })
  }

  function handleModalUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const res = ev.target?.result
      if (typeof res === 'string') setModal((prev) => (prev ? { ...prev, imageUrl: res } : prev))
    }
    reader.readAsDataURL(file)
  }

  function renderRowActions(cat: any, isParent: boolean) {
    return (
      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {isParent && (
          <PermissionGuard permission="categories.create">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-500 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/30"
              title="Ajouter une sous-catégorie"
              onClick={() => startCreate(cat.id)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </PermissionGuard>
        )}
        <PermissionGuard permission="categories.update">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-500 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-900/20"
            title="Modifier"
            onClick={() => startEdit(cat)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </PermissionGuard>
        <PermissionGuard permission="categories.delete">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
            title="Supprimer"
            disabled={deleteCategory.isPending}
            onClick={() => handleDelete(cat.id, cat.name)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </PermissionGuard>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Catégories"
        description={categories ? `${categories.length} catégories` : 'Chargement…'}
        actions={
          <PermissionGuard permission="categories.create">
            <Button leftIcon={Plus} onClick={() => startCreate()}>
              Nouvelle catégorie
            </Button>
          </PermissionGuard>
        }
      />

      {isLoading && <LoadingBlock label="Chargement des catégories…" />}

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

      {categories && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Catégories principales ({parentCategories.length})</CardTitle>
            </CardHeader>
            <div className="space-y-2">
              {parentCategories.map((cat: any) => (
                <div key={cat.id}>
                  <div className="group flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <div className="flex min-w-0 items-center gap-2">
                      {cat.imageUrl && (
                        <img
                          src={resolveAdminMediaUrl(cat.imageUrl)}
                          alt=""
                          className="h-6 w-6 flex-shrink-0 rounded object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      )}
                      <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{cat.name}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">({cat.productCount ?? 0} prod.)</span>
                    </div>
                    {renderRowActions(cat, true)}
                  </div>

                  {childCategories.filter((c: any) => c.parentId === cat.id).length > 0 && (
                    <div className="ml-6 mt-1 space-y-1 border-l-2 border-gray-100 pl-3 dark:border-gray-800">
                      {childCategories
                        .filter((c: any) => c.parentId === cat.id)
                        .map((sub: any) => (
                          <div
                            key={sub.id}
                            className="group flex items-center justify-between rounded-lg px-3 py-1.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-700 dark:text-gray-300">{sub.name}</span>
                              <span className="text-xs text-gray-400 dark:text-gray-500">({sub.productCount} prod.)</span>
                            </div>
                            {renderRowActions(sub, false)}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))}

              {parentCategories.length === 0 && (
                <EmptyState
                  icon={Tags}
                  title="Aucune catégorie"
                  description="Créez votre première catégorie pour organiser vos produits."
                  action={
                    <PermissionGuard permission="categories.create">
                      <Button leftIcon={Plus} onClick={() => startCreate()}>
                        Nouvelle catégorie
                      </Button>
                    </PermissionGuard>
                  }
                />
              )}
            </div>
          </Card>

          <div className="space-y-4">
            <StatCard
              label="Catégories principales"
              value={parentCategories.length}
              icon={Folder}
              tone="primary"
            />
            <StatCard
              label="Sous-catégories"
              value={childCategories.length}
              icon={FolderTree}
              tone="info"
            />
            <StatCard
              label="Total"
              value={categories.length}
              sub="catégories au total"
              icon={Tags}
              tone="success"
            />
          </div>
        </div>
      )}

      {modal && (
        <Modal
          open={!!modal}
          onOpenChange={(open) => !open && setModal(null)}
          title={
            modal.mode === 'edit'
              ? 'Modifier la catégorie'
              : modal.parentId
                ? `Sous-catégorie de "${parentCategories.find((c: any) => c.id === modal.parentId)?.name ?? ''}"`
                : 'Nouvelle catégorie'
          }
          size="sm"
          footer={
            <>
              <Button variant="outline" onClick={() => setModal(null)}>
                Annuler
              </Button>
              <Button loading={isSaving} disabled={!modal.name.trim()} onClick={handleSave}>
                Enregistrer
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <FormField label="Nom" htmlFor="category-name" required>
              <Input
                id="category-name"
                value={modal.name}
                onChange={(e) => setModal({ ...modal, name: e.target.value })}
                placeholder="Nom de la catégorie"
                autoFocus
                className="w-full"
              />
            </FormField>

            <FormField label="Catégorie parente" htmlFor="category-parent">
              <Select
                id="category-parent"
                value={modal.parentId}
                onChange={(v) => setModal({ ...modal, parentId: v })}
                options={parentCategories
                  .filter((c: any) => c.id !== modal.id)
                  .map((c: any) => ({ value: c.id, label: c.name }))}
                placeholder="Catégorie principale"
                className="w-full"
              />
            </FormField>

            <FormField label="Image" htmlFor="category-image" hint="URL ou fichier — facultatif.">
              <div className="flex items-center gap-3">
                <Input
                  id="category-image"
                  value={modal.imageUrl}
                  onChange={(e) => setModal({ ...modal, imageUrl: e.target.value })}
                  placeholder="URL de l'image (optionnel)"
                  className="min-w-0 flex-1"
                />
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2.5 text-xs text-gray-500 transition-colors hover:border-primary-400 hover:text-primary-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-primary-500 dark:hover:text-primary-400">
                  <ImageIcon className="h-4 w-4" />
                  Uploader
                  <input type="file" accept="image/*" className="hidden" onChange={handleModalUpload} />
                </label>
                {modal.imageUrl && (
                  <img
                    src={resolveAdminMediaUrl(modal.imageUrl)}
                    alt=""
                    className="h-9 w-9 flex-shrink-0 rounded-lg border border-gray-200 object-cover dark:border-gray-700"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                )}
              </div>
            </FormField>
          </div>
        </Modal>
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
