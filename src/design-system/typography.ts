import { TextStyle } from 'react-native';
import { colors } from './colors';

/** Échelle de tailles de police. */
export const fontSize = {
  xs: 11,
  sm: 12,
  md: 14,
  base: 15,
  lg: 16,
  xl: 18,
  '2xl': 22,
  '3xl': 28,
  '4xl': 34,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
} as const;

/** Styles de texte réutilisables. */
export const typography = {
  h1: {
    fontSize: fontSize['4xl'],
    fontWeight: fontWeight.extrabold,
    color: colors.text,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.extrabold,
    color: colors.text,
    letterSpacing: -0.4,
  },
  h3: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.text,
    letterSpacing: -0.3,
  },
  sectionTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.extrabold,
    color: colors.text,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  body: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.regular,
    color: colors.text,
  },
  bodyStrong: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  caption: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.regular,
    color: colors.textSecondary,
  },
  micro: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
  },
  price: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.extrabold,
    color: colors.price,
  },
  priceLarge: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.extrabold,
    color: colors.price,
  },
  button: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
