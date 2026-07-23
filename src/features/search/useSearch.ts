import { searchProducts } from "@/features/catalog";
import { catalogService } from "@/features/catalog";
import type { Product } from "@/types";
import { useQuery } from "@tanstack/react-query";

export type UseSearchResult = {
  results: Product[];
  isLoading: boolean;
};

/**
 * Recherche produits. Le service ne fait que fournir la liste ; TOUTE la
 * logique de recherche (normalisation de la requête, filtre) vit ici.
 */
export function useSearch(query: string): UseSearchResult {
  const { data, isLoading } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: () => catalogService.getProducts(),
  });

  return {
    results: searchProducts(data ?? [], query),
    isLoading,
  };
}
