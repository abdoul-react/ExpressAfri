import { useQuery } from '@tanstack/react-query';
import { apiAdapter } from '@/infrastructure/api/apiAdapter';
import { useAuthStore } from '@/store/authStore';

export type CouponUsageEntry = {
  id: string;
  code: string;
  name: string;
  type: string;
  value: string;
  discountAmount: string;
  usedAt: string;
};

/** Coupons déjà utilisés par le client (bouton « Historique » de l'écran coupons). */
export function useCouponHistory(enabled = true) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data = [], isLoading } = useQuery<CouponUsageEntry[]>({
    queryKey: ['coupon-history'],
    queryFn: () => apiAdapter.get('/mobile/coupons/history'),
    enabled: enabled && isAuthenticated,
    staleTime: 60 * 1000,
  });
  return { history: data, isLoading };
}
