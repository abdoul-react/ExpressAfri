import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { catalogService } from '@/features/catalog';
import { resolveMediaUrl } from '@/utils/resolveMediaUrl';

export type ProductReview = {
  id: string;
  rating: number;
  title: string | null;
  content: string | null;
  isVerified: boolean;
  createdAt?: string;
  authorName: string;
  authorAvatar: string;
};

type ServerReview = Omit<ProductReview, 'authorAvatar'> & { authorAvatar: string };

function normalize(r: ServerReview): ProductReview {
  return {
    ...r,
    authorAvatar: r.authorAvatar ? (resolveMediaUrl(r.authorAvatar) ?? r.authorAvatar) : '',
  };
}

/**
 * Avis clients réels d'un produit.
 * Endpoint : GET /mobile/products/:id/reviews (public)
 */
export function useProductReviews(productId: string | undefined) {
  const { data = [], isLoading } = useQuery<ProductReview[]>({
    queryKey: ['reviews', productId],
    queryFn: async () => {
      const rows: ServerReview[] = await catalogService.getProductReviews(productId!);
      return rows.map(normalize);
    },
    enabled: !!productId,
    staleTime: 0,
  });
  return { reviews: data, isLoading };
}

/**
 * Crée ou met à jour l'avis du client connecté sur un produit.
 * Endpoint : POST /mobile/products/:id/reviews (auth)
 * Invalide la liste d'avis et le produit (note moyenne recalculée côté serveur).
 */
export function useSubmitReview(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { rating: number; title?: string; content?: string }) =>
      catalogService.submitProductReview(productId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews', productId] });
      qc.invalidateQueries({ queryKey: ['product', productId] });
    },
  });
}
