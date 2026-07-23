import { catalogService } from "./catalogService";
import type { Product } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { getSuggestionsSlice } from "./catalogViewModel";

export type UseSuggestionsResult = Product[];

/**
 * Produits « suggestions / vous aimerez aussi ».
 * Le service fournit la liste brute ; le hook fait le découpage (count/offset).
 * `count` omis = toute la liste (à partir de `offset`).
 */
export function useSuggestions(
  count?: number,
  offset = 0,
): UseSuggestionsResult {
  const { data } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: () => catalogService.getProducts(),
  });

  return getSuggestionsSlice(data ?? [], count, offset);
}
