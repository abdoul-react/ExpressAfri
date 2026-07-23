import { useRef, useState } from 'react'
import type React from 'react'
import { Eye, EyeOff, Film, ImagePlus, Newspaper, Pencil, Plus, ThumbsUp, Trash2 } from 'lucide-react'
import {
  Button, Card, CardContent, CardDescription, CardHeader, CardTitle,
  ConfirmDialog, EmptyState, FormField, Input, LoadingBlock, Modal, Switch,
} from '@/components/ui'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/cn'
import {
  useAdminFeedPosts, useCreateFeedPost, useUpdateFeedPost, useDeleteFeedPost, useUploadFeedMedia,
} from '../hooks/useAdminFeedPosts'
import { resolveAdminMediaUrl } from '@/lib/resolveAdminMediaUrl'
import type { FeedPost, CreateFeedPostInput } from '@/infrastructure/data-source/AdminContentDataSource'

/**
 * Onglet « Publications » : gère les cartes du fil Inspiration de l'app mobile
 * (bouton central). Images ou vidéos, auteur, lien, ordre et activation.
 */
export function FeedPostsTab() {
  const { data: posts = [], isLoading } = useAdminFeedPosts()
  const deleteMutation = useDeleteFeedPost()
  const updateMutation = useUpdateFeedPost()
  const [editing, setEditing] = useState<FeedPost | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  function toggleVisibility(post: FeedPost) {
    updateMutation.mutate(
      { id: post.id, data: { isActive: !post.isActive } },
      {
        onSuccess: () => toast.success(post.isActive ? 'Publication masquée' : 'Publication visible'),
        onError: () => toast.error('Erreur lors de la mise à jour'),
      },
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Publications Inspiration</CardTitle>
            <CardDescription>
              Cartes affichées dans l'onglet central de l'app (photos et vidéos, façon Pinterest)
            </CardDescription>
          </div>
          <Button size="sm" leftIcon={Plus} onClick={() => setShowCreate(true)}>
            Nouvelle publication
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingBlock label="Chargement des publications…" />
          ) : posts.length === 0 ? (
            <EmptyState
              icon={Newspaper}
              title="Aucune publication"
              description="Créez la première carte du fil Inspiration — le fil mobile est vide tant qu'il n'y a rien ici."
              action={
                <Button size="sm" leftIcon={Plus} onClick={() => setShowCreate(true)}>
                  Nouvelle publication
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className={cn(
                    'overflow-hidden rounded-xl border bg-white transition-shadow hover:shadow-sm dark:bg-gray-900',
                    post.isActive
                      ? 'border-gray-200 dark:border-gray-800'
                      : 'border-dashed border-gray-300 opacity-60 dark:border-gray-700',
                  )}
                >
                  <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-800">
                    <img
                      src={resolveAdminMediaUrl(post.mediaType === 'video' ? (post.thumbnailUrl || post.mediaUrl) : post.mediaUrl)}
                      alt={post.title}
                      className="h-full w-full object-cover"
                    />
                    {post.mediaType === 'video' && (
                      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-gray-950/60 px-2 py-0.5 text-[11px] font-semibold text-white">
                        <Film className="h-3 w-3" />
                        {post.duration || 'Vidéo'}
                      </span>
                    )}
                    {!post.isActive && (
                      <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-gray-950/70 px-2 py-0.5 text-[11px] font-semibold text-white">
                        <EyeOff className="h-3 w-3" />
                        Masquée
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{post.title}</p>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-gray-500 dark:text-gray-400">
                      {post.authorName}
                      <span aria-hidden>·</span>
                      <ThumbsUp className="h-3 w-3" />
                      {post.likes ?? 0}
                    </p>
                    <div className="mt-2 flex gap-1.5">
                      <Button variant="outline" size="sm" className="flex-1" leftIcon={Pencil} onClick={() => setEditing(post)}>
                        Modifier
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        leftIcon={post.isActive ? EyeOff : Eye}
                        onClick={() => toggleVisibility(post)}
                      >
                        {post.isActive ? 'Masquer' : 'Afficher'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Supprimer"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
                        onClick={() => setConfirmDelete(post.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {(showCreate || editing) && (
        <FeedPostModal
          post={editing}
          onClose={() => { setShowCreate(false); setEditing(null) }}
        />
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(o) => { if (!o) setConfirmDelete(null) }}
        title="Supprimer la publication"
        description="Cette action est irréversible. La carte disparaîtra du fil Inspiration."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="danger"
        onConfirm={async () => {
          if (!confirmDelete) return
          try {
            await deleteMutation.mutateAsync(confirmDelete)
            toast.success('Publication supprimée')
          } catch {
            toast.error('Erreur lors de la suppression')
          }
        }}
      />
    </div>
  )
}

/* ── Modale création/édition ────────────────────────────────────────────────── */

function FeedPostModal({ post, onClose }: { post: FeedPost | null; onClose: () => void }) {
  const createMutation = useCreateFeedPost()
  const updateMutation = useUpdateFeedPost()
  const uploadMutation = useUploadFeedMedia()
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState<CreateFeedPostInput>({
    title: post?.title ?? '',
    mediaType: post?.mediaType ?? 'image',
    mediaUrl: post?.mediaUrl ?? '',
    thumbnailUrl: post?.thumbnailUrl ?? null,
    aspectRatio: post?.aspectRatio ?? 1,
    duration: post?.duration ?? null,
    authorName: post?.authorName ?? 'AfriExpress',
    linkUrl: post?.linkUrl ?? null,
    position: post?.position ?? 0,
    isActive: post?.isActive ?? true,
  })

  // Upload du média : détecte type + ratio (et durée pour les vidéos) automatiquement
  async function handleFile(file: File) {
    setError('')
    try {
      const { url, mediaType } = await uploadMutation.mutateAsync(file)
      let aspectRatio = 1
      let duration: string | null = null
      const objectUrl = URL.createObjectURL(file)
      if (mediaType === 'image') {
        aspectRatio = await new Promise<number>((resolve) => {
          const img = new Image()
          img.onload = () => resolve(img.naturalHeight / img.naturalWidth || 1)
          img.onerror = () => resolve(1)
          img.src = objectUrl
        })
      } else {
        const meta = await new Promise<{ ratio: number; seconds: number }>((resolve) => {
          const v = document.createElement('video')
          v.preload = 'metadata'
          v.onloadedmetadata = () => resolve({ ratio: v.videoHeight / v.videoWidth || 1, seconds: v.duration })
          v.onerror = () => resolve({ ratio: 1, seconds: 0 })
          v.src = objectUrl
        })
        aspectRatio = meta.ratio
        if (meta.seconds > 0) {
          const m = Math.floor(meta.seconds / 60)
          const s = Math.round(meta.seconds % 60)
          duration = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
        }
      }
      URL.revokeObjectURL(objectUrl)
      setForm((f) => ({ ...f, mediaUrl: url, mediaType, aspectRatio, duration }))
      toast.success('Média uploadé')
    } catch {
      setError("Échec de l'upload du média")
      toast.error("Échec de l'upload du média")
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { setError('Le titre est requis'); return }
    if (!form.mediaUrl) { setError('Uploadez une image ou une vidéo'); return }
    try {
      if (post) await updateMutation.mutateAsync({ id: post.id, data: form })
      else await createMutation.mutateAsync(form)
      toast.success('Enregistré')
      onClose()
    } catch {
      setError("Erreur lors de l'enregistrement")
      toast.error("Erreur lors de l'enregistrement")
    }
  }

  const pending = createMutation.isPending || updateMutation.isPending

  return (
    <Modal
      open
      onOpenChange={(o) => { if (!o) onClose() }}
      title={post ? 'Modifier la publication' : 'Nouvelle publication'}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button type="submit" form="feed-post-form" loading={pending} disabled={uploadMutation.isPending}>
            {post ? 'Enregistrer' : 'Publier'}
          </Button>
        </>
      }
    >
      <form id="feed-post-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</p>
        )}

        {/* Média */}
        <FormField
          label="Média (image ou vidéo)"
          required
          hint={form.mediaType === 'video' && form.duration ? `Durée détectée : ${form.duration}` : undefined}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
          />
          {form.mediaUrl ? (
            <div className="relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
              {form.mediaType === 'video' ? (
                <video src={resolveAdminMediaUrl(form.mediaUrl)} className="max-h-48 w-full object-cover" controls />
              ) : (
                <img src={resolveAdminMediaUrl(form.mediaUrl)} alt="" className="max-h-48 w-full object-cover" />
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-2 right-2 rounded-lg bg-gray-950/60 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-gray-950/80"
              >
                Remplacer
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploadMutation.isPending}
              className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-8 text-sm text-gray-500 transition-colors hover:border-primary-400 hover:text-primary-600 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:border-primary-500 dark:hover:text-primary-400"
            >
              <ImagePlus className="h-6 w-6" />
              {uploadMutation.isPending ? 'Envoi en cours…' : 'Cliquer pour choisir une image ou une vidéo'}
            </button>
          )}
        </FormField>

        <FormField label="Titre" required htmlFor="post-title">
          <Input
            id="post-title"
            size="sm"
            className="w-full"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Ex : Nouveautés mode de la semaine"
          />
        </FormField>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label="Auteur affiché" htmlFor="post-author">
            <Input
              id="post-author"
              size="sm"
              className="w-full"
              value={form.authorName ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, authorName: e.target.value }))}
              placeholder="AfriExpress"
            />
          </FormField>
          <FormField label="Position" htmlFor="post-position">
            <Input
              id="post-position"
              size="sm"
              className="w-full"
              type="number"
              value={form.position ?? 0}
              onChange={(e) => setForm((f) => ({ ...f, position: Number(e.target.value) }))}
            />
          </FormField>
        </div>

        <FormField label="Lien au clic (optionnel)" htmlFor="post-link">
          <Input
            id="post-link"
            size="sm"
            className="w-full"
            value={form.linkUrl ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, linkUrl: e.target.value || null }))}
            placeholder="/product/… ou /stores"
          />
        </FormField>

        <Switch
          checked={form.isActive ?? true}
          onCheckedChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))}
          label="Visible dans l'application"
        />
      </form>
    </Modal>
  )
}
