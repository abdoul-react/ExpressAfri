import { catalogService } from "@/features/catalog";
import type { Product } from "@/types";
import { useQuery } from "@tanstack/react-query";

export type UseSearchResult = {
  results: Product[];
  isLoading: boolean;
};

export function useSearch(query: string): UseSearchResult {
  const trimmed = query.trim();
  const { data, isLoading } = useQuery<Product[]>({
    queryKey: ["products", "search", trimmed],
    queryFn: () => catalogService.getProducts({ search: trimmed || undefined }),
    enabled: trimmed.length > 0,
  });

  return {
    results: data ?? [],
    isLoading,
  };
}
