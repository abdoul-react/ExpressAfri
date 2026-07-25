import { useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, ImagePlus, Trash2 } from 'lucide-react'
import {
  useStoreMedia, useUploadStoreMedia, useReorderStoreMedia, useDeleteStoreMedia,
} from '../hooks/useAdminStores'
import type { StoreMedia, StoreMediaType } from '@/infrastructure/data-source/AdminStoreDataSource'
import {
  Card, CardHeader, CardTitle, CardContent, Button, ConfirmDialog, LoadingBlock, EmptyState,
} from '@/components/ui'
import { resolveAdminMediaUrl } from '@/lib/resolveAdminMediaUrl'
import { toast } from '@/lib/toast'

const MAX_BYTES = 5 * 1024 * 1024

/** Emplacement d'une image unique (logo ou cover) : cliquer remplace l'existante. */
function SingleSlot({
  label, hint, media, aspect, rounded, onPick, uploading,
}: {
  label: string
  hint: string
  media?: StoreMedia
  aspect: string
  rounded?: boolean
  onPick: (file: File) => void
  uploading: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div>
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{hint}</p>
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className={`mt-2 flex w-full items-center justify-center overflow-hidden border-2 border-dashed border-gray-200 bg-gray-50 transition hover:border-primary-400 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800/50 ${aspect} ${rounded ? 'rounded-full' : 'rounded-lg'}`}
      >
        {media ? (
          <img src={resolveAdminMediaUrl(media.url)} alt={media.alt ?? label} className="h-full w-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1 text-xs text-gray-400">
            <ImagePlus className="h-5 w-5" />
            {uploading ? 'Envoi…' : 'Choisir une image'}
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) onPick(file)
        }}
      />
    </div>
  )
}

/**
 * Identité visuelle de la boutique : logo, couverture et galerie.
 * Ces médias alimentent les cartes boutique de l'application mobile.
 */
export function StoreIdentitySection({ storeId }: { storeId: string }) {
  const { data: media, isLoading } = useStoreMedia(storeId)
  const upload = useUploadStoreMedia(storeId)
  const reorder = useReorderStoreMedia(storeId)
  const remove = useDeleteStoreMedia(storeId)

  const galleryInputRef = useRef<HTMLInputElement>(null)
  const [pendingType, setPendingType] = useState<StoreMediaType | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<StoreMedia | null>(null)

  const logo = media?.find((m) => m.type === 'logo')
  const cover = media?.find((m) => m.type === 'cover')
  const gallery = (media ?? []).filter((m) => m.type === 'gallery')

  async function handleUpload(file: File, type: StoreMediaType) {
    if (file.size > MAX_BYTES) {
      toast.error('Image trop volumineuse (max 5 Mo)')
      return
    }
    setPendingType(type)
    try {
      await upload.mutateAsync({ file, type })
      toast.success('Image enregistrée')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de l'envoi")
    } finally {
      setPendingType(null)
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= gallery.length) return
    const ids = gallery.map((m) => m.id)
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    try {
      await reorder.mutateAsync(ids)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec du réordonnancement')
    }
  }

  if (isLoading) return <LoadingBlock />

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Logo et couverture</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-[160px_1fr]">
            <SingleSlot
              label="Logo"
              hint="Carré, 512×512 recommandé"
              media={logo}
              aspect="aspect-square"
              rounded
              uploading={upload.isPending && pendingType === 'logo'}
              onPick={(file) => handleUpload(file, 'logo')}
            />
            <SingleSlot
              label="Image de couverture"
              hint="Format large, 1200×400 recommandé"
              media={cover}
              aspect="aspect-[3/1]"
              uploading={upload.isPending && pendingType === 'cover'}
              onPick={(file) => handleUpload(file, 'cover')}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Galerie
            {gallery.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">({gallery.length})</span>
            )}
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            leftIcon={ImagePlus}
            disabled={upload.isPending && pendingType === 'gallery'}
            onClick={() => galleryInputRef.current?.click()}
          >
            Ajouter une photo
          </Button>
        </CardHeader>
        <CardContent>
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) handleUpload(file, 'gallery')
            }}
          />
          {gallery.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {gallery.map((photo, index) => (
                <div key={photo.id} className="group relative overflow-hidden rounded-lg border border-gray-100 dark:border-gray-800">
                  <img src={resolveAdminMediaUrl(photo.url)} alt={photo.alt ?? ''} className="aspect-square w-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/60 p-1 opacity-0 transition group-hover:opacity-100">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        aria-label="Déplacer à gauche"
                        disabled={index === 0 || reorder.isPending}
                        onClick={() => move(index, -1)}
                        className="rounded p-1 text-white hover:bg-white/20 disabled:opacity-30"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Déplacer à droite"
                        disabled={index === gallery.length - 1 || reorder.isPending}
                        onClick={() => move(index, 1)}
                        className="rounded p-1 text-white hover:bg-white/20 disabled:opacity-30"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      type="button"
                      aria-label="Supprimer la photo"
                      onClick={() => setConfirmDelete(photo)}
                      className="rounded p-1 text-white hover:bg-red-500/80"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={ImagePlus}
              title="Aucune photo"
              description="Ajoutez des photos pour illustrer la boutique dans l'application."
            />
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(open) => { if (!open) setConfirmDelete(null) }}
        title="Supprimer cette photo ?"
        description="Elle ne sera plus visible dans l'application."
        variant="danger"
        confirmLabel="Supprimer"
        onConfirm={async () => {
          if (!confirmDelete) return
          try {
            await remove.mutateAsync(confirmDelete.id)
            toast.success('Photo supprimée')
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Échec de la suppression')
          } finally {
            setConfirmDelete(null)
          }
        }}
      />
    </div>
  )
}
