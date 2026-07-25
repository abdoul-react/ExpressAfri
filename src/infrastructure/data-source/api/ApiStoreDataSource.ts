import type {
  StoreDataSource,
  StoreCard,
  StoreDetail,
  StoreQuery,
  StoreProductQuery,
  StoreCategory,
} from "../StoreDataSource";
import type { Product } from "@/types";
import { apiAdapter } from "@/infrastructure/api/apiAdapter";

export class ApiStoreDataSource implements StoreDataSource {
  async getStores(query?: StoreQuery): Promise<StoreCard[]> {
    const params = new URLSearchParams();
    if (query?.limit != null) params.set('limit', String(query.limit));
    if (query?.offset != null) params.set('offset', String(query.offset));
    if (query?.search) params.set('search', query.search);
    const qs = params.toString();
    return apiAdapter.get(`/mobile/stores${qs ? `?${qs}` : ''}`);
  }

  async getStoreById(id: string): Promise<StoreDetail> {
    return apiAdapter.get(`/mobile/stores/${id}`);
  }

  async getStoreProducts(id: string, query?: StoreProductQuery): Promise<Product[]> {
    const params = new URLSearchParams();
    if (query?.categoryId) params.set('categoryId', query.categoryId);
    if (query?.search) params.set('search', query.search);
    if (query?.sort) params.set('sort', query.sort);
    if (query?.limit != null) params.set('limit', String(query.limit));
    if (query?.offset != null) params.set('offset', String(query.offset));
    if (query?.minPrice != null) params.set('minPrice', String(query.minPrice));
    if (query?.maxPrice != null) params.set('maxPrice', String(query.maxPrice));
    const qs = params.toString();
    return apiAdapter.get(`/mobile/stores/${id}/products${qs ? `?${qs}` : ''}`);
  }

  async getStoreCategories(id: string): Promise<StoreCategory[]> {
    return apiAdapter.get(`/mobile/stores/${id}/categories`);
  }

  async getFollowedStores(): Promise<StoreCard[]> {
    return apiAdapter.get('/mobile/stores/followed');
  }

  async getFollowStatus(id: string): Promise<{ following: boolean }> {
    return apiAdapter.get(`/mobile/stores/${id}/follow-status`);
  }

  async toggleFollow(id: string, follow: boolean): Promise<{ following: boolean }> {
    return apiAdapter.post(`/mobile/stores/${id}/${follow ? 'follow' : 'unfollow'}`, {});
  }
}
