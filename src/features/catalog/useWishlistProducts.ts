import { catalogService } from "./catalogService";
import { useWishlistStore } from "@/store/wishlistStore";
import type { Product } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { getWishlistProducts } from "./catalogViewModel";

export type UseWishlistProductsResult = Product[];

/**
 * Produits de la liste de favoris : croise les ids du store (état client)
 * avec le catalogue (service). L'écran ne fait que l'affichage.
 */
export function useWishlistProducts(): UseWishlistProductsResult {
  const ids = useWishlistStore((s) => s.ids);
  const { data } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: () => catalogService.getProducts(),
  });

  return getWishlistProducts(data ?? [], ids);
}
