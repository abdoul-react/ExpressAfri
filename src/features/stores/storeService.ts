import type { Banner, Product } from "@/types";
import { storeDataSource } from "@/infrastructure/data-source";
import type {
  StoreCard,
  StoreDetail,
  StoreQuery,
  StoreProductQuery,
  StoreCategory,
  StoreSection,
  StoreGroup,
  StorePaymentMethod,
} from "@/infrastructure/data-source/StoreDataSource";

export const storeService = {
  async getStores(query?: StoreQuery): Promise<StoreCard[]> {
    return storeDataSource.getStores(query);
  },

  async getStoreGroups(): Promise<StoreGroup[]> {
    return storeDataSource.getStoreGroups();
  },

  async getStoreById(id: string): Promise<StoreDetail> {
    return storeDataSource.getStoreById(id);
  },

  async getStoreProducts(id: string, query?: StoreProductQuery): Promise<Product[]> {
    return storeDataSource.getStoreProducts(id, query);
  },

  async getStoreCategories(id: string): Promise<StoreCategory[]> {
    return storeDataSource.getStoreCategories(id);
  },

  async getStoreBanners(id: string): Promise<Banner[]> {
    return storeDataSource.getStoreBanners(id);
  },

  async getStoreSections(id: string): Promise<StoreSection[]> {
    return storeDataSource.getStoreSections(id);
  },

  async getStorePaymentMethods(id: string): Promise<StorePaymentMethod[]> {
    return storeDataSource.getStorePaymentMethods(id);
  },

  async getFollowedStores(): Promise<StoreCard[]> {
    return storeDataSource.getFollowedStores();
  },

  async getFollowStatus(id: string): Promise<{ following: boolean }> {
    return storeDataSource.getFollowStatus(id);
  },

  async toggleFollow(id: string, follow: boolean): Promise<{ following: boolean }> {
    return storeDataSource.toggleFollow(id, follow);
  },
};
