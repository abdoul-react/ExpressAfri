import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fontSize, useColors, useThemedStyles, type Colors } from '@/design-system';
import { Icon } from '@/icons';

type Props = {
  value: number;
  soldCount?: number;
  size?: number;
};

/** Note en étoile + nombre de ventes (style AliExpress). */
export function Rating({ value, soldCount, size = 12 }: Props) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.row}>
      <Icon name="star" size={size} color={colors.star} fill />
      <Text style={styles.value}>{value.toFixed(1)}</Text>
      {soldCount != null && (
        <>
          <View style={styles.dot} />
          <Text style={styles.sold}>{formatSold(soldCount)} vendus</Text>
        </>
      )}
    </View>
  );
}

function formatSold(n: number): string {
  if (n >= 100000) return `+${Math.floor(n / 1000)}k`;
  if (n >= 1000) return `+${(n / 1000).toFixed(0)} 000`;
  return `${n}`;
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  value: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600' },
  sold: { fontSize: fontSize.sm, color: colors.textMuted },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.borderStrong, marginHorizontal: 3 },
});
