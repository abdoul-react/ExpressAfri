import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
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
import { resolveMediaUrl } from '@/utils/resolveMediaUrl';
import { useAuthStore } from '@/store/authStore';
import { useToggleStoreLike } from '@/features/stores';
import type { StoreCard as StoreCardType } from '@/infrastructure/data-source/StoreDataSource';

type Props = {
  store: StoreCardType;
  /** Masque le bouton like (écran « boutiques suivies », par exemple). */
  hideLike?: boolean;
};

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace('.0', '')}k`;
  return String(n);
}

/**
 * Carte de boutique pour la grille de découverte : cover + logo + nom +
 * localisation + compteurs + bouton suivre. Ce n'est volontairement pas une
 * `ProductCard` déguisée — une boutique n'a ni prix ni note produit.
 */
export function StoreCard({ store, hideLike }: Props) {
  const router = useRouter();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const toggleLike = useToggleStoreLike();

  const cover = resolveMediaUrl(store.coverUrl) ?? resolveMediaUrl(store.photos?.[0]);
  const logo = resolveMediaUrl(store.logoUrl);
  const location = [store.city, store.country].filter(Boolean).join(', ');

  const onLike = () => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    toggleLike.mutate({ storeId: store.id, follow: !store.likedByMe });
  };

  return (
    <Pressable style={styles.card} onPress={() => router.push(`/stores/${store.id}`)}>
      <View style={styles.coverWrap}>
        {cover ? (
          <Image source={{ uri: cover }} style={styles.cover} contentFit="cover" />
        ) : logo ? (
          // Pas de photo de fond posée par le boutiquier : son logo tient lieu
          // de visuel plutôt qu'un aplat vide.
          <Image
            source={{ uri: logo }}
            style={[styles.cover, styles.coverLogo]}
            contentFit="contain"
          />
        ) : (
          <View style={[styles.cover, styles.coverFallback]}>
            <Icon name="store" size={30} color={colors.primary} />
          </View>
        )}
        {!hideLike && (
          // Bouton dans un Pressable imbriqué : le tap ne remonte pas à la carte,
          // donc liker n'ouvre pas la boutique.
          <Pressable
            style={styles.likeBtn}
            hitSlop={8}
            onPress={onLike}
            disabled={toggleLike.isPending}
            accessibilityRole="button"
            accessibilityLabel={t(store.likedByMe ? 'stores.following' : 'stores.follow')}
          >
            <Icon
              name="heart"
              size={16}
              color={store.likedByMe ? colors.sale : colors.textMuted}
              fill={store.likedByMe}
            />
          </Pressable>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.identity}>
          {logo ? (
            <Image source={{ uri: logo }} style={styles.logo} contentFit="cover" />
          ) : (
            <View style={[styles.logo, styles.logoFallback]}>
              <Icon name="store" size={16} color={colors.textMuted} />
            </View>
          )}
          <Text style={styles.name} numberOfLines={2}>
            {store.name}
          </Text>
        </View>

        {/* Ligne toujours rendue, même sans localisation : sinon la carte
            perdrait 16 px et casserait l'alignement de la grille. */}
        <View style={styles.metaRow}>
          {location ? (
            <>
              <Icon name="location" size={12} color={colors.textMuted} />
              <Text style={styles.metaText} numberOfLines={1}>
                {location}
              </Text>
            </>
          ) : null}
        </View>

        <View style={styles.stats}>
          <Text style={styles.metaText} numberOfLines={1}>
            {formatCount(store.productCount)} {t('stores.products')}
          </Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.metaText} numberOfLines={1}>
            {formatCount(store.followersCount)} {t('stores.followers')}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      overflow: 'hidden',
    },
    coverWrap: { position: 'relative' },
    cover: { width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.background },
    coverLogo: { backgroundColor: colors.primarySoft, padding: spacing.lg },
    coverFallback: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
    },
    likeBtn: {
      position: 'absolute',
      top: spacing.sm,
      right: spacing.sm,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: { padding: spacing.sm, gap: 5 },
    // Hauteur figée à deux lignes de nom : un nom court et un nom long
    // produisent la même carte, comme dans la grille de produits.
    identity: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      height: 36,
    },
    logo: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.background,
    },
    logoFallback: { alignItems: 'center', justifyContent: 'center' },
    name: {
      flex: 1,
      fontSize: fontSize.md,
      fontWeight: '700',
      color: colors.text,
      lineHeight: 18,
      height: 36,
    },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 16 },
    metaText: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 16 },
    stats: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 16 },
    dot: { fontSize: fontSize.xs, color: colors.textMuted },
  });
