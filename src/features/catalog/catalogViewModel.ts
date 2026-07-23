import type { Product } from "@/types";

export function getSuggestionsSlice(
  products: Product[],
  count?: number,
  offset = 0,
): Product[] {
  if (count == null) {
    return products.slice(offset);
  }

  return products.slice(offset, offset + count);
}

export function getWishlistProducts(
  products: Product[],
  ids: string[],
): Product[] {
  return products.filter((product) => ids.includes(product.id));
}

export function searchProducts(products: Product[], query: string): Product[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [];
  }

  return products.filter((product) =>
    product.title.toLowerCase().includes(normalizedQuery),
  );
}

export function getRelatedProducts(
  products: Product[],
  currentId: string,
  count = 6,
): Product[] {
  return products.filter((product) => product.id !== currentId).slice(0, count);
}
