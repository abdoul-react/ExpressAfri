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

  const product = productQ.data;
  const storeId = product?.storeId ?? null;

  // Les similaires viennent EXCLUSIVEMENT de la boutique du produit consulté :
  // proposer le catalogue global renverrait le client chez un concurrent.
  // La clé inclut la boutique — réutiliser ["products"] partagerait le cache
  // du catalogue global et ramènerait les autres boutiques.
  const relatedQ = useQuery<Product[]>({
    queryKey: ["products", { storeId }],
    // +1 : le produit courant est dans la liste et sera retiré ensuite.
    queryFn: () =>
      catalogService.getProducts({ storeId: storeId!, limit: RELATED_COUNT + 1 }),
    enabled: !!storeId,
  });

  const related = storeId
    ? getRelatedProducts(relatedQ.data ?? [], id, RELATED_COUNT)
    : [];

  return { product, related, isLoading: productQ.isLoading };
}
