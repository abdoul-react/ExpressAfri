import type { Banner, FeedPost } from "@/types";
import type { Shortcut, SuggestedPerson, FeedSection } from "@/infrastructure/data-source";
import { contentDataSource } from "@/infrastructure/data-source";

export const contentService = {
  async getHomeShortcuts(): Promise<Shortcut[]> {
    return contentDataSource.getHomeShortcuts();
  },

  async getFeedPosts(): Promise<FeedPost[]> {
    return contentDataSource.getFeedPosts();
  },

  async getBanners(screen?: string): Promise<Banner[]> {
    return contentDataSource.getBanners(screen);
  },

  async getSuggestedPeople(): Promise<SuggestedPerson[]> {
    return contentDataSource.getSuggestedPeople();
  },

  async getFeedSections(): Promise<FeedSection[]> {
    return contentDataSource.getFeedSections();
  },

  async toggleFeedLike(postId: string): Promise<{ liked: boolean; likes: number }> {
    return contentDataSource.toggleFeedLike(postId);
  },

  async getTrending(): Promise<string[]> {
    return contentDataSource.getTrending();
  },

  async getShippingCountries(): Promise<string[]> {
    return contentDataSource.getShippingCountries();
  },

  async getFeedSectionProducts(sectionId: string) {
    return contentDataSource.getFeedSectionProducts(sectionId);
  },

  async listStaticPages() {
    return contentDataSource.listStaticPages();
  },

  async getStaticPageBySlug(slug: string) {
    return contentDataSource.getStaticPageBySlug(slug);
  },

  async getAppSettings() {
    return contentDataSource.getAppSettings();
  },

  async getAppLogos() {
    return contentDataSource.getAppLogos();
  },

  async getFeatureFlags() {
    return contentDataSource.getFeatureFlags();
  },
};
