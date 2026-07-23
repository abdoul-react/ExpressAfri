import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { useColors, useThemedStyles, type Colors, spacing, radius, fontSize, shadows } from '@/design-system';
import { useCartStore } from '@/store/cartStore';
import { Icon } from '@/icons';
import { ScreenHeader, Price, Button, StatusState, SkeletonOrders } from '@/components';
import { useOrderDetail } from '@/features/orders';
import { useStartConversation } from '@/features/messages';
import { usePrice } from '@/hooks/usePrice';

const STATUS_LABELS: Record<string, string> = {
  unpaid: 'account.unpaid',
  toShip: 'account.toShip',
  shipped: 'account.shipped',
  toReview: 'account.toReview',
  returns: 'account.returns',
};

export default function OrderDetailScreen() {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { priceXof } = usePrice();
  const { order, isLoading } = useOrderDetail(id!);
  const startConversation = useStartConversation();

  const contactSeller = async () => {
    try {
      const conv = await startConversation.mutateAsync({
        orderId: id,
        subject: `Commande ${(order as any)?.orderNumber ?? id}`,
      });
      router.push(`/messages/${conv.id}`);
    } catch {
      Alert.alert(t('common.error', 'Erreur'), t('messages.startFailed', 'Impossible de contacter le vendeur — réessayez.'));
    }
  };

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleDateString(i18n.language, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <SkeletonOrders />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t('order.detail')} />
        <StatusState
          status="empty"
          title={t("order.notFound")}
          hint={t("order.notFoundHint")}
          actionLabel={t("common.back")}
          onAction={() => router.back()}
        />
      </View>
    );
  }

  const statusColor = order.status === 'shipped' ? colors.secondary : order.status === 'unpaid' ? colors.sale : colors.primary;

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('order.detail')} />

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}>
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: statusColor }]}>
          <Text style={styles.statusTitle}>{t(STATUS_LABELS[order.status] || 'account.unpaid')}</Text>
          <Text style={styles.statusSub}>{t('order.orderNumber')} #{(order as any).orderNumber ?? order.id}</Text>
          <Text style={styles.statusSub}>{t('order.placedOn')} {formatDate(order.createdAt)}</Text>
        </View>

        {/* Suivi : visible dès que la commande est expédiée ou livrée —
            pas seulement quand un numéro de suivi a été saisi */}
        {(order.trackingNumber || ['shipped', 'toReview'].includes(order.status)) && (
          <View style={styles.section}>
            <View style={styles.trackingRow}>
              <Icon name="truck" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.trackingLabel}>
                  {order.trackingNumber ? t('order.trackingNumber') : t('order.tracking')}
                </Text>
                <Text style={styles.trackingValue}>
                  {order.trackingNumber ?? t('tracking.evShipped', 'Commande expédiée')}
                </Text>
              </View>
            </View>
            {order.estimatedDelivery && (
              <View style={styles.estRow}>
                <Icon name="clock" size={16} color={colors.textSecondary} />
                <Text style={styles.estText}>
                  {t('order.estimatedDelivery')} : {order.estimatedDelivery}
                </Text>
              </View>
            )}
            <Button label={t('order.trackPackage')} size="sm" variant="outline" onPress={() => router.push(`/orders/tracking?id=${id}`)} style={{ marginTop: spacing.sm }} />
          </View>
        )}

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('order.items')} ({order.items.length})</Text>
          {order.items.map((item: any, idx: number) => {
            // L'API mobile renvoie { productId, title, image } ; l'ancien mock { id, images[] }
            const itemId = item.productId ?? item.id;
            const itemImage = item.image ?? item.images?.[0];
            return (
              <Pressable
                key={itemId ?? idx}
                style={styles.itemRow}
                onPress={() => itemId ? router.push(`/product/${itemId}`) : undefined}
              >
                {itemImage ? (
                  <Image source={{ uri: itemImage }} style={styles.itemImg} contentFit="cover" />
                ) : (
                  <View style={[styles.itemImg, { alignItems: 'center', justifyContent: 'center' }]}>
                    <Icon name="box" size={22} color={colors.textMuted} />
                  </View>
                )}
                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
                  {/* Déclinaison choisie (couleur, taille…) — que le client retrouve sa sélection */}
                  {item.variantLabel ? (
                    <Text style={styles.itemVariant} numberOfLines={1}>{item.variantLabel}</Text>
                  ) : null}
                  <View style={styles.itemPriceRow}>
                    <Price priceUsd={item.priceUsd ?? 0} size="sm" />
                    {item.quantity ? (
                      <Text style={styles.itemQty}>x{item.quantity}</Text>
                    ) : null}
                  </View>
                </View>
                <Icon name="chevronRight" size={16} color={colors.textMuted} />
              </Pressable>
            );
          })}
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('checkout.orderSummary')}</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('order.subtotal')}</Text>
            <Text style={styles.summaryValue}>{priceXof(order.totalUsd - order.shippingUsd - order.taxUsd)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('order.shipping')}</Text>
            <Text style={[styles.summaryValue, order.shippingUsd === 0 && { color: colors.freeShipping }]}>
              {order.shippingUsd === 0 ? t('common.free') : priceXof(order.shippingUsd)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('order.tax')}</Text>
            <Text style={styles.summaryValue}>{priceXof(order.taxUsd)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>{t('order.total')}</Text>
            <Text style={styles.totalValue}>{priceXof(order.totalUsd)}</Text>
          </View>
        </View>

        {/* Shipping Address */}
        {order.address ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('order.shippingAddress')}</Text>
            {order.address.name ? <Text style={styles.addressText}>{order.address.name}</Text> : null}
            {order.address.street ? <Text style={styles.addressText}>{order.address.street}</Text> : null}
            <Text style={styles.addressText}>
              {[order.address.city, order.address.country].filter(Boolean).join(', ')}
            </Text>
            {order.address.phone ? <Text style={styles.addressText}>{order.address.phone}</Text> : null}
          </View>
        ) : null}

        {/* Actions */}
        <View style={styles.actions}>
          {order.status === 'unpaid' && (
            <Button
              label={t('order.payNow')}
              onPress={() => {
                const store = useCartStore.getState();
                store.setAllSelected(false);
                order.items.forEach((item: any) => {
                  const pid = item.productId ?? item.id;
                  if (!pid) return;
                  const { items } = useCartStore.getState();
                  const existing = items.find((i) => i.productId === pid);
                  if (existing) {
                    if (!existing.selected) useCartStore.getState().toggleSelected(pid);
                  } else {
                    useCartStore.getState().add({
                      id: pid,
                      title: item.title ?? 'Article',
                      images: item.images ?? (item.image ? [item.image] : []),
                      priceUsd: item.priceUsd ?? 0,
                    } as any, item.quantity ?? 1);
                  }
                });
                router.push('/checkout');
              }}
              fullWidth
            />
          )}
          <Button
            label={t('order.contactSeller')}
            variant="outline"
            loading={startConversation.isPending}
            onPress={contactSeller}
            fullWidth
          />
          <Button
            label={t('order.returnRequest')}
            variant="ghost"
            onPress={() => router.push(`/orders/return?orderId=${id}`)}
            fullWidth
          />
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    statusBanner: {
      padding: spacing.xl,
      gap: 4,
    },
    statusTitle: {
      fontSize: fontSize['2xl'],
      fontWeight: '800',
      color: colors.white,
    },
    statusSub: {
      fontSize: fontSize.sm,
      color: colors.white,
      opacity: 0.9,
    },
    section: {
      backgroundColor: colors.surface,
      padding: spacing.lg,
      marginTop: spacing.sm,
      gap: spacing.sm,
    },
    sectionTitle: {
      fontSize: fontSize.lg,
      fontWeight: '800',
      color: colors.text,
      marginBottom: spacing.xs,
    },
    trackingRow: {
      flexDirection: 'row',
      gap: spacing.md,
      alignItems: 'center',
    },
    trackingLabel: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
    },
    trackingValue: {
      fontSize: fontSize.md,
      fontWeight: '700',
      color: colors.text,
    },
    estRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    estText: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
    },
    itemRow: {
      flexDirection: 'row',
      gap: spacing.md,
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
    itemImg: {
      width: 64,
      height: 64,
      borderRadius: radius.md,
      backgroundColor: colors.background,
    },
    itemInfo: {
      flex: 1,
      gap: 4,
    },
    itemTitle: {
      fontSize: fontSize.sm,
      color: colors.text,
      lineHeight: 18,
    },
    itemVariant: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
    },
    itemPriceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    itemQty: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    summaryLabel: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
    },
    summaryValue: {
      fontSize: fontSize.sm,
      color: colors.text,
      fontWeight: '600',
    },
    totalRow: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: spacing.md,
      marginTop: spacing.xs,
    },
    totalLabel: {
      fontSize: fontSize.lg,
      fontWeight: '800',
      color: colors.text,
    },
    totalValue: {
      fontSize: fontSize.lg,
      fontWeight: '800',
      color: colors.primary,
    },
    addressText: {
      fontSize: fontSize.sm,
      color: colors.text,
      lineHeight: 20,
    },
    actions: {
      padding: spacing.lg,
      gap: spacing.sm,
    },
  });
