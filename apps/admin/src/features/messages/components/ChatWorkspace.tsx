import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Ban, CheckCircle2, CornerUpLeft, FileText, Info, Link as LinkIcon,
  MessageCircle, MessagesSquare, Mic, Paperclip, Play, Send, Store, Trash2, X,
} from 'lucide-react'
import {
  useChatConversations, useChatConversation, useReplyChatConversation, useUpdateChatStatus,
  useUploadChatAttachment, useChatConversationMedia, useSetCustomerChatBlocked,
} from '../hooks/useAdminMessages'
import { resolveAdminMediaUrl } from '@/lib/resolveAdminMediaUrl'
import { PermissionGuard } from '@/components/guards/PermissionGuard'
import type { ChatConversation, ChatMessage } from '@/infrastructure/data-source/AdminMessageDataSource'
import { Badge, Button, ConfirmDialog, EmptyState, LoadingBlock, SearchInput, INPUT_BASE_CLS } from '@/components/ui'
import { cn } from '@/lib/cn'
import { toast } from '@/lib/toast'

/* ─────────────────────────────────────────────────────────────────────────────
   Workspace de chat admin : layout deux colonnes façon client mail/WhatsApp Web.
   Colonne gauche : conversations (recherche, filtre statut, badge « à répondre »).
   Colonne droite : fil complet avec médias, réponse par clic/citation, composer.
   Pensé desktop/tablette : raccourcis clavier (Entrée = envoyer, Échap = annuler
   la citation), zones larges, densité élevée.
   ──────────────────────────────────────────────────────────────────────────── */

function timeAgo(ts?: string) {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 60_000) return 'À l\'instant'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h`
  return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function initials(name?: string) {
  return (name ?? 'C').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

/** Aperçu lisible d'un message (jamais l'URL/nom de fichier brut). */
function msgPreview(m: ChatMessage): string {
  if (m.deletedAt) return 'Message supprimé'
  if (m.type === 'image') return m.content ? `Photo · ${m.content}` : 'Photo'
  if (m.type === 'video') return m.content ? `Vidéo · ${m.content}` : 'Vidéo'
  if (m.type === 'audio') return 'Message vocal'
  if (m.type === 'pdf') return m.attachmentName || 'Document'
  return m.content
}

export function ChatWorkspace() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'' | 'open' | 'closed'>('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { data, isLoading } = useChatConversations({
    search: search || undefined,
    status: statusFilter || undefined,
    limit: 50,
  })

  const conversations = data?.data ?? []
  const selected = conversations.find((c) => c.id === selectedId) ?? null

  return (
    <div className="flex h-[calc(100vh-13rem)] min-h-[480px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card dark:border-gray-800 dark:bg-gray-900">
      {/* ── Colonne conversations ── */}
      <aside className="flex w-80 flex-shrink-0 flex-col border-r border-gray-200 dark:border-gray-800 xl:w-96">
        <div className="border-b border-gray-100 p-3 dark:border-gray-800">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Rechercher client, boutique, sujet…"
            size="sm"
          />
          <div className="mt-2 flex gap-1">
            {([
              { id: '', label: 'Toutes' },
              { id: 'open', label: 'Ouvertes' },
              { id: 'closed', label: 'Fermées' },
            ] as const).map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  statusFilter === f.id
                    ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading && <LoadingBlock label="Chargement…" />}
          {!isLoading && conversations.length === 0 && (
            <EmptyState
              icon={MessagesSquare}
              title="Aucune conversation"
              description="Les conversations des clients apparaîtront ici."
            />
          )}
          {conversations.map((conv) => (
            <ConversationRow
              key={conv.id}
              conv={conv}
              active={conv.id === selectedId}
              onClick={() => setSelectedId(conv.id)}
            />
          ))}
        </div>
      </aside>

      {/* ── Colonne fil de conversation ── */}
      {selected ? (
        <ConversationPane key={selected.id} conversationId={selected.id} />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center bg-gray-50/60 dark:bg-gray-950/30">
          <EmptyState
            icon={MessageCircle}
            title="Sélectionnez une conversation pour commencer"
            description="Cliquez sur un message du fil pour y répondre directement, comme sur une messagerie classique."
          />
        </div>
      )}
    </div>
  )
}

/* ── Ligne de conversation (colonne gauche) ─────────────────────────────────── */

function ConversationRow({ conv, active, onClick }: { conv: ChatConversation; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-3 border-b border-gray-50 px-4 py-3 text-left transition-colors dark:border-gray-800/60',
        active ? 'bg-primary-50 dark:bg-primary-500/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
      )}
    >
      <div className="relative flex-shrink-0">
        {conv.customerAvatar ? (
          <img
            src={resolveAdminMediaUrl(conv.customerAvatar)}
            alt=""
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-sm font-bold text-white">
            {initials(conv.customerName)}
          </div>
        )}
        {conv.awaitingReply && (
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-red-500 dark:border-gray-900" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className={cn(
            'truncate text-sm',
            conv.awaitingReply ? 'font-semibold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-300',
          )}>
            {conv.customerName || 'Client'}
          </span>
          <span className="flex-shrink-0 text-[11px] text-gray-400 dark:text-gray-500">
            {timeAgo(conv.lastMessageAt)}
          </span>
        </div>
        {conv.storeName ? (
          <p className="truncate text-[11px] font-medium text-primary-600 dark:text-primary-400">{conv.storeName}</p>
        ) : null}
        <p className={cn(
          'mt-0.5 truncate text-xs',
          conv.awaitingReply ? 'font-medium text-gray-700 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400',
        )}>
          {conv.lastMessage || conv.subject || '—'}
        </p>
        <div className="mt-1 flex items-center gap-1.5">
          <Badge variant={conv.status === 'open' ? 'success' : 'neutral'} size="sm" dot>
            {conv.status === 'open' ? 'Ouverte' : 'Fermée'}
          </Badge>
          {conv.awaitingReply && (
            <Badge variant="danger" size="sm">À répondre</Badge>
          )}
        </div>
      </div>
    </button>
  )
}

/* ── Fil de conversation + composer (colonne droite) ────────────────────────── */

function ConversationPane({ conversationId }: { conversationId: string }) {
  const { data: detail, refetch } = useChatConversation(conversationId)
  const replyMutation = useReplyChatConversation()
  const statusMutation = useUpdateChatStatus()
  const uploadMutation = useUploadChatAttachment()
  const blockMutation = useSetCustomerChatBlocked()
  const [replyText, setReplyText] = useState('')
  const [quoted, setQuoted] = useState<ChatMessage | null>(null)
  const [infoOpen, setInfoOpen] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recordSeconds, setRecordSeconds] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordChunksRef = useRef<Blob[]>([])
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const cancelledRef = useRef(false)

  const messages = useMemo(() => detail?.messages ?? [], [detail?.messages])

  // Auto-scroll en bas à l'arrivée de messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages.length, conversationId])

  // Couper l'enregistrement si on change de conversation
  useEffect(() => () => stopRecorder(true), [conversationId])

  async function handleSend() {
    const text = replyText.trim()
    if (!text || replyMutation.isPending) return
    await replyMutation.mutateAsync({ conversationId, content: text, replyToId: quoted?.id ?? null })
    setReplyText('')
    setQuoted(null)
    refetch()
  }

  // ── Aperçu avant envoi (façon WhatsApp, comme sur mobile) : le fichier
  // choisi s'affiche avec un champ légende OPTIONNEL — rien ne part avant
  // la confirmation. ──
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingUrl, setPendingUrl] = useState<string | null>(null)
  const [fileCaption, setFileCaption] = useState('')

  function openFilePreview(file: File) {
    setPendingFile(file)
    setPendingUrl(URL.createObjectURL(file))
    setFileCaption('')
  }

  function closeFilePreview() {
    if (pendingUrl) URL.revokeObjectURL(pendingUrl)
    setPendingFile(null)
    setPendingUrl(null)
    setFileCaption('')
  }

  async function confirmFileSend() {
    if (!pendingFile || uploadMutation.isPending) return
    const file = pendingFile
    const caption = fileCaption.trim()
    closeFilePreview()
    const uploaded = await uploadMutation.mutateAsync(file)
    await replyMutation.mutateAsync({
      conversationId,
      content: caption || undefined,
      type: uploaded.type,
      attachmentUrl: uploaded.url,
      attachmentName: uploaded.name,
      replyToId: quoted?.id ?? null,
    })
    setQuoted(null)
    refetch()
  }

  // ── Vocal : MediaRecorder du navigateur ──
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      const rec = new MediaRecorder(stream, { mimeType: mime })
      recordChunksRef.current = []
      cancelledRef.current = false
      rec.ondataavailable = (e) => { if (e.data.size > 0) recordChunksRef.current.push(e.data) }
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        if (cancelledRef.current) return
        const ext = mime === 'audio/webm' ? 'webm' : 'm4a'
        const blob = new Blob(recordChunksRef.current, { type: mime })
        const file = new File([blob], `vocal_admin.${ext}`, { type: mime })
        const uploaded = await uploadMutation.mutateAsync(file)
        await replyMutation.mutateAsync({
          conversationId,
          type: 'audio',
          attachmentUrl: uploaded.url,
          attachmentName: uploaded.name,
          replyToId: quoted?.id ?? null,
        })
        setQuoted(null)
        refetch()
      }
      mediaRecorderRef.current = rec
      rec.start()
      setRecording(true)
      setRecordSeconds(0)
      recordTimerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000)
    } catch {
      // Micro refusé/indisponible
      toast.error('Microphone indisponible ou accès refusé')
    }
  }

  function stopRecorder(cancel: boolean) {
    cancelledRef.current = cancel
    if (recordTimerRef.current) { clearInterval(recordTimerRef.current); recordTimerRef.current = null }
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop()
    mediaRecorderRef.current = null
    setRecording(false)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Desktop : Entrée envoie, Maj+Entrée = nouvelle ligne, Échap annule la citation
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    if (e.key === 'Escape') setQuoted(null)
  }

  function quoteMessage(m: ChatMessage) {
    if (m.deletedAt) return
    setQuoted(m)
    inputRef.current?.focus()
  }

  if (!detail) {
    return (
      <div className="flex flex-1 items-center justify-center bg-gray-50/60 dark:bg-gray-950/30">
        <LoadingBlock label="Chargement de la conversation…" />
      </div>
    )
  }

  const isOpen = detail.status === 'open'
  const blocked = !!detail.customerBlocked
  const busy = replyMutation.isPending || uploadMutation.isPending

  return (
    <section className="flex min-w-0 flex-1 flex-col">
      {/* En-tête du fil — cliquable pour ouvrir le panneau d'infos, comme WhatsApp */}
      <header
        className="flex cursor-pointer items-center gap-3 border-b border-gray-200 px-5 py-3 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/40"
        onClick={() => setInfoOpen((v) => !v)}
        title="Voir les infos de la conversation"
      >
        {detail.customerAvatar ? (
          <img src={resolveAdminMediaUrl(detail.customerAvatar)} alt="" className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-sm font-bold text-white">
            {initials(detail.customerName)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 truncate text-sm font-semibold text-gray-900 dark:text-white">
            {detail.customerName || 'Client'}
            {blocked && <Badge variant="danger" size="sm" dot>Bloqué</Badge>}
          </h2>
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
            {[detail.customerEmail, detail.customerPhone, detail.storeName].filter(Boolean).join(' · ') || 'Conversation mobile'}
          </p>
        </div>
        <Button
          size="sm"
          variant={isOpen ? 'outline' : 'secondary'}
          onClick={(e) => { e.stopPropagation(); statusMutation.mutate({ id: conversationId, status: isOpen ? 'closed' : 'open' }) }}
          disabled={statusMutation.isPending}
        >
          {isOpen ? 'Fermer' : 'Rouvrir'}
        </Button>
        <Info className="h-4 w-4 text-gray-400 dark:text-gray-500" />
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Fil des messages */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div ref={scrollRef} className="flex-1 space-y-1 overflow-y-auto bg-gray-50/60 px-5 py-4 dark:bg-gray-950/30">
            {messages.map((m, i) => {
              const isAdmin = m.senderRole !== 'customer'
              const prev = messages[i - 1]
              const grouped = prev && prev.senderRole === m.senderRole
              return (
                <div key={m.id} className={cn('group flex', isAdmin ? 'justify-end' : 'justify-start', grouped ? 'mt-0.5' : 'mt-3')}>
                  <div className={cn('relative max-w-[70%]', isAdmin && 'order-1')}>
                    <button
                      title="Répondre à ce message"
                      onClick={() => quoteMessage(m)}
                      className={cn(
                        'absolute top-1/2 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white text-gray-400 shadow ring-1 ring-gray-200 transition-colors hover:text-primary-600 group-hover:flex dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:text-primary-400',
                        isAdmin ? '-left-9' : '-right-9',
                      )}
                    >
                      <CornerUpLeft className="h-3.5 w-3.5" />
                    </button>

                    <div
                      onClick={() => quoteMessage(m)}
                      className={cn(
                        'cursor-pointer rounded-2xl px-4 py-2.5 text-sm shadow-sm transition-shadow hover:shadow',
                        isAdmin
                          ? 'rounded-br-md bg-primary-500 text-white'
                          : 'rounded-bl-md bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100',
                      )}
                    >
                      {m.replyToId && (
                        <div className={cn(
                          'mb-1.5 rounded-lg border-l-2 px-2 py-1 text-xs',
                          isAdmin
                            ? 'border-white/60 bg-white/15 text-white/85'
                            : 'border-primary-400 bg-white/60 text-gray-500 dark:bg-gray-700/60 dark:text-gray-300',
                        )}>
                          {m.replyToText || 'Message supprimé'}
                        </div>
                      )}

                      {m.deletedAt ? (
                        <p className={cn('italic', isAdmin ? 'text-white/70' : 'text-gray-400 dark:text-gray-500')}>
                          Message supprimé
                        </p>
                      ) : (
                        <>
                          {m.type === 'image' && m.attachmentUrl && (
                            <a href={resolveAdminMediaUrl(m.attachmentUrl)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                              <img
                                src={resolveAdminMediaUrl(m.attachmentUrl)}
                                alt={m.attachmentName ?? 'Photo'}
                                className="mb-1.5 max-h-64 rounded-xl object-cover"
                              />
                            </a>
                          )}
                          {m.type === 'video' && m.attachmentUrl && (
                            <video
                              src={resolveAdminMediaUrl(m.attachmentUrl)}
                              controls
                              onClick={(e) => e.stopPropagation()}
                              className="mb-1.5 max-h-64 rounded-xl"
                            />
                          )}
                          {m.type === 'audio' && m.attachmentUrl && (
                            <audio
                              src={resolveAdminMediaUrl(m.attachmentUrl)}
                              controls
                              onClick={(e) => e.stopPropagation()}
                              className="mb-1.5 w-60"
                            />
                          )}
                          {m.type === 'pdf' && m.attachmentUrl && (
                            <a
                              href={resolveAdminMediaUrl(m.attachmentUrl)}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className={cn(
                                'mb-1.5 flex items-center gap-2 text-sm font-medium hover:underline',
                                isAdmin ? 'text-white' : 'text-primary-600 dark:text-primary-400',
                              )}
                            >
                              <FileText className="h-4 w-4 flex-shrink-0" />
                              {m.attachmentName ?? 'Document PDF'}
                            </a>
                          )}
                          {m.content && <p className="whitespace-pre-wrap">{m.content}</p>}
                        </>
                      )}

                      <p className={cn('mt-1 text-right text-[10px]', isAdmin ? 'text-white/60' : 'text-gray-400 dark:text-gray-500')}>
                        {new Date(m.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
            {messages.length === 0 && (
              <p className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">Aucun message dans cette conversation</p>
            )}
          </div>

          {/* Bandeau citation */}
          {quoted && (
            <div className="flex items-center gap-3 border-t border-gray-200 bg-primary-50/60 px-5 py-2 dark:border-gray-800 dark:bg-primary-500/10">
              <div className="min-w-0 flex-1 border-l-2 border-primary-500 pl-3">
                <p className="text-[11px] font-semibold text-primary-600 dark:text-primary-400">
                  Réponse à {quoted.senderRole === 'customer' ? (detail.customerName || 'Client') : 'vous'}
                </p>
                <p className="truncate text-xs text-gray-600 dark:text-gray-300">{msgPreview(quoted)}</p>
              </div>
              <button
                onClick={() => setQuoted(null)}
                className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                title="Annuler la citation (Échap)"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Composer */}
          <footer className="border-t border-gray-200 px-5 py-3 dark:border-gray-800">
            {recording ? (
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => stopRecorder(true)}
                  title="Annuler l'enregistrement"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <div className="flex flex-1 items-center gap-2">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Enregistrement… {Math.floor(recordSeconds / 60)}:{String(recordSeconds % 60).padStart(2, '0')}
                  </span>
                </div>
                <Button leftIcon={Send} onClick={() => stopRecorder(false)}>
                  Envoyer le vocal
                </Button>
              </div>
            ) : (
              <div className="flex items-end gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) openFilePreview(f)
                    e.target.value = ''
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0"
                  onClick={() => fileRef.current?.click()}
                  disabled={!isOpen || busy}
                  title="Joindre une image, vidéo ou PDF"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <textarea
                  ref={inputRef}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={onKeyDown}
                  rows={Math.min(5, Math.max(1, replyText.split('\n').length))}
                  placeholder={isOpen ? 'Écrire une réponse…  (Entrée pour envoyer, Maj+Entrée pour une nouvelle ligne)' : 'Conversation fermée — rouvrez-la pour répondre'}
                  disabled={!isOpen}
                  className={cn(INPUT_BASE_CLS, 'flex-1 resize-none rounded-xl px-4 py-2.5')}
                />
                {replyText.trim() ? (
                  <Button
                    size="icon"
                    className="flex-shrink-0"
                    onClick={handleSend}
                    disabled={!isOpen}
                    loading={busy}
                    title="Envoyer (Entrée)"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    size="icon"
                    className="flex-shrink-0"
                    onClick={startRecording}
                    disabled={!isOpen || busy}
                    title="Enregistrer un message vocal"
                  >
                    <Mic className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
            {uploadMutation.isPending && (
              <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">Envoi de la pièce jointe…</p>
            )}
          </footer>
        </div>

        {/* Aperçu avant envoi : média + légende optionnelle (façon WhatsApp) */}
        {pendingFile && pendingUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={closeFilePreview}>
            <div className="flex w-full max-w-lg flex-col gap-3 p-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <p className="truncate text-sm font-medium text-white/90">{pendingFile.name}</p>
                <button
                  onClick={closeFilePreview}
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
                  title="Annuler"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex max-h-[55vh] items-center justify-center overflow-hidden rounded-xl bg-black/40">
                {pendingFile.type.startsWith('image/') ? (
                  <img src={pendingUrl} alt={pendingFile.name} className="max-h-[55vh] w-auto object-contain" />
                ) : pendingFile.type.startsWith('video/') ? (
                  <video src={pendingUrl} controls className="max-h-[55vh] w-full" />
                ) : (
                  <div className="flex flex-col items-center gap-2 p-10 text-white/90">
                    <FileText className="h-10 w-10" />
                    <p className="max-w-xs truncate text-sm">{pendingFile.name}</p>
                  </div>
                )}
              </div>
              <div className="flex items-end gap-2">
                <textarea
                  value={fileCaption}
                  onChange={(e) => setFileCaption(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); confirmFileSend() }
                    if (e.key === 'Escape') closeFilePreview()
                  }}
                  rows={Math.min(4, Math.max(1, fileCaption.split('\n').length))}
                  placeholder="Ajouter une légende…  (optionnel)"
                  autoFocus
                  className="flex-1 resize-none rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder-white/50 focus:border-primary-400 focus:outline-none"
                />
                <Button leftIcon={Send} onClick={confirmFileSend} loading={uploadMutation.isPending}>
                  Envoyer
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Panneau latéral : infos, blocage, médias */}
        {infoOpen && (
          <InfoPanel
            detail={detail}
            conversationId={conversationId}
            onClose={() => setInfoOpen(false)}
            onToggleBlock={() => blockMutation.mutate({ customerId: detail.customerId, blocked: !blocked })}
            blockPending={blockMutation.isPending}
          />
        )}
      </div>
    </section>
  )
}

/* ── Panneau latéral : infos client, blocage, archive des médias ────────────── */

function InfoPanel({
  detail, conversationId, onClose, onToggleBlock, blockPending,
}: {
  detail: ChatConversation
  conversationId: string
  onClose: () => void
  onToggleBlock: () => void
  blockPending: boolean
}) {
  const [mediaTab, setMediaTab] = useState<'media' | 'docs' | 'links'>('media')
  const [confirmBlock, setConfirmBlock] = useState(false)
  const { data: media } = useChatConversationMedia(conversationId, true)
  const blocked = !!detail.customerBlocked

  return (
    <aside className="flex w-80 flex-shrink-0 flex-col overflow-y-auto border-l border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Infos de la conversation</h3>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          aria-label="Fermer le panneau"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Profil client */}
      <div className="flex flex-col items-center gap-2 border-b border-gray-100 px-4 py-5 dark:border-gray-800">
        {detail.customerAvatar ? (
          <img src={resolveAdminMediaUrl(detail.customerAvatar)} alt="" className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-2xl font-bold text-white">
            {initials(detail.customerName)}
          </div>
        )}
        <p className="text-base font-semibold text-gray-900 dark:text-white">{detail.customerName || 'Client'}</p>
        {detail.customerEmail && <p className="text-xs text-gray-500 dark:text-gray-400">{detail.customerEmail}</p>}
        {detail.customerPhone && <p className="text-xs text-gray-500 dark:text-gray-400">{detail.customerPhone}</p>}
        {detail.storeName && (
          <Badge variant="primary">
            <Store className="h-3 w-3" />
            {detail.storeName}
          </Badge>
        )}
      </div>

      {/* Archive médias / docs / liens */}
      <div className="flex-1 px-4 py-4">
        <div className="mb-3 flex gap-1">
          {([
            { id: 'media', label: 'Médias' },
            { id: 'docs', label: 'Docs & audios' },
            { id: 'links', label: 'Liens' },
          ] as const).map((tb) => (
            <button
              key={tb.id}
              onClick={() => setMediaTab(tb.id)}
              className={cn(
                'flex-1 rounded-full px-2 py-1 text-[11px] font-semibold transition-colors',
                mediaTab === tb.id
                  ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
              )}
            >
              {tb.label}
            </button>
          ))}
        </div>

        {mediaTab === 'media' && (
          media?.media?.length ? (
            <div className="grid grid-cols-3 gap-1.5">
              {media.media.map((m) => (
                <a key={m.id} href={resolveAdminMediaUrl(m.url)} target="_blank" rel="noreferrer" className="block">
                  {m.type === 'video' ? (
                    <span className="flex aspect-square items-center justify-center rounded-lg bg-black text-white">
                      <Play className="h-5 w-5" />
                    </span>
                  ) : (
                    <img src={resolveAdminMediaUrl(m.url)} alt="" className="aspect-square rounded-lg object-cover" />
                  )}
                </a>
              ))}
            </div>
          ) : <p className="py-6 text-center text-xs text-gray-400 dark:text-gray-500">Aucun média échangé</p>
        )}

        {mediaTab === 'docs' && (
          media?.docs?.length ? (
            <div className="space-y-1.5">
              {media.docs.map((d) => (
                <a
                  key={d.id}
                  href={resolveAdminMediaUrl(d.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:bg-gray-800/60 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  {d.type === 'audio'
                    ? <Mic className="h-3.5 w-3.5 flex-shrink-0 text-gray-400 dark:text-gray-500" />
                    : <FileText className="h-3.5 w-3.5 flex-shrink-0 text-gray-400 dark:text-gray-500" />}
                  <span className="truncate">{d.name || (d.type === 'audio' ? 'Message vocal' : 'Document')}</span>
                </a>
              ))}
            </div>
          ) : <p className="py-6 text-center text-xs text-gray-400 dark:text-gray-500">Aucun document échangé</p>
        )}

        {mediaTab === 'links' && (
          media?.links?.length ? (
            <div className="space-y-1.5">
              {media.links.map((l) => (
                <a
                  key={l.id}
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs font-medium text-primary-600 transition-colors hover:bg-gray-100 dark:bg-gray-800/60 dark:text-primary-400 dark:hover:bg-gray-800"
                >
                  <LinkIcon className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{l.url}</span>
                </a>
              ))}
            </div>
          ) : <p className="py-6 text-center text-xs text-gray-400 dark:text-gray-500">Aucun lien partagé</p>
        )}
      </div>

      {/* Zone danger : blocage — décision de plateforme, masqué pour un gérant de boutique
          (le serveur le refuse de toute façon) */}
      <PermissionGuard permission="users.update">
      <div className="border-t border-gray-100 px-4 py-4 dark:border-gray-800">
        {blocked ? (
          <Button
            variant="outline"
            className="w-full"
            leftIcon={CheckCircle2}
            onClick={onToggleBlock}
            loading={blockPending}
          >
            Débloquer ce client
          </Button>
        ) : (
          <Button
            variant="danger"
            className="w-full"
            leftIcon={Ban}
            onClick={() => setConfirmBlock(true)}
            loading={blockPending}
          >
            Bloquer ce client
          </Button>
        )}
        <p className="mt-2 text-center text-[11px] leading-tight text-gray-400 dark:text-gray-500">
          {blocked
            ? 'Le client est bloqué : il ne peut plus envoyer de messages.'
            : 'Bloqué, ce client ne pourra plus envoyer de messages sur le chat.'}
        </p>
        <ConfirmDialog
          open={confirmBlock}
          onOpenChange={setConfirmBlock}
          title="Bloquer ce client ?"
          description="Le client ne pourra plus envoyer de messages sur le chat tant qu'il ne sera pas débloqué."
          confirmLabel="Bloquer"
          variant="danger"
          onConfirm={() => onToggleBlock()}
        />
      </div>
      </PermissionGuard>
    </aside>
  )
}
