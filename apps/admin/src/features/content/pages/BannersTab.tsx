import { useState, useRef } from 'react'
import { Image, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  EmptyState,
  FormField,
  Input,
  LoadingBlock,
  Modal,
  Select,
  Switch,
} from '@/components/ui'
import { toast } from '@/lib/toast'
import { useAdminBanners, useCreateBanner, useUpdateBanner, useDeleteBanner } from '../hooks/useAdminBanners'
import { adminContentService } from '../services/adminContentService'
import type { CreateBannerInput, Banner } from '@/infrastructure/data-source/AdminContentDataSource'
import { resolveAdminMediaUrl } from '@/lib/resolveAdminMediaUrl'
import { formatDate } from '@/lib/format'

const SCREEN_LABELS: Record<string, string> = { home: 'Accueil', store: 'Boutique', feed: 'Feed', account: 'Compte' }

const SCREEN_OPTIONS = [
  { value: 'home', label: 'Accueil' },
  { value: 'store', label: 'Boutique' },
  { value: 'feed', label: 'Feed' },
  { value: 'account', label: 'Compte' },
]

function isActiveBanner(b: Banner) {
  if (!b.isActive) return false
  const now = new Date()
  if (b.startDate && new Date(b.startDate) > now) return false
  if (b.endDate && new Date(b.endDate) < now) return false
  return true
}

// Date ISO → "YYYY-MM-DD" en heure LOCALE (split('T')[0] donnerait la date UTC, décalée d'un jour selon le fuseau)
function toLocalDateInput(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

interface BannerFormProps {
  initial?: Banner | null
  onClose: () => void
}

function BannerFormModal({ initial, onClose }: BannerFormProps) {
  const createBanner = useCreateBanner()
  const updateBanner = useUpdateBanner(initial?.id ?? '')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? '')
  const [linkUrl, setLinkUrl] = useState(initial?.linkUrl ?? '')
  const [ctaText, setCtaText] = useState(initial?.ctaText ?? '')
  const [discountLabel, setDiscountLabel] = useState(initial?.discountLabel ?? '')
  const [screen, setScreen] = useState<'home' | 'store' | 'feed' | 'account'>(initial?.screen ?? 'home')
  const [position, setPosition] = useState(String(initial?.position ?? ''))
  const [backgroundColor, setBackgroundColor] = useState(initial?.backgroundColor ?? '')
  const [startDate, setStartDate] = useState(toLocalDateInput(initial?.startDate))
  const [endDate, setEndDate] = useState(toLocalDateInput(initial?.endDate))
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isPending = createBanner.isPending || updateBanner.isPending

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      const { url } = await adminContentService.uploadBannerImage(file)
      setImageUrl(url)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur lors de l'upload"
      setError(message)
      toast.error(message)
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!title.trim()) { setError('Le titre est requis'); return }
    if (!imageUrl.trim()) { setError("L'URL de l'image est requise"); return }
    if (startDate && endDate && endDate < startDate) { setError('La date de fin doit être postérieure à la date de début'); return }

    // Début à 00:00:00 locale, fin à 23:59:59 locale → le dernier jour est inclus
    const startIso = startDate ? new Date(`${startDate}T00:00:00`).toISOString() : null
    const endIso = endDate ? new Date(`${endDate}T23:59:59.999`).toISOString() : null

    try {
      if (initial) {
        // Update : envoyer null (pas undefined) pour vider explicitement un champ —
        // undefined disparaît du JSON et le backend conserverait l'ancienne valeur
        await updateBanner.mutateAsync({
          title: title.trim(),
          subtitle: subtitle.trim() || null,
          description: description.trim() || null,
          imageUrl: imageUrl.trim(),
          linkUrl: linkUrl.trim() || null,
          ctaText: ctaText.trim() || null,
          discountLabel: discountLabel.trim() || null,
          screen,
          position: Number(position) || 0,
          backgroundColor: backgroundColor.trim() || null,
          startDate: startIso,
          endDate: endIso,
          isActive,
        })
      } else {
        const data: CreateBannerInput = {
          title: title.trim(),
          subtitle: subtitle.trim() || undefined,
          description: description.trim() || undefined,
          imageUrl: imageUrl.trim(),
          linkUrl: linkUrl.trim() || undefined,
          ctaText: ctaText.trim() || undefined,
          discountLabel: discountLabel.trim() || undefined,
          screen,
          position: Number(position) || 0,
          backgroundColor: backgroundColor.trim() || undefined,
          startDate: startIso ?? undefined,
          endDate: endIso ?? undefined,
          isActive,
        }
        await createBanner.mutateAsync(data)
      }
      toast.success('Enregistré')
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde'
      setError(message)
      toast.error(message)
    }
  }

  return (
    <Modal
      open
      onOpenChange={(open) => { if (!open) onClose() }}
      title={initial ? 'Modifier la bannière' : 'Nouvelle bannière'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" form="banner-form" loading={isPending}>
            {initial ? 'Enregistrer' : 'Créer'}
          </Button>
        </>
      }
    >
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </p>
      )}
      <form id="banner-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <FormField label="Titre" htmlFor="banner-title" required>
              <Input id="banner-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
            </FormField>
          </div>
          <FormField label="Sous-titre" htmlFor="banner-subtitle">
            <Input id="banner-subtitle" type="text" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
          </FormField>
          <FormField label="Label réduction" htmlFor="banner-discount">
            <Input id="banner-discount" type="text" value={discountLabel} onChange={(e) => setDiscountLabel(e.target.value)} />
          </FormField>
          <div className="col-span-2">
            <FormField label="Description" htmlFor="banner-description">
              <Input id="banner-description" type="text" value={description} onChange={(e) => setDescription(e.target.value)} />
            </FormField>
          </div>
          <div className="col-span-2">
            <FormField label="Image" htmlFor="banner-image" required>
              <div className="flex gap-2">
                <Input
                  id="banner-image"
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="URL de l'image ou utilisez Parcourir"
                  className="flex-1"
                />
                <Button type="button" variant="outline" loading={uploading} onClick={() => fileInputRef.current?.click()}>
                  Parcourir
                </Button>
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden" onChange={handleFileChange} />
              </div>
            </FormField>
            {imageUrl && (
              <img src={resolveAdminMediaUrl(imageUrl)} alt="Aperçu"
                className="mt-2 h-20 w-full rounded-lg bg-gray-100 object-cover dark:bg-gray-800"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                onLoad={(e) => { (e.target as HTMLImageElement).style.display = '' }} />
            )}
          </div>
          <div className="col-span-2">
            <FormField label="Lien (URL)" htmlFor="banner-link">
              <Input id="banner-link" type="text" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
            </FormField>
          </div>
          <FormField label="Texte CTA" htmlFor="banner-cta">
            <Input id="banner-cta" type="text" value={ctaText} onChange={(e) => setCtaText(e.target.value)} />
          </FormField>
          <FormField label="Couleur de fond" htmlFor="banner-bg" hint="Valeur hex, ex. #FFF3E0">
            <div className="flex items-center gap-2">
              <Input
                id="banner-bg"
                type="text"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                placeholder="#FFF3E0"
                className="flex-1 font-mono"
              />
              {backgroundColor.trim() && (
                <div
                  className="h-9 w-9 flex-shrink-0 rounded-lg border border-gray-200 dark:border-gray-700"
                  style={{ backgroundColor: backgroundColor.trim() }}
                />
              )}
            </div>
          </FormField>
          <FormField label="Écran" htmlFor="banner-screen">
            <Select
              id="banner-screen"
              value={screen}
              onChange={(value) => setScreen(value as 'home' | 'store' | 'feed' | 'account')}
              options={SCREEN_OPTIONS}
            />
          </FormField>
          <FormField label="Position" htmlFor="banner-position">
            <Input id="banner-position" type="number" value={position} onChange={(e) => setPosition(e.target.value)} />
          </FormField>
          <FormField label="Début" htmlFor="banner-start">
            <Input id="banner-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </FormField>
          <FormField label="Fin" htmlFor="banner-end">
            <Input id="banner-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </FormField>
        </div>
        <Switch checked={isActive} onCheckedChange={setIsActive} label="Active" />
      </form>
    </Modal>
  )
}

export function BannersTab() {
  const { data: banners, isLoading, isError } = useAdminBanners()
  const deleteBanner = useDeleteBanner()
  const [showForm, setShowForm] = useState(false)
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Banner | null>(null)

  if (isLoading) return <LoadingBlock label="Chargement..." />
  if (isError) return <p className="text-sm text-red-600 dark:text-red-400">Erreur de chargement</p>

  const orderedBanners = [...(banners ?? [])].sort((a, b) => a.position - b.position)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Bannières</CardTitle>
            <CardDescription>
              {orderedBanners.length} bannière{orderedBanners.length > 1 ? 's' : ''} — affichées dans l'application mobile.
            </CardDescription>
          </div>
          <Button leftIcon={Plus} onClick={() => { setEditingBanner(null); setShowForm(true) }}>
            Nouvelle bannière
          </Button>
        </CardHeader>
        <CardContent>
          {orderedBanners.length === 0 ? (
            <EmptyState
              icon={Image}
              title="Aucune bannière"
              description="Créez une première bannière pour l'afficher dans l'application mobile."
              action={
                <Button leftIcon={Plus} onClick={() => { setEditingBanner(null); setShowForm(true) }}>
                  Nouvelle bannière
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {orderedBanners.map((banner) => {
                const active = isActiveBanner(banner)
                return (
                  <div
                    key={banner.id}
                    className={`rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 ${active ? '' : 'opacity-70'}`}
                  >
                    <div className="flex gap-4">
                      <div className="h-24 w-40 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                        <img
                          src={resolveAdminMediaUrl(banner.imageUrl)}
                          alt={banner.title}
                          className="h-full w-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <h3 className="font-medium text-gray-900 dark:text-gray-100">{banner.title}</h3>
                            {banner.subtitle && (
                              <p className="text-sm font-medium text-primary-600 dark:text-primary-400">{banner.subtitle}</p>
                            )}
                            {banner.description && (
                              <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">{banner.description}</p>
                            )}
                          </div>
                          <Badge variant={active ? 'success' : 'neutral'} dot>
                            {active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <Badge variant="neutral" size="sm">{SCREEN_LABELS[banner.screen] ?? banner.screen}</Badge>
                          <span>Position {banner.position}</span>
                          {banner.discountLabel && (
                            <Badge variant="danger" size="sm">{banner.discountLabel}</Badge>
                          )}
                          {banner.startDate && <span>Du {formatDate(banner.startDate)}</span>}
                          {banner.endDate && <span>au {formatDate(banner.endDate)}</span>}
                        </div>
                        <div className="mt-2 flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={Pencil}
                            onClick={() => { setEditingBanner(banner); setShowForm(true) }}
                          >
                            Modifier
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={Trash2}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            onClick={() => setConfirmDelete(banner)}
                          >
                            Supprimer
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {showForm && (
        <BannerFormModal
          initial={editingBanner}
          onClose={() => { setShowForm(false); setEditingBanner(null) }}
        />
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => { if (!open) setConfirmDelete(null) }}
        title="Confirmer la suppression"
        description={
          confirmDelete
            ? `La bannière « ${confirmDelete.title} » sera définitivement supprimée. Cette action est irréversible.`
            : 'Cette action est irréversible.'
        }
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="danger"
        onConfirm={async () => {
          if (!confirmDelete) return
          try {
            await deleteBanner.mutateAsync(confirmDelete.id)
            toast.success('Bannière supprimée')
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression')
          }
        }}
      />
    </div>
  )
}
