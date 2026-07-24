import type { IconName } from "@/icons";
import type { Banner, FeedPost } from "@/types";

export type ShortcutTarget = {
  type: 'category' | 'section' | 'screen' | 'search';
  value: string;
} | null;

export type Shortcut = {
  id: string;
  labelKey: string;
  icon: IconName;
  target?: ShortcutTarget;
};

export type FeedSection = {
  id: string
  title: string
  type: 'products' | 'stores' | 'banners' | 'categories' | 'inspiration' | 'custom'
  displayStyle: 'horizontal-scroll' | 'grid' | 'list' | 'card'
  position: number
  isActive: boolean
  data?: any
}

export type SuggestedPerson = {
  id: string;
  name: string;
  followers: string;
  avatar: string;
};

export interface ContentDataSource {
  getHomeShortcuts(): Promise<Shortcut[]>;
  getFeedPosts(): Promise<FeedPost[]>;
  getBanners(screen?: string): Promise<Banner[]>;
  getSuggestedPeople(): Promise<SuggestedPerson[]>;
  getFeedSections(): Promise<FeedSection[]>;
  getFeedSectionProducts(sectionId: string): Promise<{ id: string; title: string; displayStyle: string; items: any[] }>;
  toggleFeedLike(postId: string): Promise<{ liked: boolean; likes: number }>;
  getTrending(): Promise<string[]>;
  getShippingCountries(): Promise<string[]>;
  listStaticPages(): Promise<{ slug: string; title: string; updatedAt: string }[]>;
  getStaticPageBySlug(slug: string): Promise<{ slug: string; title: string; content: string; updatedAt?: string }>;
  getAppSettings(): Promise<{ key: string; value: string }[]>;
  getAppLogos(): Promise<any[]>;
  getFeatureFlags(): Promise<any[]>;
}
