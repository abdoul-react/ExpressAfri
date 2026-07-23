import { useQuery } from '@tanstack/react-query';
import { apiAdapter } from '@/infrastructure/api/apiAdapter';

export type HomeStore = {
  id: string;
  name: string;
  country: string;
  followers: string;
  avatar: string;
};

/**
 * Charge la liste des boutiques actives pour la section "Boutiques à découvrir".
 * Endpoint : GET /mobile/stores
 * staleTime=0 pour refléter les changements admin immédiatement.
 */
export function useHomeStores(limit = 10) {
  const { data = [], isLoading } = useQuery<HomeStore[]>({
    queryKey: ['home', 'stores'],
    queryFn: () => apiAdapter.get(`/mobile/stores?limit=${limit}`),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  return { stores: data, isLoading };
}
