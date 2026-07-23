import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useColors, useThemedStyles, type Colors, spacing, radius, fontSize } from '@/design-system';
import { Icon } from '@/icons';
import { ScreenHeader } from '@/components';
import { usePrice } from '@/hooks/usePrice';
import { useWallet } from '@/hooks/useWallet';

const SECURITY_KEYS = ['pciDss', 'dataSecure', 'dataEncrypted', 'dataNeverSold'];

export default function BonusScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { amount } = usePrice();
  const { data: wallet } = useWallet();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.container}>
      <ScreenHeader title={t("wallet.bonus")} actions={[{ icon: 'headset', onPress: () => router.push("/messages") }]} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl * 2 }}>
        <Text style={styles.section}>{t("wallet.bonusBalance")}</Text>
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Icon name="gift" size={20} color={colors.textSecondary} />
            <Text style={styles.balanceLabel}>{t("wallet.bonus")}</Text>
          </View>
          <Text style={styles.total}>{t("wallet.total")}</Text>
          <Text style={styles.amount}>{amount(wallet?.balance ?? 0)} pts</Text>
          <View style={styles.tip}>
            <Text style={styles.tipText}>
              {t("wallet.bonusExplanation")}
            </Text>
          </View>
        </View>

        <View style={styles.protect}>
          <View style={styles.protectHeader}>
            <Icon name="shield" size={20} color={colors.secondary} />
            <Text style={styles.protectTitle}>{t("wallet.protectedData")}</Text>
          </View>
          {SECURITY_KEYS.map((key) => (
            <View key={key} style={styles.protectRow}>
              <Icon name="check" size={16} color={colors.secondary} />
              <Text style={styles.protectText}>{t(`wallet.${key}`)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  section: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text },
  balanceCard: { backgroundColor: colors.backgroundSoft, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  balanceHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  balanceLabel: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  total: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center' },
  amount: { fontSize: fontSize['4xl'], fontWeight: '900', color: colors.textMuted, textAlign: 'center', marginVertical: spacing.sm },
  tip: { backgroundColor: colors.saleSoft, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm },
  tipText: { fontSize: fontSize.sm, color: colors.text, lineHeight: 20, fontWeight: '600' },
  protect: { gap: spacing.sm },
  protectHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  protectTitle: { fontSize: fontSize.md, fontWeight: '800', color: colors.text, flex: 1 },
  protectRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  protectText: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
});
