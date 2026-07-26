import type { Banner, Product } from "@/types";

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

/** Format des cartes produit choisi par le boutiquier pour une section. */
export type StoreSectionLayout = 'grid' | 'rail' | 'list' | 'showcase';

/** Section de catalogue composée par le boutiquier, produits déjà hydratés. */
export type StoreSection = {
  id: string;
  title: string;
  subtitle: string | null;
  layout: StoreSectionLayout;
  products: Product[];
};

/**
 * Section de la vitrine : regroupe des BOUTIQUES par thème sur la page liste.
 * Composée par l'admin central — à ne pas confondre avec `StoreSection`, qui
 * regroupe les PRODUITS à l'intérieur d'une boutique.
 */
export type StoreGroup = {
  id: string;
  title: string;
  subtitle: string | null;
  icon: string | null;
  stores: StoreCard[];
};

/**
 * Moyen de paiement accepté par une boutique, tel que vu par le client.
 * Aucune donnée technique : l'API ne projette ni clé, ni secret, ni référence.
 */
export type StorePaymentMethod = {
  id: string;
  type: 'mobile_money' | 'card' | 'wallet' | 'cash_on_delivery';
  provider: string;
  displayName: string;
  description: string | null;
  logoUrl: string | null;
  iconUrl: string | null;
  instructions: string | null;
};

export interface StoreDataSource {
  getStores(query?: StoreQuery): Promise<StoreCard[]>;
  getStoreGroups(): Promise<StoreGroup[]>;
  getStoreById(id: string): Promise<StoreDetail>;
  getStoreProducts(id: string, query?: StoreProductQuery): Promise<Product[]>;
  getStoreCategories(id: string): Promise<StoreCategory[]>;
  getStoreBanners(id: string): Promise<Banner[]>;
  getStoreSections(id: string): Promise<StoreSection[]>;
  getStorePaymentMethods(id: string): Promise<StorePaymentMethod[]>;
  getFollowedStores(): Promise<StoreCard[]>;
  getFollowStatus(id: string): Promise<{ following: boolean }>;
  toggleFollow(id: string, follow: boolean): Promise<{ following: boolean }>;
}
