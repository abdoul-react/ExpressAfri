import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { AlertTriangle, Paperclip, Send, User } from 'lucide-react'
import {
  useAdminDispute,
  useUpdateDisputeStatus,
  useResolveDispute,
  useAddDisputeMessage,
} from '../hooks/useAdminDisputes'
import { PermissionGuard } from '@/components/guards/PermissionGuard'
import type {
  AdminDispute,
  DisputeStatus,
  DisputeResolution,
  DisputeMessage,
  DisputeTimeline,
} from '@/infrastructure/data-source/AdminDisputeDataSource'
import { resolveAdminMediaUrl } from '@/lib/resolveAdminMediaUrl'
import {
  PageHeader, Card, CardTitle, Button, Badge, StatusBadge, Modal, ConfirmDialog,
  FormField, Input, Select, Textarea, LoadingBlock,
} from '@/components/ui'
import { DISPUTE_STATUS, statusMeta, type StatusVariant } from '@/lib/status'
import { cn } from '@/lib/cn'
import { toast } from '@/lib/toast'
import { formatPrice, formatDate } from '@/lib/format'

// ─── Constantes (motifs/résolutions/rôles : pas des statuts, maps locales) ────

const REASON_LABELS: Record<string, string> = {
  not_received:     'Produit non reçu',
  not_as_described: 'Non conforme à la description',
  defective:        'Produit défectueux',
  wrong_item:       'Mauvais article reçu',
  damaged:          'Produit endommagé',
  unauthorized:     'Transaction non autorisée',
  other:            'Autre',
}

const RESOLUTION_LABELS: Record<DisputeResolution, string> = {
  full_refund:     'Remboursement total',
  partial_refund:  'Remboursement partiel',
  replacement:     'Renvoi du produit',
  store_credit:    'Avoir boutique',
  no_action:       'Aucune action (rejeter)',
}

const RESOLUTION_OPTIONS = (Object.entries(RESOLUTION_LABELS) as [DisputeResolution, string][]).map(([value, label]) => ({ value, label }))

const ROLE_LABELS: Record<string, string> = {
  customer: 'Client',
  seller:   'Vendeur',
  admin:    'Admin',
  system:   'Système',
}

const ROLE_COLORS: Record<string, string> = {
  customer: 'bg-blue-500',
  seller:   'bg-orange-500',
  admin:    'bg-primary-600',
  system:   'bg-gray-400',
}

// Pastilles de timeline : variante de statut → couleur de point (mêmes tons que Badge).
const VARIANT_DOT: Record<StatusVariant, string> = {
  neutral: 'bg-gray-400',
  primary: 'bg-primary-500',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  danger:  'bg-red-500',
  info:    'bg-blue-500',
  purple:  'bg-purple-500',
}

// ─── Modale résolution ────────────────────────────────────────────────────────

function ResolveModal({
  dispute,
  onClose,
}: {
  dispute: AdminDispute
  onClose: () => void
}) {
  const resolveDispute = useResolveDispute(dispute.id)
  const [resolution, setResolution] = useState<DisputeResolution>('full_refund')
  const [resolutionAmount, setResolutionAmount] = useState(String(dispute.amount))
  const [resolutionNote, setResolutionNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!resolutionNote.trim()) {
      setError('La note de résolution est requise')
      return
    }
    try {
      await resolveDispute.mutateAsync({
        resolution,
        resolutionAmount: resolution === 'partial_refund' ? Number(resolutionAmount) : undefined,
        resolutionNote: resolutionNote.trim(),
      })
      toast.success(resolution === 'no_action' ? 'Litige rejeté' : 'Litige résolu')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
      toast.error('Erreur lors de la résolution du litige')
    }
  }

  return (
    <Modal
      open
      onOpenChange={(o) => { if (!o) onClose() }}
      title="Résoudre le litige"
      description={`${dispute.id} · Montant contesté : ${formatPrice(dispute.amount)}`}
      size="md"
      footer={
        <>
          <Button variant="outline" type="button" onClick={onClose}>Annuler</Button>
          <Button
            type="submit"
            form="resolve-dispute-form"
            variant={resolution === 'no_action' ? 'danger' : 'primary'}
            loading={resolveDispute.isPending}
          >
            {resolution === 'no_action' ? 'Rejeter' : 'Résoudre'}
          </Button>
        </>
      }
    >
      {error && (
        <p className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
        </p>
      )}
      <form id="resolve-dispute-form" onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Décision" htmlFor="resolution" required>
          <Select
            id="resolution"
            value={resolution}
            onChange={(v) => setResolution(v as DisputeResolution)}
            options={RESOLUTION_OPTIONS}
            className="w-full"
          />
        </FormField>

        {resolution === 'partial_refund' && (
          <FormField
            label="Montant remboursé (FCFA)"
            htmlFor="resolution-amount"
            required
            hint={`Montant contesté : ${formatPrice(dispute.amount)}`}
          >
            <Input
              id="resolution-amount"
              type="number"
              value={resolutionAmount}
              onChange={(e) => setResolutionAmount(e.target.value)}
              max={dispute.amount}
              className="w-full"
            />
          </FormField>
        )}

        <FormField
          label="Note de résolution"
          htmlFor="resolution-note"
          required
          hint="Visible par le client et le vendeur"
        >
          <Textarea
            id="resolution-note"
            value={resolutionNote}
            onChange={(e) => setResolutionNote(e.target.value)}
            rows={4}
            placeholder="Expliquez la décision prise…"
            className="w-full"
          />
        </FormField>
      </form>
    </Modal>
  )
}


// ─── Bulle de message ─────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: DisputeMessage }) {
  const isAdmin = msg.authorRole === 'admin'
  const isSystem = msg.authorRole === 'system'
  return (
    <div className={cn('flex gap-3', isAdmin && 'flex-row-reverse')}>
      <div className={cn('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white', ROLE_COLORS[msg.authorRole] ?? 'bg-gray-400')}>
        {msg.authorName.charAt(0).toUpperCase()}
      </div>
      <div className={cn('flex max-w-[70%] flex-col', isAdmin ? 'items-end' : 'items-start')}>
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{msg.authorName}</span>
          <Badge variant="neutral" size="sm">{ROLE_LABELS[msg.authorRole]}</Badge>
          <span className="text-[10px] text-gray-400 dark:text-gray-500">{formatDate(msg.createdAt)}</span>
        </div>
        <div className={cn(
          'rounded-2xl px-4 py-3 text-sm',
          isAdmin
            ? 'bg-primary-500 text-white'
            : isSystem
            ? 'bg-gray-100 italic text-gray-600 dark:bg-gray-800 dark:text-gray-400'
            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
        )}>
          {msg.content}
        </div>
        {msg.attachments && msg.attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {msg.attachments.map((att) => (
              <a
                key={att.id}
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-primary-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-primary-400 dark:hover:bg-gray-800"
              >
                <Paperclip className="h-3.5 w-3.5" />
                {att.name}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

function TimelineItem({ item, isLast }: { item: DisputeTimeline; isLast: boolean }) {
  const meta = statusMeta(DISPUTE_STATUS, item.status)
  return (
    <div className="relative flex gap-3">
      {!isLast && (
        <div className="absolute left-[11px] top-6 h-full w-0.5 bg-gray-200 dark:bg-gray-700" />
      )}
      <div className="relative mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-white bg-gray-100 dark:border-gray-900 dark:bg-gray-800">
        <div className={cn('h-2 w-2 rounded-full', VARIANT_DOT[meta.variant])} />
      </div>
      <div className="pb-5">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {meta.label}
        </p>
        {item.note && (
          <p className="text-xs text-gray-500 dark:text-gray-400">{item.note}</p>
        )}
        <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
          {item.actorName} · {formatDate(item.createdAt)}
        </p>
      </div>
    </div>
  )
}

// ─── Barre d'actions statut ───────────────────────────────────────────────────

function StatusActions({
  dispute,
  onResolve,
}: {
  dispute: AdminDispute
  onResolve: () => void
}) {
  const updateStatus = useUpdateDisputeStatus(dispute.id)
  const [confirmClose, setConfirmClose] = useState(false)
  const isFinal = dispute.status === 'resolved' || dispute.status === 'rejected' || dispute.status === 'closed'

  if (isFinal) return null

  function changeStatus(status: DisputeStatus) {
    updateStatus.mutate(
      { status },
      {
        onSuccess: () => toast.success('Statut du litige mis à jour'),
        onError: () => toast.error('Erreur lors du changement de statut'),
      },
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {dispute.status === 'open' && (
        <Button size="sm" variant="secondary" onClick={() => changeStatus('in_review')} loading={updateStatus.isPending}>
          Prendre en charge
        </Button>
      )}
      {dispute.status === 'in_review' && (
        <Button size="sm" variant="secondary" onClick={() => changeStatus('in_mediation')} loading={updateStatus.isPending}>
          Ouvrir médiation
        </Button>
      )}
      {(dispute.status === 'in_review' || dispute.status === 'in_mediation') && (
        <Button size="sm" variant="outline" onClick={() => setConfirmClose(true)} disabled={updateStatus.isPending}>
          Clôturer (délai)
        </Button>
      )}
      <PermissionGuard permission="disputes.resolve">
        <Button size="sm" onClick={onResolve}>
          Résoudre / Rejeter
        </Button>
      </PermissionGuard>

      <ConfirmDialog
        open={confirmClose}
        onOpenChange={setConfirmClose}
        title="Clôturer le litige ?"
        description="Le litige sera fermé pour dépassement de délai, sans résolution. Cette action met fin à la médiation."
        confirmLabel="Clôturer"
        variant="danger"
        onConfirm={() => changeStatus('closed')}
      />
    </div>
  )
}


// ─── Page principale ──────────────────────────────────────────────────────────

export function AdminDisputeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: dispute, isLoading, isError, error } = useAdminDispute(id ?? '')
  const addMessage = useAddDisputeMessage(id ?? '')
  const [messageText, setMessageText] = useState('')
  const [showResolveModal, setShowResolveModal] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  if (isLoading) {
    return <LoadingBlock label="Chargement du litige…" />
  }

  if (isError || !dispute) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
        Erreur : {(error as Error)?.message ?? 'Litige introuvable'}
      </div>
    )
  }

  const isFinal = ['resolved', 'rejected', 'closed'].includes(dispute.status)

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    setSendError(null)
    if (!messageText.trim()) return
    try {
      await addMessage.mutateAsync({ content: messageText.trim() })
      setMessageText('')
      toast.success('Message envoyé')
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Erreur')
      toast.error("Erreur lors de l'envoi du message")
    }
  }

  return (
    <div>
      <PageHeader
        backHref="/disputes"
        breadcrumbs={[{ label: 'Litiges', href: '/disputes' }, { label: dispute.orderRef }]}
        title={
          <span className="flex items-center gap-3">
            {dispute.id}
            <StatusBadge map={DISPUTE_STATUS} value={dispute.status} dot />
          </span>
        }
        description={`Commande ${dispute.orderRef} · Ouvert le ${formatDate(dispute.createdAt)}`}
        actions={
          <PermissionGuard permission="disputes.update">
            <StatusActions dispute={dispute} onResolve={() => setShowResolveModal(true)} />
          </PermissionGuard>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Colonne principale */}
        <div className="space-y-6 lg:col-span-2">

          {/* Résumé du litige */}
          <Card padding="sm" className="p-5">
            <CardTitle className="mb-4">Détails du litige</CardTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">Motif</p>
                <p className="mt-1 text-sm text-gray-800 dark:text-gray-200">{REASON_LABELS[dispute.reason] ?? dispute.reason}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">Montant contesté</p>
                <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{formatPrice(dispute.amount)}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">Description</p>
                <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{dispute.description}</p>
              </div>
              {dispute.evidence && dispute.evidence.length > 0 && (
                <div className="sm:col-span-2">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">Preuves initiales</p>
                  <div className="flex flex-wrap gap-2">
                    {dispute.evidence.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={resolveAdminMediaUrl(url)} alt={`Preuve ${i + 1}`} className="h-20 w-20 rounded-lg border border-gray-200 object-cover transition-opacity hover:opacity-80 dark:border-gray-700" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Résolution si finale */}
          {isFinal && dispute.resolution && (
            <div className={cn(
              'rounded-xl border p-5',
              dispute.status === 'resolved'
                ? 'border-green-200 bg-green-50 dark:border-green-500/30 dark:bg-green-500/10'
                : 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900',
            )}>
              <h2 className={cn(
                'mb-3 text-base font-semibold',
                dispute.status === 'resolved' ? 'text-green-800 dark:text-green-300' : 'text-gray-700 dark:text-gray-300',
              )}>
                Décision finale — {RESOLUTION_LABELS[dispute.resolution]}
              </h2>
              {dispute.resolutionAmount != null && (
                <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                  Montant remboursé : {formatPrice(dispute.resolutionAmount)}
                </p>
              )}
              {dispute.resolutionNote && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{dispute.resolutionNote}</p>
              )}
            </div>
          )}

          {/* Messages */}
          <Card padding="sm" className="p-5">
            <CardTitle className="mb-4">Messages ({dispute.messages.length})</CardTitle>
            <div className="space-y-5">
              {dispute.messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
              {dispute.messages.length === 0 && (
                <p className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">Aucun message pour l'instant</p>
              )}
            </div>

            {/* Zone de réponse */}
            {!isFinal && (
              <form onSubmit={handleSendMessage} className="mt-5 border-t border-gray-100 pt-4 dark:border-gray-800">
                {sendError && (
                  <p className="mb-2 text-xs text-red-500 dark:text-red-400">{sendError}</p>
                )}
                <div className="flex gap-3">
                  <Textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Écrire un message visible par le client et le vendeur…"
                    rows={3}
                    className="flex-1 resize-none"
                  />
                  <Button
                    type="submit"
                    className="self-end"
                    leftIcon={Send}
                    loading={addMessage.isPending}
                    disabled={!messageText.trim()}
                  >
                    Envoyer
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-5">

          {/* Produit */}
          <Card padding="sm" className="p-5">
            <CardTitle className="mb-3 text-sm">Produit</CardTitle>
            <div className="flex items-start gap-3">
              {dispute.productImage && (
                <img src={resolveAdminMediaUrl(dispute.productImage)} alt={dispute.productName} className="h-14 w-14 flex-shrink-0 rounded-xl object-cover" />
              )}
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{dispute.productName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{dispute.storeName}</p>
                <p className="mt-1 font-mono text-xs text-gray-400 dark:text-gray-500">{dispute.productId}</p>
              </div>
            </div>
          </Card>

          {/* Parties */}
          <Card padding="sm" className="p-5">
            <CardTitle className="mb-3 text-sm">Parties</CardTitle>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">Client</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{dispute.customerName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{dispute.customerEmail}</p>
              </div>
              <div className="border-t border-gray-100 pt-3 dark:border-gray-800">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">Vendeur</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{dispute.sellerName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{dispute.storeName}</p>
              </div>
            </div>
          </Card>

          {/* Admin assigné */}
          <Card padding="sm" className="p-5">
            <CardTitle className="mb-3 text-sm">Admin assigné</CardTitle>
            {dispute.assignedAdminName ? (
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">
                  {dispute.assignedAdminName.charAt(0)}
                </div>
                <p className="text-sm text-gray-800 dark:text-gray-200">{dispute.assignedAdminName}</p>
              </div>
            ) : (
              <p className="flex items-center gap-2 text-sm italic text-gray-400 dark:text-gray-500">
                <User className="h-4 w-4" />
                Non assigné
              </p>
            )}
            {dispute.dueDate && (
              <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-800">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">Date limite</p>
                <p className={cn(
                  'mt-1 text-sm font-medium',
                  new Date(dispute.dueDate) < new Date() && !isFinal
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-800 dark:text-gray-200',
                )}>
                  {formatDate(dispute.dueDate)}
                </p>
              </div>
            )}
          </Card>

          {/* Timeline */}
          <Card padding="sm" className="p-5">
            <CardTitle className="mb-4 text-sm">Historique</CardTitle>
            <div>
              {dispute.timeline.map((item, i) => (
                <TimelineItem
                  key={item.id}
                  item={item}
                  isLast={i === dispute.timeline.length - 1}
                />
              ))}
            </div>
          </Card>
        </div>
      </div>

      {showResolveModal && (
        <ResolveModal dispute={dispute} onClose={() => setShowResolveModal(false)} />
      )}
    </div>
  )
}
