import { Avatar, BrandHeaderGradient, Button, ProductCard } from "@/components";
import {
  fontSize,
  radius,
  spacing,
  useColors,
  useThemedStyles,
  type Colors,
} from "@/design-system";
import { useSuggestions } from "@/features/catalog";
// Import direct pour éviter le cycle Metro : content/index → useAccountBanners → content/index
import { useAccountBanners } from "@/features/content/useAccountBanners";
import { useUnreadCount } from "@/features/messages";
import { Icon, IconName } from "@/icons";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { COUNTRIES, useSettingsStore } from "@/store/settingsStore";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";

type ActionCfg = {
  key: string;
  icon: IconName;
  labelKey: string;
  href: string;
};

const ORDER_ACTIONS: ActionCfg[] = [
  {
    key: "unpaid",
    icon: "creditCard",
    labelKey: "account.unpaid",
    href: "/orders?status=unpaid",
  },
  {
    key: "toShip",
    icon: "box",
    labelKey: "account.toShip",
    href: "/orders?status=toShip",
  },
  {
    key: "shipped",
    icon: "truck",
    labelKey: "account.shipped",
    href: "/orders?status=shipped",
  },
  {
    key: "toReview",
    icon: "message",
    labelKey: "account.toReview",
    href: "/orders?status=toReview",
  },
  {
    key: "returns",
    icon: "return",
    labelKey: "account.returns",
    href: "/orders?status=returns",
  },
];

const GRID_ACTIONS: ActionCfg[] = [
  {
    key: "history",
    icon: "history",
    labelKey: "account.history",
    // Historique = toutes les commandes (l'onglet "Expédiées" seul était trompeur)
    href: "/orders?status=all",
  },
  {
    key: "wishlist",
    icon: "heart",
    labelKey: "account.wishlist",
    href: "/wishlist",
  },
  {
    key: "coupons",
    icon: "coupon",
    labelKey: "account.coupons",
    href: "/coupons",
  },
  {
    key: "stores",
    icon: "store",
    labelKey: "account.followedStores",
    href: "/stores",
  },
];

const WALLET_ACTIONS: ActionCfg[] = [
  {
    key: "payment",
    icon: "creditCard",
    labelKey: "account.payment",
    href: "/payment",
  },
  {
    key: "bonus",
    icon: "gift",
    labelKey: "account.bonus",
    href: "/wallet/bonus",
  },
  {
    key: "savings",
    icon: "coins",
    labelKey: "account.savings",
    href: "/wallet/savings",
  },
  {
    key: "benefits",
    icon: "star",
    labelKey: "account.benefits",
    href: "/coupons",
  },
  {
    key: "support",
    icon: "headset",
    labelKey: "account.support",
    href: "/messages",
  },
];

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuthStore();
  const countryCode = useSettingsStore((s) => s.country);
  const country = COUNTRIES.find((c) => c.code === countryCode)!;
  const suggestions = useSuggestions(6);
  const toggleWish = useWishlistStore((s) => s.toggle);
  const addToCart = useCartStore((s) => s.add);
  const wishedIds = useWishlistStore((s) => s.ids);
  const unreadCount = useUnreadCount();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  // Bannières CMS pour l'écran Compte (rien ne s'affiche si la liste est vide)
  const cmsBanners = useAccountBanners();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['products'] }),
      queryClient.invalidateQueries({ queryKey: ['banners'] }),
      queryClient.invalidateQueries({ queryKey: ['banners', 'account'] }),
      // CMS : logos et settings se mettent à jour au pull-to-refresh
      queryClient.invalidateQueries({ queryKey: ['app-logos'] }),
      queryClient.invalidateQueries({ queryKey: ['app-settings'] }),
    ]);
    setRefreshing(false);
  }, [queryClient]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* En-tête profil — FIXE (sticky), voile dégradé de marque comme l'accueil */}
      <View style={styles.profile}>
        <BrandHeaderGradient />
        <Pressable onPress={() => router.push("/profile")}>
          <Avatar uri={user?.avatar} name={user?.name} size={48} />
        </Pressable>
        <Pressable style={{ flex: 1 }} onPress={() => router.push("/profile")}>
          <Text style={styles.name} numberOfLines={1}>
            {isAuthenticated ? user?.name : t("account.guest")}
          </Text>
          {!isAuthenticated && (
            <Text style={styles.signInLink}>
              {t("auth.signIn")} / {t("auth.signUp")}
            </Text>
          )}
        </Pressable>
        <Pressable
          style={styles.flagBtn}
          onPress={() => router.push("/settings")}
        >
          <Image
            source={{
              uri: `https://flagcdn.com/w80/${country.code.toLowerCase()}.png`,
            }}
            style={styles.flag}
            contentFit="cover"
          />
        </Pressable>
        <Pressable
          style={styles.iconBtn}
          onPress={() => router.push("/settings")}
        >
          <Icon name="settings" size={24} color={colors.text} />
        </Pressable>
        <Pressable
          style={styles.iconBtn}
          onPress={() => router.push("/messages")}
        >
          <Icon name="bell" size={24} color={colors.text} />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Bannière promo — FIXE (sous l'en-tête), pilotée par le CMS (screen=account) */}
      {cmsBanners.length > 0 && (
        <Pressable
          onPress={() => cmsBanners[0].linkUrl ? router.push(cmsBanners[0].linkUrl as any) : undefined}
        >
          <View style={[styles.promo, cmsBanners[0].backgroundColor ? { backgroundColor: cmsBanners[0].backgroundColor } : {}]}>
            {cmsBanners[0].imageUrl ? (
              <>
                <Image source={{ uri: cmsBanners[0].imageUrl }} style={styles.promoBannerImg} contentFit="cover" />
                {/* Voile sombre entre l'image et le texte pour garantir la lisibilité */}
                <View style={styles.promoScrim} />
              </>
            ) : null}
            <View style={{ flex: 1 }}>
              <Text style={styles.promoText} numberOfLines={1}>
                {cmsBanners[0].title}
              </Text>
              {cmsBanners[0].subtitle ? (
                <Text style={styles.promoSubText} numberOfLines={1}>{cmsBanners[0].subtitle}</Text>
              ) : null}
            </View>
            {cmsBanners[0].discountLabel ? (
              <View style={styles.promoBadge}>
                <Text style={styles.promoBadgeText}>{cmsBanners[0].discountLabel}</Text>
              </View>
            ) : null}
            {cmsBanners[0].ctaText ? (
              <View style={styles.promoCta}>
                <Text style={styles.promoCtaText} numberOfLines={1}>{cmsBanners[0].ctaText}</Text>
              </View>
            ) : (
              <Icon name="chevronRight" size={20} color={colors.white} />
            )}
          </View>
        </Pressable>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Prompt connexion invité */}
        {!isAuthenticated && (
          <View style={styles.guestCard}>
            <Text style={styles.guestText}>{t("account.signInPrompt")}</Text>
            <Button
              label={t("auth.signIn")}
              size="sm"
              onPress={() => router.push("/auth/login")}
            />
          </View>
        )}

        {/* Mes commandes */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{t("account.myOrders")}</Text>
            <Pressable
              style={styles.seeAll}
              onPress={() => router.push("/orders")}
            >
              <Text style={styles.seeAllText}>{t("common.seeAll")}</Text>
              <Icon name="chevronRight" size={16} color={colors.textMuted} />
            </Pressable>
          </View>
          <View style={styles.actionRow}>
            {ORDER_ACTIONS.map((a) => (
              <ActionItem
                key={a.key}
                icon={a.icon}
                label={t(a.labelKey)}
                onPress={() => router.push(a.href)}
              />
            ))}
          </View>
        </View>

        {/* Grille raccourcis (4 colonnes) */}
        <View style={styles.card}>
          <View style={styles.actionRow}>
            {GRID_ACTIONS.map((a) => (
              <ActionItem
                key={a.key}
                icon={a.icon}
                label={t(a.labelKey)}
                onPress={() => router.push(a.href)}
                big
                cols={4}
              />
            ))}
          </View>
        </View>

        {/* Bannière large intercalée — 2e bannière CMS (screen=account), rien si absente */}
        {cmsBanners.length > 1 && (
          <Pressable
            onPress={() => cmsBanners[1].linkUrl ? router.push(cmsBanners[1].linkUrl as any) : undefined}
          >
            <View style={[styles.midBanner, cmsBanners[1].backgroundColor ? { backgroundColor: cmsBanners[1].backgroundColor } : {}]}>
              {cmsBanners[1].imageUrl ? (
                <>
                  <Image source={{ uri: cmsBanners[1].imageUrl }} style={styles.midBannerBgImg} contentFit="cover" />
                  {/* Voile sombre entre l'image et le texte pour garantir la lisibilité */}
                  <View style={styles.promoScrim} />
                </>
              ) : null}
              <View style={{ flex: 1 }}>
                <Text style={styles.midBannerTitle} numberOfLines={1}>
                  {cmsBanners[1].title}
                </Text>
                {cmsBanners[1].subtitle ? (
                  <Text style={styles.midBannerSub} numberOfLines={1}>{cmsBanners[1].subtitle}</Text>
                ) : null}
              </View>
              {cmsBanners[1].discountLabel ? (
                <View style={styles.promoBadge}>
                  <Text style={styles.promoBadgeText}>{cmsBanners[1].discountLabel}</Text>
                </View>
              ) : null}
              {cmsBanners[1].ctaText ? (
                <View style={styles.promoCta}>
                  <Text style={styles.promoCtaText} numberOfLines={1}>{cmsBanners[1].ctaText}</Text>
                </View>
              ) : (
                <Icon name="chevronRight" size={22} color={colors.white} />
              )}
            </View>
          </Pressable>
        )}

        {/* Deux cartes pub (séparateur) — 3e et 4e bannières CMS (screen=account), rien si absentes */}
        {cmsBanners.length > 2 && (
          <View style={styles.promoCards}>
            {cmsBanners.slice(2, 4).map((b, i) => (
              <Pressable
                key={b.id}
                style={[
                  styles.promoCard,
                  i === 0 ? styles.promoCardPrimary : styles.promoCardSecondary,
                  b.backgroundColor ? { backgroundColor: b.backgroundColor } : {},
                ]}
                onPress={() => b.linkUrl ? router.push(b.linkUrl as any) : undefined}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.promoCardTitle} numberOfLines={1}>
                    {b.title}
                  </Text>
                  {b.subtitle ? (
                    <Text style={styles.promoCardSub} numberOfLines={1}>
                      {b.subtitle}
                    </Text>
                  ) : null}
                  {b.ctaText ? (
                    <View style={styles.promoCardBtn}>
                      <Text style={styles.promoCardBtnText}>{b.ctaText}</Text>
                    </View>
                  ) : null}
                </View>
                {b.imageUrl ? (
                  <Image source={{ uri: b.imageUrl }} style={styles.promoCardImg} contentFit="cover" />
                ) : (
                  <Icon name={i === 0 ? "gift" : "star"} size={28} color={i === 0 ? colors.primary : colors.sale} fill={i !== 0} />
                )}
              </Pressable>
            ))}
          </View>
        )}

        {/* Portefeuille */}
        <View style={styles.card}>
          <View style={styles.actionRow}>
            {WALLET_ACTIONS.map((a) => (
              <ActionItem
                key={a.key}
                icon={a.icon}
                label={t(a.labelKey)}
                onPress={() => router.push(a.href)}
              />
            ))}
          </View>
        </View>

        {/* Vous aimerez aussi */}
        <Text style={styles.suggestTitle}>{t("cart.youMayLike")}</Text>
        <View style={styles.suggestGrid}>
          {suggestions.map((p) => (
            <View key={p.id} style={{ width: "47%", marginBottom: spacing.sm }}>
              <ProductCard product={p} isWished={wishedIds.includes(p.id)} onToggleWish={toggleWish} onAddToCart={addToCart} />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function ActionItem({
  icon,
  label,
  onPress,
  big,
  cols = 5,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  big?: boolean;
  cols?: number;
}) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      style={[styles.action, { width: `${100 / cols}%` }]}
      onPress={onPress}
    >
      <View style={styles.actionIconWrap}>
        <Icon
          name={icon}
          size={big ? 26 : 24}
          color={colors.primary}
          strokeWidth={1.8}
        />
      </View>
      {/*
        Libellés uniformes : 2 lignes RÉSERVÉES pour tous (hauteur fixe),
        même taille, centrés — aucun item ne décale la rangée.
      */}
      <Text
        style={styles.actionLabel}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    profile: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: colors.surface,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.background,
    },
    avatarGuest: { alignItems: "center", justifyContent: "center" },
    name: { fontSize: fontSize.xl, fontWeight: "800", color: colors.text },
    signInLink: {
      fontSize: fontSize.sm,
      color: colors.primary,
      fontWeight: "700",
      marginTop: 2,
    },
    flagBtn: { padding: 4 },
    flag: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.background,
    },
    iconBtn: { padding: 4 },
    badge: {
      position: "absolute",
      top: -2,
      right: -4,
      backgroundColor: colors.sale,
      borderRadius: 9,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      alignItems: "center",
      justifyContent: "center",
    },
    badgeText: { color: colors.white, fontSize: 10, fontWeight: "800" },
    guestCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
      backgroundColor: colors.primarySoft,
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      padding: spacing.lg,
      borderRadius: radius.lg,
    },
    guestText: {
      flex: 1,
      fontSize: fontSize.md,
      color: colors.primaryDark,
      fontWeight: "600",
    },
    promo: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: colors.primary,
      overflow: 'hidden',
    },
    promoBannerImg: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      top: 0,
      left: 0,
    },
    promoScrim: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      top: 0,
      left: 0,
      backgroundColor: 'rgba(0,0,0,0.38)',
    },
    promoText: {
      color: colors.white,
      fontWeight: "800",
      fontSize: fontSize.md,
      flex: 1,
      textShadowColor: 'rgba(0,0,0,0.4)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    promoSubText: {
      color: colors.white,
      fontSize: fontSize.xs,
      opacity: 0.95,
      marginTop: 2,
      textShadowColor: 'rgba(0,0,0,0.4)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    promoBadge: {
      backgroundColor: 'rgba(0,0,0,0.25)',
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      marginLeft: spacing.sm,
    },
    promoBadgeText: {
      color: colors.white,
      fontSize: fontSize.xs,
      fontWeight: '800',
    },
    promoCta: {
      backgroundColor: colors.white,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: 5,
      marginLeft: spacing.sm,
    },
    promoCtaText: {
      color: colors.primary,
      fontSize: fontSize.xs,
      fontWeight: '800',
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      paddingVertical: spacing.md,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.sm,
    },
    cardTitle: { fontSize: fontSize.lg, fontWeight: "800", color: colors.text },
    seeAll: { flexDirection: "row", alignItems: "center" },
    seeAllText: { fontSize: fontSize.sm, color: colors.textMuted },
    actionRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      paddingHorizontal: spacing.sm,
    },
    action: { alignItems: "center", gap: 4, paddingVertical: spacing.sm },
    actionIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      // Pastille teintée par le thème — les icônes ne sont plus "blanches/pâles",
      // la couleur de marque est visible en clair comme en sombre.
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    actionLabel: {
      fontSize: fontSize.xs,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 14,
      // 2 lignes réservées pour tous les items → rangées parfaitement alignées
      height: 28,
      paddingHorizontal: 2,
    },
    suggestTitle: {
      fontSize: fontSize.xl,
      fontWeight: "800",
      color: colors.text,
      padding: spacing.lg,
    },
    suggestGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
    },
    midBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: colors.primary,
      overflow: 'hidden',
    },
    midBannerBgImg: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      top: 0,
      left: 0,
    },
    midBannerTitle: {
      color: colors.white,
      fontWeight: "800",
      fontSize: fontSize.md,
      textShadowColor: 'rgba(0,0,0,0.4)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    midBannerSub: {
      color: colors.white,
      fontSize: fontSize.xs,
      opacity: 0.9,
      marginTop: 2,
    },
    promoCards: {
      flexDirection: "row",
      gap: spacing.md,
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
    },
    promoCard: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      borderRadius: radius.lg,
      padding: spacing.md,
    },
    promoCardPrimary: { backgroundColor: colors.primarySoft },
    promoCardSecondary: { backgroundColor: colors.saleSoft },
    promoCardTitle: {
      fontSize: fontSize.md,
      fontWeight: "800",
      color: colors.text,
    },
    promoCardSub: {
      fontSize: fontSize.xs,
      color: colors.textSecondary,
      marginTop: 2,
    },
    promoCardBtn: {
      alignSelf: "flex-start",
      marginTop: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: 4,
    },
    promoCardBtnText: {
      fontSize: fontSize.xs,
      fontWeight: "800",
      color: colors.text,
    },
    promoCardImg: {
      width: 48,
      height: 48,
      borderRadius: radius.md,
    },
  });
