import { useQuery } from "@tanstack/react-query";
import { chatService } from "./chatService";
import { useAuthStore } from "@/store/authStore";

export function useUnreadCount(): number {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data = [] } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => chatService.getConversations(),
    staleTime: 60_000,
    // Pas de session → pas d'appel (évite les 401 en boucle pour les invités)
    enabled: isAuthenticated,
  });
  // Somme des messages NON LUS (renvoyée par le serveur pour chaque
  // conversation) — pas le nombre de conversations ouvertes : la pastille
  // doit refléter ce qui attend réellement d'être lu.
  return (data as any[]).reduce((n, c) => n + (Number(c.unread) || 0), 0);
}