import { useQuery } from '@tanstack/react-query';
import { contentService } from './contentService';
import type { Banner } from '@/types';

/**
 * Charge les bannières de l'écran Compte depuis le CMS.
 * Filtre screen=account côté API.
 * staleTime=0 pour que les changements admin se reflètent immédiatement au retour sur l'écran.
 */
export function useAccountBanners(): Banner[] {
  const { data = [] } = useQuery({
    queryKey: ['banners', 'account'],
    queryFn: () => contentService.getBanners('account'),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  return data;
}
