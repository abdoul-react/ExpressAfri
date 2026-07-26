import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { router } from 'expo-router';
import { useThemedStyles, useColors, type Colors, radius, fontSize, spacing } from '@/design-system';
import { Icon } from '@/icons';

type Props = {
  storeId?: string | null;
  storeName?: string | null;
  /**
   * Rend l'insigne cliquable (ouvre la boutique). Faux dans les grilles : la
   * carte entière est déjà pressable, un Pressable imbriqué avalerait le tap.
   */
  pressable?: boolean;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
};

/**
 * Insigne de provenance : d'où vient ce produit.
 *
 * Rend `null` sans nom de boutique — c'est le cas des produits de la boutique
 * système (pas de vendeur) et des paniers persistés avant l'ajout du champ.
 * L'appelant peut donc l'insérer sans condition.
 */
export function StoreBadge({ storeId, storeName, pressable, size = 'sm', style }: Props) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();

  if (!storeName) return null;

  const isMd = size === 'md';
  const iconSize = isMd ? 14 : 11;

  const content = (
    <View style={[styles.badge, isMd && styles.badgeMd, style]}>
      <Icon name="store" size={iconSize} color={colors.textSecondary} strokeWidth={2} />
      <Text style={[styles.text, isMd && styles.textMd]} numberOfLines={1}>
        {storeName}
      </Text>
    </View>
  );

  if (!pressable || !storeId) return content;

  return (
    <Pressable
      onPress={(e) => {
        e.stopPropagation();
        router.push('/stores/' + storeId);
      }}
      hitSlop={6}
    >
      {content}
    </Pressable>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 3,
      maxWidth: '100%',
    },
    badgeMd: {
      backgroundColor: colors.background,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      gap: 4,
    },
    text: {
      flexShrink: 1,
      fontSize: 10,
      lineHeight: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    textMd: { fontSize: fontSize.xs, lineHeight: 16 },
  });
