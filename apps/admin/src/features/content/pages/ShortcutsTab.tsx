import { useState } from 'react'
import { GripVertical, LayoutGrid, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  useAdminShortcuts, useCreateShortcut, useUpdateShortcut,
  useDeleteShortcut, useReorderShortcuts,
} from '../hooks/useAdminShortcuts'
import { useAdminFeedSections } from '../hooks/useAdminFeedSections'
import { useAdminCategories } from '@/features/categories/hooks/useAdminCategories'
import type { Shortcut, ShortcutTarget } from '@/infrastructure/data-source/AdminContentDataSource'
import {
  Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle,
  ConfirmDialog, EmptyState, FormField, Input, LoadingBlock, Modal, Select, Switch,
} from '@/components/ui'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/cn'

const AVAILABLE_ICONS = [
  'home', 'store', 'feed', 'cart', 'account', 'search', 'camera', 'bell', 'heart', 'star',
  'settings', 'filter', 'sort', 'share', 'help', 'more', 'send', 'plus', 'minus', 'close',
  'check', 'trash', 'truck', 'wallet', 'coupon', 'gift', 'tag', 'message', 'headset',
  'location', 'globe', 'clock', 'history', 'box', 'boxOpen', 'creditCard', 'return', 'edit',
  'eye', 'eyeOff', 'shield', 'fire', 'bolt', 'phone', 'lock', 'mail', 'grid', 'scan', 'play',
  'thumbUp', 'flag', 'laptop', 'tshirtCrew', 'lipstick', 'basketball', 'cellphone', 'car',
]

// Écrans de l'app proposés comme destination (libellés grand public, pas de routes techniques)
const SCREEN_OPTIONS: { value: string; label: string }[] = [
  { value: '/coupons', label: 'Mes coupons' },
  { value: '/stores', label: 'Boutiques' },
  { value: '/wishlist', label: 'Mes favoris' },
  { value: '/orders', label: 'Mes commandes' },
  { value: '/camera', label: 'Recherche par photo' },
  { value: '/messages', label: 'Messagerie' },
]

const TARGET_TYPE_LABELS: Record<string, string> = {
  category: 'Une catégorie de produits',
  section: 'Une sélection de l\'accueil',
  screen: 'Un écran de l\'application',
  search: 'Une recherche pré-remplie',
}

function ShortcutForm({ initial, onClose }: { initial?: Shortcut | null; onClose: () => void }) {
  const createShortcut = useCreateShortcut()
  const updateShortcut = useUpdateShortcut(initial?.id ?? '')
  const { data: categories = [] } = useAdminCategories()
  const { data: sections = [] } = useAdminFeedSections()
  const [label, setLabel] = useState(initial?.label ?? '')
  const [icon, setIcon] = useState(initial?.icon ?? 'tag')
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [targetType, setTargetType] = useState<'category' | 'section' | 'screen' | 'search'>(initial?.target?.type ?? 'category')
  const [targetValue, setTargetValue] = useState(initial?.target?.value ?? '')
  const [error, setError] = useState<string | null>(null)
  const isPending = createShortcut.isPending || updateShortcut.isPending

  const productSections = sections.filter((s) => s.type === 'products')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null)
    if (!label.trim()) { setError('Le libellé est requis'); return }
    if (!targetValue) { setError('Choisissez la destination du raccourci — c\'est ce qui s\'ouvre quand le client clique dessus'); return }
    const target: ShortcutTarget = { type: targetType, value: targetValue }
    try {
      if (initial) await updateShortcut.mutateAsync({ label: label.trim(), icon, isActive, target })
      else await createShortcut.mutateAsync({ label: label.trim(), icon, target })
      toast.success('Enregistré')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    }
  }

  return (
    <Modal
      open
      onOpenChange={(o) => { if (!o) onClose() }}
      title={initial ? 'Modifier le raccourci' : 'Nouveau raccourci'}
      description="Le raccourci apparaît dans la barre d'icônes en haut de l'écran d'accueil."
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Annuler</Button>
          <Button type="submit" form="shortcut-form" loading={isPending}>
            {initial ? 'Enregistrer' : 'Créer'}
          </Button>
        </>
      }
    >
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">{error}</p>
      )}
      <form id="shortcut-form" onSubmit={handleSubmit} className="space-y-4">
        <FormField
          label="Libellé"
          htmlFor="shortcut-label"
          required
          hint="C'est le texte affiché sous l'icône dans l'application."
        >
          <Input
            id="shortcut-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            autoFocus
            placeholder="Ex : Électronique, Promo Tabaski…"
          />
        </FormField>
        <FormField label="Icône" htmlFor="shortcut-icon">
          <Select
            id="shortcut-icon"
            value={icon}
            onChange={setIcon}
            options={AVAILABLE_ICONS.map((name) => ({ value: name, label: name }))}
          />
        </FormField>

        {/* Destination : ce qui s'ouvre quand le client tape le raccourci */}
        <div className="space-y-2 rounded-lg border border-gray-200 p-3 dark:border-gray-800">
          <FormField label="Quand le client clique, ouvrir…" required>
            <Select
              value={targetType}
              onChange={(v) => { setTargetType(v as typeof targetType); setTargetValue('') }}
              options={Object.entries(TARGET_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
            />
          </FormField>

          {targetType === 'category' && (
            <Select
              value={targetValue}
              onChange={setTargetValue}
              placeholder="— Choisir la catégorie —"
              options={categories.map((c: any) => ({ value: c.id, label: c.name }))}
            />
          )}
          {targetType === 'section' && (
            <Select
              value={targetValue}
              onChange={setTargetValue}
              placeholder="— Choisir la sélection —"
              options={productSections.map((s) => ({ value: s.id, label: s.title }))}
            />
          )}
          {targetType === 'screen' && (
            <Select
              value={targetValue}
              onChange={setTargetValue}
              placeholder="— Choisir l'écran —"
              options={SCREEN_OPTIONS}
            />
          )}
          {targetType === 'search' && (
            <Input
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              placeholder="Ex : téléphone, robe, chaussures homme…"
            />
          )}
        </div>

        {initial && (
          <Switch checked={isActive} onCheckedChange={setIsActive} label="Actif" />
        )}
      </form>
    </Modal>
  )
}

export function ShortcutsTab() {
  const { data: shortcuts, isLoading, isError } = useAdminShortcuts()
  const deleteShortcut = useDeleteShortcut()
  const reorderShortcuts = useReorderShortcuts()
  const [showForm, setShowForm] = useState(false)
  const [editingShortcut, setEditingShortcut] = useState<Shortcut | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Shortcut | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [localOrder, setLocalOrder] = useState<string[] | null>(null)

  if (isLoading) return <LoadingBlock label="Chargement des raccourcis…" />
  if (isError) {
    return (
      <Card>
        <p className="text-sm text-red-600 dark:text-red-400">Erreur de chargement</p>
      </Card>
    )
  }

  const orderedShortcuts = [...(shortcuts ?? [])]
  const displayShortcuts = localOrder
    ? localOrder.map((id) => orderedShortcuts.find((s) => s.id === id)).filter(Boolean) as Shortcut[]
    : orderedShortcuts

  function handleDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.setData('text/plain', id)
    setDragId(id)
    setLocalOrder(orderedShortcuts.map((s) => s.id))
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
    reorderShortcuts.mutate(localOrder, {
      onSuccess: () => { setLocalOrder(null); toast.success('Enregistré') },
      onError: (err) => {
        setLocalOrder(null)
        toast.error(err instanceof Error ? err.message : 'Échec de la sauvegarde du nouvel ordre')
      },
    })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Raccourcis de l'accueil</CardTitle>
            <CardDescription>
              Les raccourcis sont les 8 icônes de la barre horizontale en haut de l'écran d'accueil
              (Électronique, Mode, etc.). Réordonnez-les par glisser-déposer, modifiez leur libellé
              et leur icône, désactivez-les temporairement, ou ajoutez-en de nouveaux.
            </CardDescription>
          </div>
          <Button size="sm" leftIcon={Plus} onClick={() => { setEditingShortcut(null); setShowForm(true) }}>
            Nouveau raccourci
          </Button>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
            {orderedShortcuts.length} raccourcis · Glissez-déposez pour réordonner
          </p>

          {displayShortcuts.length === 0 ? (
            <EmptyState
              icon={LayoutGrid}
              title="Aucun raccourci"
              description="Ajoutez un raccourci pour l'afficher sur l'écran d'accueil de l'application."
              action={
                <Button size="sm" leftIcon={Plus} onClick={() => { setEditingShortcut(null); setShowForm(true) }}>
                  Nouveau raccourci
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {displayShortcuts.map((shortcut) => (
                <div
                  key={shortcut.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, shortcut.id)}
                  onDragOver={(e) => handleDragOver(e, shortcut.id)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    'cursor-grab rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-sm active:cursor-grabbing dark:border-gray-800 dark:bg-gray-900',
                    !shortcut.isActive && 'opacity-60',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <GripVertical className="h-4 w-4 flex-shrink-0 text-gray-400 dark:text-gray-500" />
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                        <LayoutGrid className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-medium text-gray-900 dark:text-gray-100">{shortcut.label}</h3>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2">
                          <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                            {shortcut.icon}
                          </span>
                          <Badge variant={shortcut.isActive ? 'success' : 'neutral'} size="sm" dot>
                            {shortcut.isActive ? 'Actif' : 'Inactif'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="ml-4 flex flex-shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={Pencil}
                        onClick={() => { setEditingShortcut(shortcut); setShowForm(true) }}
                      >
                        Modifier
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={Trash2}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        onClick={() => setConfirmDelete(shortcut)}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showForm && (
        <ShortcutForm initial={editingShortcut} onClose={() => { setShowForm(false); setEditingShortcut(null) }} />
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(o) => { if (!o) setConfirmDelete(null) }}
        title="Confirmer la suppression"
        description={confirmDelete ? `Le raccourci « ${confirmDelete.label} » sera supprimé. Cette action est irréversible.` : undefined}
        confirmLabel="Supprimer"
        variant="danger"
        onConfirm={async () => {
          if (!confirmDelete) return
          try {
            await deleteShortcut.mutateAsync(confirmDelete.id)
            toast.success('Raccourci supprimé')
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression')
          }
        }}
      />
    </div>
  )
}
