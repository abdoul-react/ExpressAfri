import {
  Countdown,
  Price,
  ProductCard,
  SectionHeader,
  SkeletonHome,
} from "@/components";
import {
  fontSize,
  radius,
  spacing,
  useThemedStyles,
  type Colors,
} from "@/design-system";
import { BannerCarousel, HomeHeader, PromoModal, ShortcutRail, useHomeFeed, useHomeStores } from "@/features/home";
import { useAppSettings } from "@/features/content";
import { useCartStore } from "@/store/cartStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { useSettingsStore } from "@/store/settingsStore";
import { FlashList } from "@shopify/flash-list";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";

const GRID_GAP = spacing.sm;

export default function HomeScreen() {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const { width: screenWidth } = useWindowDimensions();
  const queryClient = useQueryClient();

  // Largeurs de cartes calculées pour un rail « plein écran » sans reste :
  // - rail large : exactement 2 cartes visibles (padding gauche/droite + 1 gouttière)
  // - rail compact : exactement 3 cartes visibles (padding + 2 gouttières)
  const cardWidth2 = Math.floor((screenWidth - spacing.lg * 2 - GRID_GAP) / 2);
  const cardWidth3 = Math.floor((screenWidth - spacing.lg * 2 - GRID_GAP * 2) / 3);
  const [tab, setTab] = useState<"forYou" | "deals">("forYou");
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { bundle, deals, grid, categories, banners, sections, isLoading } =
    useHomeFeed(activeCat, tab);
  const { stores: featuredStores } = useHomeStores(8);
  // Chercher la section produits avec un endDate (compteur Flash Deal)
  const dealSection = sections.find((s) => s.type === 'products' && s.data?.endDate);
  const dealEndDateMs = dealSection?.data?.endDate
    ? new Date(dealSection.data.endDate as string).getTime()
    : null;
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const dealUntil = dealEndDateMs && dealEndDateMs > now ? dealEndDateMs : null;
  const toggleWish = useWishlistStore((s) => s.toggle);
  const addToCart = useCartStore((s) => s.add);
  const wishedIds = useWishlistStore((s) => s.ids);

  const hasSeenPromo = useSettingsStore((s) => s.hasSeenPromo);
  const markPromoSeen = useSettingsStore((s) => s.markPromoSeen);
  const [promoVisible, setPromoVisible] = useState(!hasSeenPromo);
  const { get } = useAppSettings();

  // Refetch quand l'écran reprend le focus (Expo Router garde les écrans montés)
  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['banners'] });
      queryClient.invalidateQueries({ queryKey: ['feed-sections'] });
      // CMS : logos, settings, shortcuts, stores — se mettent à jour au retour sur l'écran
      queryClient.invalidateQueries({ queryKey: ['app-logos'] });
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      queryClient.invalidateQueries({ queryKey: ['home', 'shortcuts'] });
      queryClient.invalidateQueries({ queryKey: ['home', 'stores'] });
    }, [queryClient]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['products'] }),
      queryClient.invalidateQueries({ queryKey: ['categories'] }),
      queryClient.invalidateQueries({ queryKey: ['banners'] }),
      queryClient.invalidateQueries({ queryKey: ['feed-sections'] }),
      queryClient.invalidateQueries({ queryKey: ['app-logos'] }),
      queryClient.invalidateQueries({ queryKey: ['app-settings'] }),
      queryClient.invalidateQueries({ queryKey: ['home', 'shortcuts'] }),
      queryClient.invalidateQueries({ queryKey: ['home', 'stores'] }),
    ]);
    setRefreshing(false);
  }, [queryClient]);

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <SkeletonHome />
      </View>
    );
  }

  const closePromo = () => {
    setPromoVisible(false);
    markPromoSeen();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <HomeHeader
        activeTab={tab}
        onTabChange={setTab}
        activeCat={activeCat}
        onCatChange={setActiveCat}
        categories={categories}
      />

      <FlashList
        data={grid}
        numColumns={2}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <View>
            <BannerCarousel banners={banners} />
            <View style={styles.railCard}>
              <ShortcutRail />
            </View>

            {sections.length > 0 ? (
              sections.map((section) => {
                const sectionEndMs = section.data?.endDate
                  ? new Date(section.data.endDate as string).getTime()
                  : null;
                const sectionUntil =
                  sectionEndMs && sectionEndMs > now ? sectionEndMs : null;
                return (
                <View key={section.id}>
                  {section.type === 'products' && sectionUntil != null ? (
                    // Titre à gauche, compte à rebours à droite sur la même ligne
                    <Pressable style={styles.dealHeader} onPress={() => router.push(`/section/${section.id}`)}>
                      <View style={styles.dealTitleRow}>
                        <Text style={styles.dealTitle} numberOfLines={1}>
                          {section.title}
                        </Text>
                      </View>
                      <View style={styles.dealCountdown}>
                        <Countdown until={sectionUntil} tone="primary" />
                      </View>
                    </Pressable>
                  ) : (
                    <SectionHeader
                      title={section.title}
                      actionLabel={t("common.seeAll")}
                      onAction={() => {
                        // « Voir tout » contextuel : chaque type de section a sa destination
                        if (section.type === 'products') router.push(`/section/${section.id}`);
                        else if (section.type === 'stores') router.push('/stores');
                        else if (section.type === 'categories') router.push('/search');
                        else router.push(`/section/${section.id}`);
                      }}
                    />
                  )}

                  {section.type === 'products' && section.items?.length > 0 && (
                    // Le style d'affichage est défini par l'admin sur chaque section
                    // (Sections Feed → Style) : rail compact, grille, liste ou grandes cartes.
                    section.displayStyle === 'grid' ? (
                      <View style={styles.sectionGrid}>
                        {section.items.map((p: any) => (
                          <View key={p.id} style={styles.sectionGridItem}>
                            <ProductCard
                              product={p}
                              variant="compact"
                              quickAdd={false}
                              isWished={wishedIds.includes(p.id)}
                              onToggleWish={toggleWish}
                              onAddToCart={addToCart}
                            />
                          </View>
                        ))}
                      </View>
                    ) : section.displayStyle === 'list' ? (
                      <View style={styles.sectionList}>
                        {section.items.map((p: any) => (
                          <ProductCard
                            key={p.id}
                            product={p}
                            quickAdd={false}
                            isWished={wishedIds.includes(p.id)}
                            onToggleWish={toggleWish}
                            onAddToCart={addToCart}
                          />
                        ))}
                      </View>
                    ) : section.displayStyle === 'card' ? (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.hRail}
                        snapToInterval={cardWidth2 + GRID_GAP}
                        decelerationRate="fast"
                      >
                        {section.items.map((p: any) => (
                          <ProductCard
                            key={p.id}
                            product={p}
                            width={cardWidth2}
                            quickAdd={false}
                            isWished={wishedIds.includes(p.id)}
                            onToggleWish={toggleWish}
                            onAddToCart={addToCart}
                          />
                        ))}
                      </ScrollView>
                    ) : (
                      // horizontal-scroll (défaut) : rail dense image-first façon AliExpress
                      // Exactement 2 cartes pleines visibles, on coulisse pour la suite
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.hRail}
                        snapToInterval={cardWidth2 + GRID_GAP}
                        decelerationRate="fast"
                      >
                        {section.items.map((p: any) => (
                          <ProductCard
                            key={p.id}
                            product={p}
                            width={cardWidth2}
                            variant="compact"
                            quickAdd={false}
                            isWished={wishedIds.includes(p.id)}
                            onToggleWish={toggleWish}
                            onAddToCart={addToCart}
                          />
                        ))}
                      </ScrollView>
                    )
                  )}

                  {section.type === 'banners' && (
                    <BannerCarousel banners={section.items ?? []} />
                  )}

                  {section.type === 'categories' && categories.length > 0 && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.hRail}
                    >
                      {categories.map((cat) => (
                        <Pressable key={cat.id} style={styles.catChip} onPress={() => setActiveCat(cat.id)}>
                          <Text style={styles.catChipText} numberOfLines={1}>{cat.name}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  )}

                  {section.type === 'stores' && (
                    featuredStores.length > 0 ? (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.hRail}
                      >
                        {featuredStores.map((s) => (
                          <Pressable
                            key={s.id}
                            style={styles.storeCard}
                            onPress={() => router.push('/stores')}
                          >
                            <View style={styles.storeAvatar}>
                              {s.avatar ? (
                                <Image
                                  source={{ uri: s.avatar }}
                                  style={styles.storeAvatarImg}
                                  contentFit="cover"
                                />
                              ) : (
                                <Text style={styles.storeAvatarLetter}>
                                  {s.name.charAt(0).toUpperCase()}
                                </Text>
                              )}
                            </View>
                            <Text style={styles.storeName} numberOfLines={1}>{s.name}</Text>
                            <Text style={styles.storeCountry} numberOfLines={1}>{s.country}</Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    ) : (
                      <Text style={styles.comingSoon}>{t('home.noStores')}</Text>
                    )
                  )}
                </View>
                );
              })
            ) : activeCat === null && tab === "forYou" ? (
              <>
                {/* Offres groupées */}
                <SectionHeader
                  title={t("home.bundleDeals")}
                  badge={get('promo.bundleLabel', t("home.bundleBadge"))}
                  badgeTone="green"
                  actionLabel={t("common.seeAll")}
                  onAction={() => router.push("/search")}
                />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.hRail}
                  snapToInterval={cardWidth2 + GRID_GAP}
                  decelerationRate="fast"
                >
                  {bundle.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      width={cardWidth2}
                      variant="compact"
                      quickAdd={false}
                      isWished={wishedIds.includes(p.id)}
                      onToggleWish={toggleWish}
                      onAddToCart={addToCart}
                    />
                  ))}
                </ScrollView>

                {/* Deal du jour */}
                <View style={styles.dealHeader}>
                  <View style={styles.dealTitleRow}>
                    <Text style={styles.dealTitle} numberOfLines={1}>
                      {t("home.dealOfDay")}
                    </Text>
                    <View style={styles.dealBadge}>
                      <Text style={styles.dealBadgeText} numberOfLines={1}>
                        {get('promo.dealLabel', t("home.dealBadge"))}
                      </Text>
                    </View>
                  </View>
                  {dealUntil != null && (
                    <View style={styles.dealCountdown}>
                      <Countdown until={dealUntil} tone="primary" />
                    </View>
                  )}
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.hRail}
                  snapToInterval={cardWidth2 + GRID_GAP}
                  decelerationRate="fast"
                >
                  {deals.map((p) => (
                    <Pressable
                      key={p.id}
                      style={{ width: cardWidth2, gap: 4 }}
                      onPress={() => router.push(`/product/${p.id}`)}
                    >
                      <View style={styles.dealImgWrap}>
                        <Image
                          source={{ uri: p.images[0] }}
                          style={[styles.dealImg, { width: cardWidth2, height: cardWidth2 }]}
                          contentFit="cover"
                        />
                        {p.discountPercent ? (
                          <View style={styles.dealPctTag}>
                            <Text style={styles.dealPctText}>-{p.discountPercent}%</Text>
                          </View>
                        ) : null}
                      </View>
                      <Price priceUsd={p.priceUsd} size="sm" fit />
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            ) : null}

            {/* Boutiques à découvrir — section statique si aucune section CMS ne les intègre */}
            {activeCat === null && tab === "forYou" && featuredStores.length > 0 && sections.every((s) => s.type !== 'stores') && (
              <>
                <SectionHeader
                  title={t("home.featuredStores")}
                  actionLabel={t("common.seeAll")}
                  onAction={() => router.push("/stores")}
                />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.hRail}
                >
                  {featuredStores.map((s) => (
                    <Pressable
                      key={s.id}
                      style={styles.storeCard}
                      onPress={() => router.push('/stores')}
                    >
                      <View style={styles.storeAvatar}>
                        {s.avatar ? (
                          <Image
                            source={{ uri: s.avatar }}
                            style={styles.storeAvatarImg}
                            contentFit="cover"
                          />
                        ) : (
                          <Text style={styles.storeAvatarLetter}>
                            {s.name.charAt(0).toUpperCase()}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.storeName} numberOfLines={1}>{s.name}</Text>
                      <Text style={styles.storeCountry} numberOfLines={1}>{s.country}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}

            <SectionHeader
              title={
                activeCat
                  ? categories.find((c) => c.id === activeCat)?.name ?? t("home.recommended")
                  : tab === "deals"
                    ? t("home.tabDeals")
                    : t("home.recommended")
              }
              actionLabel={activeCat ? t("common.seeAll") : undefined}
              onAction={activeCat ? () => router.push(`/category/${activeCat}`) : undefined}
            />
          </View>
        }
        renderItem={({ item, index }) => (
          <View
            style={{
              flex: 1,
              marginLeft: index % 2 === 0 ? spacing.lg : GRID_GAP / 2,
              marginRight: index % 2 === 0 ? GRID_GAP / 2 : spacing.lg,
              marginBottom: GRID_GAP,
            }}
          >
            <ProductCard product={item} isWished={wishedIds.includes(item.id)} onToggleWish={toggleWish} onAddToCart={addToCart} />
          </View>
        )}
      />

      <PromoModal
        visible={promoVisible}
        onClose={closePromo}
        onDiscover={closePromo}
        hero={bundle[1] ?? bundle[0] ?? null}
      />
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    railCard: {
      backgroundColor: colors.surface,
      marginBottom: spacing.sm,
      paddingBottom: spacing.xs,
    },
    hRail: {
      paddingHorizontal: spacing.lg,
      gap: GRID_GAP,
      paddingBottom: spacing.md,
    },
    sectionGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      gap: GRID_GAP,
    },
    sectionGridItem: {
      // 3 colonnes : (largeur - 2×padding - 2×gap) / 3 — flexBasis en % simplifie
      flexBasis: "31.5%",
      flexGrow: 1,
      maxWidth: "32%",
    },
    sectionList: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      gap: GRID_GAP,
    },
    dealHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    dealTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      flex: 1,
      marginRight: spacing.sm,
      overflow: "hidden",
    },
    dealTitle: {
      fontSize: fontSize["2xl"],
      fontWeight: "800",
      color: colors.text,
      flexShrink: 0,
    },
    dealBadge: {
      backgroundColor: colors.saleSoft,
      borderRadius: radius.sm,
      paddingHorizontal: 6,
      paddingVertical: 2,
      flexShrink: 1,
    },
    dealBadgeText: {
      color: colors.sale,
      fontSize: fontSize.xs,
      fontWeight: "700",
    },
    dealCountdown: { flexShrink: 0 },
    dealImgWrap: { position: "relative" },
    dealImg: {
      borderRadius: radius.md,
      backgroundColor: colors.background,
    },
    dealPctTag: {
      position: "absolute",
      top: 6,
      left: 6,
      backgroundColor: colors.sale,
      borderRadius: radius.sm,
      paddingHorizontal: 5,
      paddingVertical: 2,
    },
    dealPctText: { color: colors.white, fontSize: 10, fontWeight: "800" },
    catChip: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
      marginHorizontal: spacing.xs,
    },
    catChipText: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600' },
    comingSoon: { fontSize: fontSize.sm, color: colors.textMuted, padding: spacing.lg },
    storeCard: {
      width: 80,
      alignItems: 'center',
      gap: 4,
    },
    storeAvatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    storeAvatarImg: { width: 64, height: 64, borderRadius: 32 },
    storeAvatarLetter: {
      fontSize: fontSize.xl,
      fontWeight: '800',
      color: colors.primary,
    },
    storeName: {
      fontSize: fontSize.xs,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
    },
    storeCountry: {
      fontSize: 10,
      color: colors.textMuted,
      textAlign: 'center',
    },
  });
