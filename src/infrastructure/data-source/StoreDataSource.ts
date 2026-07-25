import type { Product } from "@/types";

/** Carte boutique affichée dans les listes de découverte. */
export type StoreCard = {
  id: string;
  name: string;
  description: string | null;
  country: string;
  city: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  photos: string[];
  followersCount: number;
  productCount: number;
  likedByMe: boolean;
  /** Champs de compatibilité avec les écrans historiques (compteur formaté, avatar). */
  followers: string;
  avatar: string;
};

export type StoreDetail = StoreCard;

export type StoreQuery = {
  limit?: number;
  offset?: number;
  search?: string;
};

export type StoreProductQuery = {
  categoryId?: string;
  search?: string;
  sort?: string;
  limit?: number;
  offset?: number;
  minPrice?: number;
  maxPrice?: number;
};

export type StoreCategory = {
  id: string;
  name: string;
  image?: string | null;
  parentId?: string | null;
};

export interface StoreDataSource {
  getStores(query?: StoreQuery): Promise<StoreCard[]>;
  getStoreById(id: string): Promise<StoreDetail>;
  getStoreProducts(id: string, query?: StoreProductQuery): Promise<Product[]>;
  getStoreCategories(id: string): Promise<StoreCategory[]>;
  getFollowedStores(): Promise<StoreCard[]>;
  getFollowStatus(id: string): Promise<{ following: boolean }>;
  toggleFollow(id: string, follow: boolean): Promise<{ following: boolean }>;
}
