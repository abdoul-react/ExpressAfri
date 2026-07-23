import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  StyleProp,
  View,
} from 'react-native';
import { useColors, useThemedStyles, type Colors, radius, spacing, fontSize, fontWeight } from '@/design-system';
import { Icon, IconName } from '@/icons';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'dark';
type Size = 'sm' | 'md' | 'lg';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

const HEIGHTS: Record<Size, number> = { sm: 36, md: 44, lg: 52 };
const FONTS: Record<Size, number> = { sm: fontSize.sm, md: fontSize.md, lg: fontSize.lg };

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading,
  disabled,
  fullWidth,
  style,
}: Props) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const palette = getVariant(variant, colors);
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          height: HEIGHTS[size],
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderWidth: palette.border ? 1.5 : 0,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          paddingHorizontal: size === 'sm' ? spacing.md : spacing.xl,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} size="small" />
      ) : (
        <View style={styles.content}>
          {icon && <Icon name={icon} size={FONTS[size] + 4} color={palette.text} />}
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            style={[styles.label, { color: palette.text, fontSize: FONTS[size] }]}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function getVariant(variant: Variant, colors: Colors) {
  switch (variant) {
    case 'primary':
      return { bg: colors.primary, text: colors.textOnPrimary, border: '' };
    case 'secondary':
      return { bg: colors.secondary, text: colors.textOnPrimary, border: '' };
    case 'dark':
      return { bg: colors.inverse, text: colors.textInverse, border: '' };
    case 'outline':
      return { bg: colors.surface, text: colors.primary, border: colors.primary };
    case 'ghost':
      return { bg: 'transparent', text: colors.text, border: '' };
  }
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { fontWeight: fontWeight.bold as any },
});
