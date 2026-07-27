import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { storeService } from '@/features/stores/storeService';
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
 * Renvoie [] si non connecté (la requête n'est pas lancée).
 */
export function useFollowedStores() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data = [], isLoading } = useQuery<FollowedStore[]>({
    queryKey: ['stores', 'followed'],
    queryFn: () => storeService.getFollowedStores(),
    enabled: isAuthenticated,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  return { stores: data, isLoading };
}

/**
 * Suivre / ne plus suivre une boutique.
 * Appelle storeService directement — pas de dépendance sur le domaine stores.
 */
export function useToggleFollow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ storeId, follow }: { storeId: string; follow: boolean }) =>
      storeService.toggleFollow(storeId, follow),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['stores', 'followed'] });
    },
  });
}
