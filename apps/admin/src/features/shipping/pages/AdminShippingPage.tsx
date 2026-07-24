import { useState } from 'react'
import type React from 'react'
import { MapPin, Plus, Trash2, ChevronDown, Package } from 'lucide-react'
import { PermissionGuard } from '@/components/guards/PermissionGuard'
import { useShippingZones, useCreateZone, useUpdateZone, useDeleteZone, useToggleZone } from '../hooks/useAdminShipping'
import { useShippingMethods, useCreateMethod, useUpdateMethod, useDeleteMethod } from '../hooks/useAdminShipping'
import { useShippingRules, useCreateRule, useUpdateRule, useDeleteRule } from '../hooks/useAdminShipping'
import type { ShippingZone } from '@/infrastructure/data-source/AdminShippingDataSource'
import {
  PageHeader, Button, Badge, Card, Modal, ConfirmDialog, Switch, Checkbox,
  Input, Select, FormField, LoadingBlock, EmptyState,
  Tabs, TabsList, TabsTrigger, TabsContent,
} from '@/components/ui'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/cn'
import { formatPrice } from '@/lib/format'
import { WORLD_COUNTRIES } from '@/lib/countries'

export function AdminShippingPage() {
  const [expandedZone, setExpandedZone] = useState<string | null>(null)
  const { data: zones, isLoading } = useShippingZones()
  const toggleZone = useToggleZone()
  const deleteZone = useDeleteZone()
  const [showCreate, setShowCreate] = useState(false)
  const [confirmDeleteZone, setConfirmDeleteZone] = useState<ShippingZone | null>(null)

  return (
    <div>
      <PageHeader
        title="Livraison"
        description="Zones, méthodes et règles de livraison"
        actions={
          <PermissionGuard permission="shipping.create">
            <Button leftIcon={Plus} onClick={() => setShowCreate(true)}>
              Nouvelle zone
            </Button>
          </PermissionGuard>
        }
      />

      {showCreate && <CreateZoneModal onClose={() => setShowCreate(false)} />}

      {isLoading ? (
        <LoadingBlock label="Chargement des zones…" />
      ) : (
        <div className="space-y-4">
          {zones?.map((zone: ShippingZone) => (
            <Card key={zone.id} padding="none" className="overflow-hidden">
              <div
                className="flex cursor-pointer items-center justify-between px-5 py-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                onClick={() => setExpandedZone(expandedZone === zone.id ? null : zone.id)}>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg',
                    zone.isActive
                      ? 'bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
                  )}>
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{zone.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{zone.countries.length} pays · Priorité {zone.priority}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <PermissionGuard permission="shipping.update">
                    <span onClick={(e) => e.stopPropagation()}>
                      <Switch
                        checked={zone.isActive}
                        onCheckedChange={() =>
                          toggleZone.mutate(
                            { id: zone.id, isActive: !zone.isActive },
                            {
                              onSuccess: () => toast.success(zone.isActive ? 'Zone désactivée' : 'Zone activée'),
                              onError: () => toast.error('Erreur lors de la mise à jour de la zone'),
                            },
                          )
                        }
                      />
                    </span>
                  </PermissionGuard>
                  <PermissionGuard permission="shipping.delete">
                    <Button
                      variant="ghost" size="sm" leftIcon={Trash2}
                      className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10"
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteZone(zone) }}
                    >
                      Supprimer
                    </Button>
                  </PermissionGuard>
                  <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform', expandedZone === zone.id && 'rotate-180')} />
                </div>
              </div>
              {expandedZone === zone.id && <ZoneDetail zoneId={zone.id} />}
            </Card>
          ))}
          {(!zones || zones.length === 0) && (
            <Card padding="none">
              <EmptyState
                icon={MapPin}
                title="Aucune zone de livraison"
                description="Créez une première zone pour définir vos méthodes et règles de livraison."
              />
            </Card>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDeleteZone}
        onOpenChange={(o) => { if (!o) setConfirmDeleteZone(null) }}
        title="Supprimer cette zone ?"
        description={`La zone « ${confirmDeleteZone?.name ?? ''} » ainsi que ses méthodes et règles seront supprimées. Cette action est irréversible.`}
        confirmLabel="Supprimer"
        variant="danger"
        onConfirm={async () => {
          if (!confirmDeleteZone) return
          try {
            await deleteZone.mutateAsync(confirmDeleteZone.id)
            toast.success('Zone supprimée')
          } catch {
            toast.error('Erreur lors de la suppression de la zone')
          }
          setConfirmDeleteZone(null)
        }}
      />
    </div>
  )
}

function CreateZoneModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: '', countries: [] as { code: string; name: string }[], priority: 99 })
  const create = useCreateZone()
  const [error, setError] = useState('')

  function toggleCountry(c: { code: string; name: string }) {
    setForm((f) => ({
      ...f,
      countries: f.countries.find((x) => x.code === c.code)
        ? f.countries.filter((x) => x.code !== c.code)
        : [...f.countries, c],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Nom requis'); return }
    if (form.countries.length === 0) { setError('Sélectionnez au moins un pays'); return }
    try {
      const payload = { name: form.name, countries: form.countries.map(c => c.code), priority: form.priority }
      await create.mutateAsync(payload)
      toast.success('Zone de livraison créée')
      onClose()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la création'
      setError(message)
      toast.error(message)
    }
  }

  return (
    <Modal
      open
      onOpenChange={(o) => { if (!o) onClose() }}
      title="Nouvelle zone de livraison"
      description="Regroupez des pays sous une même politique de livraison"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button type="submit" form="create-zone-form" loading={create.isPending}>Créer</Button>
        </>
      }
    >
      <form id="create-zone-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">{error}</div>}
        <FormField label="Nom" required>
          <Input required size="sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </FormField>
        <FormField label="Priorité" hint="Plus la valeur est basse, plus la zone est prioritaire">
          <Input type="number" size="sm" value={form.priority} onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 99 })} />
        </FormField>
        <FormField label="Pays" required>
          <div className="grid max-h-64 grid-cols-2 gap-1 overflow-y-auto rounded-lg border border-gray-200 p-2 dark:border-gray-700 dark:bg-gray-800/40">
            {WORLD_COUNTRIES.map((c) => (
              <Checkbox
                key={c.code}
                checked={!!form.countries.find((x) => x.code === c.code)}
                onCheckedChange={() => toggleCountry(c)}
                label={<span className="text-xs">{c.flag} {c.name}</span>}
                className="rounded px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800"
              />
            ))}
          </div>
        </FormField>
      </form>
    </Modal>
  )
}

function ZoneDetail({ zoneId }: { zoneId: string }) {
  const [tab, setTab] = useState<'methods' | 'rules'>('methods')
  const { data: methods } = useShippingMethods(zoneId)
  const { data: rules } = useShippingRules(zoneId)
  const deleteMethod = useDeleteMethod()
  const deleteRule = useDeleteRule()
  const [showNewMethod, setShowNewMethod] = useState(false)
  const [showNewRule, setShowNewRule] = useState(false)

  function handleDeleteMethod(id: string) {
    deleteMethod.mutate(id, {
      onSuccess: () => toast.success('Méthode supprimée'),
      onError: () => toast.error('Erreur lors de la suppression de la méthode'),
    })
  }
  function handleDeleteRule(id: string) {
    deleteRule.mutate(id, {
      onSuccess: () => toast.success('Règle supprimée'),
      onError: () => toast.error('Erreur lors de la suppression de la règle'),
    })
  }

  return (
    <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-4 dark:border-gray-800 dark:bg-gray-800/30">
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'methods' | 'rules')}>
        <TabsList variant="underline">
          <TabsTrigger value="methods" badge={methods?.length}>Méthodes</TabsTrigger>
          <TabsTrigger value="rules" badge={rules?.length}>Règles</TabsTrigger>
        </TabsList>

        <TabsContent value="methods">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {methods?.length ?? 0} méthode{(methods?.length ?? 0) > 1 ? 's' : ''}
            </span>
            <PermissionGuard permission="shipping.create">
              <Button variant="ghost" size="sm" leftIcon={Plus} onClick={() => setShowNewMethod(true)}>
                Ajouter
              </Button>
            </PermissionGuard>
          </div>
          {showNewMethod && <MethodFormModal zoneId={zoneId} onClose={() => setShowNewMethod(false)} />}
          <div className="space-y-2">
            {methods?.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{m.name}</span>
                    {!m.isActive && <Badge size="sm">Inactif</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {formatPrice(m.baseRate)} · {m.estimatedDaysMin}-{m.estimatedDaysMax} jours
                    {m.freeThreshold ? ` · gratuit > ${formatPrice(m.freeThreshold)}` : ''}
                  </p>
                </div>
                <PermissionGuard permission="shipping.delete">
                  <Button
                    variant="ghost" size="sm" leftIcon={Trash2}
                    className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10"
                    onClick={() => handleDeleteMethod(m.id)}
                  >
                    Supprimer
                  </Button>
                </PermissionGuard>
              </div>
            ))}
            {(!methods || methods.length === 0) && (
              <EmptyState
                icon={Package}
                title="Aucune méthode de livraison"
                description="Ajoutez une méthode pour proposer cette zone au checkout."
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="rules">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {rules?.length ?? 0} règle{(rules?.length ?? 0) > 1 ? 's' : ''}
            </span>
            <PermissionGuard permission="shipping.create">
              <Button variant="ghost" size="sm" leftIcon={Plus} onClick={() => setShowNewRule(true)}>
                Ajouter
              </Button>
            </PermissionGuard>
          </div>
          {showNewRule && <RuleFormModal zoneId={zoneId} onClose={() => setShowNewRule(false)} />}
          <div className="space-y-2">
            {rules?.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{r.name}</span>
                    <Badge size="sm" variant="info">{r.type}</Badge>
                    {!r.isActive && <Badge size="sm">Inactif</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {r.type === 'weight' ? 'Poids' : r.type === 'price' ? 'Prix' : 'Quantité'} : {r.minValue}{r.maxValue ? ` - ${r.maxValue}` : '+'}
                    {r.type === 'weight' ? ' kg' : r.type === 'price' ? ' FCFA' : ''} → {formatPrice(r.rate)}
                  </p>
                </div>
                <PermissionGuard permission="shipping.delete">
                  <Button
                    variant="ghost" size="sm" leftIcon={Trash2}
                    className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10"
                    onClick={() => handleDeleteRule(r.id)}
                  >
                    Supprimer
                  </Button>
                </PermissionGuard>
              </div>
            ))}
            {(!rules || rules.length === 0) && (
              <EmptyState
                icon={Package}
                title="Aucune règle tarifaire"
                description="Ajoutez une règle pour affiner les tarifs selon le poids, le prix ou la quantité."
              />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function MethodFormModal({ zoneId, onClose }: { zoneId: string; onClose: () => void }) {
  const [form, setForm] = useState({ name: '', baseRate: 0, freeThreshold: 0, estimatedDaysMin: 2, estimatedDaysMax: 5, isActive: true })
  const create = useCreateMethod()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await create.mutateAsync({ ...form, zoneId, description: '' })
      toast.success('Méthode de livraison ajoutée')
      onClose()
    } catch {
      toast.error("Erreur lors de l'ajout de la méthode")
    }
  }

  return (
    <Modal
      open
      onOpenChange={(o) => { if (!o) onClose() }}
      title="Nouvelle méthode"
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button type="submit" form="method-form" loading={create.isPending}>Ajouter</Button>
        </>
      }
    >
      <form id="method-form" onSubmit={handleSubmit} className="space-y-3">
        <FormField label="Nom" required>
          <Input required size="sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Tarif de base (FCFA)" required>
            <Input required type="number" size="sm" value={form.baseRate} onChange={(e) => setForm({ ...form, baseRate: parseInt(e.target.value) || 0 })} />
          </FormField>
          <FormField label={'Gratuit > (0 = non)'}>
            <Input type="number" size="sm" value={form.freeThreshold} onChange={(e) => setForm({ ...form, freeThreshold: parseInt(e.target.value) || 0 })} />
          </FormField>
          <FormField label="Jours min" required>
            <Input required type="number" size="sm" value={form.estimatedDaysMin} onChange={(e) => setForm({ ...form, estimatedDaysMin: parseInt(e.target.value) || 2 })} />
          </FormField>
          <FormField label="Jours max" required>
            <Input required type="number" size="sm" value={form.estimatedDaysMax} onChange={(e) => setForm({ ...form, estimatedDaysMax: parseInt(e.target.value) || 5 })} />
          </FormField>
        </div>
      </form>
    </Modal>
  )
}

function RuleFormModal({ zoneId, onClose }: { zoneId: string; onClose: () => void }) {
  const [form, setForm] = useState({ name: '', type: 'weight' as const, minValue: 0, maxValue: 0, rate: 0, isActive: true })
  const create = useCreateRule()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await create.mutateAsync({ ...form, zoneId, maxValue: form.maxValue || undefined })
      toast.success('Règle tarifaire ajoutée')
      onClose()
    } catch {
      toast.error("Erreur lors de l'ajout de la règle")
    }
  }

  return (
    <Modal
      open
      onOpenChange={(o) => { if (!o) onClose() }}
      title="Nouvelle règle"
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button type="submit" form="rule-form" loading={create.isPending}>Ajouter</Button>
        </>
      }
    >
      <form id="rule-form" onSubmit={handleSubmit} className="space-y-3">
        <FormField label="Nom" required>
          <Input required size="sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </FormField>
        <FormField label="Type">
          <Select
            size="sm"
            className="w-full"
            value={form.type}
            onChange={(v) => setForm({ ...form, type: v as any })}
            options={[
              { value: 'weight', label: 'Poids' },
              { value: 'price', label: 'Prix' },
              { value: 'quantity', label: 'Quantité' },
            ]}
          />
        </FormField>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Min" required>
            <Input required type="number" size="sm" value={form.minValue} onChange={(e) => setForm({ ...form, minValue: parseFloat(e.target.value) || 0 })} />
          </FormField>
          <FormField label="Max">
            <Input type="number" size="sm" value={form.maxValue} onChange={(e) => setForm({ ...form, maxValue: parseFloat(e.target.value) || 0 })} />
          </FormField>
          <FormField label="Tarif" required>
            <Input required type="number" size="sm" value={form.rate} onChange={(e) => setForm({ ...form, rate: parseFloat(e.target.value) || 0 })} />
          </FormField>
        </div>
      </form>
    </Modal>
  )
}
