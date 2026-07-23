import { useQuery } from '@tanstack/react-query';
import { contentService } from './contentService';
import type { Banner } from '@/types';

/**
 * Charge les bannières CMS d'un écran donné (home | store | feed | account).
 * staleTime=0 pour que les changements admin se reflètent immédiatement au retour sur l'écran.
 */
export function useScreenBanners(screen: 'home' | 'store' | 'feed' | 'account'): Banner[] {
  const { data = [] } = useQuery({
    queryKey: ['banners', screen],
    queryFn: () => contentService.getBanners(screen),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  return data;
}
