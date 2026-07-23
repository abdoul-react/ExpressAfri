import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useColors, useThemedStyles, type Colors, radius, spacing, fontSize, shadows } from '@/design-system';
import { Icon } from '@/icons';
import { Product } from '@/types';
import { usePrice } from '@/hooks/usePrice';
import { Price } from './Price';
import { Rating } from './Rating';
import { Badge } from './Badge';
type Props = {
  product: Product;
  /** Largeur imposée (grille) ; sinon flex. */
  width?: number;
  /** Taille prédéfinie : small, medium, large */
  size?: 'small' | 'medium' | 'large';
  /**
   * Variante d'affichage :
   * - 'full' (défaut) : image + titre + prix + note + livraison — pour les grilles
   * - 'compact' : image dominante + prix rouge + vendus/note, sans titre — façon
   *   rails AliExpress, dense et image-first
   */
  variant?: 'full' | 'compact';
  /** Affiche le bouton "+" d'ajout rapide. */
  quickAdd?: boolean;
  /** Ajouté aux favoris ? (store remonté par l'écran) */
  isWished?: boolean;
  /** Callback toggle favori */
  onToggleWish?: (id: string) => void;
  /** Callback ajout panier */
  onAddToCart?: (product: Product, quantity: number) => void;
};

/**
 * Prix compact pour les petites cartes : une seule ligne, rétrécit au besoin
 * (adjustsFontSizeToFit) au lieu d'être tronqué avec « … » — les gros montants
 * FCFA restent lisibles sans casser la hauteur de carte.
 */
function CompactPrice({ priceUsd }: { priceUsd: number }) {
  const { priceXof } = usePrice();
  const colors = useColors();
  return (
    <Text
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.6}
      style={{ fontSize: fontSize.base, fontWeight: '800', color: colors.price }}
    >
      {priceXof(priceUsd)}
    </Text>
  );
}

export function ProductCard({ product, width, size, variant = 'full', quickAdd = true, isWished, onToggleWish, onAddToCart }: Props) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const router = useRouter();

  // Determine width based on props
  const sizeMap: Record<'small' | 'medium' | 'large', number> = {
    small: 120,
    medium: 150,
    large: 190,
  };
  let finalWidth: number | undefined;
  if (width !== undefined) {
    finalWidth = width;
  } else if (size !== undefined) {
    finalWidth = sizeMap[size];
  }

  if (variant === 'compact') {
    return (
      <Animated.View entering={FadeInDown.duration(300).springify()}>
        <Pressable
          style={[styles.compactCard, finalWidth !== undefined ? { width: finalWidth } : { flex: 1 }]}
          onPress={() => router.push(`/product/${product.id}`)}
        >
          <View style={styles.compactImageWrap}>
            <Image
              source={{ uri: product.images[0] }}
              style={styles.image}
              contentFit="cover"
              transition={200}
            />
            {/* Réduction EN HAUT sur l'image : jamais de chevauchement ni de hauteur variable */}
            {product.discountPercent != null && product.discountPercent > 0 && (
              <View style={styles.compactDiscount}>
                <Text style={styles.compactDiscountText}>-{product.discountPercent}%</Text>
              </View>
            )}
          </View>
          <View style={styles.compactBody}>
            <CompactPrice priceUsd={product.priceUsd} />
            <View style={styles.compactMeta}>
              {product.soldCount > 0 ? (
                <Text style={styles.compactSold} numberOfLines={1}>
                  +{product.soldCount >= 1000 ? `${Math.floor(product.soldCount / 1000)}k` : product.soldCount} vendus
                </Text>
              ) : product.rating > 0 ? (
                <>
                  <Icon name="star" size={10} color={colors.star} fill />
                  <Text style={styles.compactRating}>{product.rating.toFixed(1)}</Text>
                </>
              ) : (
                <Text style={styles.compactSold}>Nouveau</Text>
              )}
              {product.soldCount > 0 && product.rating > 0 && (
                <>
                  <Icon name="star" size={10} color={colors.star} fill />
                  <Text style={styles.compactRating}>{product.rating.toFixed(1)}</Text>
                </>
              )}
            </View>
          </View>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInDown.duration(300).springify()}>
      <Pressable
        style={[styles.card, finalWidth !== undefined ? { width: finalWidth } : { flex: 1 }]}
        onPress={() => router.push(`/product/${product.id}`)}
      >
        <View style={styles.imageWrap}>
          <Image
            source={{ uri: product.images[0] }}
            style={styles.image}
            contentFit="cover"
            transition={200}
          />
          {product.discountPercent != null && product.discountPercent > 0 && (
            <View style={styles.discountTag}>
              <Text style={styles.discountText}>-{product.discountPercent}%</Text>
            </View>
          )}
          {/* Badge Choice sur l'image (bas gauche) : n'affecte jamais la hauteur du corps */}
          {product.isChoice && (
            <View style={styles.choiceTag}>
              <Badge label="Choice" tone="choice" />
            </View>
          )}
          {onToggleWish && (
            <Pressable
              hitSlop={8}
              style={styles.wishBtn}
              onPress={() => onToggleWish(product.id)}
            >
              <Icon
                name="heart"
                size={18}
                color={isWished ? colors.sale : colors.white}
                fill={isWished ?? false}
              />
            </Pressable>
          )}
        </View>

        {/*
          Corps à hauteur STRICTEMENT fixe : chaque zone a une hauteur imposée
          (le titre réserve toujours 2 lignes) → toutes les cartes d'une rangée
          sont identiques, quel que soit le nom du produit.
        */}
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>
            {product.title}
          </Text>

          <View style={styles.priceRow}>
            <Price priceUsd={product.priceUsd} originalPriceUsd={product.originalPriceUsd} size="sm" fit />
          </View>

          {/* Ligne méta toujours rendue (hauteur fixe) : note/ventes, sinon offre, sinon vide */}
          <View style={styles.metaRow}>
            {product.rating > 0 || product.soldCount > 0 ? (
              <Rating value={product.rating} soldCount={product.soldCount} />
            ) : product.isNewBuyerDeal ? (
              <Text style={styles.newBuyer} numberOfLines={1}>Nouveau client seulement</Text>
            ) : null}
          </View>

          <View style={styles.footer}>
            {product.freeShipping ? (
              <View style={styles.freeShip}>
                <Icon name="truck" size={12} color={colors.freeShipping} />
                <Text style={styles.freeShipText} numberOfLines={1}>Livraison gratuite</Text>
              </View>
            ) : (
              <View />
            )}
            {quickAdd && (
              <Pressable
                style={styles.addBtn}
                hitSlop={6}
                onPress={() => onAddToCart?.(product, 1)}
              >
                <Icon name="plus" size={18} color={colors.white} />
              </Pressable>
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  // Image carrée comme AliExpress : les cartes restent basses et uniformes
  imageWrap: { position: 'relative', width: '100%', aspectRatio: 1, backgroundColor: colors.background },
  image: { width: '100%', height: '100%' },
  discountTag: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.sale,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 3,
    minWidth: 36,
    alignItems: 'center',
  },
  discountText: { color: colors.white, fontSize: fontSize.xs, fontWeight: '800', letterSpacing: 0.3 },
  wishBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: spacing.sm, gap: 2 },
  /*
    Hauteurs FIXES par zone — la somme est constante, donc toutes les cartes
    ont exactement la même hauteur, que le titre fasse 1 ou 2 lignes,
    qu'il y ait une note ou non, une livraison gratuite ou non :
      titre 32 + prix 20 + méta 16 + footer 32 (+ paddings/gaps)
  */
  title: { fontSize: fontSize.sm, color: colors.text, lineHeight: 16, height: 32 },
  priceRow: { height: 20, justifyContent: 'center' },
  metaRow: { height: 16, justifyContent: 'center' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 32 },
  freeShip: { flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 1 },
  freeShipText: { fontSize: fontSize.xs, color: colors.freeShipping, fontWeight: '600' },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  newBuyer: { fontSize: fontSize.xs, color: colors.sale },
  choiceTag: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
  },

  // ── Variante compacte (rails horizontaux façon AliExpress) ──
  // Hauteur STRICTEMENT identique pour toutes les cartes : image carrée
  // + zone texte à hauteur fixe (badge réduction posé sur l'image, pas en bas).
  compactCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  compactImageWrap: { position: 'relative', width: '100%', aspectRatio: 1, backgroundColor: colors.background },
  compactBody: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, gap: 2, height: 48, justifyContent: 'center' },
  compactMeta: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 14 },
  compactSold: { fontSize: fontSize.xs, color: colors.textSecondary, flexShrink: 1 },
  compactRating: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: '600' },
  compactDiscount: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    backgroundColor: colors.sale,
    borderRadius: radius.sm,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  compactDiscountText: { color: colors.white, fontSize: 10, fontWeight: '800' },
});