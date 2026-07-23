import type { ContentDataSource, FeedSection, Shortcut, SuggestedPerson } from "../ContentDataSource";
import type { Banner, FeedPost } from "@/types";
import { HOME_SHORTCUTS } from "./categories";
import { BANNERS, FEED_POSTS } from "./banners";

export class MockContentDataSource implements ContentDataSource {
  async getHomeShortcuts(): Promise<Shortcut[]> {
    return HOME_SHORTCUTS;
  }

  async getFeedPosts(): Promise<FeedPost[]> {
    return FEED_POSTS;
  }

  async getBanners(screen?: string): Promise<Banner[]> {
    // En mode mock on retourne toutes les bannières (pas de filtre par screen)
    return BANNERS;
  }

  async getSuggestedPeople(): Promise<SuggestedPerson[]> {
    return [
      { id: "1", name: "enpropiamano", followers: "8.3k", avatar: "https://picsum.photos/seed/p1/100" },
      { id: "2", name: "Alina_P", followers: "15.2k", avatar: "https://picsum.photos/seed/p2/100" },
    ];
  }

  async getFeedSections(): Promise<FeedSection[]> {
    return []
  }
}
