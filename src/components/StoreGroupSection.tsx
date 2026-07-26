import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import {
  useThemedStyles,
  type Colors,
  spacing,
  fontSize,
} from '@/design-system';
import type { StoreGroup } from '@/infrastructure/data-source/StoreDataSource';
import { StoreCard } from './StoreCard';

/** Largeur des cartes du rail — alignée sur les rails de l'accueil. */
const RAIL_CARD_WIDTH = 170;

/**
 * Section de la vitrine : un thème composé par l'admin central et les boutiques
 * qui lui sont assignées, en défilement horizontal. À ne pas confondre avec
 * `ProductSection`, qui présente les PRODUITS d'une boutique.
 */
export function StoreGroupSection({ group }: { group: StoreGroup }) {
  const styles = useThemedStyles(makeStyles);

  if (!group.stores.length) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {group.title}
        </Text>
        {group.subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {group.subtitle}
          </Text>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
      >
        {group.stores.map((store) => (
          <View key={store.id} style={styles.railItem}>
            <StoreCard store={store} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    wrap: { paddingTop: spacing.lg },
    header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
    title: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text },
    subtitle: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
    rail: { paddingHorizontal: spacing.lg, gap: spacing.sm },
    railItem: { width: RAIL_CARD_WIDTH },
  });
