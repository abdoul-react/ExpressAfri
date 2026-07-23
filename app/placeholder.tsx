import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useThemedStyles, type Colors } from '@/design-system';
import { ScreenHeader, EmptyState } from '@/components';
import { IconName } from '@/icons';

/** Écran générique pour les sections encore en construction (aucun bouton mort). */
export default function PlaceholderScreen() {
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { t } = useTranslation();
  const { title, icon } = useLocalSearchParams<{ title?: string; icon?: string }>();

  return (
    <View style={styles.container}>
      <ScreenHeader title={title ?? 'AfriExpress'} />
      <EmptyState
        icon={(icon as IconName) ?? 'box'}
        title={title ?? ''}
        hint={t('common.comingSoon')}
        actionLabel={t('checkout.continueShopping')}
        onAction={() => router.replace('/')}
      />
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
});
