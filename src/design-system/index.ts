export { colors, lightColors, darkColors, palette, gradients } from './colors';
export type { Colors } from './colors';
export { ThemeProvider, useColors, useThemedStyles } from './ThemeContext';
export { spacing, radius, shadows } from './spacing';
export type { Spacing, Radius } from './spacing';
export { typography, fontSize, fontWeight } from './typography';
export type { TypographyVariant } from './typography';

import { colors, gradients } from './colors';
import { spacing, radius, shadows } from './spacing';
import { typography, fontSize, fontWeight } from './typography';

/** Thème agrégé — pratique pour un accès unique. */
export const theme = {
  colors,
  gradients,
  spacing,
  radius,
  shadows,
  typography,
  fontSize,
  fontWeight,
} as const;

export type Theme = typeof theme;
