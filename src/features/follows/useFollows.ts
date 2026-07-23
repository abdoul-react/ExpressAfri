import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiAdapter } from '@/infrastructure/api/apiAdapter';
import { useAuthStore } from '@/store/authStore';

export type FollowedStore = {
  id: string;
  name: string;
  country: string;
  followers: string;
  avatar: string;
};

/**
 * Boutiques suivies par le client connecté.
 * Endpoint : GET /mobile/stores/followed (auth ; renvoie [] si non connecté).
 */
export function useFollowedStores() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data = [], isLoading } = useQuery<FollowedStore[]>({
    queryKey: ['stores', 'followed'],
    queryFn: () => apiAdapter.get('/mobile/stores/followed'),
    enabled: isAuthenticated,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  return { stores: data, isLoading };
}

/**
 * Suivre / ne plus suivre une boutique.
 * Endpoints : POST /mobile/stores/:id/follow | /unfollow (auth).
 * Invalide la liste suivie et les listes de boutiques (compteur d'abonnés).
 */
export function useToggleFollow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ storeId, follow }: { storeId: string; follow: boolean }) =>
      apiAdapter.post(`/mobile/stores/${storeId}/${follow ? 'follow' : 'unfollow'}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stores', 'followed'] });
      qc.invalidateQueries({ queryKey: ['home', 'stores'] });
    },
  });
}
