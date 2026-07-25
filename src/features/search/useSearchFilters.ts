import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { catalogService } from '@/features/catalog';
import { queryClient } from '@/infrastructure/query/queryClient';
import type { Product } from '@/types';

export type SortOption = 'featured' | 'priceLow' | 'priceHigh' | 'rating' | 'newest';

export type SearchFilters = {
  query: string;
  sort: SortOption;
  categoryId: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  minRating: number | null;
  freeShippingOnly: boolean;
  onSaleOnly: boolean;
};

const defaultFilters: SearchFilters = {
  query: '',
  sort: 'featured',
  categoryId: null,
  minPrice: null,
  maxPrice: null,
  minRating: null,
  freeShippingOnly: false,
  onSaleOnly: false,
};

export function useSearchFilters() {
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);
  const [activeCount, setActiveCount] = useState(0);

  const updateFilter = useCallback(<K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
    setActiveCount(0);
    queryClient.removeQueries({ queryKey: ['products', 'filtered'] });
  }, []);

  const applyFilters = useCallback(() => {
    const count = Object.entries(filters).reduce((n, [key, value]) => {
      if (key === 'query' || key === 'sort') return n;
      if (value === null || value === false || value === '') return n;
      return n + 1;
    }, 0);
    setActiveCount(count);
  }, [filters]);

  const hasActiveFilters = activeCount > 0;

  return { filters, updateFilter, resetFilters, applyFilters, activeCount, hasActiveFilters };
}

export function useFilteredProducts(filters: SearchFilters) {
  const { data, isLoading, error } = useQuery<Product[]>({
    queryKey: [
      'products', 'filtered',
      filters.query, filters.categoryId,
      filters.minPrice, filters.maxPrice,
      filters.minRating, filters.freeShippingOnly,
      filters.onSaleOnly, filters.sort,
    ],
    queryFn: () => catalogService.getProducts({
      search: filters.query.trim() || undefined,
      categoryId: filters.categoryId ?? undefined,
      minPrice: filters.minPrice ?? undefined,
      maxPrice: filters.maxPrice ?? undefined,
      minRating: filters.minRating ?? undefined,
      freeShipping: filters.freeShippingOnly || undefined,
      onSale: filters.onSaleOnly || undefined,
      sort: filters.sort !== 'featured' ? filters.sort : undefined,
      limit: 100,
    }),
  });

  const categoriesQ = useQuery({
    queryKey: ['categories'],
    queryFn: () => catalogService.getCategories(),
  });

  const categories = categoriesQ.data ?? [];
  const results = data ?? [];

  return { results, isLoading, error, categories, totalCount: results.length };
}
