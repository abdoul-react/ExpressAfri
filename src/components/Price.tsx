import React from 'react';
import { Text, StyleSheet, View, TextStyle } from 'react-native';
import { fontSize, fontWeight, useColors, useThemedStyles, type Colors } from '@/design-system';
import { usePrice } from '@/hooks/usePrice';

type Props = {
  /** Montant en XOF (FCFA) — champ `priceUsd` de l'API (nom historique trompeur). */
  priceUsd: number;
  originalPriceUsd?: number;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  /** Rétrécit la police pour tenir sur une ligne (cartes étroites). */
  fit?: boolean;
};

const SIZES = { sm: fontSize.lg, md: fontSize.xl, lg: fontSize['3xl'] };

/** Affiche un prix (converti depuis XOF vers la devise active) + prix barré éventuel. */
export function Price({ priceUsd, originalPriceUsd, size = 'md', color, fit }: Props) {
  const { priceXof } = usePrice();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const resolved = color ?? colors.price;
  return (
    <View style={styles.row}>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit={fit}
        minimumFontScale={fit ? 0.6 : undefined}
        style={[styles.price, { fontSize: SIZES[size], color: resolved }, fit && { flexShrink: 1 }]}
      >
        {priceXof(priceUsd)}
      </Text>
      {originalPriceUsd != null && (
        <Text style={styles.strike} numberOfLines={1}>{priceXof(originalPriceUsd)}</Text>
      )}
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  price: { fontWeight: fontWeight.extrabold as any } as TextStyle,
  strike: {
    fontSize: fontSize.xs,
    color: colors.priceStrike,
    textDecorationLine: 'line-through',
  },
});
