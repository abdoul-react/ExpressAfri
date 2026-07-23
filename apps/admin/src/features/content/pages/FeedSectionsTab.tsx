import { useState } from 'react'
import {
  BookOpen, Clock, GripVertical, LayoutGrid, Megaphone, Pencil, Plus, Store, Timer, Trash2,
  type LucideIcon,
} from 'lucide-react'
import {
  Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle,
  Checkbox, ConfirmDialog, EmptyState, FormField, Input, LoadingBlock, Modal, Select, Switch,
} from '@/components/ui'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/cn'
import {
  useAdminFeedSections, useCreateFeedSection, useUpdateFeedSection,
  useDeleteFeedSection, useReorderFeedSections,
} from '../hooks/useAdminFeedSections'
import type { FeedSection } from '@/infrastructure/data-source/AdminContentDataSource'

const TYPE_LABELS: Record<string, string> = {
  products: 'Produits', stores: 'Boutiques', banners: 'Bannières',
  categories: 'Catégories', inspiration: 'Inspiration', custom: 'Personnalisé',
}
const DISPLAY_LABELS: Record<string, string> = {
  'horizontal-scroll': 'Rail compact (petites cartes, défilement)',
  grid: 'Grille 3 colonnes (cartes denses)',
  list: 'Liste verticale (grandes cartes détaillées)',
  card: 'Rail large (grandes cartes, défilement)',
}

const DISPLAY_HINTS: Record<string, string> = {
  'horizontal-scroll': 'Petites cartes image + prix qui défilent — façon « Offres groupées » AliExpress.',
  grid: 'Cartes denses sur 3 colonnes, image dominante + prix.',
  list: 'Grandes cartes complètes (titre, note, livraison) empilées.',
  card: 'Grandes cartes détaillées qui défilent horizontalement.',
}

const GUIDE_ITEMS: { icon: LucideIcon; title: string; body: React.ReactNode }[] = [
  {
    icon: Timer,
    title: 'Compteur Flash Deal (Deal du Jour)',
    body: <>Créez une section de type <strong>Produits</strong> et renseignez la <strong>Date de fin</strong>. L'application mobile affichera automatiquement un compte à rebours jusqu'à cette date. Pour renouveler le deal, modifiez simplement la date.</>,
  },
  {
    icon: Megaphone,
    title: 'Sections publicitaires (Économies de l\'été, etc.)',
    body: <>Créez une section de type <strong>Bannières</strong> ou <strong>Personnalisé</strong>. Ces sections sont gérées via l'onglet <em>Bannières</em>. Pour qu'une bannière apparaisse dans une section, son <strong>écran cible</strong> doit correspondre (home, store, feed).</>,
  },
  {
    icon: Store,
    title: 'Boutiques à découvrir',
    body: <>Créez une section de type <strong>Boutiques</strong>. L'application affichera automatiquement les boutiques actives de la plateforme. Pas besoin de configurer le contenu — il vient de la liste des boutiques.</>,
  },
  {
    icon: LayoutGrid,
    title: 'Ordre d\'affichage',
    body: <>Glissez-déposez les sections pour changer leur ordre. La <strong>Position</strong> détermine l'ordre d'affichage dans l'app (0 = en premier). Utilisez <em>Inactive</em> pour masquer temporairement une section sans la supprimer.</>,
  },
]

function SectionFormModal({ initial, onClose }: { initial?: FeedSection | null; onClose: () => void }) {
  const createSection = useCreateFeedSection()
  const updateSection = useUpdateFeedSection(initial?.id ?? '')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [type, setType] = useState<FeedSection['type']>(initial?.type ?? 'products')
  const [displayStyle, setDisplayStyle] = useState<FeedSection['displayStyle']>(initial?.displayStyle ?? 'horizontal-scroll')
  const [position, setPosition] = useState(String(initial?.position ?? ''))
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [endDate, setEndDate] = useState(
    initial?.data && typeof initial.data === 'object' && 'endDate' in initial.data
      ? (initial.data as any).endDate?.slice(0, 16) ?? ''
      : ''
  )
  const [cartRecommendations, setCartRecommendations] = useState(
    initial?.data && typeof initial.data === 'object'
      ? (initial.data as any).cartRecommendations === true
      : false
  )
  const [error, setError] = useState<string | null>(null)
  const isPending = createSection.isPending || updateSection.isPending
  // Une date déjà passée = compteur invisible dans l'app (il est masqué une fois expiré)
  const endDateInPast = !!endDate && new Date(endDate).getTime() <= Date.now()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null)
    if (!title.trim()) { setError('Le titre est requis'); return }
    if (endDateInPast && type === 'products') {
      setError('La date de fin du compteur est déjà passée — choisissez une date future, sinon le compte à rebours ne s\'affichera pas dans l\'app')
      return
    }
    try {
      const payload: any = { title: title.trim(), type, displayStyle, position: Number(position) || 0, isActive }
      if (type === 'products') {
        // Toujours envoyer data : permet aussi d'EFFACER le compteur quand le champ est vidé
        const data: any = {}
        if (endDate) data.endDate = new Date(endDate).toISOString()
        if (cartRecommendations) data.cartRecommendations = true
        payload.data = Object.keys(data).length ? data : null
      }
      if (initial) await updateSection.mutateAsync(payload)
      else await createSection.mutateAsync(payload)
      toast.success('Enregistré')
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur'
      setError(message)
      toast.error(message)
    }
  }

  return (
    <Modal
      open
      onOpenChange={(o) => { if (!o) onClose() }}
      title={initial ? 'Modifier la section' : 'Nouvelle section'}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button type="submit" form="feed-section-form" loading={isPending}>
            {initial ? 'Enregistrer' : 'Créer'}
          </Button>
        </>
      }
    >
      <form id="feed-section-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</p>
        )}
        <FormField label="Titre" required htmlFor="section-title">
          <Input id="section-title" size="sm" className="w-full" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </FormField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Type" htmlFor="section-type">
            <Select
              id="section-type"
              size="sm"
              className="w-full"
              value={type}
              onChange={(v) => setType(v as FeedSection['type'])}
              options={Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))}
            />
          </FormField>
          <FormField
            label="Affichage"
            htmlFor="section-display"
            hint={type === 'products' ? DISPLAY_HINTS[displayStyle] : undefined}
          >
            <Select
              id="section-display"
              size="sm"
              className="w-full"
              value={displayStyle}
              onChange={(v) => setDisplayStyle(v as FeedSection['displayStyle'])}
              options={Object.entries(DISPLAY_LABELS).map(([value, label]) => ({ value, label }))}
            />
          </FormField>
          <FormField label="Position" htmlFor="section-position">
            <Input id="section-position" size="sm" className="w-full" type="number" value={position} onChange={(e) => setPosition(e.target.value)} />
          </FormField>
        </div>
        {type === 'products' && (
          <FormField
            label="Date de fin du compteur Flash Deal (optionnel)"
            htmlFor="section-end-date"
            error={endDateInPast ? 'Cette date est déjà passée : le compte à rebours ne s\'affichera pas dans l\'app. Choisissez une date future.' : undefined}
            hint="Renseignez cette date pour afficher un compte à rebours dans l'app mobile. Laissez vide pour une section produits classique sans timer."
          >
            <Input id="section-end-date" size="sm" className="w-full" type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </FormField>
        )}
        {type === 'products' && (
          <div>
            <Checkbox
              checked={cartRecommendations}
              onCheckedChange={setCartRecommendations}
              label="Source du « Vous aimerez aussi » du panier"
            />
            <p className="ml-6 mt-1 text-xs text-gray-400 dark:text-gray-500">
              Les produits de cette section seront proposés sous le panier. Une seule section à la fois — cocher ici remplace la précédente.
            </p>
          </div>
        )}
        <Switch checked={isActive} onCheckedChange={setIsActive} label="Section active" />
      </form>
    </Modal>
  )
}

export function FeedSectionsTab() {
  const { data: sections, isLoading, isError } = useAdminFeedSections()
  const deleteSection = useDeleteFeedSection()
  const reorderSections = useReorderFeedSections()
  const [showForm, setShowForm] = useState(false)
  const [editingSection, setEditingSection] = useState<FeedSection | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  // Ordre local pendant le glisser-déposer (évite les appels API à chaque dragOver)
  const [localOrder, setLocalOrder] = useState<string[] | null>(null)

  if (isLoading) return <LoadingBlock label="Chargement des sections…" />
  if (isError) return <p className="text-sm text-red-600 dark:text-red-400">Erreur de chargement</p>

  const orderedSections = [...(sections ?? [])].sort((a, b) => a.position - b.position)
  // Appliquer l'ordre local si présent (pendant le drag)
  const displaySections = localOrder
    ? localOrder.map((id) => orderedSections.find((s) => s.id === id)).filter(Boolean) as FeedSection[]
    : orderedSections

  function handleDragStart(e: React.DragEvent, id: string) {
    // setData requis par Firefox pour initier un drag
    e.dataTransfer.setData('text/plain', id)
    setDragId(id)
    setLocalOrder(orderedSections.map((s) => s.id))
  }
  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault()
    if (!dragId || dragId === id || !localOrder) return
    const fromIdx = localOrder.indexOf(dragId)
    const toIdx = localOrder.indexOf(id)
    if (fromIdx === -1 || toIdx === -1) return
    const updated = [...localOrder]
    const [moved] = updated.splice(fromIdx, 1)
    updated.splice(toIdx, 0, moved)
    setLocalOrder(updated)
  }
  function handleDragEnd() {
    setDragId(null)
    if (!localOrder) return
    // Garder l'ordre local affiché jusqu'à la fin de la sauvegarde,
    // sinon la liste revient à l'ancien ordre le temps du refetch
    reorderSections.mutate(localOrder, {
      onSuccess: () => {
        setLocalOrder(null)
        toast.success('Nouvel ordre enregistré')
      },
      onError: (err) => {
        setLocalOrder(null)
        toast.error(err instanceof Error ? err.message : 'Échec de la sauvegarde du nouvel ordre')
      },
    })
  }

  return (
    <div className="space-y-6">
      {/* ── Guide d'utilisation ────────────────────────────────────────── */}
      <Card padding="sm">
        <CardHeader className="mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary-600 dark:text-primary-400" />
            <CardTitle className="text-sm">Comment configurer les sections de l'écran d'accueil</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          {GUIDE_ITEMS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-gray-800 dark:text-gray-200">
                <Icon className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                {title}
              </p>
              <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">{body}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── Liste des sections ─────────────────────────────────────────── */}
      <Card padding="sm">
        <CardHeader>
          <div>
            <CardTitle>Sections de l'accueil</CardTitle>
            <CardDescription>
              {orderedSections.length} section{orderedSections.length > 1 ? 's' : ''} · Glissez-déposez pour réordonner
            </CardDescription>
          </div>
          <Button size="sm" leftIcon={Plus} onClick={() => { setEditingSection(null); setShowForm(true) }}>
            Nouvelle section
          </Button>
        </CardHeader>
        <CardContent>
          {displaySections.length === 0 ? (
            <EmptyState
              icon={LayoutGrid}
              title="Aucune section"
              description="Créez la première section de l'écran d'accueil de l'application."
              action={
                <Button size="sm" leftIcon={Plus} onClick={() => { setEditingSection(null); setShowForm(true) }}>
                  Nouvelle section
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {displaySections.map((section) => {
                const rawEndDate = section.type === 'products' && section.data && typeof section.data === 'object' && 'endDate' in section.data
                  ? (section.data as any).endDate as string | undefined
                  : undefined
                const endDateExpired = rawEndDate ? new Date(rawEndDate).getTime() <= Date.now() : false
                const endDateLabel = rawEndDate
                  ? new Date(rawEndDate).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                  : null
                return (
                  <div
                    key={section.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, section.id)}
                    onDragOver={(e) => handleDragOver(e, section.id)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      'cursor-grab rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-sm active:cursor-grabbing dark:border-gray-800 dark:bg-gray-900',
                      dragId === section.id && 'ring-2 ring-primary-500/40',
                      !section.isActive && 'opacity-60',
                    )}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <GripVertical className="h-5 w-5 flex-shrink-0 select-none text-gray-300 dark:text-gray-600" />
                        <div className="min-w-0">
                          <h3 className="font-medium text-gray-900 dark:text-gray-100">{section.title}</h3>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <Badge size="sm">{TYPE_LABELS[section.type] ?? section.type}</Badge>
                            <Badge size="sm">{DISPLAY_LABELS[section.displayStyle] ?? section.displayStyle}</Badge>
                            <span>Position {section.position}</span>
                            {endDateLabel && (
                              <Badge size="sm" variant={endDateExpired ? 'danger' : 'warning'} className="gap-1">
                                <Clock className="h-3 w-3" />
                                {endDateExpired
                                  ? `Expiré le ${endDateLabel} — compteur masqué dans l'app`
                                  : `Fin : ${endDateLabel}`}
                              </Badge>
                            )}
                            <Badge size="sm" dot variant={section.isActive ? 'success' : 'neutral'}>
                              {section.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Modifier"
                          onClick={() => { setEditingSection(section); setShowForm(true) }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Supprimer"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
                          onClick={() => setConfirmDelete(section.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
        <SectionFormModal initial={editingSection} onClose={() => { setShowForm(false); setEditingSection(null) }} />
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(o) => { if (!o) setConfirmDelete(null) }}
        title="Supprimer la section"
        description="Cette action est irréversible."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="danger"
        onConfirm={async () => {
          if (!confirmDelete) return
          try {
            await deleteSection.mutateAsync(confirmDelete)
            toast.success('Section supprimée')
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression')
          }
        }}
      />
    </div>
  )
}
