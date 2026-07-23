import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useColors, useThemedStyles, type Colors, spacing, typography } from '@/design-system';
import { Icon } from '@/icons';
import { Badge } from './Badge';

type Props = {
  title: string;
  badge?: string;
  badgeTone?: 'primary' | 'sale' | 'green';
  actionLabel?: string;
  onAction?: () => void;
};

export function SectionHeader({ title, badge, badgeTone = 'primary', actionLabel, onAction }: Props) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={[typography.sectionTitle, { color: colors.text }, styles.title]} numberOfLines={1}>{title}</Text>
        {badge && (
          <View style={styles.badgeWrap}>
            <Badge label={badge} tone={badgeTone} />
          </View>
        )}
      </View>
      {(actionLabel || onAction) && (
        <Pressable style={styles.action} onPress={onAction} hitSlop={8}>
          {actionLabel && <Text style={styles.actionText} numberOfLines={1}>{actionLabel}</Text>}
          <Icon name="chevronRight" size={18} color={colors.textSecondary} />
        </Pressable>
      )}
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1, marginRight: spacing.sm, overflow: 'hidden' },
  title: { flexShrink: 1 },
  badgeWrap: { flexShrink: 1 },
  action: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  actionText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
});
