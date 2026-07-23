/**
 * AfriExpress — Palette de couleurs
 * Basée sur le drapeau du Niger : Orange · Blanc · Vert + soleil orange.
 * Ne jamais coder de hex en dur dans les écrans — toujours passer par `colors`.
 */

export const palette = {
  // Niger — Orange (primaire)
  orange50: '#FFF4EC',
  orange100: '#FFE3D1',
  orange200: '#FFC4A3',
  orange300: '#FF9E66',
  orange400: '#FF8A00', // soleil
  orange500: '#E8590C', // primaire marque
  orange600: '#C74A08',
  orange700: '#A33C06',

  // Niger — Vert (secondaire)
  green50: '#E8F9EC',
  green100: '#C6F0D1',
  green200: '#84DE9C',
  green300: '#3ECB63',
  green400: '#0DB02B', // vert marque
  green500: '#0A8F22',
  green600: '#08761C',

  // Rouge promo / urgence (usage limité)
  red400: '#FF4D4F',
  red500: '#FA2A2D',

  // Neutres
  white: '#FFFFFF',
  black: '#000000',
  ink: '#1A1A1A',
  slate700: '#374151',
  slate600: '#4B5563',
  slate500: '#6B7280',
  slate400: '#9CA3AF',
  slate300: '#D1D5DB',
  line: '#EEEEEE',
  bg: '#F5F5F5',
  bgSoft: '#FAFAFA',

  // Utilitaires
  star: '#FFB300',
  overlay: 'rgba(0,0,0,0.5)',
  transparent: 'transparent',
} as const;

/** Rôles sémantiques — utilisés par le thème. */
export const colors = {
  // Marque
  primary: palette.orange500,
  primarySun: palette.orange400,
  primaryDark: palette.orange600,
  primarySoft: palette.orange50,

  secondary: palette.green400,
  secondaryDark: palette.green500,
  secondarySoft: palette.green50,

  // Prix & promo
  price: palette.orange500,
  priceStrike: palette.slate400,
  sale: palette.red500,
  saleSoft: '#FFECEC',

  // Texte
  text: palette.ink,
  textSecondary: palette.slate500,
  textMuted: palette.slate400,
  textOnPrimary: palette.white,

  // Surface inversée — pastilles/onglets/boutons "sombres".
  // Lisible dans les DEUX thèmes : ne jamais utiliser `text` comme fond
  // (en sombre `text` est quasi-blanc → bouton pâle illisible).
  inverse: palette.ink,
  textInverse: palette.white,

  // Surfaces
  surface: palette.white,
  background: palette.bg,
  backgroundSoft: palette.bgSoft,
  card: palette.white,

  // Bordures / séparateurs
  border: palette.line,
  borderStrong: palette.slate300,

  // États
  success: palette.green400,
  warning: palette.orange400,
  danger: palette.red500,
  star: palette.star,

  // Divers
  overlay: palette.overlay,
  freeShipping: palette.green400,
  badgeNew: palette.orange500,
  tabInactive: palette.slate500,
  tabActive: palette.orange500,

  // Neutres bruts (accès direct)
  white: palette.white,
  black: palette.black,
  slate500: palette.slate500,
  slate400: palette.slate400,
} as const;

/**
 * Palette SOMBRE — mêmes rôles/clés que `colors` (clair).
 * Les couleurs de marque (orange/vert/rouge) restent ; surfaces, textes et
 * bordures s'inversent.
 */
export const darkColors: Colors = {
  primary: palette.orange500,
  primarySun: palette.orange400,
  primaryDark: palette.orange400,
  primarySoft: '#2A1D12',

  secondary: palette.green400,
  secondaryDark: palette.green300,
  secondarySoft: '#12241A',

  price: palette.orange400,
  priceStrike: palette.slate500,
  sale: palette.red400,
  saleSoft: '#2A1416',

  text: '#F2F2F5',
  textSecondary: '#A8A8B0',
  textMuted: '#7A7A82',
  textOnPrimary: palette.white,

  // Surface inversée en sombre : claire avec texte foncé (contraste garanti).
  inverse: '#F2F2F5',
  textInverse: palette.ink,

  surface: '#1C1C1E',
  background: '#0B0B0D',
  backgroundSoft: '#141416',
  card: '#1C1C1E',

  border: '#2C2C2E',
  borderStrong: '#3A3A3C',

  success: palette.green400,
  warning: palette.orange400,
  danger: palette.red400,
  star: palette.star,

  overlay: 'rgba(0,0,0,0.6)',
  freeShipping: palette.green400,
  badgeNew: palette.orange500,
  tabInactive: '#8A8A92',
  tabActive: palette.orange400,

  white: palette.white,
  black: palette.black,
  slate500: palette.slate500,
  slate400: palette.slate400,
};

/** Palette claire (alias explicite de `colors`). */
export const lightColors: Colors = colors;

/** Dégradés signature (soleil du Niger). */
export const gradients = {
  sun: [palette.orange400, palette.orange500] as const,
  sunset: ['#FFB347', palette.orange500, palette.orange600] as const,
  flag: [palette.orange500, palette.white, palette.green400] as const,
  promo: ['#7C5CFF', '#5B7CFF'] as const, // bannière festive (comme AliExpress)
};

export type Colors = { [K in keyof typeof colors]: string };
