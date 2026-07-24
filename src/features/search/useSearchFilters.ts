import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { catalogService } from '@/features/catalog';
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
  const { data, isLoading } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => catalogService.getProducts(),
  });

  const allProducts = useMemo(() => data ?? [], [data]);

  const categoriesQ = useQuery({
    queryKey: ['categories'],
    queryFn: () => catalogService.getCategories(),
  });

  const categories = categoriesQ.data ?? [];

  const results = useMemo(() => {
    let filtered = [...allProducts];

    // search by query
    const q = filters.query.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((p) => p.title.toLowerCase().includes(q));
    }

    // category
    if (filters.categoryId) {
      filtered = filtered.filter((p) => p.categoryId === filters.categoryId);
    }

    // price range
    if (filters.minPrice != null) {
      filtered = filtered.filter((p) => p.priceUsd >= filters.minPrice!);
    }
    if (filters.maxPrice != null) {
      filtered = filtered.filter((p) => p.priceUsd <= filters.maxPrice!);
    }

    // rating
    if (filters.minRating != null) {
      filtered = filtered.filter((p) => p.rating >= filters.minRating!);
    }

    // free shipping
    if (filters.freeShippingOnly) {
      filtered = filtered.filter((p) => p.freeShipping);
    }

    // on sale
    if (filters.onSaleOnly) {
      filtered = filtered.filter((p) => p.discountPercent != null && p.discountPercent > 0);
    }

    // sort
    switch (filters.sort) {
      case 'priceLow':
        filtered.sort((a, b) => a.priceUsd - b.priceUsd);
        break;
      case 'priceHigh':
        filtered.sort((a, b) => b.priceUsd - a.priceUsd);
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        filtered.sort((a, b) => (a.id > b.id ? -1 : 1));
        break;
    }

    return filtered;
  }, [allProducts, filters]);

  return { results, isLoading, categories, totalCount: allProducts.length };
}
