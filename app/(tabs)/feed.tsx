import {
  fontSize,
  radius,
  spacing,
  useColors,
  useThemedStyles,
  type Colors,
} from "@/design-system";
import { useFeed, useToggleFeedLike } from "@/features/feed";
import { useFollowedStores, useToggleFollow } from "@/features/follows";
import { useHomeStores } from "@/features/home/useHomeStores";
import { useUnreadCount } from "@/features/messages";
import { Icon } from "@/icons";
import { BrandHeaderGradient, MediaViewer, type MediaViewerItem } from "@/components";
import { useAuthStore } from "@/store/authStore";
import type { FeedPost } from "@/types";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function FeedScreen() {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const [tab, setTab] = useState<"inspiration" | "subscriptions">(
    "inspiration",
  );
  const { posts } = useFeed();
  const unreadCount = useUnreadCount();
  const [viewerItem, setViewerItem] = useState<MediaViewerItem | null>(null);

  // Masonry 2 colonnes équilibré par hauteur estimée (ratio réel du média),
  // pas par simple alternance : les colonnes restent de tailles proches.
  const { left, right } = useMemo(() => {
    const l: FeedPost[] = [];
    const r: FeedPost[] = [];
    let lh = 0;
    let rh = 0;
    for (const p of posts) {
      const h = p.aspectRatio ?? (p.height ? p.height / 180 : 1);
      if (lh <= rh) {
        l.push(p);
        lh += h;
      } else {
        r.push(p);
        rh += h;
      }
    }
    return { left: l, right: r };
  }, [posts]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <BrandHeaderGradient />
        <Pressable style={styles.searchStub} onPress={() => router.push("/search")}>
          <Icon name="search" size={18} color={colors.textMuted} />
          <Text style={styles.searchText} numberOfLines={1}>
            {t("feed.moreInspiration")}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/messages")}
          hitSlop={8}
          style={styles.msgBtn}
        >
          <Icon name="message" size={24} color={colors.text} />
          {unreadCount > 0 && (
            <View style={styles.msgBadge}>
              <Text style={styles.msgBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <View style={styles.tabs}>
        {(["inspiration", "subscriptions"] as const).map((tb) => (
          <Pressable key={tb} onPress={() => setTab(tb)} style={styles.tab}>
            <Text style={[styles.tabText, tab === tb && styles.tabTextActive]}>
              {t(`feed.${tb}`)}
            </Text>
            {tab === tb && <View style={styles.underline} />}
          </Pressable>
        ))}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {tab === "inspiration" ? (
          posts.length === 0 ? (
            <View style={styles.emptyFeed}>
              <Icon name="feed" size={44} color={colors.textMuted} />
              <Text style={styles.emptyFeedText}>{t("feed.empty", "Rien à afficher pour le moment")}</Text>
            </View>
          ) : (
            <MasonryFeed left={left} right={right} onOpenMedia={setViewerItem} />
          )
        ) : (
          <Subscriptions />
        )}
      </ScrollView>

      {/* Lecture plein écran (vidéos et photos du fil) */}
      <MediaViewer item={viewerItem} onClose={() => setViewerItem(null)} />
    </View>
  );
}

function MasonryFeed({
  left,
  right,
  onOpenMedia,
}: {
  left: FeedPost[];
  right: FeedPost[];
  onOpenMedia: (item: MediaViewerItem) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.masonry}>
      {[left, right].map((col, ci) => (
        <View key={ci} style={styles.col}>
          {col.map((post) => (
            <PostCard key={post.id} post={post} onOpenMedia={onOpenMedia} />
          ))}
        </View>
      ))}
    </View>
  );
}

function PostCard({
  post,
  onOpenMedia,
}: {
  post: FeedPost;
  onOpenMedia: (item: MediaViewerItem) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const toggleLike = useToggleFeedLike();

  // Largeur de colonne = (écran - padding - gouttière) / 2 → hauteur fidèle au ratio
  const colWidth = (width - spacing.sm * 2 - spacing.sm) / 2;
  const mediaHeight = Math.round(colWidth * (post.aspectRatio ?? 1));

  const openPost = () => {
    if (post.mediaType === "video" && post.videoUrl) {
      onOpenMedia({ url: post.videoUrl, type: "video", caption: post.title });
    } else if (post.linkUrl) {
      router.push(post.linkUrl as never);
    } else {
      onOpenMedia({ url: post.image, type: "image", caption: post.title });
    }
  };

  const onLike = () => {
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }
    toggleLike.mutate(post.id);
  };

  return (
    <Pressable style={styles.postCard} onPress={openPost}>
      <View>
        <Image
          source={{ uri: post.image }}
          style={[styles.postImg, { height: Math.max(120, Math.min(mediaHeight, 340)) }]}
          contentFit="cover"
        />
        {post.mediaType === "video" && (
          <>
            <View style={styles.playOverlay}>
              <Icon name="play" size={22} color={colors.white} fill />
            </View>
            {post.duration ? (
              <View style={styles.duration}>
                <Icon name="play" size={10} color={colors.white} fill />
                <Text style={styles.durationText}>{post.duration}</Text>
              </View>
            ) : null}
          </>
        )}
      </View>
      <View style={styles.postBody}>
        <Text style={styles.postTitle} numberOfLines={2}>
          {post.title}
        </Text>
        <View style={styles.postFooter}>
          <View style={styles.author}>
            {post.authorAvatar ? (
              <Image source={{ uri: post.authorAvatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Icon name="account" size={12} color={colors.textMuted} />
              </View>
            )}
            <Text style={styles.authorName} numberOfLines={1}>
              {post.author}
            </Text>
          </View>
          <Pressable style={styles.likes} onPress={onLike} hitSlop={8}>
            <Icon
              name="thumbUp"
              size={14}
              color={post.likedByMe ? colors.primary : colors.textMuted}
              fill={post.likedByMe}
            />
            <Text style={[styles.likesText, post.likedByMe && { color: colors.primary, fontWeight: "700" }]}>
              {post.likes}
            </Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

/**
 * Onglet Abonnements : les boutiques que le client suit réellement,
 * plus des recommandations à suivre (mêmes données que l'écran Boutiques).
 */
function Subscriptions() {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const router = useRouter();
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { stores: followed } = useFollowedStores();
  const { stores: recommended } = useHomeStores(10);
  const toggleFollow = useToggleFollow();

  const followedIds = new Set(followed.map((s) => s.id));
  const reco = recommended.filter((s) => !followedIds.has(s.id)).slice(0, 6);

  const requireAuth = (fn: () => void) => () => {
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }
    fn();
  };

  return (
    <View style={styles.subs}>
      {/* Boutiques suivies */}
      {followed.length > 0 && (
        <>
          <Text style={styles.subsTitle}>{t("feed.mySubscriptions", "Mes abonnements")}</Text>
          {followed.map((s) => (
            <View key={s.id} style={styles.storeRow}>
              {s.avatar ? (
                <Image source={{ uri: s.avatar }} style={styles.storeAvatar} />
              ) : (
                <View style={[styles.storeAvatar, styles.avatarFallback]}>
                  <Icon name="store" size={20} color={colors.textMuted} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.storeName}>{s.name}</Text>
                <Text style={styles.storeFollowers}>{s.followers} {t("feed.followers", "abonnés")}</Text>
              </View>
              <Pressable
                style={[styles.followBtnSmall, styles.followingBtn]}
                onPress={requireAuth(() => toggleFollow.mutate({ storeId: s.id, follow: false }))}
                disabled={toggleFollow.isPending}
              >
                <Text style={styles.followingText}>{t("feed.following", "Suivi")}</Text>
              </Pressable>
            </View>
          ))}
        </>
      )}

      {followed.length === 0 && (
        <View style={styles.emptySubs}>
          <Icon name="store" size={40} color={colors.textMuted} />
          <Text style={styles.emptySubsText}>
            {t("feed.noSubscriptions", "Vous ne suivez aucune boutique pour le moment")}
          </Text>
        </View>
      )}

      {/* Recommandations */}
      {reco.length > 0 && (
        <>
          <Text style={[styles.subsTitle, { marginTop: spacing.xl }]}>{t("feed.suggestions")}</Text>
          {reco.map((s) => (
            <View key={s.id} style={styles.storeRow}>
              {s.avatar ? (
                <Image source={{ uri: s.avatar }} style={styles.storeAvatar} />
              ) : (
                <View style={[styles.storeAvatar, styles.avatarFallback]}>
                  <Icon name="store" size={20} color={colors.textMuted} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.storeName}>{s.name}</Text>
                <Text style={styles.storeFollowers}>{s.followers} {t("feed.followers", "abonnés")}</Text>
              </View>
              <Pressable
                style={styles.followBtnSmall}
                onPress={requireAuth(() => toggleFollow.mutate({ storeId: s.id, follow: true }))}
                disabled={toggleFollow.isPending}
              >
                <Text style={styles.followText}>{t("feed.follow")}</Text>
              </Pressable>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    searchStub: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: colors.background,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      height: 40,
    },
    searchText: { color: colors.textMuted, fontSize: fontSize.md, flex: 1 },
    msgBtn: { padding: 2 },
    msgBadge: {
      position: "absolute",
      top: -4,
      right: -6,
      backgroundColor: colors.sale,
      borderRadius: 9,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      alignItems: "center",
      justifyContent: "center",
    },
    msgBadgeText: { color: colors.white, fontSize: 10, fontWeight: "800" },
    tabs: {
      flexDirection: "row",
      gap: spacing.xl,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
      backgroundColor: colors.surface,
    },
    tab: { alignItems: "center" },
    tabText: {
      fontSize: fontSize.xl,
      fontWeight: "700",
      color: colors.textSecondary,
    },
    tabTextActive: { color: colors.text },
    underline: {
      marginTop: 4,
      height: 3,
      width: 24,
      borderRadius: 2,
      backgroundColor: colors.sale,
    },
    scrollContent: { paddingBottom: spacing.xxl * 2 },
    emptyFeed: {
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: spacing.xxl * 2,
    },
    emptyFeedText: { fontSize: fontSize.md, color: colors.textMuted },
    masonry: {
      flexDirection: "row",
      paddingHorizontal: spacing.sm,
      gap: spacing.sm,
    },
    col: { flex: 1, gap: spacing.sm, paddingTop: spacing.sm },
    postCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      overflow: "hidden",
    },
    postImg: { width: "100%", backgroundColor: colors.background },
    playOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: "center",
      justifyContent: "center",
    },
    duration: {
      position: "absolute",
      top: spacing.sm,
      left: spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor: "rgba(0,0,0,0.55)",
      borderRadius: radius.pill,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    durationText: { color: colors.white, fontSize: 10, fontWeight: "700" },
    postBody: { padding: spacing.sm, gap: spacing.sm },
    postTitle: { fontSize: fontSize.md, color: colors.text, lineHeight: 18 },
    postFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    author: { flexDirection: "row", alignItems: "center", gap: 5, flex: 1 },
    avatar: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.background,
    },
    avatarFallback: { alignItems: "center", justifyContent: "center" },
    authorName: { fontSize: fontSize.xs, color: colors.textSecondary, flex: 1 },
    likes: { flexDirection: "row", alignItems: "center", gap: 3, padding: 4 },
    likesText: { fontSize: fontSize.xs, color: colors.textMuted },
    subs: { padding: spacing.lg },
    subsTitle: {
      fontSize: fontSize.md,
      color: colors.textSecondary,
      marginBottom: spacing.md,
      fontWeight: "700",
    },
    emptySubs: {
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: spacing.xxl,
    },
    emptySubsText: {
      fontSize: fontSize.md,
      color: colors.textMuted,
      textAlign: "center",
    },
    storeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    storeAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.background,
    },
    storeName: { fontSize: fontSize.md, fontWeight: "700", color: colors.text },
    storeFollowers: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 1 },
    followBtnSmall: {
      backgroundColor: colors.primary,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    followingBtn: {
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    followingText: {
      color: colors.textSecondary,
      fontWeight: "700",
      fontSize: fontSize.sm,
    },
    followText: {
      color: colors.white,
      fontWeight: "700",
      fontSize: fontSize.sm,
    },
  });
