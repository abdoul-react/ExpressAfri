import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, ClipboardList } from 'lucide-react'
import { useAdminAssignments, useUpdateAssignmentStatus, useAssignDelivery } from '../hooks/useAdminDelivery'
import { useAdminDeliveryPersons } from '../hooks/useAdminDelivery'
import { PermissionGuard } from '@/components/guards/PermissionGuard'
import type { DeliveryAssignment } from '@/infrastructure/data-source/AdminDeliveryDataSource'
import {
  PageHeader, Button, Card, StatusBadge, Modal, Select, Input, FormField, LoadingBlock, EmptyState,
} from '@/components/ui'
import { DELIVERY_STATUS } from '@/lib/status'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/format'

export function AdminDeliveryAssignmentsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedPersonId = searchParams.get('deliveryPersonId') || undefined
  const { data: persons } = useAdminDeliveryPersons({ limit: 100 })
  const { data: assignments, isLoading } = useAdminAssignments(selectedPersonId)
  const updateStatus = useUpdateAssignmentStatus()
  const assign = useAssignDelivery()

  const [showAssign, setShowAssign] = useState(false)
  const [assignPersonId, setAssignPersonId] = useState('')
  const [assignOrderId, setAssignOrderId] = useState('')
  const [assignError, setAssignError] = useState('')

  async function handleAssign() {
    if (!assignPersonId || !assignOrderId) { setAssignError('Sélectionnez un livreur et entrez un ID de commande'); return }
    try {
      await assign.mutateAsync({ deliveryPersonId: assignPersonId, orderId: assignOrderId })
      setShowAssign(false)
      setAssignOrderId('')
      setAssignError('')
      toast.success('Commande assignée au livreur')
    } catch (err: any) {
      setAssignError(err.message || 'Erreur')
      toast.error(err.message || "Erreur lors de l'assignation")
    }
  }

  async function handleUpdateStatus(assignment: DeliveryAssignment, status: DeliveryAssignment['status']) {
    try {
      await updateStatus.mutateAsync({ id: assignment.id, status, notes: assignment.notes })
      toast.success('Statut de la livraison mis à jour')
    } catch {
      toast.error('Erreur lors de la mise à jour du statut')
    }
  }

  return (
    <div>
      <PageHeader
        title="Assignations"
        description="Gestion des livraisons assignées aux livreurs"
        actions={
          <PermissionGuard permission="shipping.create">
            <Button leftIcon={Plus} onClick={() => setShowAssign(true)}>
              Nouvelle assignation
            </Button>
          </PermissionGuard>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select
          size="sm"
          value={selectedPersonId ?? ''}
          onChange={(v) => {
            if (v) setSearchParams({ deliveryPersonId: v })
            else setSearchParams({})
          }}
          placeholder="Tous les livreurs"
          options={(persons?.data ?? []).map((p: any) => ({ value: p.id, label: `${p.name} - ${p.zone}` }))}
        />
        {assignments && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {assignments.length} assignation{assignments.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <Modal
        open={showAssign}
        onOpenChange={(o) => { if (!o) { setShowAssign(false); setAssignError('') } }}
        title="Nouvelle assignation"
        description="Assignez une commande à un livreur actif"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => { setShowAssign(false); setAssignError('') }}>Annuler</Button>
            <Button loading={assign.isPending} onClick={handleAssign}>Assigner</Button>
          </>
        }
      >
        <div className="space-y-4">
          {assignError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">{assignError}</div>
          )}
          <FormField label="Livreur" required>
            <Select
              size="sm"
              className="w-full"
              value={assignPersonId}
              onChange={setAssignPersonId}
              placeholder="Sélectionner un livreur"
              placeholderSelectable={false}
              options={(persons?.data ?? []).filter((p) => p.isActive).map((p) => ({ value: p.id, label: p.name }))}
            />
          </FormField>
          <FormField label="ID commande" required hint="Format attendu : ord_xxx">
            <Input size="sm" value={assignOrderId} onChange={(e) => setAssignOrderId(e.target.value)} placeholder="ID commande (ord_xxx)" />
          </FormField>
        </div>
      </Modal>

      {isLoading ? (
        <LoadingBlock label="Chargement des assignations…" />
      ) : (
        <div className="space-y-3">
          {assignments && assignments.length === 0 ? (
            <Card padding="none">
              <EmptyState
                icon={ClipboardList}
                title="Aucune assignation trouvée"
                description="Créez une nouvelle assignation pour confier une commande à un livreur."
              />
            </Card>
          ) : (
            assignments?.map((a) => (
              <Card key={a.id} padding="sm">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{a.orderNumber}</span>
                      <StatusBadge map={DELIVERY_STATUS} value={a.status} />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Livreur: {a.deliveryPersonName} · Client: {a.customerName}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{a.customerAddress}</p>
                    <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-gray-400 dark:text-gray-500">
                      <span>Assignée: {formatDate(a.assignedAt)}</span>
                      {a.pickedUpAt && <span>Récupérée: {formatDate(a.pickedUpAt)}</span>}
                      {a.deliveredAt && <span>Finalisée: {formatDate(a.deliveredAt)}</span>}
                    </div>
                    {a.notes && <p className="mt-1 text-xs italic text-gray-500 dark:text-gray-400">Note: {a.notes}</p>}
                  </div>
                  <PermissionGuard permission="shipping.update">
                    <div className="ml-4 flex flex-col gap-1.5">
                      {a.status === 'assigned' && (
                        <Button size="sm" variant="secondary" loading={updateStatus.isPending} onClick={() => handleUpdateStatus(a, 'picked-up')}>
                          Récupérée
                        </Button>
                      )}
                      {a.status === 'picked-up' && (
                        <Button size="sm" variant="secondary" loading={updateStatus.isPending} onClick={() => handleUpdateStatus(a, 'in-transit')}>
                          En transit
                        </Button>
                      )}
                      {a.status === 'in-transit' && (
                        <div className="flex gap-1.5">
                          <Button size="sm" loading={updateStatus.isPending} onClick={() => handleUpdateStatus(a, 'delivered')}>
                            Livrée
                          </Button>
                          <Button size="sm" variant="danger" loading={updateStatus.isPending} onClick={() => handleUpdateStatus(a, 'failed')}>
                            Échouée
                          </Button>
                        </div>
                      )}
                    </div>
                  </PermissionGuard>
                </div>

                <div className="mt-2 flex items-center gap-1">
                  {(['assigned', 'picked-up', 'in-transit', 'delivered'] as const).map((step, i) => {
                    const orderStatus: string = a.status
                    const done = orderStatus === 'delivered' || orderStatus === 'failed' ||
                      step === 'assigned' ||
                      (step === 'picked-up' && a.pickedUpAt != null) ||
                      (step === 'in-transit' && (orderStatus === 'in-transit' || orderStatus === 'delivered' || orderStatus === 'failed')) ||
                      (step === 'delivered' && (orderStatus === 'delivered' || orderStatus === 'failed'))
                    return (
                      <div key={step} className="flex flex-1 items-center">
                        <div className={cn('h-2.5 w-2.5 rounded-full', done ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600')} />
                        {i < 3 && <div className={cn('h-0.5 flex-1', done ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700')} />}
                      </div>
                    )
                  })}
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-gray-400 dark:text-gray-500">
                  <span>Assignée</span>
                  <span>Récupérée</span>
                  <span>Transit</span>
                  <span>Finalisée</span>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}
