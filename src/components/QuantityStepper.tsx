import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useColors, useThemedStyles, type Colors, radius, fontSize } from '@/design-system';
import { Icon } from '@/icons';

type Props = {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  /** Version compacte (panier) : boutons et valeur plus étroits */
  compact?: boolean;
};

export function QuantityStepper({ value, onChange, min = 1, max = 99, compact = false }: Props) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  return (
    <View style={styles.row}>
      <Pressable
        style={[styles.btn, compact && styles.btnCompact, value <= min && styles.disabled]}
        disabled={value <= min}
        onPress={() => onChange(value - 1)}
        hitSlop={6}
      >
        <Icon name="minus" size={compact ? 14 : 16} color={colors.text} />
      </Pressable>
      <Text style={[styles.value, compact && styles.valueCompact]}>{value}</Text>
      <Pressable
        style={[styles.btn, compact && styles.btnCompact, value >= max && styles.disabled]}
        disabled={value >= max}
        onPress={() => onChange(value + 1)}
        hitSlop={6}
      >
        <Icon name="plus" size={compact ? 14 : 16} color={colors.text} />
      </Pressable>
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
    flexShrink: 0,
  },
  btn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  btnCompact: { width: 28, height: 28 },
  disabled: { opacity: 0.4 },
  value: { minWidth: 36, textAlign: 'center', fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  valueCompact: { minWidth: 24, fontSize: fontSize.md },
});
