import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  useColors,
  useThemedStyles,
  type Colors,
  spacing,
  radius,
  fontSize,
} from '@/design-system';
import { Icon } from '@/icons';
import {
  ProductCard,
  ProductSection,
  Rating,
  ScreenHeader,
  SearchBar,
  SkeletonProductGrid,
  StatusState,
  StorePaymentMethods,
} from '@/components';
import {
  useStoreBanners,
  useStoreCategories,
  useStoreDetail,
  useStoreProducts,
  useStoreSections,
  useStorePaymentMethods,
  useToggleStoreLike,
} from '@/features/stores';
// Import direct : évite le cycle Metro via le barrel de features/home
import { BannerCarousel } from '@/features/home/BannerCarousel';
import { resolveMediaUrl } from '@/utils/resolveMediaUrl';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { useCartBadge } from '@/hooks/useCartBadge';
import { useWishlistStore } from '@/store/wishlistStore';

export default function StoreDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();
  const cartBadge = useCartBadge();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const toggleLike = useToggleStoreLike();
  const toggleWish = useWishlistStore((s) => s.toggle);
  const wishedIds = useWishlistStore((s) => s.ids);
  const addToCart = useCartStore((s) => s.add);

  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [coverIndex, setCoverIndex] = useState(0);
  const coverScrollRef = React.useRef<ScrollView>(null);
  const coverPaused = React.useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const store = useStoreDetail(id!);
  const categories = useStoreCategories(id!);
  const banners = useStoreBanners(id!);
  const sections = useStoreSections(id!);
  const payments = useStorePaymentMethods(id!);
  // Recherche et filtre par catégorie sont délégués au backend : la grille
  // affiche exactement ce que l'API renvoie, sans filtrage local.
  const products = useStoreProducts(id!, {
    categoryId,
    search: debounced || undefined,
  });

  // Défilement automatique de la galerie de couvertures : suspendu pendant le
  // glissement de l'utilisateur, repart ensuite. `coversCount` est dérivé ici
  // pour garder le hook AVANT les retours conditionnels de chargement.
  const coversCount = [store.data?.coverUrl, ...(store.data?.photos ?? [])]
    .map((u) => resolveMediaUrl(u))
    .filter(Boolean).length;
  useEffect(() => {
    if (coversCount < 2) return;
    const timer = setInterval(() => {
      if (coverPaused.current) return;
      setCoverIndex((i) => {
        const next = (i + 1) % coversCount;
        coverScrollRef.current?.scrollTo({ x: next * width, animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [coversCount, width]);

  if (!id) return null;

  if (store.isLoading) {
    return (
      <View style={styles.container}>
        <ScreenHeader />
        <StatusState status="loading" title={t('common.loading')} />
      </View>
    );
  }

  if (store.isError || !store.data) {
    return (
      <View style={styles.container}>
        <ScreenHeader />
        <StatusState
          status="error"
          icon="store"
          title={t('stores.notFound')}
          actionLabel={t('common.retry')}
          onAction={() => store.refetch()}
        />
      </View>
    );
  }

  const s = store.data;
  const logo = resolveMediaUrl(s.logoUrl);
  const location = [s.city, s.country].filter(Boolean).join(', ');
  // Cover puis galerie : le boutiquier compose son en-tête depuis l'onglet
  // Identité de l'Admin, sans avoir à choisir un emplacement unique.
  const covers = [s.coverUrl, ...(s.photos ?? [])]
    .map((u) => resolveMediaUrl(u))
    .filter((u): u is string => !!u);

  const onFollow = () => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    toggleLike.mutate({ storeId: s.id, follow: !s.likedByMe });
  };

  const items = products.data ?? [];

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={s.name}
        actions={[{ icon: 'cart', badge: cartBadge, onPress: () => router.push('/cart') }]}
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxxl }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={store.isRefetching}
            onRefresh={() => {
              store.refetch();
              products.refetch();
              banners.refetch();
              sections.refetch();
            }}
            tintColor={colors.primary}
          />
        }
      >
        {/* En-tête visuel : couverture (+ galerie défilante) puis identité */}
        {covers.length === 0 ? (
          <View style={[styles.cover, styles.coverFallback]}>
            <Icon name="store" size={32} color={colors.primary} />
          </View>
        ) : covers.length === 1 ? (
          <Image source={{ uri: covers[0] }} style={styles.cover} contentFit="cover" />
        ) : (
          <ScrollView
            ref={coverScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScrollBeginDrag={() => {
              coverPaused.current = true;
            }}
            onMomentumScrollEnd={(e) => {
              coverPaused.current = false;
              setCoverIndex(
                Math.round(e.nativeEvent.contentOffset.x / Math.max(1, width)),
              );
            }}
          >
            {covers.map((uri) => (
              <Image
                key={uri}
                source={{ uri }}
                style={[styles.cover, { width }]}
                contentFit="cover"
              />
            ))}
          </ScrollView>
        )}
        {covers.length > 1 && (
          <View style={styles.coverDots}>
            {covers.map((uri, i) => (
              <View
                key={uri}
                style={[styles.coverDot, i === coverIndex && styles.coverDotActive]}
              />
            ))}
          </View>
        )}

        <View style={styles.identity}>
          {logo ? (
            <Image source={{ uri: logo }} style={styles.logo} contentFit="cover" />
          ) : (
            <View style={[styles.logo, styles.logoFallback]}>
              <Icon name="store" size={26} color={colors.textMuted} />
            </View>
          )}
          <View style={styles.identityText}>
            <Text style={styles.name} numberOfLines={2}>
              {s.name}
            </Text>
            {location ? (
              <View style={styles.metaRow}>
                <Icon name="location" size={12} color={colors.textMuted} />
                <Text style={styles.meta}>{location}</Text>
              </View>
            ) : null}
            {/* Note issue des avis produits — rien tant qu'aucun avis n'existe */}
            {s.rating != null ? (
              <View style={styles.metaRow}>
                <Rating value={s.rating} soldCount={s.salesCount} />
                <Text style={styles.meta}>
                  ({s.ratingCount} {t('stores.reviews')})
                </Text>
              </View>
            ) : null}
            <Text style={styles.meta}>
              {s.followersCount} {t('stores.followers')} · {s.productCount}{' '}
              {t('stores.products')}
            </Text>
          </View>
          <Pressable
            style={[styles.followBtn, s.likedByMe && styles.followingBtn]}
            onPress={onFollow}
            disabled={toggleLike.isPending}
          >
            <Text style={[styles.followText, s.likedByMe && styles.followingText]}>
              {t(s.likedByMe ? 'stores.following' : 'stores.follow')}
            </Text>
          </Pressable>
        </View>

        {s.description ? (
          <Text style={styles.description}>{s.description}</Text>
        ) : null}

        {/* Recherche dans le catalogue de la boutique — même barre que l'accueil */}
        <View style={styles.searchWrap}>
          <SearchBar
            editable
            value={search}
            onChangeText={setSearch}
            onCameraPress={() => router.push('/camera')}
            autoFocus={false}
          />
        </View>

        {/* Campagnes publicitaires propres à la boutique — format discret */}
        <BannerCarousel banners={banners.data ?? []} compact />

        {/* Puces de catégories de la boutique — filtre par id, pas par nom */}
        {(categories.data?.length ?? 0) > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            <Chip
              label={t('stores.allProducts')}
              active={!categoryId}
              onPress={() => setCategoryId(undefined)}
            />
            {categories.data!.map((c) => (
              <Chip
                key={c.id}
                label={c.name}
                active={categoryId === c.id}
                onPress={() => setCategoryId(c.id)}
              />
            ))}
          </ScrollView>
        )}

        {/* Moyens de paiement acceptés par CETTE boutique — chaque boutiquier
            configure les siens. Masqués pendant une recherche, comme le reste
            de la vitrine. */}
        {!categoryId && !debounced && (
          <StorePaymentMethods methods={payments.data ?? []} />
        )}

        {/* Sections composées par le boutiquier, chacune dans son format.
            Masquées dès qu'on filtre ou qu'on recherche : le client attend
            alors une liste de résultats, pas la vitrine. */}
        {!categoryId &&
          !debounced &&
          (sections.data ?? []).map((section) => (
            <ProductSection
              key={section.id}
              section={section}
              isWished={(pid) => wishedIds.includes(pid)}
              onToggleWish={toggleWish}
              onAddToCart={addToCart}
            />
          ))}

        {/* Catalogue complet */}
        {products.isLoading ? (
          <SkeletonProductGrid />
        ) : items.length === 0 ? (
          <View style={styles.emptyProducts}>
            <Icon name="box" size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>{t('stores.noProducts')}</Text>
          </View>
        ) : (
          <>
            {!categoryId && !debounced && (sections.data?.length ?? 0) > 0 && (
              <Text style={styles.catalogTitle}>{t('stores.allProducts')}</Text>
            )}
            <View style={styles.grid}>
              {items.map((p) => (
                <View key={p.id} style={styles.gridItem}>
                  <ProductCard
                    product={p}
                    isWished={wishedIds.includes(p.id)}
                    onToggleWish={toggleWish}
                    onAddToCart={addToCart}
                    hideStoreBadge
                  />
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    cover: { width: '100%', aspectRatio: 3, backgroundColor: colors.surface },
    coverFallback: {
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Pastilles posées sur le bas de la couverture, pas en dessous : sinon
    // elles décaleraient le bloc d'identité.
    coverDots: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 6,
      marginTop: -spacing.md,
      marginBottom: spacing.xs,
    },
    coverDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: 'rgba(255,255,255,0.6)',
    },
    coverDotActive: { backgroundColor: colors.white, width: 16 },
    identity: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.lg,
      backgroundColor: colors.surface,
    },
    logo: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.background,
    },
    logoFallback: { alignItems: 'center', justifyContent: 'center' },
    identityText: { flex: 1, gap: 3 },
    name: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    meta: { fontSize: fontSize.sm, color: colors.textMuted },
    followBtn: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: colors.primary,
    },
    followingBtn: {
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    followText: { fontSize: fontSize.sm, fontWeight: '800', color: colors.white },
    followingText: { color: colors.textSecondary },
    description: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
      backgroundColor: colors.surface,
      fontSize: fontSize.md,
      color: colors.textSecondary,
      lineHeight: 20,
    },    // Prolonge le bloc d'identité (même surface) et se termine par les coins
    // arrondis + l'ombre douce de `HomeHeader` : l'en-tête boutique se lit
    // exactement comme l'en-tête de l'accueil.
    searchWrap: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xs,
      paddingBottom: spacing.md,
      borderBottomLeftRadius: radius.xl,
      borderBottomRightRadius: radius.xl,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
      zIndex: 10,
    },
    chips: {
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.md,
    },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      maxWidth: 180,
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textSecondary },
    chipTextActive: { color: colors.white },
    catalogTitle: {
      fontSize: fontSize.lg,
      fontWeight: '800',
      color: colors.text,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: spacing.lg,
      gap: spacing.sm,
    },
    gridItem: { width: '48%' },
    emptyProducts: {
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.xxxl,
    },
    emptyText: { fontSize: fontSize.md, color: colors.textMuted, textAlign: 'center' },
  });
