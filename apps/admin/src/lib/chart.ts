// Palette graphique centralisée — SEUL fichier (avec tailwind.config.js) autorisé
// à contenir des valeurs hexadécimales.

export const CHART_COLORS = {
  primary: '#E8590C',
  secondary: '#0DB02B',
  accent: '#6366F1',
  blue: '#3B82F6',
  amber: '#F59E0B',
  red: '#EF4444',
  purple: '#A855F7',
  teal: '#14B8A6',
  gray: '#9CA3AF',
} as const

/** Ordre catégoriel par défaut pour les séries multiples. */
export const CHART_SERIES: string[] = [
  CHART_COLORS.primary,
  CHART_COLORS.accent,
  CHART_COLORS.secondary,
  CHART_COLORS.blue,
  CHART_COLORS.amber,
  CHART_COLORS.purple,
  CHART_COLORS.teal,
  CHART_COLORS.red,
]

/** Couleurs d'axes/grilles selon le thème. */
export function chartTheme(dark: boolean) {
  return {
    grid: dark ? '#1f2937' : '#e5e7eb',
    axis: dark ? '#6b7280' : '#9ca3af',
    tooltipBg: dark ? '#111827' : '#ffffff',
    tooltipBorder: dark ? '#374151' : '#e5e7eb',
    tooltipText: dark ? '#f3f4f6' : '#111827',
  }
}
