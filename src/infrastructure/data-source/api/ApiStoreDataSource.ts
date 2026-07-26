import type {
  StoreDataSource,
  StoreCard,
  StoreDetail,
  StoreQuery,
  StoreProductQuery,
  StoreCategory,
  StoreSection,
  StoreGroup,
  StorePaymentMethod,
} from "../StoreDataSource";
import type { Banner, Product } from "@/types";
import { apiAdapter } from "@/infrastructure/api/apiAdapter";
import { resolveMediaUrl } from "@/utils/resolveMediaUrl";

export class ApiStoreDataSource implements StoreDataSource {
  async getStores(query?: StoreQuery): Promise<StoreCard[]> {
    const params = new URLSearchParams();
    if (query?.limit != null) params.set('limit', String(query.limit));
    if (query?.offset != null) params.set('offset', String(query.offset));
    if (query?.search) params.set('search', query.search);
    const qs = params.toString();
    return apiAdapter.get(`/mobile/stores${qs ? `?${qs}` : ''}`);
  }

  async getStoreGroups(): Promise<StoreGroup[]> {
    return apiAdapter.get('/mobile/store-groups');
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

  async getStoreBanners(id: string): Promise<Banner[]> {
    const raw = await apiAdapter.get(`/mobile/stores/${id}/banners`);
    // Les images uploadées via l'admin ont une URL relative (/uploads/banners/…) :
    // React Native ne peut pas les charger sans l'origine du serveur
    return (raw as any[]).map((b) => ({
      ...b,
      imageUrl: resolveMediaUrl(b.imageUrl) ?? b.imageUrl,
    }));
  }

  async getStoreSections(id: string): Promise<StoreSection[]> {
    return apiAdapter.get(`/mobile/stores/${id}/sections`);
  }

  async getStorePaymentMethods(id: string): Promise<StorePaymentMethod[]> {
    const raw = await apiAdapter.get(`/mobile/stores/${id}/payment-methods`);
    // Mêmes contraintes que les bannières : les logos uploadés côté admin ont
    // une URL relative que React Native ne sait pas résoudre seul.
    return (raw as any[]).map((m) => ({
      ...m,
      logoUrl: resolveMediaUrl(m.logoUrl) ?? m.logoUrl,
      iconUrl: resolveMediaUrl(m.iconUrl) ?? m.iconUrl,
    }));
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
