import { useState } from 'react'
import type React from 'react'
import { Lock, MessageCircle, MessagesSquare, Plus, Send } from 'lucide-react'
import {
  useAdminMessages, useAdminMessage, useReplyMessage, useUpdateMessageStatus,
  useInternalMessages, useSendInternalMessage, useReplyInternalMessage, useMarkInternalMessageRead,
  useUnreadSupportCount, useUnreadInternalCount, useChatConversations,
} from '../hooks/useAdminMessages'
import { ChatWorkspace } from '../components/ChatWorkspace'
import { PermissionGuard } from '@/components/guards/PermissionGuard'
import { useAdminAuth } from '@/features/auth'
import type { MessageItem, MessageStatus, InternalMessage, SendInternalMessageInput } from '@/infrastructure/data-source/AdminMessageDataSource'
import {
  PageHeader, Tabs, TabsList, TabsTrigger, TabsContent, Card, Badge, StatusBadge,
  Button, Input, Select, Textarea, FormField, SearchInput, Pagination, EmptyState,
  LoadingBlock, Modal,
} from '@/components/ui'
import { TICKET_STATUS, type StatusVariant } from '@/lib/status'
import { cn } from '@/lib/cn'
import { toast } from '@/lib/toast'

// ── Utilitaires ───────────────────────────────────────────────────────────────

// La priorité n'est pas dans le registre central : petite map locale → variante Badge.
const PRIORITY_META: Record<string, { label: string; variant: StatusVariant }> = {
  high: { label: 'Haute', variant: 'danger' },
  medium: { label: 'Moyenne', variant: 'warning' },
  low: { label: 'Basse', variant: 'neutral' },
}

const STATUS_OPTIONS = Object.entries(TICKET_STATUS).map(([value, meta]) => ({ value, label: meta.label }))

import { formatRelativeTime, formatDate } from '@/lib/format'

type Tab = 'support' | 'internal' | 'chat'

// ── Page principale ───────────────────────────────────────────────────────────
export function AdminMessageListPage() {
  const { admin } = useAdminAuth()
  // Gérant de boutique : uniquement le chat de SA boutique — tickets support
  // et messages internes sont des outils de la plateforme (le serveur les refuse de toute façon)
  const isStoreManager = !!admin?.storeId
  const [tab, setTab] = useState<Tab>(isStoreManager ? 'chat' : 'support')
  const { data: unreadSupport = 0 } = useUnreadSupportCount()
  const { data: unreadInternal = 0 } = useUnreadInternalCount()
  // Même clé de requête que le workspace (les params undefined sont ignorés) → pas de double appel
  const { data: chatList } = useChatConversations({ limit: 50 })
  const awaitingChat = chatList?.data.filter((c) => c.awaitingReply && c.status === 'open').length ?? 0

  const tabs: { id: Tab; label: string; icon: typeof MessagesSquare; badge: number }[] = isStoreManager
    ? [{ id: 'chat', label: 'Messages clients', icon: MessageCircle, badge: awaitingChat }]
    : [
        { id: 'support', label: 'Support client', icon: MessagesSquare, badge: unreadSupport },
        { id: 'chat', label: 'Chat clients', icon: MessageCircle, badge: awaitingChat },
        { id: 'internal', label: 'Messages internes', icon: Lock, badge: unreadInternal },
      ]

  return (
    <div>
      <PageHeader
        title="Messages"
        description={isStoreManager ? 'Conversations des clients avec votre boutique' : 'Support client et messagerie interne'}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList variant="pills">
          {tabs.map((t) => (
            <TabsTrigger key={t.id} value={t.id} icon={t.icon} badge={t.badge}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {!isStoreManager && (
          <TabsContent value="support">
            <SupportTab />
          </TabsContent>
        )}
        <TabsContent value="chat">
          <ChatWorkspace />
        </TabsContent>
        {!isStoreManager && (
          <TabsContent value="internal">
            <InternalTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

// ── Onglet Support client ─────────────────────────────────────────────────────
function SupportTab() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { data, isLoading } = useAdminMessages({ page, search: search || undefined, status: statusFilter || undefined })
  const { refetch: refetchDetail } = useAdminMessage(selectedId ?? '')

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-3">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1) }}
          placeholder="Rechercher par sujet, client…"
          size="sm"
          className="min-w-[200px] flex-1"
        />
        <Select
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); setPage(1) }}
          options={STATUS_OPTIONS}
          placeholder="Tous les statuts"
          size="sm"
        />
      </div>

      {isLoading ? (
        <Card padding="none"><LoadingBlock label="Chargement des messages…" /></Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {data?.data.map((msg: MessageItem) => (
              <div key={msg.id}
                className={cn(
                  'flex cursor-pointer items-start gap-4 px-5 py-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50',
                  msg.unread && 'bg-primary-50/50 dark:bg-primary-500/5',
                )}
                onClick={() => setSelectedId(msg.conversationId)}>
                <div className={cn(
                  'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold',
                  msg.unread
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/15 dark:text-primary-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
                )}>
                  {msg.customerName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={cn('truncate font-medium', msg.unread ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300')}>{msg.customerName}</span>
                      {msg.unread && <span className="h-2 w-2 flex-shrink-0 rounded-full bg-primary-500" />}
                      {(msg.priority === 'high' || msg.priority === 'medium') && (
                        <Badge variant={PRIORITY_META[msg.priority].variant} size="sm">{PRIORITY_META[msg.priority].label}</Badge>
                      )}
                    </div>
                    <span className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500">{formatRelativeTime(msg.updatedAt)}</span>
                  </div>
                  <p className={cn('mt-0.5 truncate text-sm', msg.unread ? 'font-medium text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400')}>{msg.subject}</p>
                  <p className="mt-0.5 truncate text-xs text-gray-400 dark:text-gray-500">{msg.lastMessage}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <StatusBadge map={TICKET_STATUS} value={msg.status} size="sm" dot />
                    <span className="text-xs text-gray-400 dark:text-gray-500">{msg.messageCount} messages</span>
                    {msg.assignedToName && <span className="text-xs text-gray-400 dark:text-gray-500">· {msg.assignedToName}</span>}
                  </div>
                </div>
              </div>
            ))}
            {(!data?.data || data.data.length === 0) && (
              <EmptyState
                icon={MessagesSquare}
                title="Aucun message"
                description="Aucun ticket de support ne correspond à ces critères."
              />
            )}
          </div>
          {data && data.total > 15 && (
            <div className="border-t border-gray-100 px-5 py-3 dark:border-gray-800">
              <Pagination page={page} pageSize={15} total={data.total} onPageChange={setPage} />
            </div>
          )}
        </Card>
      )}

      {selectedId && (
        <SupportDetailModal conversationId={selectedId} onClose={() => { setSelectedId(null); refetchDetail() }} />
      )}
    </>
  )
}

function SupportDetailModal({ conversationId, onClose }: { conversationId: string; onClose: () => void }) {
  const { data: detail, refetch } = useAdminMessage(conversationId)
  const replyMutation = useReplyMessage()
  const statusMutation = useUpdateMessageStatus()
  const [replyText, setReplyText] = useState('')
  if (!detail) return null

  async function handleReply() {
    if (!replyText.trim()) return
    try {
      await replyMutation.mutateAsync({ conversationId, content: replyText })
      setReplyText('')
      refetch()
      toast.success('Réponse envoyée')
    } catch {
      toast.error("Erreur lors de l'envoi de la réponse")
    }
  }
  async function handleStatusChange(status: MessageStatus) {
    try {
      await statusMutation.mutateAsync({ id: conversationId, status })
      refetch()
      toast.success('Statut mis à jour')
    } catch {
      toast.error('Erreur lors du changement de statut')
    }
  }

  const STATUS_ACTIONS: { label: string; status: MessageStatus }[] = [
    { label: 'Ouvrir', status: 'open' }, { label: 'Prendre', status: 'in_progress' },
    { label: 'Résoudre', status: 'resolved' }, { label: 'Fermer', status: 'closed' },
  ]

  return (
    <Modal
      open
      onOpenChange={(o) => { if (!o) onClose() }}
      title={detail.subject}
      description={`${detail.customerName} · ${detail.customerEmail}`}
      size="lg"
    >
      <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-4 dark:border-gray-800">
        {STATUS_ACTIONS.map((a) => (
          <PermissionGuard key={a.status} permission="messages.update">
            <Button
              size="sm"
              variant={detail.status === a.status ? 'primary' : 'outline'}
              onClick={() => handleStatusChange(a.status)}
              disabled={statusMutation.isPending}
            >
              {a.label}
            </Button>
          </PermissionGuard>
        ))}
      </div>
      <div className="max-h-[45vh] space-y-4 overflow-y-auto py-4">
        {detail.messages.map((m: any) => (
          <div key={m.id} className={cn('flex', m.senderType === 'admin' ? 'justify-end' : 'justify-start')}>
            <div className={cn(
              'max-w-[80%] rounded-2xl px-4 py-3',
              m.senderType === 'admin' ? 'bg-primary-50 dark:bg-primary-500/10' : 'bg-gray-100 dark:bg-gray-800',
            )}>
              <div className="mb-1 flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{m.senderName}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">{formatRelativeTime(m.createdAt)}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100">{m.content}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-100 pt-4 dark:border-gray-800">
        <div className="flex gap-3">
          <Textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={3}
            placeholder="Écrire une réponse…"
            className="flex-1 resize-none"
          />
          <PermissionGuard permission="messages.update">
            <Button
              className="self-end"
              leftIcon={Send}
              onClick={handleReply}
              disabled={!replyText.trim()}
              loading={replyMutation.isPending}
            >
              Envoyer
            </Button>
          </PermissionGuard>
        </div>
      </div>
    </Modal>
  )
}

// ── Onglet Messages internes ──────────────────────────────────────────────────

const ADMIN_LIST = [
  { id: 'admin_002', name: 'Kofi Product Admin' },
  { id: 'admin_003', name: 'Fatou Order Admin' },
  { id: 'admin_004', name: 'Sékou Logistics Admin' },
  { id: 'admin_005', name: 'Moussa Support Agent' },
]

function InternalTab() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedMsg, setSelectedMsg] = useState<InternalMessage | null>(null)
  const [showCompose, setShowCompose] = useState(false)
  const { data, isLoading } = useInternalMessages({ page, search: search || undefined })
  const markRead = useMarkInternalMessageRead()

  async function handleSelect(msg: InternalMessage) {
    setSelectedMsg(msg)
    if (!msg.isRead) await markRead.mutateAsync(msg.id)
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-3">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1) }}
          placeholder="Rechercher par sujet, expéditeur…"
          size="sm"
          className="min-w-[200px] flex-1"
        />
        <Button size="sm" leftIcon={Plus} onClick={() => setShowCompose(true)}>
          Nouveau message
        </Button>
      </div>

      {isLoading ? (
        <Card padding="none"><LoadingBlock label="Chargement des messages…" /></Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {data?.data.map((msg: InternalMessage) => (
              <div key={msg.id}
                onClick={() => handleSelect(msg)}
                className={cn(
                  'flex cursor-pointer items-start gap-4 px-5 py-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50',
                  !msg.isRead && 'bg-indigo-50/50 dark:bg-indigo-500/5',
                )}>
                <div className={cn(
                  'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold',
                  !msg.isRead
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
                )}>
                  {msg.fromAdminName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={cn('truncate text-sm font-medium', !msg.isRead ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300')}>{msg.fromAdminName}</span>
                      <span className="text-xs text-gray-400">→</span>
                      <span className="truncate text-xs text-gray-500 dark:text-gray-400">{msg.toAdminName}</span>
                      {!msg.isRead && <span className="h-2 w-2 flex-shrink-0 rounded-full bg-indigo-500" />}
                    </div>
                    <span className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500">{formatRelativeTime(msg.createdAt)}</span>
                  </div>
                  <p className={cn('mt-0.5 truncate text-sm', !msg.isRead ? 'font-medium text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400')}>{msg.subject}</p>
                  <p className="mt-0.5 truncate text-xs text-gray-400 dark:text-gray-500">{msg.content}</p>
                  {msg.thread.length > 0 && (
                    <span className="mt-1 inline-flex items-center gap-1 text-xs text-indigo-500 dark:text-indigo-400">
                      ↩ {msg.thread.length} réponse{msg.thread.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {(!data?.data || data.data.length === 0) && (
              <EmptyState
                icon={Lock}
                title="Aucun message interne"
                description="Envoyez un message à un autre administrateur pour démarrer une conversation."
                action={<Button size="sm" leftIcon={Plus} onClick={() => setShowCompose(true)}>Nouveau message</Button>}
              />
            )}
          </div>
          {data && data.total > 15 && (
            <div className="border-t border-gray-100 px-5 py-3 dark:border-gray-800">
              <Pagination page={page} pageSize={15} total={data.total} onPageChange={setPage} />
            </div>
          )}
        </Card>
      )}

      {selectedMsg && <InternalDetailModal msg={selectedMsg} onClose={() => setSelectedMsg(null)} />}
      {showCompose && <ComposeModal onClose={() => setShowCompose(false)} />}
    </>
  )
}

function InternalDetailModal({ msg, onClose }: { msg: InternalMessage; onClose: () => void }) {
  const replyMutation = useReplyInternalMessage()
  const [replyText, setReplyText] = useState('')

  async function handleReply() {
    if (!replyText.trim()) return
    try {
      await replyMutation.mutateAsync({ messageId: msg.id, content: replyText })
      setReplyText('')
      toast.success('Réponse envoyée')
    } catch {
      toast.error("Erreur lors de l'envoi de la réponse")
    }
  }

  return (
    <Modal
      open
      onOpenChange={(o) => { if (!o) onClose() }}
      title={msg.subject}
      description={`${msg.fromAdminName} → ${msg.toAdminName} · ${formatDate(msg.createdAt, { time: true })}`}
      size="lg"
    >
      <div className="mb-3">
        <Badge variant="purple" size="sm" dot>Interne</Badge>
      </div>
      <div className="space-y-4">
        {/* Message original */}
        <div className="rounded-2xl bg-gray-50 px-4 py-3 dark:bg-gray-800/60">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400">
              {msg.fromAdminName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">{msg.fromAdminName}</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(msg.createdAt, { time: true })}</span>
          </div>
          <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{msg.content}</p>
        </div>
        {/* Thread */}
        {msg.thread.map((reply) => (
          <div key={reply.id} className={cn('flex', reply.fromAdminId === 'admin_001' ? 'justify-end' : 'justify-start')}>
            <div className={cn(
              'max-w-[85%] rounded-2xl px-4 py-3',
              reply.fromAdminId === 'admin_001' ? 'bg-primary-50 dark:bg-primary-500/10' : 'bg-gray-100 dark:bg-gray-800',
            )}>
              <div className="mb-1 flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{reply.fromAdminName}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(reply.createdAt, { time: true })}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100">{reply.content}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
        <div className="flex gap-3">
          <Textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={3}
            placeholder="Écrire une réponse…"
            className="flex-1 resize-none"
          />
          <Button
            className="self-end"
            leftIcon={Send}
            onClick={handleReply}
            disabled={!replyText.trim()}
            loading={replyMutation.isPending}
          >
            Répondre
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function ComposeModal({ onClose }: { onClose: () => void }) {
  const sendMutation = useSendInternalMessage()
  const [form, setForm] = useState<SendInternalMessageInput>({
    toAdminId: ADMIN_LIST[0].id, toAdminName: ADMIN_LIST[0].name, subject: '', content: '',
  })
  const [error, setError] = useState('')

  function handleRecipientChange(id: string) {
    const admin = ADMIN_LIST.find((a) => a.id === id)
    if (admin) setForm((f) => ({ ...f, toAdminId: admin.id, toAdminName: admin.name }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.subject.trim() || !form.content.trim()) { setError('Sujet et message requis'); return }
    try {
      await sendMutation.mutateAsync(form)
      toast.success('Message interne envoyé')
      onClose()
    } catch {
      setError("Erreur lors de l'envoi")
      toast.error("Erreur lors de l'envoi du message")
    }
  }

  return (
    <Modal
      open
      onOpenChange={(o) => { if (!o) onClose() }}
      title="Nouveau message interne"
      size="md"
      footer={
        <>
          <Button variant="outline" type="button" onClick={onClose}>Annuler</Button>
          <Button type="submit" form="compose-internal-form" leftIcon={Send} loading={sendMutation.isPending}>
            Envoyer
          </Button>
        </>
      }
    >
      <form id="compose-internal-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">{error}</div>}
        <FormField label="Destinataire" htmlFor="compose-recipient">
          <Select
            id="compose-recipient"
            value={form.toAdminId}
            onChange={handleRecipientChange}
            options={ADMIN_LIST.map((a) => ({ value: a.id, label: a.name }))}
            className="w-full"
          />
        </FormField>
        <FormField label="Sujet" htmlFor="compose-subject" required>
          <Input
            id="compose-subject"
            required
            value={form.subject}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            placeholder="Ex : Question sur la commande…"
            className="w-full"
          />
        </FormField>
        <FormField label="Message" htmlFor="compose-content" required>
          <Textarea
            id="compose-content"
            required
            rows={5}
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            placeholder="Écrire votre message…"
            className="w-full resize-none"
          />
        </FormField>
      </form>
    </Modal>
  )
}
