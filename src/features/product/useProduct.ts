import { getRelatedProducts } from "@/features/catalog";
import { catalogService } from "@/features/catalog";
import type { Product } from "@/types";
import { useQuery } from "@tanstack/react-query";

const RELATED_COUNT = 6;

export type UseProductResult = {
  product: Product | undefined;
  related: Product[];
  isLoading: boolean;
};

/**
 * Logique de données de la fiche produit.
 *
 * Le service fournit la donnée brute (produit + liste). Le hook expose le
 * produit courant et compose la liste « produits similaires ». L'écran ne
 * connaît ni le mock ni react-query.
 */
export function useProduct(id: string): UseProductResult {
  const productQ = useQuery<Product | undefined>({
    queryKey: ["product", id],
    queryFn: () => catalogService.getProductById(id),
  });

  const productsQ = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: () => catalogService.getProducts(),
  });

  const product = productQ.data;
  const related = getRelatedProducts(productsQ.data ?? [], id, RELATED_COUNT);

  return { product, related, isLoading: productQ.isLoading };
}
