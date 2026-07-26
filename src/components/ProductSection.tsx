import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
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
  shadows,
} from '@/design-system';
import { Icon } from '@/icons';
import type { Product } from '@/types';
import type { StoreSection } from '@/infrastructure/data-source/StoreDataSource';
import { ProductCard } from './ProductCard';
import { Price } from './Price';
import { Rating } from './Rating';

type Props = {
  section: StoreSection;
  isWished?: (id: string) => boolean;
  onToggleWish?: (id: string) => void;
  onAddToCart?: (product: Product, quantity: number) => void;
};

/** Largeur des cartes du rail horizontal — même valeur que les rails d'accueil. */
const RAIL_CARD_WIDTH = 150;

/**
 * Section de catalogue composée par le boutiquier. Le format des cartes suit
 * `section.layout` :
 * - grid     : grille 2 colonnes (format par défaut)
 * - rail     : défilement horizontal, image dominante
 * - list     : une ligne par produit, vignette + détails
 * - showcase : 1 produit héros pleine largeur, puis grille
 *
 * Dans tous les cas, chaque zone de texte a une hauteur imposée : deux produits
 * aux titres de longueur différente occupent exactement la même place.
 */
export function ProductSection({
  section,
  isWished,
  onToggleWish,
  onAddToCart,
}: Props) {
  const styles = useThemedStyles(makeStyles);
  const { products, layout } = section;

  if (!products.length) return null;

  const cardProps = (p: Product) => ({
    product: p,
    isWished: isWished?.(p.id),
    onToggleWish,
    onAddToCart,
  });

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {section.title}
        </Text>
        {section.subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {section.subtitle}
          </Text>
        ) : null}
      </View>

      {layout === 'rail' ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rail}
        >
          {products.map((p) => (
            <ProductCard
              key={p.id}
              {...cardProps(p)}
              variant="compact"
              width={RAIL_CARD_WIDTH}
            />
          ))}
        </ScrollView>
      ) : layout === 'list' ? (
        <View style={styles.list}>
          {products.map((p) => (
            <ListRow
              key={p.id}
              product={p}
              onAddToCart={onAddToCart}
            />
          ))}
        </View>
      ) : layout === 'showcase' ? (
        <>
          <View style={styles.heroWrap}>
            <HeroCard product={products[0]} onAddToCart={onAddToCart} />
          </View>
          <View style={styles.grid}>
            {products.slice(1).map((p) => (
              <View key={p.id} style={styles.gridItem}>
                <ProductCard {...cardProps(p)} />
              </View>
            ))}
          </View>
        </>
      ) : (
        <View style={styles.grid}>
          {products.map((p) => (
            <View key={p.id} style={styles.gridItem}>
              <ProductCard {...cardProps(p)} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/** Format « liste » : vignette carrée + détails, hauteur de ligne constante. */
function ListRow({
  product,
  onAddToCart,
}: {
  product: Product;
  onAddToCart?: (product: Product, quantity: number) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <Pressable
      style={styles.row}
      onPress={() => router.push(`/product/${product.id}`)}
    >
      <Image
        source={{ uri: product.images[0] }}
        style={styles.rowImage}
        contentFit="cover"
        transition={200}
      />
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {product.title}
        </Text>
        <View style={styles.rowPrice}>
          <Price
            priceUsd={product.priceUsd}
            originalPriceUsd={product.originalPriceUsd}
            size="sm"
            fit
          />
        </View>
        <View style={styles.rowMeta}>
          {product.rating > 0 || product.soldCount > 0 ? (
            <Rating value={product.rating} soldCount={product.soldCount} />
          ) : null}
        </View>
      </View>
      <Pressable
        style={styles.rowAdd}
        hitSlop={8}
        onPress={() => onAddToCart?.(product, 1)}
        accessibilityRole="button"
        accessibilityLabel={t('product.addToCart')}
      >
        <Icon name="plus" size={18} color={colors.white} />
      </Pressable>
    </Pressable>
  );
}

/** Format « vitrine » : produit héros en 16/9 pleine largeur. */
function HeroCard({
  product,
  onAddToCart,
}: {
  product: Product;
  onAddToCart?: (product: Product, quantity: number) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <Pressable
      style={styles.hero}
      onPress={() => router.push(`/product/${product.id}`)}
    >
      <Image
        source={{ uri: product.images[0] }}
        style={styles.heroImage}
        contentFit="cover"
        transition={200}
      />
      {product.discountPercent != null && product.discountPercent > 0 && (
        <View style={styles.heroDiscount}>
          <Text style={styles.heroDiscountText}>-{product.discountPercent}%</Text>
        </View>
      )}
      <View style={styles.heroBody}>
        <View style={styles.heroText}>
          <Text style={styles.heroTitle} numberOfLines={1}>
            {product.title}
          </Text>
          <Price
            priceUsd={product.priceUsd}
            originalPriceUsd={product.originalPriceUsd}
            size="md"
            fit
          />
        </View>
        <Pressable
          style={styles.heroAdd}
          hitSlop={8}
          onPress={() => onAddToCart?.(product, 1)}
          accessibilityRole="button"
          accessibilityLabel={t('product.addToCart')}
        >
          <Icon name="plus" size={20} color={colors.white} />
        </Pressable>
      </View>
    </Pressable>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    wrap: { paddingTop: spacing.lg },
    header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
    title: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text },
    subtitle: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
      marginTop: 2,
    },

    // ── grid / showcase ──
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: spacing.lg,
      gap: spacing.sm,
    },
    gridItem: { width: '48%' },

    // ── rail ──
    rail: { paddingHorizontal: spacing.lg, gap: spacing.sm },

    // ── list ──
    list: { paddingHorizontal: spacing.lg, gap: spacing.sm },
    // Hauteurs figées : vignette 96 + corps 96 → toutes les lignes identiques,
    // que le titre tienne sur une ou deux lignes.
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.sm,
      backgroundColor: colors.card,
      borderRadius: radius.md,
      height: 112,
      ...shadows.sm,
    },
    rowImage: {
      width: 96,
      height: 96,
      borderRadius: radius.sm,
      backgroundColor: colors.background,
    },
    rowBody: { flex: 1, gap: 2 },
    rowTitle: {
      fontSize: fontSize.sm,
      color: colors.text,
      lineHeight: 18,
      height: 36,
    },
    rowPrice: { height: 22, justifyContent: 'center' },
    rowMeta: { height: 16, justifyContent: 'center' },
    rowAdd: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // ── showcase (héros) ──
    heroWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
    hero: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      overflow: 'hidden',
      ...shadows.sm,
    },
    heroImage: {
      width: '100%',
      aspectRatio: 16 / 9,
      backgroundColor: colors.background,
    },
    heroDiscount: {
      position: 'absolute',
      top: spacing.sm,
      left: spacing.sm,
      backgroundColor: colors.sale,
      borderRadius: radius.sm,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    heroDiscountText: {
      color: colors.white,
      fontSize: fontSize.xs,
      fontWeight: '800',
    },
    heroBody: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      height: 68,
    },
    heroText: { flex: 1, gap: 2 },
    heroTitle: {
      fontSize: fontSize.md,
      fontWeight: '700',
      color: colors.text,
      lineHeight: 20,
    },
    heroAdd: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
