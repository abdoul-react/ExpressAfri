import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, fontSize, useColors, useThemedStyles, type Colors } from '@/design-system';
import { Icon } from '@/icons';
import { Button } from '@/components';

export default function SuccessScreen() {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const router = useRouter();
  const { t } = useTranslation();
  const { orderNumber } = useLocalSearchParams<{ orderId?: string; orderNumber?: string }>();

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.primarySun, colors.primary]} style={styles.circle}>
        <Icon name="check" size={56} color={colors.white} strokeWidth={3} />
      </LinearGradient>
      <Text style={styles.title}>{t('checkout.success')}</Text>
      {orderNumber ? (
        <Text style={styles.orderNumber}>N° {orderNumber}</Text>
      ) : null}
      <Text style={styles.hint}>{t('checkout.successHint')}</Text>

      <View style={styles.actions}>
        <Button
          label={t('checkout.trackOrder')}
          variant="outline"
          size="lg"
          fullWidth
          onPress={() => {
            router.dismissAll();
            router.push('/orders');
          }}
        />
        <Button
          label={t('checkout.continueShopping')}
          size="lg"
          fullWidth
          onPress={() => {
            router.dismissAll();
          }}
        />
      </View>
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', padding: spacing.xxxl, gap: spacing.md },
  circle: { width: 110, height: 110, borderRadius: 55, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  title: { fontSize: fontSize['3xl'], fontWeight: '900', color: colors.text, textAlign: 'center' },
  orderNumber: { fontSize: fontSize.md, fontWeight: '700', color: colors.primary, textAlign: 'center' },
  hint: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  actions: { width: '100%', gap: spacing.md, marginTop: spacing.xl },
});
