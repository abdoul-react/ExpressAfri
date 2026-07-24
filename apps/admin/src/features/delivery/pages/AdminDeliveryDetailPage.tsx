import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Bike, Car, Truck, Star, Phone, Mail, MapPin, Home, CreditCard, Hash, Globe,
  CheckCircle2, XCircle, Pencil, Pause, Play, ShieldCheck, ShieldOff, ClipboardList, UserX,
} from 'lucide-react'
import { useAdminDeliveryPerson, useUpdateDeliveryPerson, useAdminAssignments } from '../hooks/useAdminDelivery'
import { PermissionGuard } from '@/components/guards/PermissionGuard'
import { GEOGRAPHY } from '../services/geographyService'
import { WORLD_COUNTRIES } from '@/lib/countries'
import type { DeliveryAssignment } from '@/infrastructure/data-source/AdminDeliveryDataSource'
import { resolveAdminMediaUrl } from '@/lib/resolveAdminMediaUrl'
import {
  PageHeader, Button, Badge, StatusBadge, Card, CardHeader, CardTitle,
  DataTable, type Column, StatCard, LoadingBlock, EmptyState,
} from '@/components/ui'
import { DELIVERY_STATUS } from '@/lib/status'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/cn'
const VEHICLE_META: Record<string, { label: string; icon: typeof Bike }> = {
  bike: { label: 'Moto', icon: Bike },
  car: { label: 'Voiture', icon: Car },
  truck: { label: 'Camion', icon: Truck },
}

import { formatDate } from '@/lib/format'

// ─── Page principale ───────────────────────────────────────────────────────────
export function AdminDeliveryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: person, isLoading, isError } = useAdminDeliveryPerson(id ?? '')
  const { data: assignments = [] } = useAdminAssignments(id)
  const updatePerson = useUpdateDeliveryPerson()

  const flag = WORLD_COUNTRIES.find((c) => c.code === (person?.country?.code ?? ''))?.flag
    ?? GEOGRAPHY.find((c) => c.code === (person?.country?.code ?? ''))?.flag
    ?? ''

  // Stats calculées depuis les assignations
  const delivered = assignments.filter((a) => a.status === 'delivered')
  const failed = assignments.filter((a) => a.status === 'failed')
  const total = delivered.length + failed.length
  const successRate = total > 0 ? Math.round((delivered.length / total) * 100) : 0
  const inProgress = assignments.filter(
    (a) => a.status === 'assigned' || a.status === 'picked-up' || a.status === 'in-transit'
  ).length

  async function handleToggleActive() {
    if (!person) return
    try {
      await updatePerson.mutateAsync({ id: person.id, data: { isActive: !person.isActive } })
      toast.success(person.isActive ? 'Livreur suspendu' : 'Livreur réactivé')
    } catch {
      toast.error('Erreur lors de la mise à jour du statut')
    }
  }
  async function handleToggleVerified() {
    if (!person) return
    try {
      await updatePerson.mutateAsync({ id: person.id, data: { isVerified: !person.isVerified } })
      toast.success(person.isVerified ? 'Vérification révoquée' : 'Livreur vérifié')
    } catch {
      toast.error('Erreur lors de la mise à jour de la vérification')
    }
  }

  // ── États de chargement / erreur ────────────────────────────────────────────
  if (isLoading) {
    return <LoadingBlock label="Chargement du profil…" />
  }
  if (isError || !person) {
    return (
      <EmptyState
        icon={UserX}
        title="Livreur introuvable"
        description="Ce livreur n'existe pas ou a été supprimé."
        action={
          <Button onClick={() => navigate('/delivery')}>Retour à la liste</Button>
        }
      />
    )
  }

  const vehicle = VEHICLE_META[person.vehicleType]
  const VehicleIcon = vehicle?.icon ?? Bike

  return (
    <div className="space-y-6">
      <PageHeader
        title={person.name}
        description={`${vehicle?.label ?? person.vehicleType} · ${flag} ${person.country?.name ?? ''} · ${person.region}`}
        backHref="/delivery"
        breadcrumbs={[
          { label: 'Livreurs', href: '/delivery' },
          { label: person.name },
        ]}
        actions={
          <PermissionGuard permission="delivery.manage">
            <Button variant="outline" leftIcon={Pencil} onClick={() => navigate(`/delivery?edit=${person.id}`)}>
              Modifier
            </Button>
            <Button
              variant="outline"
              leftIcon={person.isActive ? Pause : Play}
              loading={updatePerson.isPending}
              onClick={handleToggleActive}
            >
              {person.isActive ? 'Suspendre' : 'Réactiver'}
            </Button>
            <Button
              variant={person.isVerified ? 'outline' : 'secondary'}
              leftIcon={person.isVerified ? ShieldOff : ShieldCheck}
              loading={updatePerson.isPending}
              onClick={handleToggleVerified}
            >
              {person.isVerified ? 'Révoquer vérif.' : 'Vérifier'}
            </Button>
          </PermissionGuard>
        }
      />

      {/* ── Carte profil ────────────────────────────────────────────────────── */}
      <Card>
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          {/* Avatar / photo */}
          {person.profilePhoto ? (
            <img
              src={resolveAdminMediaUrl(person.profilePhoto)}
              alt={person.name}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
              className="h-20 w-20 flex-shrink-0 rounded-full border-2 border-gray-200 object-cover dark:border-gray-700"
            />
          ) : (
            <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full border-2 border-primary-200 bg-primary-50 dark:border-primary-500/30 dark:bg-primary-500/10">
              <span className="text-2xl font-bold text-primary-700 dark:text-primary-300">
                {person.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
              </span>
            </div>
          )}

          {/* Nom + badges */}
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">{person.name}</h2>
              {person.isVerified && (
                <Badge variant="info">
                  <CheckCircle2 className="h-3 w-3" />
                  Vérifié
                </Badge>
              )}
              <Badge variant={person.isActive ? 'success' : 'neutral'} dot>
                {person.isActive ? 'Actif' : 'Inactif'}
              </Badge>
            </div>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
              <span className="inline-flex items-center gap-1.5">
                <VehicleIcon className="h-4 w-4" /> {vehicle?.label ?? person.vehicleType}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" /> {flag} {person.country?.name ?? ''} · {person.region}
              </span>
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Membre depuis le {formatDate(person.joinedAt)}
            </p>
          </div>

          {/* Note */}
          {person.rating > 0 && (
            <div className="flex-shrink-0 text-center">
              <p className="flex items-center justify-center gap-1.5 text-2xl font-semibold text-gray-900 dark:text-gray-100">
                <Star className="h-6 w-6 fill-current text-amber-400" />
                {person.rating.toFixed(1)}
              </p>
              <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{person.ratingCount} avis</p>
            </div>
          )}
        </div>
      </Card>

      {/* ── Stats ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Livraisons totales" value={person.totalDeliveries} icon={Truck} tone="primary" />
        <StatCard label="En cours" value={inProgress} icon={Bike} tone="info" />
        <StatCard label="Réussies" value={delivered.length} icon={CheckCircle2} tone="success" />
        <StatCard label="Échouées" value={failed.length} icon={XCircle} tone="warning" />
      </div>

      {/* ── Grille : Infos + Taux de succès ─────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Infos personnelles */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Informations</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoRow icon={Phone} label="Téléphone" value={person.phone} />
            <InfoRow icon={Mail} label="Email" value={person.email ?? '—'} />
            <InfoRow icon={Globe} label="Pays" value={`${flag} ${person.country?.name ?? '—'}`} />
            <InfoRow icon={MapPin} label="Région" value={person.region} />
            {person.address && <InfoRow icon={Home} label="Adresse" value={person.address} />}
            {person.idCardNumber && <InfoRow icon={CreditCard} label="Pièce d'identité" value={person.idCardNumber} />}
            <InfoRow icon={VehicleIcon} label="Véhicule" value={vehicle?.label ?? person.vehicleType} />
            {person.licensePlate && <InfoRow icon={Hash} label="Plaque" value={person.licensePlate} />}
          </div>
        </Card>

        {/* Taux de succès */}
        <Card>
          <CardHeader>
            <CardTitle>Performance</CardTitle>
          </CardHeader>
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800/60">
            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Taux de succès</p>
            <div className="flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    successRate >= 90 ? 'bg-green-500' : successRate >= 70 ? 'bg-amber-500' : 'bg-red-500',
                  )}
                  style={{ width: `${successRate}%` }}
                />
              </div>
              <span className="w-10 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">{successRate}%</span>
            </div>
            <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
              Calculé sur {total} livraison{total > 1 ? 's' : ''} finalisée{total > 1 ? 's' : ''}
            </p>
          </div>
        </Card>
      </div>

      {/* ── Historique des assignations ─────────────────────────────────────── */}
      <AssignmentHistory assignments={assignments} />
    </div>
  )
}

// ─── Sous-composants ───────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400 dark:text-gray-500" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <p className="break-words text-sm text-gray-900 dark:text-gray-100">{value}</p>
      </div>
    </div>
  )
}

// ─── Historique des assignations ──────────────────────────────────────────────
function AssignmentHistory({ assignments }: { assignments: DeliveryAssignment[] }) {
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 5
  const total = assignments.length
  const paginated = assignments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const columns: Column<DeliveryAssignment>[] = [
    {
      key: 'orderNumber',
      header: 'Commande',
      cell: (a) => <span className="whitespace-nowrap font-medium text-gray-900 dark:text-gray-100">{a.orderNumber}</span>,
    },
    { key: 'customerName', header: 'Client', cell: (a) => a.customerName },
    {
      key: 'customerAddress',
      header: 'Adresse',
      hideBelow: 'md',
      cell: (a) => (
        <span className="block max-w-[220px] truncate text-gray-500 dark:text-gray-400" title={a.customerAddress}>
          {a.customerAddress}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      cell: (a) => <StatusBadge map={DELIVERY_STATUS} value={a.status} />,
    },
    {
      key: 'assignedAt',
      header: 'Date assignation',
      hideBelow: 'lg',
      cell: (a) => <span className="whitespace-nowrap text-gray-500 dark:text-gray-400">{formatDate(a.assignedAt, { time: true })}</span>,
    },
    {
      key: 'rating',
      header: 'Note',
      cell: (a) =>
        a.rating ? (
          <span className="inline-flex gap-0.5">
            {Array.from({ length: a.rating }).map((_, i) => (
              <Star key={i} className="h-3.5 w-3.5 fill-current text-amber-400" />
            ))}
          </span>
        ) : (
          <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
        ),
    },
  ]

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          Historique des assignations
          {total > 0 && <span className="ml-2 text-sm font-normal text-gray-400 dark:text-gray-500">({total})</span>}
        </h2>
      </div>
      <DataTable<DeliveryAssignment>
        bare
        data={paginated}
        columns={columns}
        rowKey={(a) => a.id}
        empty={{
          icon: ClipboardList,
          title: 'Aucune assignation pour ce livreur',
          description: 'Les livraisons assignées à ce livreur apparaîtront ici.',
        }}
        pagination={{
          page,
          pageSize: PAGE_SIZE,
          total,
          onPageChange: setPage,
        }}
      />
    </Card>
  )
}
