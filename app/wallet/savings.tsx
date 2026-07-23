import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useColors, useThemedStyles, type Colors, spacing, fontSize } from '@/design-system';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/icons';
import { ScreenHeader, EmptyState } from '@/components';
import { usePrice } from '@/hooks/usePrice';
import { useCartBadge } from '@/hooks/useCartBadge';
import { useSettingsStore, COUNTRIES } from '@/store/settingsStore';
import { useWallet } from '@/hooks/useWallet';

const TAB_KEYS = ['all', 'pending', 'received', 'upcoming', 'used'];

export default function SavingsScreen() {
  const router = useRouter();
  const cartBadge = useCartBadge();
  const { priceXof } = usePrice();
  const { data: wallet } = useWallet();
  const { t } = useTranslation();
  const [tab, setTab] = useState(0);
  const countryCode = useSettingsStore((s) => s.country);
  const country = COUNTRIES.find((c) => c.code === countryCode)!;
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.container}>
      <ScreenHeader title={t("wallet.savings")} actions={[{ icon: 'cart', badge: cartBadge, onPress: () => router.push('/cart') }]} />

      <Pressable style={styles.terms}>
        <Icon name="help" size={16} color={colors.textSecondary} />
        <Text style={styles.termsText}>{t("wallet.savingsTerms")}</Text>
        <Icon name="chevronRight" size={16} color={colors.textMuted} />
      </Pressable>

      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>{t("wallet.total")} ({country.name})</Text>
        <Text style={styles.totalAmount}>{priceXof(wallet?.totalSavings ?? 0)}</Text>
      </View>

      <View style={styles.tabsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {TAB_KEYS.map((key, i) => (
            <Pressable key={key} onPress={() => setTab(i)} style={styles.tab}>
              <Text style={[styles.tabText, tab === i && styles.tabTextActive]} numberOfLines={1}>{t(`wallet.${key}`)}</Text>
              {tab === i && <View style={styles.underline} />}
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <EmptyState
        icon="coupon"
        title={t("wallet.savingsEmpty")}
        hint={t("wallet.savingsHint")}
      />
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  terms: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.background, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  termsText: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary },
  totalCard: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  totalLabel: { fontSize: fontSize.md, color: colors.textSecondary },
  totalAmount: { fontSize: fontSize['4xl'], fontWeight: '900', color: colors.text, marginTop: 4 },
  tabsWrap: { flexGrow: 0, flexShrink: 0 },
  tabs: { paddingHorizontal: spacing.lg, gap: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { paddingVertical: spacing.md, alignItems: 'center' },
  tabText: { fontSize: fontSize.md, color: colors.textSecondary, fontWeight: '600' },
  tabTextActive: { color: colors.text, fontWeight: '800' },
  underline: { marginTop: 6, height: 3, width: 22, borderRadius: 2, backgroundColor: colors.text },
});
