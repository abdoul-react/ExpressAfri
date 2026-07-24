import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle, Ban, CheckCircle2, ExternalLink, FileCheck, LayoutDashboard, Pencil, ShieldAlert, Store, Trash2, Users, XCircle,
} from 'lucide-react'
import { useAdminStore, useUpdateStore, useDeleteStore } from '../hooks/useAdminStores'
import { useApproveStore, useRejectStore, useSuspendStore, useReactivateStore, useUpdateKyc, useUpdateDocument, useUpdateCommission } from '../hooks/useStoreActions'
import { PermissionGuard } from '@/components/guards/PermissionGuard'
import { StoreManagersSection } from '../components/StoreManagersSection'
import {
  PageHeader, Card, CardHeader, CardTitle, CardContent, Button, StatusBadge, Badge,
  LoadingBlock, EmptyState, ConfirmDialog, Modal, Input, FormField, Select, Tabs, TabsList, TabsTrigger, TabsContent,
} from '@/components/ui'
import { STORE_STATUS, KYC_STATUS, SANCTION_TYPE, statusMeta } from '@/lib/status'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/cn'
import { WORLD_COUNTRIES } from '@/lib/countries'

const DOC_TYPE_LABELS: Record<string, string> = { id_card: "Carte d'identité", passport: 'Passeport', business_registration: 'Registre de commerce (RCCM)', tax_certificate: 'Attestation fiscale (NIF)', bank_statement: 'Relevé bancaire', other: 'Autre' }

import { formatPrice, formatDate } from '@/lib/format'

const SANCTION_ICONS: Record<string, { icon: typeof AlertTriangle; cls: string }> = {
  warning: { icon: AlertTriangle, cls: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' },
  suspension: { icon: Ban, cls: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400' },
  rejection: { icon: XCircle, cls: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400' },
  reactivation: { icon: CheckCircle2, cls: 'bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400' },
}

interface ConfirmState {
  title: string
  description: string
  variant?: 'danger' | 'default'
  confirmLabel: string
  onConfirm: () => Promise<void>
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-right font-medium text-gray-900 dark:text-gray-100">{value}</span>
    </div>
  )
}

export function AdminStoreDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { data: store, isLoading, isError, error } = useAdminStore(id!)
  const approve = useApproveStore()
  const reject = useRejectStore()
  const suspend = useSuspendStore()
  const reactivate = useReactivateStore()
  const updateKyc = useUpdateKyc()
  const updateDocument = useUpdateDocument()
  const updateCommission = useUpdateCommission()

  const updateStore = useUpdateStore()
  const deleteStore = useDeleteStore()

  const [tab, setTab] = useState('overview')
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [actionReason, setActionReason] = useState('')
  const [reasonModal, setReasonModal] = useState<'reject' | 'suspend' | null>(null)
  const [editingCommission, setEditingCommission] = useState(false)
  const [commissionValue, setCommissionValue] = useState(0)
  const [rejectingDoc, setRejectingDoc] = useState<string | null>(null)
  const [docReason, setDocReason] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', city: '', country: '', description: '' })

  if (isLoading) return <LoadingBlock label="Chargement de la boutique…" />
  if (isError) {
    return (
      <Card padding="none">
        <EmptyState icon={XCircle} title="Erreur de chargement" description={(error as Error)?.message} />
      </Card>
    )
  }
  if (!store) {
    return (
      <Card padding="none">
        <EmptyState
          icon={Store}
          title="Boutique introuvable"
          action={<Button variant="outline" onClick={() => navigate('/stores')}>Retour aux boutiques</Button>}
        />
      </Card>
    )
  }
  const s = store
  const kyc = s.kyc

  function askApprove() {
    setConfirm({
      title: 'Approuver la boutique',
      description: `Approuver « ${s.name} » ? Elle deviendra visible sur la plateforme.`,
      confirmLabel: 'Approuver',
      onConfirm: async () => {
        try {
          await approve.mutateAsync(s.id)
          toast.success('Boutique approuvée')
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Erreur lors de l'approbation")
        }
      },
    })
  }

  function askReactivate() {
    setConfirm({
      title: 'Réactiver la boutique',
      description: `Réactiver « ${s.name} » ? Elle redeviendra visible et opérationnelle.`,
      confirmLabel: 'Réactiver',
      onConfirm: async () => {
        try {
          await reactivate.mutateAsync(s.id)
          toast.success('Boutique réactivée')
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Erreur lors de la réactivation')
        }
      },
    })
  }

  async function handleReasonSubmit() {
    const isReject = reasonModal === 'reject'
    try {
      if (isReject) await reject.mutateAsync({ id: s.id, reason: actionReason || undefined })
      else await suspend.mutateAsync({ id: s.id, reason: actionReason || undefined })
      toast.success(isReject ? 'Boutique rejetée' : 'Boutique suspendue')
      setReasonModal(null)
      setActionReason('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Une erreur est survenue')
    }
  }

  async function handleCommissionSave() {
    if (commissionValue < 0 || commissionValue > 100) return
    try {
      await updateCommission.mutateAsync({ id: s.id, payload: { commissionRate: commissionValue } })
      toast.success('Commission mise à jour')
      setEditingCommission(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour')
    }
  }

  async function handleDocApprove(docId: string) {
    try {
      await updateDocument.mutateAsync({ storeId: s.id, docId, payload: { status: 'approved' } })
      toast.success('Document approuvé')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'approbation du document")
    }
  }

  async function handleDocReject() {
    if (!rejectingDoc) return
    try {
      await updateDocument.mutateAsync({ storeId: s.id, docId: rejectingDoc, payload: { status: 'rejected', rejectionReason: docReason || undefined } })
      toast.success('Document rejeté')
      setRejectingDoc(null)
      setDocReason('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors du rejet du document')
    }
  }

  function askKycApprove() {
    setConfirm({
      title: 'Approuver le KYC',
      description: 'Valider l’ensemble du dossier KYC de cette boutique ?',
      confirmLabel: 'Approuver',
      onConfirm: async () => {
        try {
          await updateKyc.mutateAsync({ id: s.id, payload: { status: 'approved', reviewedBy: 'Admin' } })
          toast.success('KYC approuvé')
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Erreur lors de l'approbation du KYC")
        }
      },
    })
  }

  function askKycReject() {
    setConfirm({
      title: 'Rejeter le KYC',
      description: 'Rejeter le dossier KYC pour « Documents non conformes » ? Le vendeur devra soumettre à nouveau.',
      variant: 'danger',
      confirmLabel: 'Rejeter',
      onConfirm: async () => {
        try {
          await updateKyc.mutateAsync({ id: s.id, payload: { status: 'rejected', rejectionReason: 'Documents non conformes', reviewedBy: 'Admin' } })
          toast.success('KYC rejeté')
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Erreur lors du rejet du KYC')
        }
      },
    })
  }

  return (
    <div>
      <PageHeader
        backHref="/stores"
        breadcrumbs={[{ label: 'Boutiques', href: '/stores' }, { label: s.name }]}
        title={
          <span className="flex items-center gap-3">
            {s.name}
            <StatusBadge map={STORE_STATUS} value={s.status} dot />
          </span>
        }
        description={`Créée le ${formatDate(s.createdAt)} · ${s.city}, ${s.country}`}
        actions={
          <>
            {s.status === 'pending' && (
              <>
                <PermissionGuard permission="stores.approve">
                  <Button leftIcon={CheckCircle2} disabled={approve.isPending} onClick={askApprove}>
                    Approuver
                  </Button>
                </PermissionGuard>
                <PermissionGuard permission="stores.reject">
                  <Button variant="danger" leftIcon={XCircle} onClick={() => { setActionReason(''); setReasonModal('reject') }}>
                    Rejeter
                  </Button>
                </PermissionGuard>
              </>
            )}
            {s.status === 'approved' && (
              <PermissionGuard permission="stores.update">
                <Button variant="outline" leftIcon={Ban} onClick={() => { setActionReason(''); setReasonModal('suspend') }}>
                  Suspendre
                </Button>
              </PermissionGuard>
            )}
            {(s.status === 'suspended' || s.status === 'rejected') && (
              <PermissionGuard permission="stores.update">
                <Button leftIcon={CheckCircle2} disabled={reactivate.isPending} onClick={askReactivate}>
                  Réactiver
                </Button>
              </PermissionGuard>
            )}
            <PermissionGuard permission="stores.update">
              <Button variant="outline" leftIcon={Pencil}
                onClick={() => {
                  setEditForm({ name: s.name, email: s.ownerEmail, phone: s.phone, city: s.city, country: s.country, description: s.description ?? '' })
                  setEditOpen(true)
                }}>
                Modifier
              </Button>
            </PermissionGuard>
            <PermissionGuard permission="stores.delete">
              <Button variant="danger" leftIcon={Trash2}
                onClick={() => setConfirm({
                  title: 'Supprimer la boutique',
                  description: `La boutique « ${s.name} » et tous ses gérants associés seront supprimés définitivement. Cette action est irréversible.`,
                  variant: 'danger',
                  confirmLabel: 'Supprimer',
                  onConfirm: async () => {
                    try {
                      await deleteStore.mutateAsync(s.id)
                      toast.success(`Boutique « ${s.name} » supprimée`)
                      navigate('/stores')
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression')
                    }
                  },
                })}>
                Supprimer
              </Button>
            </PermissionGuard>
          </>
        }
      />

      <Modal
        open={editOpen}
        onOpenChange={(o) => { if (!o) setEditOpen(false) }}
        title="Modifier la boutique"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Annuler</Button>
            <Button
              loading={updateStore.isPending}
              onClick={async () => {
                try {
                  await updateStore.mutateAsync({ id: s.id, payload: editForm })
                  toast.success('Boutique mise à jour')
                  setEditOpen(false)
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour')
                }
              }}
            >
              Enregistrer
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Nom de la boutique" required>
            <Input size="sm" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          </FormField>
          <FormField label="Email de contact">
            <Input type="email" size="sm" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
          </FormField>
          <FormField label="Téléphone">
            <Input size="sm" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
          </FormField>
          <FormField label="Ville">
            <Input size="sm" value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
          </FormField>
          <FormField label="Pays">
            <Select
              size="sm"
              className="w-full"
              value={editForm.country}
              onChange={(v) => setEditForm({ ...editForm, country: v })}
              options={WORLD_COUNTRIES.map((c) => ({ value: c.name, label: `${c.flag} ${c.name}` }))}
            />
          </FormField>
          <FormField label="Description">
            <Input size="sm" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
          </FormField>
        </div>
      </Modal>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList variant="underline">
          <TabsTrigger value="overview" icon={LayoutDashboard}>Aperçu</TabsTrigger>
          <TabsTrigger value="kyc" icon={FileCheck}>KYC</TabsTrigger>
          <TabsTrigger value="managers" icon={Users}>Gérants</TabsTrigger>
          <TabsTrigger value="sanctions" icon={ShieldAlert} badge={s.sanctions.length}>Sanctions</TabsTrigger>
        </TabsList>

        {/* ─── Aperçu ─── */}
        <TabsContent value="overview">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle>Informations</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <InfoRow label="Propriétaire" value={s.ownerName} />
                  <InfoRow label="Email" value={s.ownerEmail} />
                  <InfoRow label="Téléphone" value={s.phone} />
                  <InfoRow label="Ville" value={s.city} />
                  <InfoRow label="Pays" value={s.country} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Statistiques</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <InfoRow label="Produits" value={s.productCount} />
                  <InfoRow label="Commandes" value={s.totalOrders} />
                  <InfoRow label="Revenu total" value={formatPrice(s.revenue)} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Commission</CardTitle></CardHeader>
                <CardContent>
                  {editingCommission ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Input type="number" min={0} max={100} step={0.5} size="sm" autoFocus
                          value={commissionValue}
                          onChange={(e) => setCommissionValue(parseFloat(e.target.value) || 0)}
                          className="w-24 text-center" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">%</span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" loading={updateCommission.isPending} onClick={handleCommissionSave}>
                          Enregistrer
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingCommission(false)}>
                          Annuler
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">{s.commissionRate}%</span>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">prélevé sur chaque vente</p>
                      </div>
                      <PermissionGuard permission="stores.update">
                        <Button size="sm" variant="ghost" className="text-primary-600 dark:text-primary-400"
                          onClick={() => { setCommissionValue(s.commissionRate); setEditingCommission(true) }}>
                          Modifier
                        </Button>
                      </PermissionGuard>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6 lg:col-span-2">
              <Card>
                <CardHeader><CardTitle>Description</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">{s.description}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Produits de la boutique</CardTitle>
                  {s.productCount > 0 && (
                    <Button variant="ghost" size="sm" rightIcon={ExternalLink} className="text-primary-600 dark:text-primary-400"
                      onClick={() => navigate(`/products?store=${s.id}`)}>
                      Voir tout ({s.productCount})
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {s.productCount > 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {s.productCount} produit(s) publié(s) par cette boutique.
                    </p>
                  ) : (
                    <EmptyState icon={Store} title="Aucun produit pour le moment" className="py-8" />
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ─── KYC ─── */}
        <TabsContent value="kyc">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Statut du dossier</CardTitle>
                {kyc.status === 'pending' && (
                  <PermissionGuard permission="stores.update">
                    <div className="flex gap-2">
                      <Button size="sm" leftIcon={CheckCircle2} disabled={updateKyc.isPending} onClick={askKycApprove}>
                        Approuver le KYC
                      </Button>
                      <Button size="sm" variant="danger" leftIcon={XCircle} disabled={updateKyc.isPending} onClick={askKycReject}>
                        Rejeter le KYC
                      </Button>
                    </div>
                  </PermissionGuard>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <StatusBadge map={KYC_STATUS} value={kyc.status} dot />
                  {kyc.status === 'rejected' && kyc.rejectionReason && (
                    <p className="flex-1 text-xs text-red-600 dark:text-red-400">{kyc.rejectionReason}</p>
                  )}
                </div>
                {kyc.submittedAt && (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Soumis le {formatDate(kyc.submittedAt)}</p>
                )}
                {kyc.reviewedAt && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">Révisé le {formatDate(kyc.reviewedAt)} par {kyc.reviewedBy}</p>
                )}
              </CardContent>
            </Card>

            {kyc.status !== 'not_submitted' && (
              <Card>
                <CardHeader><CardTitle>Identité du gérant</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  {[
                    { label: 'Prénom', value: kyc.ownerFirstName },
                    { label: 'Nom', value: kyc.ownerLastName },
                    { label: "N° pièce d'identité", value: kyc.ownerIdNumber },
                    { label: 'Nationalité', value: kyc.ownerNationality ?? '—' },
                    { label: 'Date de naissance', value: kyc.ownerDateOfBirth ? formatDate(kyc.ownerDateOfBirth) : '—' },
                    {
                      label: 'Type de structure',
                      value: kyc.businessType === 'company' ? 'Société' : kyc.businessType === 'association' ? 'Association' : 'Particulier',
                    },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">{label}</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{value}</span>
                    </div>
                  ))}
                  {kyc.businessName && (
                    <div className="col-span-2">
                      <span className="block text-xs text-gray-500 dark:text-gray-400">Raison sociale</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{kyc.businessName}</span>
                    </div>
                  )}
                  {kyc.rccmNumber && (
                    <div>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">RCCM</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{kyc.rccmNumber}</span>
                    </div>
                  )}
                  {kyc.taxpayerNumber && (
                    <div>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">N° Contribuable (NIF)</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{kyc.taxpayerNumber}</span>
                    </div>
                  )}
                  {kyc.businessAddress && (
                    <div className="col-span-2">
                      <span className="block text-xs text-gray-500 dark:text-gray-400">Adresse d'activité</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{kyc.businessAddress}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle>Documents KYC</CardTitle></CardHeader>
              <CardContent>
                {kyc.documents.length === 0 ? (
                  <EmptyState icon={FileCheck} title="Aucun document soumis" className="py-8" />
                ) : (
                  <div className="space-y-3">
                    {kyc.documents.map((doc) => (
                      <div key={doc.id} className="rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{doc.label}</span>
                              <StatusBadge map={KYC_STATUS} value={doc.status} size="sm" />
                            </div>
                            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                              {DOC_TYPE_LABELS[doc.type]} · Soumis le {formatDate(doc.uploadedAt)}
                            </p>
                            {doc.rejectionReason && (
                              <p className="mt-1 text-xs text-red-600 dark:text-red-400">Motif : {doc.rejectionReason}</p>
                            )}
                          </div>
                          <div className="flex flex-shrink-0 items-center gap-2">
                            <Button asChild variant="outline" size="sm">
                              <a href={doc.url} target="_blank" rel="noopener noreferrer">Voir</a>
                            </Button>
                            {doc.status === 'pending' && (
                              <PermissionGuard permission="stores.update">
                                <Button size="sm" disabled={updateDocument.isPending} onClick={() => handleDocApprove(doc.id)}>
                                  Approuver
                                </Button>
                                <Button size="sm" variant="danger" onClick={() => { setDocReason(''); setRejectingDoc(doc.id) }}>
                                  Rejeter
                                </Button>
                              </PermissionGuard>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Gérants ─── */}
        <TabsContent value="managers">
          <div className="max-w-2xl">
            <PermissionGuard permission="admins.read">
              <StoreManagersSection storeId={s.id} />
            </PermissionGuard>
          </div>
        </TabsContent>

        {/* ─── Sanctions ─── */}
        <TabsContent value="sanctions">
          <Card>
            <CardHeader>
              <CardTitle>
                Historique des sanctions
                {s.sanctions.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">({s.sanctions.length})</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {s.sanctions.length > 0 ? (
                <div className="space-y-3">
                  {[...s.sanctions].reverse().map((sanction) => {
                    const meta = SANCTION_ICONS[sanction.type] ?? SANCTION_ICONS.warning
                    const SanctionIcon = meta.icon
                    return (
                      <div key={sanction.id} className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                        <div className={cn('mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full', meta.cls)}>
                          <SanctionIcon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={statusMeta(SANCTION_TYPE, sanction.type).variant} size="sm">
                              {statusMeta(SANCTION_TYPE, sanction.type).label}
                            </Badge>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(sanction.createdAt, { time: true })}</span>
                          </div>
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{sanction.reason}</p>
                          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">Par {sanction.adminName}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <EmptyState icon={ShieldAlert} title="Aucune sanction" description="Cette boutique n'a fait l'objet d'aucune sanction." className="py-8" />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modale motif rejet / suspension */}
      <Modal
        open={reasonModal !== null}
        onOpenChange={(open) => { if (!open) { setReasonModal(null); setActionReason('') } }}
        title={reasonModal === 'reject' ? 'Rejeter la boutique' : 'Suspendre la boutique'}
        description={reasonModal === 'reject'
          ? `Le vendeur de « ${s.name} » sera informé du rejet.`
          : `« ${s.name} » ne sera plus visible pendant la suspension.`}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => { setReasonModal(null); setActionReason('') }}>Annuler</Button>
            <Button
              variant="danger"
              loading={reject.isPending || suspend.isPending}
              onClick={handleReasonSubmit}
            >
              {reasonModal === 'reject' ? 'Confirmer le rejet' : 'Confirmer la suspension'}
            </Button>
          </>
        }
      >
        <FormField label={reasonModal === 'reject' ? 'Motif du rejet' : 'Motif de la suspension'} hint="Optionnel — communiqué au vendeur.">
          <Input
            value={actionReason}
            onChange={(e) => setActionReason(e.target.value)}
            placeholder={reasonModal === 'reject' ? 'Motif du rejet…' : 'Motif de la suspension…'}
            autoFocus
            className="w-full"
          />
        </FormField>
      </Modal>

      {/* Modale rejet de document */}
      <Modal
        open={rejectingDoc !== null}
        onOpenChange={(open) => { if (!open) { setRejectingDoc(null); setDocReason('') } }}
        title="Rejeter le document"
        description="Le vendeur devra soumettre un nouveau document."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => { setRejectingDoc(null); setDocReason('') }}>Annuler</Button>
            <Button variant="danger" loading={updateDocument.isPending} onClick={handleDocReject}>
              Rejeter le document
            </Button>
          </>
        }
      >
        <FormField label="Motif du rejet" hint="Optionnel — communiqué au vendeur.">
          <Input
            value={docReason}
            onChange={(e) => setDocReason(e.target.value)}
            placeholder="Motif du rejet…"
            autoFocus
            className="w-full"
          />
        </FormField>
      </Modal>

      {confirm && (
        <ConfirmDialog
          open
          onOpenChange={(open) => { if (!open) setConfirm(null) }}
          title={confirm.title}
          description={confirm.description}
          confirmLabel={confirm.confirmLabel}
          variant={confirm.variant}
          onConfirm={confirm.onConfirm}
        />
      )}
    </div>
  )
}
