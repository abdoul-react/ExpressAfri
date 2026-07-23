import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColors, useThemedStyles, type Colors, spacing, fontSize } from '@/design-system';
import { Icon, IconName } from '@/icons';
import { BrandHeaderGradient } from './BrandHeaderGradient';

type Action = { icon: IconName; onPress: () => void; badge?: number };

type Props = {
  title?: string;
  actions?: Action[];
  transparent?: boolean;
  onBack?: () => void;
  /** Centre le titre (pages légales, documents…) au lieu de l'aligner à gauche. */
  centerTitle?: boolean;
};

export function ScreenHeader({ title, actions, transparent, onBack, centerTitle }: Props) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View
      style={[
        styles.wrap,
        { paddingTop: insets.top + spacing.xs },
        transparent ? styles.transparent : styles.solid,
      ]}
    >
      {/* Voile dégradé de marque (couleurs CMS) — même signature que l'accueil */}
      {!transparent && <BrandHeaderGradient />}
      <Pressable hitSlop={8} onPress={onBack ?? (() => router.back())} style={styles.iconBtn}>
        <Icon name="chevronLeft" size={26} color={colors.text} />
      </Pressable>
      {title ? (
        <Text style={[styles.title, centerTitle && styles.titleCentered]} numberOfLines={1}>
          {title}
        </Text>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      {/* Titre centré sans actions : équilibrer la place du bouton retour */}
      {centerTitle && !actions?.length ? <View style={styles.iconBtn}><View style={{ width: 26 }} /></View> : null}
      <View style={styles.actions}>
        {actions?.map((a, i) => (
          <Pressable key={i} hitSlop={8} onPress={a.onPress} style={styles.iconBtn}>
            <Icon name={a.icon} size={24} color={colors.text} />
            {a.badge ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{a.badge}</Text>
              </View>
            ) : null}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  solid: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  transparent: { backgroundColor: 'transparent' },
  iconBtn: { padding: 4 },
  title: { flex: 1, fontSize: fontSize.xl, fontWeight: '800', color: colors.text },
  titleCentered: { textAlign: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  badge: { position: 'absolute', top: -2, right: -4, backgroundColor: colors.sale, borderRadius: 9, minWidth: 16, height: 16, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: colors.white, fontSize: 9, fontWeight: '800' },
});
