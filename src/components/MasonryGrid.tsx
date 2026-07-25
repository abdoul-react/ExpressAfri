import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { spacing } from '@/design-system';

type Props<T> = {
  items: T[];
  /** Hauteur relative estimée d'un élément — sert à équilibrer les colonnes. */
  estimateHeight: (item: T) => number;
  renderItem: (item: T) => React.ReactNode;
  keyExtractor: (item: T) => string;
};

/**
 * Grille 2 colonnes équilibrée par hauteur estimée, et non par simple alternance :
 * chaque élément part dans la colonne actuellement la plus courte, ce qui évite
 * qu'une colonne dépasse largement l'autre quand les hauteurs varient.
 */
export function MasonryGrid<T>({ items, estimateHeight, renderItem, keyExtractor }: Props<T>) {
  const { left, right } = useMemo(() => {
    const l: T[] = [];
    const r: T[] = [];
    let lh = 0;
    let rh = 0;
    for (const item of items) {
      const h = estimateHeight(item);
      if (lh <= rh) {
        l.push(item);
        lh += h;
      } else {
        r.push(item);
        rh += h;
      }
    }
    return { left: l, right: r };
  }, [items, estimateHeight]);

  return (
    <View style={styles.masonry}>
      {[left, right].map((col, ci) => (
        <View key={ci} style={styles.col}>
          {col.map((item) => (
            <React.Fragment key={keyExtractor(item)}>{renderItem(item)}</React.Fragment>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  masonry: { flexDirection: 'row', paddingHorizontal: spacing.sm, gap: spacing.sm },
  col: { flex: 1, gap: spacing.sm, paddingTop: spacing.sm },
});
