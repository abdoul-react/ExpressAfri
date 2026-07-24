import { BrandHeaderGradient, SearchBar, SkeletonStore } from "@/components";
import {
  fontSize,
  radius,
  shadows,
  spacing,
  useColors,
  useThemedStyles,
  type Colors,
} from "@/design-system";
import { useStoreCatalog } from "@/features/store";
import { useAppSettings } from "@/features/content";
// Import direct pour éviter le cycle Metro : content/index → useScreenBanners → content/index
import { useScreenBanners } from "@/features/content/useScreenBanners";
import { useUnreadCount } from "@/features/messages";
import { usePrice } from "@/hooks/usePrice";
import { Icon } from "@/icons";
import type { Product } from "@/types";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  I18nManager,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";

/** Largeur du tiroir de catégories (s'ouvre au clic sur le hamburger). */
const DRAWER_WIDTH = 232;

export default function StoreScreen() {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { priceXof } = usePrice();
  const { get, getBool } = useAppSettings();
  const unreadCount = useUnreadCount();
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [recoOpen, setRecoOpen] = useState(true);
  // Bandeau promo piloté par le CMS (bannières écran "store", 1re par position)
  const storeBanners = useScreenBanners('store');
  const promoBanner = storeBanners[0];

  // Sens de lecture : en arabe (RTL) le tiroir s'ouvre depuis la droite
  const isRTL = I18nManager.isRTL || (i18n.language ?? '').startsWith('ar');

  // « Recommandé pour vous » : activable/désactivable par l'admin (CMS)
  const showRecommended = getBool('shop.showRecommended', true);

  // Les données composées (sous-catégories, produits, recommandé) viennent du
  // hook ; l'écran ne fait que la présentation.
  const { categories, subs, categoryProducts, recommended, isLoading, active } =
    useStoreCatalog(activeId ?? "");

  // Sélectionner la première catégorie quand les données arrivent et qu'aucune n'est encore choisie.
  React.useEffect(() => {
    if (!activeId && categories && categories.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveId(categories[0].id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories]);

  // Refetch au focus de l'écran (Expo Router garde les écrans montés)
  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['products', 'category'] })
      queryClient.invalidateQueries({ queryKey: ['app-settings'] })
    }, [queryClient]),
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['products'] }),
      queryClient.invalidateQueries({ queryKey: ['categories'] }),
      // Invalider aussi les produits filtrés par catégorie
      queryClient.invalidateQueries({ queryKey: ['products', 'category'] }),
      queryClient.invalidateQueries({ queryKey: ['app-settings'] }),
    ]);
    setRefreshing(false);
  }, [queryClient]);

  const pickCategory = (id: string) => {
    setActiveId(id);
    setDrawerOpen(false);
  };

  /** Vignette produit (grille 3 colonnes) — partagée catégorie / recommandé. */
  const renderProductTile = (p: Product) => (
    <Pressable
      key={p.id}
      style={styles.tile}
      onPress={() => router.push(`/product/${p.id}`)}
    >
      <View style={styles.tileImgWrap}>
        <Image
          source={{ uri: p.images[0] }}
          style={styles.tileImg}
          contentFit="cover"
        />
      </View>
      <Text style={styles.tileName} numberOfLines={2}>
        {p.title}
      </Text>
      <Text
        style={styles.tilePrice}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {priceXof(p.priceUsd)}
      </Text>
    </Pressable>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <SkeletonStore />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header : hamburger + recherche + cloche — voile dégradé de marque */}
      <View style={styles.header}>
        <BrandHeaderGradient />
        <Pressable
          hitSlop={8}
          onPress={() => setDrawerOpen(true)}
          style={styles.menuBtn}
          accessibilityRole="button"
          accessibilityLabel={t("store.openCategories", "Catégories")}
        >
          <Icon name="menu" size={22} color={colors.text} />
        </Pressable>
        <SearchBar
          onPress={() => router.push("/search")}
          onCameraPress={() => router.push("/camera")}
        />
        <Pressable
          hitSlop={8}
          onPress={() => router.push("/messages")}
          style={styles.bell}
        >
          <Icon name="bell" size={24} color={colors.text} />
          {unreadCount > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Bandeau promo (comme AliExpress) — 1re bannière CMS écran "store", rien si absente */}
      {promoBanner && (
        <Pressable
          style={[styles.promoBand, promoBanner.backgroundColor ? { backgroundColor: promoBanner.backgroundColor } : {}]}
          onPress={() => promoBanner.linkUrl ? router.push(promoBanner.linkUrl as any) : undefined}
        >
          <Text style={styles.promoBandText} numberOfLines={1}>
            {promoBanner.title}
          </Text>
          <Text style={styles.promoBandSub} numberOfLines={1}>
            {promoBanner.subtitle ?? ''}
          </Text>
          {promoBanner.discountLabel ? (
            <View style={styles.promoBandBadge}>
              <Text style={styles.promoBandBadgeText}>{promoBanner.discountLabel}</Text>
            </View>
          ) : null}
          <Icon name="chevronRight" size={16} color={colors.white} />
        </Pressable>
      )}

      <View style={styles.body}>
        {/* Panneau principal — pleine largeur, le tiroir ne vit qu'à la demande */}
        <ScrollView
          style={styles.panel}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: spacing.md,
            paddingBottom: spacing.xxxl,
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* En-tête catégorie — la catégorie active reste changeable via le hamburger */}
          <View style={styles.catHead}>
            <Pressable style={styles.catHeadRow} onPress={() => setDrawerOpen(true)}>
              <Text style={styles.catHeadTitle} numberOfLines={1}>
                {active ? t(active.name) : ""}
              </Text>
              <Icon name="chevronDown" size={18} color={colors.textSecondary} />
            </Pressable>
            <View style={styles.freeShipPill}>
              <Icon name="truck" size={12} color={colors.secondaryDark} />
              <Text style={styles.freeShipText}>{get('promo.freeShip', t("home.freeShipFrom"))}</Text>
            </View>
          </View>

          {/* Sous-catégories — 3 colonnes, vignette + nom */}
          <View style={styles.grid}>
            {subs.map((sub) => (
              <Pressable
                key={sub.id}
                style={styles.tile}
                onPress={() => router.push(`/category/${sub.id}`)}
              >
                <View style={styles.tileImgWrap}>
                  <Image
                    source={{ uri: sub.image ?? `https://picsum.photos/seed/${sub.id}/240` }}
                    style={styles.tileImg}
                    contentFit="cover"
                  />
                </View>
                <Text style={styles.tileLabel} numberOfLines={2}>
                  {t(sub.name)}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* ── Produits de la catégorie sélectionnée ──────────────────── */}
          {categoryProducts.length > 0 ? (
            <View style={styles.grid}>
              {categoryProducts.map(renderProductTile)}
            </View>
          ) : (
            <View style={styles.emptyCat}>
              <Icon name="boxOpen" size={32} color={colors.textMuted} />
              <Text style={styles.emptyCatText}>
                {t("store.emptyCategory", "Aucun produit dans cette catégorie pour le moment")}
              </Text>
            </View>
          )}

          {/* ── Recommandé pour vous — activable par l'admin, repliable ── */}
          {showRecommended && recommended.length > 0 && (
            <Animated.View layout={LinearTransition.duration(200)}>
              <Pressable
                style={styles.recoHead}
                onPress={() => setRecoOpen((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={t("home.recommended")}
              >
                <Text style={styles.recoTitle}>{t("home.recommended")}</Text>
                <Icon
                  name={recoOpen ? "chevronUp" : "chevronDown"}
                  size={18}
                  color={colors.textMuted}
                />
              </Pressable>

              {recoOpen && (
                <Animated.View
                  entering={FadeIn.duration(180)}
                  exiting={FadeOut.duration(120)}
                  style={styles.grid}
                >
                  {recommended.map(renderProductTile)}
                </Animated.View>
              )}
            </Animated.View>
          )}
        </ScrollView>

        {/* ── Tiroir catégories — glisse depuis le bord de lecture ──────── */}
        {drawerOpen && (
          <>
            {/* Voile assombri : ferme le tiroir au toucher */}
            <Animated.View
              entering={FadeIn.duration(180)}
              exiting={FadeOut.duration(150)}
              style={styles.backdrop}
            >
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => setDrawerOpen(false)}
                accessibilityRole="button"
                accessibilityLabel={t("common.close", "Fermer")}
              />
            </Animated.View>

            <Animated.View
              entering={(isRTL ? SlideInRight : SlideInLeft).duration(240)}
              exiting={(isRTL ? SlideOutRight : SlideOutLeft).duration(200)}
              style={[styles.drawer, isRTL ? styles.drawerRight : styles.drawerLeft]}
            >
              <View style={styles.drawerHead}>
                <Text style={styles.drawerTitle}>{t("store.categories", "Catégories")}</Text>
                <Pressable
                  hitSlop={8}
                  onPress={() => setDrawerOpen(false)}
                  style={styles.drawerClose}
                >
                  <Icon name="close" size={18} color={colors.text} />
                </Pressable>
              </View>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: spacing.xxxl, paddingTop: spacing.xs }}
              >
                {(categories ?? []).map((c) => {
                  const isActive = c.id === activeId;
                  return (
                    <Pressable
                      key={c.id}
                      style={[styles.drawerItem, isActive && styles.drawerItemActive]}
                      onPress={() => pickCategory(c.id)}
                    >
                      {isActive && (
                        <View
                          style={[
                            styles.drawerBar,
                            isRTL ? styles.drawerBarRight : styles.drawerBarLeft,
                          ]}
                        />
                      )}
                      <Text
                        style={[styles.drawerText, isActive && styles.drawerTextActive]}
                        numberOfLines={2}
                      >
                        {t(c.name)}
                      </Text>
                      {isActive && (
                        <Icon name="check" size={15} color={colors.primary} />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Animated.View>
          </>
        )}
      </View>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surface },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      backgroundColor: colors.surface,
    },
    menuBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.backgroundSoft,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    bell: { padding: 2, position: 'relative' },
    bellBadge: {
      position: 'absolute', top: -2, right: -2,
      backgroundColor: colors.sale, borderRadius: 8,
      minWidth: 16, height: 16, paddingHorizontal: 3,
      alignItems: 'center', justifyContent: 'center',
    },
    bellBadgeText: { color: colors.white, fontSize: 9, fontWeight: '800' },
    promoBand: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    promoBandText: {
      color: colors.white,
      fontWeight: "800",
      fontSize: fontSize.sm,
    },
    promoBandSub: {
      color: colors.white,
      fontSize: fontSize.xs,
      opacity: 0.9,
      flex: 1,
    },
    promoBandBadge: {
      backgroundColor: 'rgba(0,0,0,0.25)',
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
    },
    promoBandBadgeText: {
      color: colors.white,
      fontSize: fontSize.xs,
      fontWeight: '800',
    },
    body: { flex: 1 },
    panel: { flex: 1, backgroundColor: colors.surface },
    // ── Tiroir catégories ────────────────────────────────────────────
    backdrop: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.overlay,
      zIndex: 20,
    },
    drawer: {
      position: "absolute",
      top: 0,
      bottom: 0,
      width: DRAWER_WIDTH,
      maxWidth: "64%",
      backgroundColor: colors.surface,
      zIndex: 21,
      ...shadows.lg,
    },
    // LTR : collé à gauche, coins arrondis côté contenu (droite)
    drawerLeft: {
      left: 0,
      borderTopRightRadius: radius.xl,
      borderBottomRightRadius: radius.xl,
    },
    // RTL (arabe) : collé à droite, coins arrondis côté contenu (gauche)
    drawerRight: {
      right: 0,
      borderTopLeftRadius: radius.xl,
      borderBottomLeftRadius: radius.xl,
    },
    drawerHead: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    drawerTitle: {
      fontSize: fontSize.md,
      fontWeight: "800",
      color: colors.text,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    drawerClose: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.backgroundSoft,
    },
    drawerItem: {
      minHeight: 46,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
    },
    drawerItemActive: { backgroundColor: colors.primarySoft },
    drawerBar: {
      position: "absolute",
      top: 12,
      bottom: 12,
      width: 3,
      backgroundColor: colors.primary,
    },
    drawerBarLeft: {
      left: 0,
      borderTopRightRadius: 2,
      borderBottomRightRadius: 2,
    },
    drawerBarRight: {
      right: 0,
      borderTopLeftRadius: 2,
      borderBottomLeftRadius: 2,
    },
    drawerText: {
      flex: 1,
      fontSize: fontSize.sm,
      lineHeight: 18,
      color: colors.textSecondary,
      fontWeight: "600",
    },
    drawerTextActive: { color: colors.primary, fontWeight: "800" },
    catHead: { marginBottom: spacing.md },
    catHeadRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      alignSelf: "flex-start",
    },
    catHeadTitle: {
      fontSize: fontSize.xl,
      fontWeight: "800",
      color: colors.text,
      flexShrink: 1,
    },
    freeShipPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      alignSelf: "flex-start",
      marginTop: 6,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radius.pill,
      backgroundColor: colors.secondarySoft,
    },
    freeShipText: {
      fontSize: fontSize.xs,
      color: colors.secondaryDark,
      fontWeight: "700",
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginHorizontal: -spacing.xs,
    },
    tile: {
      width: "33.33%",
      paddingHorizontal: spacing.xs,
      marginBottom: spacing.lg,
      alignItems: "center",
    },
    tileImgWrap: {
      width: "100%",
      aspectRatio: 1,
      borderRadius: radius.md,
      overflow: "hidden",
      backgroundColor: colors.background,
    },
    tileImg: { width: "100%", height: "100%" },
    tileLabel: {
      fontSize: fontSize.xs,
      color: colors.text,
      textAlign: "center",
      marginTop: 6,
      lineHeight: 14,
    },
    tileName: {
      fontSize: fontSize.xs,
      color: colors.text,
      textAlign: "left",
      alignSelf: "stretch",
      marginTop: 6,
      lineHeight: 14,
      minHeight: 28,
    },
    tilePrice: {
      fontSize: fontSize.sm,
      color: colors.price,
      fontWeight: "800",
      marginTop: 2,
      alignSelf: "flex-start",
    },
    emptyCat: {
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: spacing.xxl,
    },
    emptyCatText: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
      textAlign: "center",
      paddingHorizontal: spacing.xl,
    },
    recoHead: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: spacing.xs,
      marginBottom: spacing.md,
      paddingVertical: spacing.xs,
    },
    recoTitle: { fontSize: fontSize.lg, fontWeight: "800", color: colors.text },
  });
