import { useState } from 'react'
import type React from 'react'
import { useNavigate } from 'react-router-dom'
import { Bike, Car, Truck, Star, Plus, Download, CheckCircle2, Clock, Pencil, Trash2, Pause, Play, ClipboardList } from 'lucide-react'
import { useAdminDeliveryPersons, useCreateDeliveryPerson, useUpdateDeliveryPerson, useDeleteDeliveryPerson, useRateAssignment, useAvailableOrders } from '../hooks/useAdminDelivery'
import { useAdminAssignments, useAssignDelivery, useUpdateAssignmentStatus } from '../hooks/useAdminDelivery'
import { PermissionGuard } from '@/components/guards/PermissionGuard'
import type { DeliveryPerson, DeliveryCountry, DeliveryPersonQueryParams, CreateDeliveryPersonInput, UpdateDeliveryPersonInput, DeliveryAssignment } from '@/infrastructure/data-source/AdminDeliveryDataSource'
import { GEOGRAPHY } from '../services/geographyService'
import { WORLD_COUNTRIES } from '@/lib/countries'
import { resolveAdminMediaUrl } from '@/lib/resolveAdminMediaUrl'
import { exportToCSV } from '@/lib/exportCSV'
import {
  PageHeader, Button, Badge, StatusBadge, DataTable, type Column, Modal, ConfirmDialog,
  SearchInput, Select, Input, Textarea, FormField, LoadingBlock, EmptyState,
} from '@/components/ui'
import { DELIVERY_STATUS } from '@/lib/status'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/format'

const VEHICLE_META: Record<string, { label: string; icon: typeof Bike }> = {
  bike: { label: 'Moto', icon: Bike },
  car: { label: 'Voiture', icon: Car },
  truck: { label: 'Camion', icon: Truck },
}

export function AdminDeliveryListPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [countryFilter, setCountryFilter] = useState('')
  const [regionFilter, setRegionFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const availableRegions = countryFilter
    ? (GEOGRAPHY.find((c) => c.code === countryFilter)?.regions ?? [])
    : []

  const params: DeliveryPersonQueryParams = {
    page, limit: 10,
    search: search || undefined,
    countryCode: countryFilter || undefined,
    region: regionFilter || undefined,
    isActive: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
  }

  const { data, isLoading } = useAdminDeliveryPersons(params)
  const deletePerson = useDeleteDeliveryPerson()
  const updatePerson = useUpdateDeliveryPerson()
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)
  const [editPerson, setEditPerson] = useState<DeliveryPerson | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<DeliveryPerson | null>(null)
  const [confirmToggle, setConfirmToggle] = useState<DeliveryPerson | null>(null)
  const [viewAssignments, setViewAssignments] = useState<DeliveryPerson | null>(null)

  function handleCountryFilterChange(code: string) {
    setCountryFilter(code)
    setRegionFilter('')
    setPage(1)
  }

  function handleExport() {
    if (!data?.data) return
    const rows = data.data.map((p) => ({
      ID: p.id,
      Nom: p.name,
      Téléphone: p.phone,
      Email: p.email ?? '',
      Pays: p.country?.name ?? '',
      Région: p.region,
      Véhicule: p.vehicleType,
      Plaque: p.licensePlate ?? '',
      Statut: p.isActive ? 'Actif' : 'Inactif',
      Note: p.rating ?? '',
      Livraisons: p.totalDeliveries ?? '',
    }))
    exportToCSV(rows, `livreurs_${new Date().toISOString().slice(0, 10)}`)
    toast.success('Export CSV généré')
  }

  const columns: Column<DeliveryPerson>[] = [
    {
      key: 'name',
      header: 'Livreur',
      cell: (p) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-semibold text-primary-700 dark:bg-primary-500/10 dark:text-primary-400">
            {p.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{p.name}</p>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">{p.phone}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'country',
      header: 'Pays',
      hideBelow: 'md',
      cell: (p) => (
        <span title={p.country.name}>
          {GEOGRAPHY.find((c) => c.code === p.country.code)?.flag ?? ''} {p.country.name}
        </span>
      ),
    },
    { key: 'region', header: 'Région', hideBelow: 'lg', cell: (p) => p.region },
    {
      key: 'vehicle',
      header: 'Véhicule',
      hideBelow: 'lg',
      cell: (p) => {
        const meta = VEHICLE_META[p.vehicleType]
        const Icon = meta?.icon ?? Bike
        return (
          <span className="inline-flex items-center gap-1.5">
            <Icon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            {meta?.label ?? p.vehicleType}
          </span>
        )
      },
    },
    {
      key: 'status',
      header: 'Statut',
      cell: (p) => (
        <Badge variant={p.isActive ? 'success' : 'neutral'} dot>
          {p.isActive ? 'Actif' : 'Inactif'}
        </Badge>
      ),
    },
    {
      key: 'verified',
      header: 'Vérifié',
      hideBelow: 'md',
      cell: (p) =>
        p.isVerified ? (
          <Badge variant="info">
            <CheckCircle2 className="h-3 w-3" />
            Vérifié
          </Badge>
        ) : (
          <Badge variant="warning">
            <Clock className="h-3 w-3" />
            En attente
          </Badge>
        ),
    },
    {
      key: 'deliveries',
      header: 'Livraisons',
      align: 'center',
      hideBelow: 'md',
      cell: (p) => <span className="tabular-nums">{p.totalDeliveries}</span>,
    },
    {
      key: 'rating',
      header: 'Note',
      align: 'center',
      cell: (p) =>
        p.rating > 0 ? (
          <div className="inline-flex flex-col items-center gap-0.5">
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
              <Star className="h-3.5 w-3.5 fill-current text-amber-400" />
              {p.rating.toFixed(1)}
            </span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">{p.ratingCount} avis</span>
          </div>
        ) : (
          <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
        ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (p) => (
        <div className="flex items-center justify-end gap-1">
          <PermissionGuard permission="delivery.manage">
            <Button
              variant="ghost" size="sm" leftIcon={Pencil}
              onClick={(e) => { e.stopPropagation(); setEditPerson(p) }}
            >
              Modifier
            </Button>
            <Button
              variant="ghost" size="sm" leftIcon={p.isActive ? Pause : Play}
              onClick={(e) => { e.stopPropagation(); setConfirmToggle(p) }}
            >
              {p.isActive ? 'Suspendre' : 'Réactiver'}
            </Button>
          </PermissionGuard>
          <Button
            variant="ghost" size="sm" leftIcon={ClipboardList}
            onClick={(e) => { e.stopPropagation(); setViewAssignments(p) }}
          >
            Assignations
          </Button>
          <PermissionGuard permission="delivery.manage">
            <Button
              variant="ghost" size="sm"
              className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10"
              leftIcon={Trash2}
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(p) }}
            >
              Supprimer
            </Button>
          </PermissionGuard>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Livreurs"
        description={data ? `${data.total} livreur${data.total > 1 ? 's' : ''} partenaire${data.total > 1 ? 's' : ''}` : 'Gestion des livreurs partenaires'}
        actions={
          <>
            <PermissionGuard permission="delivery.manage">
              <Button variant="outline" leftIcon={Download} onClick={handleExport}>
                Exporter CSV
              </Button>
            </PermissionGuard>
            <PermissionGuard permission="delivery.manage">
              <Button leftIcon={Plus} onClick={() => setShowCreate(true)}>
                Nouveau livreur
              </Button>
            </PermissionGuard>
          </>
        }
      />

      {/* Filtres */}
      <div className="mb-4 flex flex-wrap gap-3">
        <SearchInput
          className="min-w-[220px] flex-1"
          value={search}
          onChange={(v) => { setSearch(v); setPage(1) }}
          placeholder="Rechercher par nom, téléphone ou région…"
        />
        <Select
          size="sm"
          value={countryFilter}
          onChange={handleCountryFilterChange}
          placeholder="Tous les pays"
          options={WORLD_COUNTRIES.map((c) => ({ value: c.code, label: `${c.flag} ${c.name}` }))}
        />
        <Select
          size="sm"
          value={regionFilter}
          onChange={(v) => { setRegionFilter(v); setPage(1) }}
          disabled={!countryFilter}
          placeholder="Toutes les régions"
          options={availableRegions.map((r) => ({ value: r, label: r }))}
        />
        <Select
          size="sm"
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); setPage(1) }}
          placeholder="Tous les statuts"
          options={[
            { value: 'active', label: 'Actifs' },
            { value: 'inactive', label: 'Inactifs' },
          ]}
        />
      </div>

      <DataTable<DeliveryPerson>
        data={data?.data ?? []}
        columns={columns}
        rowKey={(p) => p.id}
        loading={isLoading}
        onRowClick={(p) => navigate(`/delivery/${p.id}`)}
        empty={{
          icon: Bike,
          title: 'Aucun livreur trouvé',
          description: 'Ajustez vos filtres ou ajoutez un nouveau livreur pour commencer.',
        }}
        pagination={{
          page,
          pageSize: 10,
          total: data?.total ?? 0,
          onPageChange: setPage,
        }}
      />

      {showCreate && <DeliveryPersonFormModal onClose={() => setShowCreate(false)} />}
      {editPerson && <DeliveryPersonFormModal person={editPerson} onClose={() => setEditPerson(null)} />}
      {viewAssignments && <AssignmentsModal person={viewAssignments} onClose={() => setViewAssignments(null)} />}

      <ConfirmDialog
        open={!!confirmToggle}
        onOpenChange={(o) => { if (!o) setConfirmToggle(null) }}
        title={confirmToggle?.isActive ? 'Suspendre ce livreur ?' : 'Réactiver ce livreur ?'}
        description={
          confirmToggle?.isActive
            ? `${confirmToggle?.name} ne pourra plus recevoir de nouvelles assignations.`
            : `${confirmToggle?.name} pourra de nouveau recevoir des assignations.`
        }
        confirmLabel={confirmToggle?.isActive ? 'Suspendre' : 'Réactiver'}
        variant={confirmToggle?.isActive ? 'danger' : 'default'}
        onConfirm={async () => {
          if (!confirmToggle) return
          try {
            await updatePerson.mutateAsync({ id: confirmToggle.id, data: { isActive: !confirmToggle.isActive } })
            toast.success(confirmToggle.isActive ? 'Livreur suspendu' : 'Livreur réactivé')
          } catch {
            toast.error('Erreur lors de la mise à jour du livreur')
          }
          setConfirmToggle(null)
        }}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => { if (!o) setConfirmDelete(null) }}
        title="Confirmer la suppression"
        description={`Le livreur ${confirmDelete?.name ?? ''} sera supprimé définitivement. Cette action est irréversible.`}
        confirmLabel="Supprimer"
        variant="danger"
        onConfirm={async () => {
          if (!confirmDelete) return
          try {
            await deletePerson.mutateAsync(confirmDelete.id)
            toast.success('Livreur supprimé')
          } catch {
            toast.error('Erreur lors de la suppression')
          }
          setConfirmDelete(null)
        }}
      />
    </div>
  )
}


// ---------------------------------------------------------------------------
// Formulaire création / modification livreur
// ---------------------------------------------------------------------------
function DeliveryPersonFormModal({ person, onClose }: { person?: DeliveryPerson; onClose: () => void }) {
  const create = useCreateDeliveryPerson()
  const update = useUpdateDeliveryPerson()

  const defaultCountry = WORLD_COUNTRIES.find((c) => c.code === 'NE') ?? WORLD_COUNTRIES[0]
  const initialCountry: DeliveryCountry = person?.country ?? { code: defaultCountry.code, name: defaultCountry.name }

  const [selectedCountryCode, setSelectedCountryCode] = useState(initialCountry.code)
  const [form, setForm] = useState<CreateDeliveryPersonInput>({
    name: person?.name ?? '',
    phone: person?.phone ?? '',
    email: person?.email ?? '',
    vehicleType: person?.vehicleType ?? 'bike',
    country: initialCountry,
    region: person?.region ?? (GEOGRAPHY.find((c) => c.code === initialCountry.code)?.regions[0] ?? ''),
    address: person?.address ?? '',
    idCardNumber: person?.idCardNumber ?? '',
    licensePlate: person?.licensePlate ?? '',
    profilePhoto: person?.profilePhoto ?? '',
  })
  const [error, setError] = useState('')

  const currentGeo = GEOGRAPHY.find((c) => c.code === selectedCountryCode)
  const regions = currentGeo?.regions ?? []
  const needsPlate = form.vehicleType === 'car' || form.vehicleType === 'truck'
  const saving = create.isPending || update.isPending

  function handleCountryChange(code: string) {
    const wc = WORLD_COUNTRIES.find((c) => c.code === code)
    if (!wc) return
    const geo = GEOGRAPHY.find((c) => c.code === code)
    setSelectedCountryCode(code)
    setForm((f) => ({
      ...f,
      country: { code: wc.code, name: wc.name },
      region: geo?.regions[0] ?? '',
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.phone.trim()) { setError('Nom et téléphone requis'); return }
    if (!form.region) { setError('Veuillez sélectionner une région'); return }
    try {
      const payload: CreateDeliveryPersonInput = {
        ...form,
        email: form.email || undefined,
        address: form.address || undefined,
        idCardNumber: form.idCardNumber || undefined,
        licensePlate: needsPlate ? (form.licensePlate || undefined) : undefined,
        profilePhoto: form.profilePhoto || undefined,
      }
      if (person) {
        const data: UpdateDeliveryPersonInput = {
          ...payload,
          isVerified: person.isVerified,
          isActive: person.isActive,
        }
        await update.mutateAsync({ id: person.id, data })
        toast.success('Livreur mis à jour')
      } else {
        await create.mutateAsync(payload)
        toast.success('Livreur créé')
      }
      onClose()
    } catch {
      setError("Erreur lors de l'enregistrement")
      toast.error("Erreur lors de l'enregistrement")
    }
  }

  return (
    <Modal
      open
      onOpenChange={(o) => { if (!o) onClose() }}
      title={person ? 'Modifier le livreur' : 'Nouveau livreur'}
      description="Identité, zone d'opération et véhicule du livreur"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button type="submit" form="delivery-person-form" loading={saving}>
            {person ? 'Enregistrer les modifications' : 'Créer le livreur'}
          </Button>
        </>
      }
    >
      <form id="delivery-person-form" onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">{error}</div>
        )}

        {/* ── Identité ─────────────────────────────────────────────────────── */}
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary-700 dark:bg-primary-500/10 dark:text-primary-400">1</span>
            Identité
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Nom complet" required className="sm:col-span-2">
              <Input required size="sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex : Kouamé Adama" />
            </FormField>
            <FormField label="Téléphone" required>
              <Input required size="sm" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+225 07 00 00 00 00" />
            </FormField>
            <FormField label="Email">
              <Input type="email" size="sm" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="livreur@exemple.com" />
            </FormField>
            <FormField label="N° pièce d'identité">
              <Input size="sm" value={form.idCardNumber ?? ''} onChange={(e) => setForm({ ...form, idCardNumber: e.target.value })} placeholder="Ex : CI-2020-00123456" />
            </FormField>
            <FormField label="Adresse domicile">
              <Input size="sm" value={form.address ?? ''} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Ex : Cocody Angré, Villa 12" />
            </FormField>
            <FormField label="Photo de profil (URL)" className="sm:col-span-2">
              <Input type="url" size="sm" value={form.profilePhoto ?? ''} onChange={(e) => setForm({ ...form, profilePhoto: e.target.value })} placeholder="https://exemple.com/photo.jpg" />
              {form.profilePhoto && (
                <div className="mt-2 flex items-center gap-3">
                  <img
                    src={resolveAdminMediaUrl(form.profilePhoto)}
                    alt="Aperçu photo"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                    className="h-12 w-12 rounded-full border border-gray-200 object-cover dark:border-gray-700"
                  />
                  <span className="text-xs text-gray-400 dark:text-gray-500">Aperçu</span>
                </div>
              )}
            </FormField>
          </div>
        </div>

        {/* ── Zone d'opération ─────────────────────────────────────────────── */}
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary-700 dark:bg-primary-500/10 dark:text-primary-400">2</span>
            Zone d'opération
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Pays" required>
              <Select
                size="sm"
                className="w-full"
                value={selectedCountryCode}
                onChange={handleCountryChange}
                options={WORLD_COUNTRIES.map((c) => ({ value: c.code, label: `${c.flag} ${c.name}` }))}
              />
            </FormField>
            <FormField label="Région / Ville" required>
              {regions.length > 0 ? (
                <Select
                  size="sm"
                  className="w-full"
                  value={form.region}
                  onChange={(v) => setForm({ ...form, region: v })}
                  options={regions.map((r) => ({ value: r, label: r }))}
                />
              ) : (
                <Input
                  size="sm"
                  value={form.region}
                  onChange={(e) => setForm({ ...form, region: e.target.value })}
                  placeholder="Ex : Paris, Lyon, Casablanca…"
                />
              )}
            </FormField>
          </div>
        </div>

        {/* ── Véhicule ─────────────────────────────────────────────────────── */}
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary-700 dark:bg-primary-500/10 dark:text-primary-400">3</span>
            Véhicule
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Type de véhicule">
              <Select
                size="sm"
                className="w-full"
                value={form.vehicleType}
                onChange={(v) => setForm({ ...form, vehicleType: v as DeliveryPerson['vehicleType'], licensePlate: '' })}
                options={[
                  { value: 'bike', label: 'Moto' },
                  { value: 'car', label: 'Voiture' },
                  { value: 'truck', label: 'Camion' },
                ]}
              />
            </FormField>
            {needsPlate ? (
              <FormField label="Plaque d'immatriculation">
                <Input size="sm" value={form.licensePlate ?? ''} onChange={(e) => setForm({ ...form, licensePlate: e.target.value })} placeholder="Ex : CI-1234-AB" />
              </FormField>
            ) : (
              <div className="flex items-end pb-1">
                <p className="text-xs italic text-gray-400 dark:text-gray-500">Pas de plaque requise pour une moto</p>
              </div>
            )}
          </div>
        </div>
      </form>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Modal assignations
// ---------------------------------------------------------------------------
function AssignmentsModal({ person, onClose }: { person: DeliveryPerson; onClose: () => void }) {
  const { data: assignments, isLoading } = useAdminAssignments(person.id)
  const [showAssign, setShowAssign] = useState(false)

  return (
    <Modal
      open
      onOpenChange={(o) => { if (!o) onClose() }}
      title={`Assignations — ${person.name}`}
      description={`${GEOGRAPHY.find((c) => c.code === person.country.code)?.flag ?? ''} ${person.country.name} · ${person.region} · ${person.totalDeliveries} livraisons`}
      size="lg"
    >
      <div className="mb-4 flex justify-end">
        <PermissionGuard permission="shipping.create">
          <Button size="sm" leftIcon={Plus} onClick={() => setShowAssign(true)}>
            Assigner
          </Button>
        </PermissionGuard>
      </div>

      {showAssign && <AssignForm deliveryPersonId={person.id} onClose={() => setShowAssign(false)} />}

      {isLoading ? (
        <LoadingBlock label="Chargement des assignations…" />
      ) : (
        <div className="space-y-3">
          {assignments && assignments.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Aucune assignation"
              description="Ce livreur n'a encore reçu aucune livraison à effectuer."
            />
          ) : (
            assignments?.map((a) => <AssignmentCard key={a.id} assignment={a} />)
          )}
        </div>
      )}
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Composant notation par étoiles
// ---------------------------------------------------------------------------
function StarRating({ value, onChange, readonly = false }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  const [hovered, setHovered] = useState(0)
  const display = readonly ? value : (hovered || value)
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onChange?.(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          className={cn('transition-transform', !readonly ? 'cursor-pointer hover:scale-110' : 'cursor-default')}
          aria-label={`${star} étoile${star > 1 ? 's' : ''}`}
        >
          <Star
            className={cn(
              'h-4 w-4',
              star <= display ? 'fill-current text-amber-400' : 'text-gray-300 dark:text-gray-600',
            )}
          />
        </button>
      ))}
    </div>
  )
}

const STAR_LABELS: Record<number, string> = {
  1: 'Très mauvais', 2: 'Insuffisant', 3: 'Correct', 4: 'Bon', 5: 'Excellent',
}

// ---------------------------------------------------------------------------
// Carte assignation
// ---------------------------------------------------------------------------
function AssignmentCard({ assignment }: { assignment: DeliveryAssignment }) {
  const updateStatus = useUpdateAssignmentStatus()
  const rateAssignment = useRateAssignment()
  const [showFeedback, setShowFeedback] = useState(false)
  const [noteText, setNoteText] = useState(assignment.notes ?? '')
  const [rating, setRating] = useState(assignment.rating ?? 0)
  const isFinished = assignment.status === 'delivered' || assignment.status === 'failed'

  const timeline = [
    { label: 'Assignée', date: assignment.assignedAt, done: true },
    { label: 'Récupérée', date: assignment.pickedUpAt, done: !!assignment.pickedUpAt },
    { label: 'En transit', date: null, done: assignment.status === 'in-transit' || isFinished },
    { label: 'Finalisée', date: assignment.deliveredAt, done: isFinished },
  ]

  async function handleSaveFeedback() {
    // Utilise rateAssignment qui recalcule aussi le rating du livreur
    try {
      await rateAssignment.mutateAsync({ id: assignment.id, rating, notes: noteText.trim() || undefined })
      toast.success('Note enregistrée — moyenne du livreur mise à jour')
      setShowFeedback(false)
    } catch {
      toast.error("Erreur lors de l'enregistrement du feedback")
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/60">
      {/* En-tête */}
      <div className="mb-3 flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{assignment.orderNumber}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{assignment.customerName} · {assignment.customerAddress}</p>
        </div>
        <StatusBadge map={DELIVERY_STATUS} value={assignment.status} />
      </div>

      {/* Timeline */}
      <div className="mb-1 flex items-center gap-1">
        {timeline.map((step, i) => (
          <div key={i} className="flex flex-1 items-center">
            <div className={cn('h-2.5 w-2.5 flex-shrink-0 rounded-full', step.done ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600')} />
            {i < timeline.length - 1 && <div className={cn('h-0.5 flex-1', step.done && timeline[i + 1].done ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700')} />}
          </div>
        ))}
      </div>
      <div className="mb-3 flex justify-between text-[10px] text-gray-400 dark:text-gray-500">
        {timeline.map((step, i) => (
          <span key={i} className="max-w-[60px] truncate">{step.date ? formatDate(step.date) : '—'}</span>
        ))}
      </div>

      {/* Note enregistrée */}
      {(assignment.rating || assignment.notes) && (
        <div className="mb-3 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-900">
          <p className="mb-1 text-[11px] font-medium text-gray-500 dark:text-gray-400">Feedback enregistré</p>
          {assignment.rating && assignment.rating > 0 && (
            <div className="mb-1 flex items-center gap-2">
              <StarRating value={assignment.rating} readonly />
              <span className="text-xs text-gray-500 dark:text-gray-400">{STAR_LABELS[assignment.rating]}</span>
            </div>
          )}
          {assignment.notes && (
            <p className="text-xs italic text-gray-700 dark:text-gray-300">"{assignment.notes}"</p>
          )}
        </div>
      )}

      {/* Actions de statut */}
      {!isFinished && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {assignment.status === 'assigned' && <StatusBtn status="picked-up" label="Marquer récupérée" assignment={assignment} updateStatus={updateStatus} />}
          {assignment.status === 'picked-up' && <StatusBtn status="in-transit" label="Marquer en transit" assignment={assignment} updateStatus={updateStatus} />}
          {assignment.status === 'in-transit' && (
            <>
              <StatusBtn status="delivered" label="Livrée" assignment={assignment} updateStatus={updateStatus} />
              <StatusBtn status="failed" label="Échouée" assignment={assignment} updateStatus={updateStatus} variant="danger" />
            </>
          )}
        </div>
      )}

      {/* Bouton feedback */}
      <Button variant="ghost" size="sm" leftIcon={showFeedback ? undefined : (assignment.rating ? Pencil : Plus)} onClick={() => setShowFeedback(!showFeedback)}>
        {showFeedback ? 'Masquer' : (assignment.rating ? 'Modifier le feedback' : 'Ajouter un feedback')}
      </Button>

      {/* Panneau feedback */}
      {showFeedback && (
        <div className="mt-3 space-y-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div>
            <p className="mb-1 text-xs font-medium text-gray-700 dark:text-gray-300">Note de livraison</p>
            <div className="flex items-center gap-3">
              <StarRating value={rating} onChange={setRating} />
              {rating > 0 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">{STAR_LABELS[rating]}</span>
              )}
            </div>
          </div>
          <FormField label="Commentaire (optionnel)">
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={2}
              placeholder="Ex : Livreur ponctuel, colis bien emballé…"
              className="resize-none text-xs"
            />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowFeedback(false)}>
              Annuler
            </Button>
            <Button
              size="sm"
              onClick={handleSaveFeedback}
              disabled={rating === 0}
              loading={rateAssignment.isPending}
              title={rating === 0 ? 'Sélectionnez une note avant de valider' : ''}
            >
              Enregistrer
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBtn({ status, label, assignment, updateStatus, variant = 'primary' }: {
  status: DeliveryAssignment['status']
  label: string
  assignment: DeliveryAssignment
  updateStatus: ReturnType<typeof useUpdateAssignmentStatus>
  variant?: 'primary' | 'danger'
}) {
  return (
    <Button
      size="sm"
      variant={variant}
      loading={updateStatus.isPending}
      onClick={() =>
        updateStatus.mutate(
          { id: assignment.id, status, notes: assignment.notes },
          {
            onSuccess: () => toast.success('Statut mis à jour'),
            onError: () => toast.error('Erreur lors de la mise à jour du statut'),
          },
        )
      }
    >
      {label}
    </Button>
  )
}

// ---------------------------------------------------------------------------
// Formulaire assignation rapide — avec liste de commandes disponibles
// ---------------------------------------------------------------------------
function AssignForm({ deliveryPersonId, onClose }: { deliveryPersonId: string; onClose: () => void }) {
  const assign = useAssignDelivery()
  const { data: availableOrders = [], isLoading: loadingOrders } = useAvailableOrders()
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [advancedMode, setAdvancedMode] = useState(false)
  const [manualOrderId, setManualOrderId] = useState('')
  const [error, setError] = useState('')

  const orderId = advancedMode ? manualOrderId.trim() : selectedOrderId

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!orderId) { setError(advancedMode ? 'ID de commande requis' : 'Sélectionnez une commande'); return }
    try {
      await assign.mutateAsync({ deliveryPersonId, orderId })
      toast.success('Commande assignée au livreur')
      onClose()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur'
      setError(message)
      toast.error(message)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 rounded-lg border border-primary-200 bg-primary-50 p-4 dark:border-primary-500/30 dark:bg-primary-500/10">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Nouvelle assignation</h4>
        <button type="button" onClick={() => setAdvancedMode(!advancedMode)}
          className="text-xs text-gray-400 underline hover:text-gray-600 dark:hover:text-gray-300">
          {advancedMode ? 'Choisir dans la liste' : 'Mode avancé (ID manuel)'}
        </button>
      </div>

      {error && <div className="mb-3 rounded bg-red-50 p-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-400">{error}</div>}

      {advancedMode ? (
        /* Mode avancé — saisie libre */
        <div className="flex gap-2">
          <Input
            size="sm"
            className="flex-1"
            value={manualOrderId}
            onChange={(e) => setManualOrderId(e.target.value)}
            placeholder="ID de la commande (ex: ord_xxx)"
          />
          <Button type="submit" size="sm" loading={assign.isPending}>
            Assigner
          </Button>
        </div>
      ) : (
        /* Mode normal — liste de commandes disponibles */
        <>
          {loadingOrders ? (
            <LoadingBlock label="Chargement des commandes…" />
          ) : availableOrders.length === 0 ? (
            <p className="py-2 text-center text-xs text-gray-500 dark:text-gray-400">
              Aucune commande disponible pour assignation.
            </p>
          ) : (
            <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
              {availableOrders.map((order) => (
                <label
                  key={order.id}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                    selectedOrderId === order.id
                      ? 'border-primary-500 bg-white dark:border-primary-500 dark:bg-gray-900'
                      : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900/50 dark:hover:border-gray-600',
                  )}
                >
                  <input
                    type="radio"
                    name="order"
                    value={order.id}
                    checked={selectedOrderId === order.id}
                    onChange={() => { setSelectedOrderId(order.id); setError('') }}
                    className="mt-0.5 flex-shrink-0 accent-primary-600"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{order.orderNumber}</span>
                      <span className="whitespace-nowrap text-xs font-medium text-gray-600 dark:text-gray-300">
                        {order.amount.toLocaleString('fr-FR')} {order.currency}
                      </span>
                    </div>
                    <p className="truncate text-xs text-gray-600 dark:text-gray-300">{order.customerName}</p>
                    <p className="truncate text-xs text-gray-400 dark:text-gray-500">{order.customerAddress}</p>
                  </div>
                </label>
              ))}
            </div>
          )}

          <div className="mt-3 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" size="sm" disabled={!selectedOrderId} loading={assign.isPending}>
              Confirmer l'assignation
            </Button>
          </div>
        </>
      )}
    </form>
  )
}
