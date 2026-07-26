import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import {
  useThemedStyles,
  useColors,
  type Colors,
  spacing,
  radius,
  fontSize,
} from '@/design-system';
import type { StorePaymentMethod } from '@/infrastructure/data-source/StoreDataSource';
import { Icon, type IconName } from '@/icons';

/** Icône de repli quand le boutiquier n'a pas fourni de logo. */
const TYPE_ICONS: Record<StorePaymentMethod['type'], IconName> = {
  mobile_money: 'phone',
  card: 'creditCard',
  wallet: 'wallet',
  cash_on_delivery: 'truck',
};

/**
 * Moyens de paiement acceptés par la boutique. Rassure le client avant l'achat :
 * chaque boutique a ses propres options, et savoir qu'on peut payer comme on
 * veut se décide avant la mise au panier, pas au checkout.
 */
export function StorePaymentMethods({
  methods,
}: {
  methods: StorePaymentMethod[];
}) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const { t } = useTranslation();

  if (!methods.length) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('stores.paymentMethods')}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
      >
        {methods.map((method) => (
          <View key={method.id} style={styles.chip}>
            {method.logoUrl ? (
              <Image
                source={{ uri: method.logoUrl }}
                style={styles.logo}
                contentFit="contain"
              />
            ) : (
              <Icon
                name={TYPE_ICONS[method.type] ?? 'creditCard'}
                size={18}
                color={colors.primary}
              />
            )}
            <Text style={styles.label} numberOfLines={1}>
              {method.displayName}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    wrap: { paddingTop: spacing.lg },
    title: {
      fontSize: fontSize.lg,
      fontWeight: '800',
      color: colors.text,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
    },
    rail: { paddingHorizontal: spacing.lg, gap: spacing.sm },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    logo: { width: 22, height: 22 },
    label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  });
