import { chatService } from "./chatService";
import type { SendMessagePayload } from "@/infrastructure/data-source/ChatDataSource";
import { useAuthStore } from "@/store/authStore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useConversations() {
  // Cloisonnement : ne jamais interroger (ni servir du cache) sans session.
  // Un invité ou un utilisateur déconnecté n'a AUCUNE conversation à voir.
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data = [], isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => chatService.getConversations(),
    enabled: isAuthenticated,
  });

  return { conversations: isAuthenticated ? data : [], isLoading };
}

export function useConversation(id: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data, isLoading } = useQuery({
    queryKey: ["conversation", id],
    queryFn: () => chatService.getConversation(id),
    enabled: !!id && isAuthenticated,
    // Nouveau message vendeur visible sans quitter l'écran
    refetchInterval: 10_000,
  });

  return { conversation: isAuthenticated ? data : undefined, isLoading };
}

/** Envoie un message (texte et/ou pièce jointe, réponse) puis rafraîchit son fil. */
export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SendMessagePayload) =>
      chatService.sendMessage(conversationId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

/** Uploade une pièce jointe (image/pdf/audio) et renvoie {url, name, type}. */
export function useUploadAttachment(conversationId: string) {
  return useMutation({
    mutationFn: (localUri: string) =>
      chatService.uploadAttachment(conversationId, localUri),
  });
}

/** Supprime un de ses propres messages (pour tous). */
export function useDeleteMessage(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) =>
      chatService.deleteMessage(conversationId, messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

/** Archive la conversation puis rafraîchit la liste. */
export function useArchiveConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => chatService.archiveConversation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

/** Médias, documents et liens échangés dans la conversation. */
export function useConversationMedia(id: string) {
  const { data, isLoading } = useQuery({
    queryKey: ["conversation-media", id],
    queryFn: () => chatService.getConversationMedia(id),
    enabled: !!id,
  });
  return { media: data, isLoading };
}

/** Crée (ou récupère, si déjà ouverte pour cette commande) une conversation vendeur. */
export function useStartConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { storeId?: string; orderId?: string; subject?: string }) =>
      chatService.createConversation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
