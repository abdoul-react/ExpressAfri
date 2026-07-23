import { apiAdapter } from "@/infrastructure/api/apiAdapter";
import type { Product } from "@/types";
import { useQuery } from "@tanstack/react-query";

/**
 * « Vous aimerez aussi » du panier.
 * La source est choisie par l'admin (CMS → Sections → case « panier ») ;
 * le serveur replie sur les produits récents si rien n'est configuré.
 */
export function useCartRecommendations(): Product[] {
  const { data } = useQuery<Product[]>({
    queryKey: ["cart-recommendations"],
    queryFn: () => apiAdapter.get("/mobile/cart/recommendations"),
    staleTime: 5 * 60 * 1000,
  });
  return data ?? [];
}
