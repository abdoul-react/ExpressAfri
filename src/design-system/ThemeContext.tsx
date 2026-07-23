import React, { createContext, useContext, useMemo } from 'react';
import type { Colors } from './colors';
import { lightColors } from './colors';

/**
 * Contexte de thème. Fournit la palette active (claire/sombre) à toute l'app.
 * Les écrans consomment `useColors()` (couleurs inline) et `useThemedStyles()`
 * (feuilles de styles reconstruites au changement de thème).
 */
const ColorsContext = createContext<Colors>(lightColors);

export function ThemeProvider({ colors, children }: { colors: Colors; children: React.ReactNode }) {
  return <ColorsContext.Provider value={colors}>{children}</ColorsContext.Provider>;
}

/** Palette active. */
export function useColors(): Colors {
  return useContext(ColorsContext);
}

/**
 * Construit une feuille de styles à partir de la palette active, mémoïsée
 * et reconstruite automatiquement au changement de thème.
 *
 *   const makeStyles = (colors: Colors) => StyleSheet.create({ ... });
 *   const styles = useThemedStyles(makeStyles);
 */
export function useThemedStyles<T>(factory: (colors: Colors) => T): T {
  const colors = useColors();
  return useMemo(() => factory(colors), [colors, factory]);
}
