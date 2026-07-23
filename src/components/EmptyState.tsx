import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors, useThemedStyles, type Colors, spacing, typography } from '@/design-system';
import { Icon, IconName } from '@/icons';
import { Button } from './Button';

type Props = {
  icon: IconName;
  title: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon, title, hint, actionLabel, onAction }: Props) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.wrap}>
      <View style={styles.circle}>
        <Icon name={icon} size={40} color={colors.textMuted} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {hint && <Text style={styles.hint}>{hint}</Text>}
      {actionLabel && <Button label={actionLabel} onPress={onAction} style={{ marginTop: spacing.lg, alignSelf: 'center' }} />}
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxxl, gap: spacing.sm },
  circle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: { ...typography.title, textAlign: 'center', color: colors.text },
  hint: { ...typography.caption, textAlign: 'center', color: colors.textSecondary },
});
