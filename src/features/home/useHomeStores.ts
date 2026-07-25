import { useQuery } from '@tanstack/react-query';
import { storeService } from '@/features/stores/storeService';

export type HomeStore = {
  id: string;
  name: string;
  country: string;
  followers: string;
  avatar: string;
};

/**
 * Charge la liste des boutiques approuvées pour la section "Boutiques à découvrir".
 * staleTime=0 pour refléter les changements admin immédiatement.
 */
export function useHomeStores(limit = 10) {
  const { data = [], isLoading } = useQuery<HomeStore[]>({
    queryKey: ['home', 'stores', limit],
    queryFn: () => storeService.getStores({ limit }),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  return { stores: data, isLoading };
}
