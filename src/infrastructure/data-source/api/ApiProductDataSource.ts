import type { ProductDataSource, ReviewPayload, ProductQuery } from "../ProductDataSource";
import type { Product } from "@/types";
import { apiAdapter } from "@/infrastructure/api/apiAdapter";

export class ApiProductDataSource implements ProductDataSource {
  async getProducts(query?: ProductQuery): Promise<Product[]> {
    const params = new URLSearchParams();
    if (query?.search) params.set('search', query.search);
    if (query?.categoryId) params.set('categoryId', query.categoryId);
    if (query?.storeId) params.set('storeId', query.storeId);
    if (query?.limit != null) params.set('limit', String(query.limit));
    if (query?.offset != null) params.set('offset', String(query.offset));
    if (query?.minPrice != null) params.set('minPrice', String(query.minPrice));
    if (query?.maxPrice != null) params.set('maxPrice', String(query.maxPrice));
    if (query?.minRating != null) params.set('minRating', String(query.minRating));
    if (query?.freeShipping) params.set('freeShipping', 'true');
    if (query?.onSale) params.set('onSale', 'true');
    if (query?.sort) params.set('sort', query.sort);
    const qs = params.toString();
    return apiAdapter.get(`/mobile/products${qs ? `?${qs}` : ''}`);
  }

  async getProductById(id: string): Promise<Product | undefined> {
    return apiAdapter.get(`/mobile/products/${id}`);
  }

  async getByCategory(categoryId: string): Promise<Product[]> {
    return apiAdapter.get(`/mobile/categories/${categoryId}/products`);
  }

  async getProductReviews(productId: string): Promise<any[]> {
    return apiAdapter.get(`/mobile/products/${productId}/reviews`);
  }

  async submitProductReview(productId: string, data: ReviewPayload): Promise<{ id: string; updated: boolean }> {
    return apiAdapter.post(`/mobile/products/${productId}/reviews`, data as Record<string, unknown>);
  }
}
