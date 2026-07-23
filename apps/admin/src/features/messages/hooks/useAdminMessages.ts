import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminMessageService } from '../services/adminMessageService'
import type { SendInternalMessageInput } from '@/infrastructure/data-source/AdminMessageDataSource'

// ── Support client ────────────────────────────────────────────────────────────

export function useAdminMessages(params?: { page?: number; limit?: number; status?: string; priority?: string; search?: string }) {
  return useQuery({
    queryKey: ['admin', 'messages', 'support', params],
    queryFn: () => adminMessageService.list(params),
  })
}

export function useAdminMessage(id: string) {
  return useQuery({
    queryKey: ['admin', 'messages', 'support', id],
    queryFn: () => adminMessageService.getById(id),
    enabled: !!id,
  })
}

export function useReplyMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ conversationId, content }: { conversationId: string; content: string }) =>
      adminMessageService.reply(conversationId, content),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'messages'] }),
  })
}

export function useUpdateMessageStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminMessageService.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'messages'] }),
  })
}

export function useUnreadSupportCount() {
  return useQuery({
    queryKey: ['admin', 'messages', 'unread-support'],
    queryFn: () => adminMessageService.getUnreadCount(),
    refetchInterval: 30_000,
  })
}

// ── Messages internes ─────────────────────────────────────────────────────────

export function useInternalMessages(params?: { page?: number; limit?: number; search?: string }) {
  return useQuery({
    queryKey: ['admin', 'messages', 'internal', params],
    queryFn: () => adminMessageService.listInternalMessages(params),
  })
}

export function useSendInternalMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SendInternalMessageInput) => adminMessageService.sendInternalMessage(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'messages', 'internal'] }),
  })
}

export function useReplyInternalMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ messageId, content }: { messageId: string; content: string }) =>
      adminMessageService.replyInternalMessage(messageId, content),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'messages', 'internal'] }),
  })
}

export function useMarkInternalMessageRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (messageId: string) => adminMessageService.markInternalMessageRead(messageId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'messages', 'internal'] })
      qc.invalidateQueries({ queryKey: ['admin', 'messages', 'unread-internal'] })
    },
  })
}

export function useUnreadInternalCount() {
  return useQuery({
    queryKey: ['admin', 'messages', 'unread-internal'],
    queryFn: () => adminMessageService.getUnreadInternalCount(),
    refetchInterval: 30_000,
  })
}

// ── Chat conversations (pont mobile → admin) ─────────────────────────────────

export function useChatConversations(params?: { page?: number; limit?: number; search?: string; status?: string }) {
  return useQuery({
    queryKey: ['admin', 'messages', 'chat', params],
    queryFn: () => adminMessageService.listChatConversations(params),
    // La liste doit vivre : nouveaux messages clients visibles sans recharger
    refetchInterval: 15_000,
  })
}

export function useChatConversation(id: string) {
  return useQuery({
    queryKey: ['admin', 'messages', 'chat', id],
    queryFn: () => adminMessageService.getChatConversation(id),
    enabled: !!id,
    refetchInterval: 10_000,
  })
}

export function useReplyChatConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ conversationId, ...payload }: { conversationId: string } & import('@/infrastructure/data-source/AdminMessageDataSource').ChatReplyPayload) =>
      adminMessageService.replyChatConversation(conversationId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'messages', 'chat'] }),
  })
}

export function useUploadChatAttachment() {
  return useMutation({
    mutationFn: (file: File) => adminMessageService.uploadChatAttachment(file),
  })
}

export function useChatConversationMedia(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'messages', 'chat', id, 'media'],
    queryFn: () => adminMessageService.getChatConversationMedia(id),
    enabled: !!id && enabled,
  })
}

export function useUpdateChatStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'open' | 'closed' }) =>
      adminMessageService.updateChatStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'messages', 'chat'] }),
  })
}

export function useSetCustomerChatBlocked() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ customerId, blocked }: { customerId: string; blocked: boolean }) =>
      adminMessageService.setCustomerChatBlocked(customerId, blocked),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'messages', 'chat'] }),
  })
}

/** Compte total non-lus (support + internes) — utilisé par le badge Sidebar */
export function useUnreadMessageCount() {
  const { data: supportCount = 0 } = useUnreadSupportCount()
  const { data: internalCount = 0 } = useUnreadInternalCount()
  return supportCount + internalCount
}
