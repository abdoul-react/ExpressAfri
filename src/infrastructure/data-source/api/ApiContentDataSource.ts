import type { ContentDataSource, FeedSection } from "../ContentDataSource";
import type { Shortcut, SuggestedPerson } from "../ContentDataSource";
import type { Banner, FeedPost } from "@/types";
import { apiAdapter } from "@/infrastructure/api/apiAdapter";
import { resolveMediaUrl } from "@/utils/resolveMediaUrl";
import { ICONS, type IconName } from "@/icons/paths";

// Icônes de remplacement pour les catégories dont l'icône backend ne serait pas dans paths.ts
const ICON_ALIAS: Record<string, IconName> = {
  'shoeSneaker': 'tag',
  'toyBrick': 'gift',
  'instagram': 'share',
  'twitter': 'share',
  'whatsapp': 'message',
  'tiktok': 'play',
  'cash': 'wallet',
};

function resolveIcon(icon: string | undefined): IconName {
  if (!icon) return 'tag';
  if (icon in ICONS) return icon as IconName;
  if (icon in ICON_ALIAS) return ICON_ALIAS[icon];
  return 'tag';
}

// Les images uploadées via l'admin ont une URL relative (/uploads/banners/…) :
// React Native ne peut pas les charger sans l'origine du serveur
function resolveBannerImage(b: any): Banner {
  return { ...b, imageUrl: resolveMediaUrl(b.imageUrl) ?? b.imageUrl };
}

export class ApiContentDataSource implements ContentDataSource {
  async getHomeShortcuts(): Promise<Shortcut[]> {
    const raw = await apiAdapter.get("/mobile/shortcuts");
    // Normalise les icônes pour n'utiliser que celles présentes dans paths.ts
    return (raw as any[]).map((s: any) => ({
      ...s,
      icon: resolveIcon(s.icon),
    }));
  }

  async getFeedPosts(): Promise<FeedPost[]> {
    const raw = await apiAdapter.get("/mobile/feed");
    // Résoudre les URLs relatives (/uploads/…) des médias et avatars
    return (raw as any[]).map((p) => ({
      ...p,
      image: resolveMediaUrl(p.image) ?? p.image,
      videoUrl: p.videoUrl ? (resolveMediaUrl(p.videoUrl) ?? p.videoUrl) : null,
      authorAvatar: p.authorAvatar ? (resolveMediaUrl(p.authorAvatar) ?? p.authorAvatar) : undefined,
    }));
  }

  async getBanners(screen?: string): Promise<Banner[]> {
    const params = screen ? `?screen=${encodeURIComponent(screen)}` : '';
    const raw = await apiAdapter.get(`/mobile/banners${params}`);
    return (raw as any[]).map(resolveBannerImage);
  }

  async getSuggestedPeople(): Promise<SuggestedPerson[]> {
    return apiAdapter.get("/mobile/suggested-people");
  }

  async getFeedSections(): Promise<FeedSection[]> {
    const raw = await apiAdapter.get("/mobile/feed-sections");
    // Les sections 'banners' contiennent des items bannières → résoudre leurs URLs d'image aussi
    return (raw as any[]).map((s: any) =>
      s.type === 'banners' && Array.isArray(s.items)
        ? { ...s, items: s.items.map(resolveBannerImage) }
        : s,
    );
  }

  async toggleFeedLike(postId: string): Promise<{ liked: boolean; likes: number }> {
    return apiAdapter.post(`/mobile/feed/${postId}/like`, {});
  }

  async getTrending(): Promise<string[]> {
    return apiAdapter.get("/mobile/search/trending");
  }

  async getShippingCountries(): Promise<string[]> {
    return apiAdapter.get("/mobile/shipping-countries");
  }
}
