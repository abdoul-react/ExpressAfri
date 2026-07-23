import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColors, useThemedStyles, type Colors, spacing, radius, fontSize } from '@/design-system';
import { Icon, IconName } from '@/icons';
import { ScreenHeader, Button } from '@/components';
import { useCoupons, useCouponHistory, type Coupon } from '@/features/coupons';
import { usePrice } from '@/hooks/usePrice';
import { useCartBadge } from '@/hooks/useCartBadge';
import { useAuthStore } from '@/store/authStore';

const TABS = ['Tout', 'Coupons AfriExpress', 'Coupons vendeur'];

// Un coupon "vendeur" cible une boutique précise ; sinon c'est un coupon AfriExpress.
function isVendorCoupon(c: Coupon) {
  return c.applicableTo === 'store' || c.applicableTo === 'product';
}

function formatValue(c: Coupon) {
  const n = Number(c.value);
  return c.type === 'percentage' ? `-${n % 1 === 0 ? n : n.toFixed(0)}%` : `-${n.toFixed(0)}`;
}

function formatExpiry(endDate: string | null) {
  if (!endDate) return null;
  const d = new Date(endDate);
  if (Number.isNaN(d.getTime())) return null;
  return `Expire le ${d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}`;
}

export default function CouponsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { coupons, isLoading } = useCoupons();
  const { history, isLoading: historyLoading } = useCouponHistory(showHistory);
  const { priceXof } = usePrice();
  const cartBadge = useCartBadge();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const FOOTER: { icon: IconName; label: string; onPress: () => void }[] = [
    { icon: 'history', label: 'Historique', onPress: () => setShowHistory(true) },
    // « Obtenez plus » : retour boutique — les coupons se gagnent en achetant
    { icon: 'coupon', label: 'Obtenez plus', onPress: () => router.push('/') },
    // Règles : page statique gérée par l'admin (CMS → Pages)
    { icon: 'help', label: 'Règles', onPress: () => router.push('/static-page/regles-coupons') },
  ];

  const visible = useMemo(() => {
    if (tab === 1) return coupons.filter((c) => !isVendorCoupon(c));
    if (tab === 2) return coupons.filter(isVendorCoupon);
    return coupons;
  }, [coupons, tab]);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Mes coupons" actions={[{ icon: 'cart', badge: cartBadge, onPress: () => router.push('/cart') }]} />

      {/* Onglets pilules — filtrent les coupons créés par l'admin */}
      <View style={styles.tabsBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {TABS.map((label, i) => (
            <Pressable
              key={label}
              style={[styles.tab, tab === i && styles.tabActive]}
              onPress={() => setTab(i)}
            >
              <Text style={[styles.tabText, tab === i && styles.tabTextActive]} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {visible.length > 0 ? (
        <ScrollView contentContainerStyle={styles.list}>
          {visible.map((c) => (
            <View key={c.id} style={styles.coupon}>
              <View style={styles.couponValueBox}>
                <Text style={styles.couponValue} numberOfLines={1} adjustsFontSizeToFit>
                  {formatValue(c)}
                </Text>
                {c.minPurchase && Number(c.minPurchase) > 0 ? (
                  <Text style={styles.couponMin}>dès {Number(c.minPurchase).toFixed(0)}</Text>
                ) : null}
              </View>
              <View style={styles.couponBody}>
                <Text style={styles.couponName} numberOfLines={2}>{c.name}</Text>
                {c.applicableName ? (
                  <Text style={styles.couponScope} numberOfLines={1}>{c.applicableName}</Text>
                ) : (
                  <Text style={styles.couponScope}>AfriExpress</Text>
                )}
                {formatExpiry(c.endDate) ? (
                  <Text style={styles.couponExpiry}>{formatExpiry(c.endDate)}</Text>
                ) : null}
              </View>
              <View style={styles.couponCode}>
                <Text style={styles.couponCodeText}>{c.code}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.empty}>
          <View style={styles.walletIcon}>
            <Icon name="wallet" size={48} color={colors.primary} />
          </View>
          <Text style={styles.emptyText}>
            {isLoading ? 'Chargement…' : 'Vous n’avez pas gagné de coupon'}
          </Text>
          {!isLoading && (
            <Button label="Obtenir des coupons" size="lg" onPress={() => router.replace('/')} style={{ marginTop: spacing.lg, alignSelf: 'center' }} />
          )}
        </View>
      )}

      {/* Barre bas */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        {FOOTER.map((f) => (
          <Pressable key={f.label} style={styles.footerItem} onPress={f.onPress}>
            <Icon name={f.icon} size={22} color={colors.text} />
            <Text style={styles.footerLabel}>{f.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Historique des coupons utilisés */}
      <Modal visible={showHistory} animationType="slide" transparent onRequestClose={() => setShowHistory(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowHistory(false)} />
        <View style={[styles.historySheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.historyTitle}>Historique des coupons</Text>
          {!isAuthenticated ? (
            <View style={styles.historyEmpty}>
              <Text style={styles.emptyText}>Connectez-vous pour voir votre historique</Text>
              <Button label="Se connecter" onPress={() => { setShowHistory(false); router.push('/auth/login'); }} style={{ marginTop: spacing.md }} />
            </View>
          ) : historyLoading ? (
            <View style={styles.historyEmpty}>
              <Text style={styles.emptyText}>Chargement…</Text>
            </View>
          ) : history.length === 0 ? (
            <View style={styles.historyEmpty}>
              <Icon name="history" size={40} color={colors.textMuted} />
              <Text style={styles.emptyText}>Aucun coupon utilisé pour l’instant</Text>
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: spacing.sm }}>
              {history.map((h) => (
                <View key={h.id} style={styles.historyRow}>
                  <View style={styles.historyBadge}>
                    <Icon name="coupon" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.historyName} numberOfLines={1}>{h.name}</Text>
                    <Text style={styles.historyMeta} numberOfLines={1}>
                      {h.code} · {new Date(h.usedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                  <Text style={styles.historyAmount}>-{priceXof(Number(h.discountAmount))}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  tabsBar: { flexGrow: 0, flexShrink: 0 },
  tabs: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm, alignItems: 'center' },
  tab: { height: 36, justifyContent: 'center', backgroundColor: colors.background, borderRadius: radius.pill, paddingHorizontal: spacing.lg },
  tabActive: { backgroundColor: colors.inverse },
  tabText: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600' },
  tabTextActive: { color: colors.textInverse },
  list: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
  coupon: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  couponValueBox: { width: 96, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm, gap: 2 },
  couponValue: { fontSize: fontSize.xl, fontWeight: '800', color: colors.primary },
  couponMin: { fontSize: fontSize.xs, color: colors.textMuted },
  couponBody: { flex: 1, padding: spacing.md, gap: 2, justifyContent: 'center' },
  couponName: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  couponScope: { fontSize: fontSize.sm, color: colors.textSecondary },
  couponExpiry: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  couponCode: { justifyContent: 'center', paddingHorizontal: spacing.md, borderLeftWidth: 1, borderLeftColor: colors.border, borderStyle: 'dashed' },
  couponCodeText: { fontSize: fontSize.sm, fontWeight: '800', color: colors.text, letterSpacing: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxxl },
  walletIcon: { width: 110, height: 110, borderRadius: 55, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center' },
  footer: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: spacing.md },
  footerItem: { flex: 1, alignItems: 'center', gap: 4 },
  footerLabel: { fontSize: fontSize.xs, color: colors.text },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  historySheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: spacing.md },
  historyTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text, marginBottom: spacing.md },
  historyEmpty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radius.md,
  },
  historyBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  historyName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  historyMeta: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  historyAmount: { fontSize: fontSize.md, fontWeight: '800', color: colors.price },
})
