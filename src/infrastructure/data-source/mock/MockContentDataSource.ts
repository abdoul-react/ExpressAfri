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
    return [];
  }

  async toggleFeedLike(_postId: string): Promise<{ liked: boolean; likes: number }> {
    return { liked: true, likes: 0 };
  }

  async getTrending(): Promise<string[]> {
    return [];
  }

  async getShippingCountries(): Promise<string[]> {
    return [];
  }

  async getFeedSectionProducts(_id: string): Promise<{ id: string; title: string; displayStyle: string; items: any[] }> {
    return { id: _id, title: "", displayStyle: "horizontal-scroll", items: [] };
  }

  async listStaticPages(): Promise<{ slug: string; title: string; updatedAt: string }[]> {
    return [];
  }

  async getStaticPageBySlug(_slug: string): Promise<{ slug: string; title: string; content: string; updatedAt?: string }> {
    return { slug: _slug, title: "", content: "" };
  }

  async getAppSettings(): Promise<{ key: string; value: string }[]> {
    return [];
  }

  async getAppLogos(): Promise<any[]> {
    return [];
  }

  async getFeatureFlags(): Promise<any[]> {
    return [];
  }
}
