import {
  Button,
  EmptyState,
  Price,
  ScreenHeader,
  SkeletonOrders,
} from "@/components";
import {
  fontSize,
  radius,
  spacing,
  useColors,
  useThemedStyles,
  type Colors,
} from "@/design-system";
import { useOrders } from "@/features/orders";
import { useCartStore } from "@/store/cartStore";
import { Icon } from "@/icons";
import type { OrderStatus } from "@/types";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";

const TABS: { key: OrderStatus | "all"; labelKey: string }[] = [
  { key: "all", labelKey: "order.all" },
  { key: "unpaid", labelKey: "account.unpaid" },
  { key: "toShip", labelKey: "account.toShip" },
  { key: "shipped", labelKey: "account.shipped" },
  { key: "toReview", labelKey: "account.toReview" },
  { key: "returns", labelKey: "account.returns" },
];

const STATUS_LABELS: Record<string, string> = {
  unpaid: "account.unpaid",
  toShip: "account.toShip",
  shipped: "account.shipped",
  toReview: "account.toReview",
  returns: "account.returns",
};

export default function OrdersScreen() {
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { t } = useTranslation();
  const { status } = useLocalSearchParams<{ status?: string }>();
  const [tab, setTab] = useState<OrderStatus | "all">(
    (status as OrderStatus | "all") || "all",
  );
  const colors = useColors();
  const { orders, isLoading } = useOrders(tab);
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['orders'] });
    setRefreshing(false);
  }, [queryClient]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <SkeletonOrders />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={t("account.myOrders")} />

      <View style={styles.tabsWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {TABS.map((tb) => (
            <Pressable
              key={tb.key}
              onPress={() => setTab(tb.key)}
              style={styles.tab}
            >
              <Text
                style={[styles.tabText, tab === tb.key && styles.tabTextActive]}
              >
                {t(tb.labelKey)}
              </Text>
              {tab === tb.key && <View style={styles.underline} />}
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {orders.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="box"
            title={t("order.empty")}
            hint={t("order.emptyHint")}
            actionLabel={t("checkout.continueShopping")}
            onAction={() => router.replace("/")}
          />
        </View>
      ) : (
        <ScrollView
          // paddingBottom généreux : sans lui, la dernière carte (et son bouton
          // « Détails ») passe sous la zone de gestes système en bas d'écran
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl * 2 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {orders.map((order) => {
            const firstItem = order.items[0] as any;
            // L'API mobile renvoie { productId, title, image } ; l'ancien mock renvoyait { id, images[] }
            const firstItemId = firstItem?.productId ?? firstItem?.id;
            const firstItemImage = firstItem?.image ?? firstItem?.images?.[0];
            return (
              <View key={order.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.orderId} numberOfLines={1}>
                    {t("order.numberPrefix")}{(order as any).orderNumber ?? order.id}
                  </Text>
                  <Text style={styles.orderStatus}>
                    {tab === "all"
                      ? t(STATUS_LABELS[order.status] ?? "account.unpaid")
                      : t(TABS.find((x) => x.key === tab)!.labelKey)}
                  </Text>
                </View>
                {firstItem ? (
                  <Pressable
                    style={styles.itemRow}
                    onPress={() => firstItemId ? router.push(`/product/${firstItemId}`) : undefined}
                  >
                    {firstItemImage ? (
                      <Image
                        source={{ uri: firstItemImage }}
                        style={styles.itemImg}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={[styles.itemImg, { alignItems: 'center', justifyContent: 'center' }]}>
                        <Icon name="box" size={24} color={colors.textMuted} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle} numberOfLines={2}>
                        {firstItem.title}
                      </Text>
                      <Price priceUsd={firstItem.priceUsd} size="sm" />
                      {order.items.length > 1 && (
                        <Text
                          style={{
                            fontSize: fontSize.xs,
                            color: colors.textMuted,
                            marginTop: 2,
                          }}
                        >
                          +{order.items.length - 1} {t("order.otherItems", { count: order.items.length - 1 })}
                        </Text>
                      )}
                    </View>
                  </Pressable>
                ) : null}
                <View style={styles.cardActions}>
                  {tab === "unpaid" && (
                    <Button
                      label={t("order.payNow")}
                      size="sm"
                      onPress={() => {
                        const store = useCartStore.getState();
                        store.setAllSelected(false);
                        order.items.forEach((item: any) => {
                          // L'API mobile renvoie { productId, title, image, priceUsd } ; l'ancien mock { id, images[] }
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
                        router.push("/checkout");
                      }}
                    />
                  )}
                  {tab === "shipped" && (
                    <Button
                      label={t("order.track")}
                      size="sm"
                      variant="outline"
                      onPress={() => router.push(`/orders/tracking?id=${order.id}`)}
                    />
                  )}
                  {tab !== "unpaid" && (
                    <Button
                      label={t("order.details")}
                      size="sm"
                      variant="outline"
                      onPress={() => router.push(`/orders/${order.id}`)}
                    />
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    emptyWrap: {
      flex: 1,
      justifyContent: "center",
      paddingBottom: spacing.xxxl,
    },
    tabsWrap: {
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tabs: { paddingHorizontal: spacing.lg, gap: spacing.xl },
    tab: { paddingVertical: spacing.md, alignItems: "center" },
    tabText: {
      fontSize: fontSize.md,
      color: colors.textSecondary,
      fontWeight: "600",
    },
    tabTextActive: { color: colors.text, fontWeight: "800" },
    underline: {
      marginTop: 6,
      height: 3,
      width: 24,
      borderRadius: 2,
      backgroundColor: colors.primary,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.md,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    orderId: { fontSize: fontSize.sm, color: colors.textSecondary },
    orderStatus: {
      fontSize: fontSize.sm,
      color: colors.primary,
      fontWeight: "700",
    },
    itemRow: { flexDirection: "row", gap: spacing.md },
    itemImg: {
      width: 72,
      height: 72,
      borderRadius: radius.md,
      backgroundColor: colors.background,
    },
    itemTitle: {
      fontSize: fontSize.sm,
      color: colors.text,
      lineHeight: 18,
      marginBottom: 4,
    },
    cardActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: spacing.sm,
    },
  });
