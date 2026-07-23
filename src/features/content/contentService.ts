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
};
