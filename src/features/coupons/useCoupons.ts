import { useQuery } from '@tanstack/react-query';
import { apiAdapter } from '@/infrastructure/api/apiAdapter';

export type Coupon = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: string; // 'percentage' | 'fixed'
  value: string;
  minPurchase: string | null;
  maxDiscount: string | null;
  applicableTo: string | null;
  applicableName: string | null;
  endDate: string | null;
};

/**
 * Charge les coupons actifs (filtrés par dates côté serveur).
 * Endpoint : GET /mobile/coupons
 * staleTime=0 pour refléter les créations admin immédiatement au retour sur l'écran.
 */
export function useCoupons() {
  const { data = [], isLoading } = useQuery<Coupon[]>({
    queryKey: ['coupons'],
    queryFn: () => apiAdapter.get('/mobile/coupons'),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  return { coupons: data, isLoading };
}
