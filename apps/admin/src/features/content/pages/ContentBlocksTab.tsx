import { useState } from 'react'
import {
  Camera, Check, ClipboardList, Coins, Compass, CreditCard, FileText, Hand, Home, Lock, MapPin,
  MessageCircle, Newspaper, Package, Palette, Pencil, Search, Settings, ShoppingCart, Truck, User, Wallet,
  type LucideIcon,
} from 'lucide-react'
import {
  Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle,
  EmptyState, Input, LoadingBlock, SearchInput, Select, Textarea,
} from '@/components/ui'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/cn'
import { useAdminContentBlocks, useAdminContentGroups, useUpdateContentBlock } from '../hooks/useAdminContentBlocks'

// ─── Labels humains pour les groupes ─────────────────────────────────────────

const GROUP_META: Record<string, { label: string; description: string; icon: LucideIcon }> = {
  branding:        { label: 'Identité & marque',       description: "Nom de l'application, slogan, description",           icon: Palette },
  onboarding:      { label: 'Écran d\'accueil',         description: 'Textes affichés au premier lancement de l\'app',      icon: Hand },
  auth:            { label: 'Connexion & inscription',  description: 'Labels des formulaires de connexion et inscription',   icon: Lock },
  navigation:      { label: 'Navigation',               description: 'Noms des onglets et menus',                           icon: Compass },
  home:            { label: 'Page d\'accueil',           description: 'Titres et messages de la page principale',            icon: Home },
  product:         { label: 'Fiche produit',             description: 'Textes des pages produit (boutons, étiquettes)',      icon: Package },
  cart:            { label: 'Panier',                    description: 'Textes du panier d\'achat',                           icon: ShoppingCart },
  checkout:        { label: 'Paiement & commande',      description: 'Messages du tunnel de commande',                      icon: CreditCard },
  search:          { label: 'Recherche',                 description: 'Textes de la barre et des résultats de recherche',    icon: Search },
  orders:          { label: 'Commandes',                 description: 'Statuts et messages de suivi de commande',            icon: ClipboardList },
  account:         { label: 'Mon compte',                description: 'Titres et labels de l\'espace personnel',             icon: User },
  settings:        { label: 'Paramètres',                description: 'Labels des options de l\'application',               icon: Settings },
  messages:        { label: 'Messagerie',                description: 'Textes de la messagerie et des conversations',        icon: MessageCircle },
  address:         { label: 'Adresses',                  description: 'Labels du formulaire d\'adresse de livraison',        icon: MapPin },
  common:          { label: 'Textes communs',            description: 'Boutons et messages génériques (Valider, Annuler…)',  icon: FileText },
  payment:         { label: 'Modes de paiement',         description: 'Labels des méthodes de paiement',                    icon: Coins },
  feed:            { label: 'Fil d\'actualité',           description: 'Messages du fil de publications',                    icon: Newspaper },
  wallet:          { label: 'Portefeuille',              description: 'Textes de la section portefeuille',                   icon: Wallet },
  camera:          { label: 'Appareil photo',            description: 'Messages de la recherche par image',                  icon: Camera },
  tracking:        { label: 'Suivi de livraison',        description: 'Messages de suivi de commande en temps réel',        icon: Truck },
}

// Groupes à masquer dans cet onglet (gérés par d'autres onglets dédiés)
const HIDDEN_GROUPS = new Set(['feed', 'shortcuts', 'suggested_people', 'search'])

// Types de valeur qui ne sont PAS éditables manuellement (JSON complexe)
function isJsonComplex(value: string): boolean {
  if (!value.trim().startsWith('{') && !value.trim().startsWith('[')) return false
  try { JSON.parse(value); return true } catch { return false }
}

// Nettoyer une valeur pour l'affichage (enlever les guillemets JSON simples)
function displayValue(value: string): string {
  if (value.startsWith('"') && value.endsWith('"')) {
    try { return JSON.parse(value) } catch {}
  }
  return value
}

export function ContentBlocksTab() {
  const { data: groups } = useAdminContentGroups()
  const [selectedGroup, setSelectedGroup] = useState<string | undefined>(undefined)
  const { data: blocks, isLoading, isError } = useAdminContentBlocks(selectedGroup)
  const updateBlock = useUpdateContentBlock()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [savedId, setSavedId] = useState<string | null>(null)

  if (isLoading) return <LoadingBlock label="Chargement des textes…" />
  if (isError) return <p className="text-sm text-red-600 dark:text-red-400">Erreur de chargement</p>

  // Filtrer : on exclut les JSON complexes (gérés par d'autres onglets)
  const editableBlocks = (blocks ?? []).filter((b) => {
    if (HIDDEN_GROUPS.has(b.group ?? '')) return false
    if (isJsonComplex(b.value)) return false
    return true
  })

  const filteredBlocks = editableBlocks.filter((b) =>
    !searchTerm ||
    b.label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.value?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Grouper les blocs par groupe
  const grouped = filteredBlocks.reduce<Record<string, typeof filteredBlocks>>((acc, block) => {
    const g = block.group ?? 'common'
    if (!acc[g]) acc[g] = []
    acc[g].push(block)
    return acc
  }, {})

  const visibleGroups = Object.keys(grouped).sort()

  async function handleSave(id: string) {
    try {
      await updateBlock.mutateAsync({ id, value: editValue })
      setEditingId(null)
      setSavedId(id)
      setTimeout(() => setSavedId(null), 2000)
      toast.success('Enregistré')
    } catch {
      toast.error("Erreur lors de l'enregistrement")
    }
  }

  return (
    <div className="space-y-6">
      {/* En-tête explicatif */}
      <Card padding="sm">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
            <Pencil className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm">Éditeur de textes de l'application</CardTitle>
            <CardDescription className="text-xs">
              Modifiez ici les textes visibles dans l'application mobile — titres, boutons, messages, descriptions.
              Cliquez sur <strong>Modifier</strong> à côté d'un texte pour l'éditer, puis <strong>Enregistrer</strong>.
            </CardDescription>
          </div>
        </div>
      </Card>

      {/* Barre de recherche + filtre groupe */}
      <div className="flex flex-wrap gap-3">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Rechercher un texte…"
          size="sm"
          className="min-w-[200px] flex-1"
        />
        <Select
          size="sm"
          value={selectedGroup ?? ''}
          onChange={(v) => { setSelectedGroup(v || undefined); setSearchTerm('') }}
          placeholder="Toutes les sections"
          options={(groups ?? [])
            .filter((g) => !HIDDEN_GROUPS.has(g))
            .map((g) => ({ value: g, label: GROUP_META[g]?.label ?? g }))}
        />
      </div>

      {/* Résultats vides */}
      {filteredBlocks.length === 0 && (
        <Card padding="none">
          <EmptyState
            icon={Search}
            title={searchTerm ? `Aucun texte ne correspond à « ${searchTerm} »` : 'Aucun texte éditable dans cette section.'}
            action={
              searchTerm ? (
                <Button variant="outline" size="sm" onClick={() => setSearchTerm('')}>
                  Effacer la recherche
                </Button>
              ) : undefined
            }
          />
        </Card>
      )}

      {/* Sections groupées */}
      {visibleGroups.map((groupKey) => {
        const meta = GROUP_META[groupKey]
        const GroupIcon = meta?.icon ?? FileText
        const groupBlocks = grouped[groupKey]
        return (
          <Card key={groupKey} padding="none">
            {/* En-tête de section */}
            <CardHeader className="mb-0 flex-nowrap items-center border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  <GroupIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-sm">{meta?.label ?? groupKey}</CardTitle>
                  {meta?.description && (
                    <CardDescription className="text-xs">{meta.description}</CardDescription>
                  )}
                </div>
              </div>
              <Badge size="sm" className="ml-auto flex-shrink-0">
                {groupBlocks.length} texte{groupBlocks.length > 1 ? 's' : ''}
              </Badge>
            </CardHeader>

            {/* Liste des textes */}
            <CardContent className="divide-y divide-gray-100 dark:divide-gray-800">
              {groupBlocks.map((block) => {
                const currentValue = displayValue(block.value)
                const isEditing = editingId === block.id
                const justSaved = savedId === block.id

                return (
                  <div
                    key={block.id}
                    className={cn(
                      'px-5 py-4 transition-colors',
                      isEditing && 'bg-primary-50/60 dark:bg-primary-900/10',
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        {/* Label lisible */}
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {block.label}
                        </p>

                        {/* Zone d'édition ou affichage */}
                        {isEditing ? (
                          <div className="mt-2 space-y-2">
                            {editValue.length > 80 ? (
                              <Textarea
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                rows={3}
                                autoFocus
                                className="w-full"
                                onKeyDown={(e) => { if (e.key === 'Escape') setEditingId(null) }}
                              />
                            ) : (
                              <Input
                                type="text"
                                size="sm"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                autoFocus
                                className="w-full"
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(block.id); if (e.key === 'Escape') setEditingId(null) }}
                              />
                            )}
                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                size="sm"
                                leftIcon={Check}
                                onClick={() => handleSave(block.id)}
                                loading={updateBlock.isPending}
                              >
                                Enregistrer
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                                Annuler
                              </Button>
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                Entrée pour valider · Échap pour annuler
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p
                            className={cn(
                              'mt-1 text-sm',
                              currentValue
                                ? 'text-gray-600 dark:text-gray-300'
                                : 'italic text-gray-400 dark:text-gray-500',
                            )}
                          >
                            {currentValue || '— vide —'}
                          </p>
                        )}
                      </div>

                      {/* Bouton Modifier / confirmation */}
                      {!isEditing && (
                        <div className="flex-shrink-0">
                          {justSaved ? (
                            <Badge variant="success" className="gap-1">
                              <Check className="h-3 w-3" />
                              Enregistré
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              leftIcon={Pencil}
                              onClick={() => { setEditingId(block.id); setEditValue(currentValue) }}
                            >
                              Modifier
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )
      })}

      {/* Note de bas de page */}
      {filteredBlocks.length > 0 && (
        <p className="text-center text-xs text-gray-400 dark:text-gray-600">
          Les contenus JSON complexes (posts feed, raccourcis, données structurées) sont gérés dans leurs onglets dédiés.
        </p>
      )}
    </div>
  )
}
