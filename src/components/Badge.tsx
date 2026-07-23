import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useColors, useThemedStyles, type Colors, radius, fontSize, spacing } from '@/design-system';

type Tone = 'primary' | 'sale' | 'green' | 'neutral' | 'choice';

type Props = {
  label: string;
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
};

const makeTones = (colors: Colors): Record<Tone, { bg: string; fg: string }> => ({
  primary: { bg: colors.primarySoft, fg: colors.primary },
  sale: { bg: colors.saleSoft, fg: colors.sale },
  green: { bg: colors.secondarySoft, fg: colors.secondaryDark },
  neutral: { bg: colors.background, fg: colors.textSecondary },
  choice: { bg: '#FFF3D6', fg: '#B7791F' },
});

/** Petite étiquette (Choice, Promo, -60%, Nouveau client…). */
export function Badge({ label, tone = 'primary', style }: Props) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const t = makeTones(colors)[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }, style]}>
      <Text style={[styles.text, { color: t.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  text: { fontSize: fontSize.xs, fontWeight: '700' },
});
