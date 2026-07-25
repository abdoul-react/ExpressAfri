import { useQuery } from '@tanstack/react-query';
import { storeService } from '@/features/stores/storeService';
import { useToggleStoreLike } from '@/features/stores/useStores';
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
 * Alias de useToggleStoreLike, conservé pour les écrans historiques.
 */
export function useToggleFollow() {
  return useToggleStoreLike();
}
