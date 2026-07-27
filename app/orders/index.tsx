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
import {
  useCancelOrder,
  useDeleteOrder,
  useOrders,
  usePayExistingOrder,
} from "@/features/orders";
import { paymentService } from "@/features/payment/paymentService";
import { storeService } from "@/features/stores/storeService";
import { COD_PROVIDER } from "@/features/checkout/payment";
import { useStartConversation } from "@/features/messages/useMessages";
import { Icon } from "@/icons";
import type { OrderStatus } from "@/types";
import { Image } from "expo-image";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
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
  cancelled: "order.cancelledStatus",
};

/** Statuts où l'annulation est autorisée (pas encore expédié). */
const CANCELLABLE = new Set(["unpaid", "toShip"]);
/** Statuts où la suppression de l'historique est autorisée. */
const DELETABLE = new Set(["toReview", "cancelled"]);

async function pollPaymentStatus(
  orderId: string,
): Promise<"captured" | "pending" | "failed"> {
  for (let i = 0; i < 4; i++) {
    try {
      const res = await paymentService.getOrderPaymentStatus(orderId);
      if (res.status === "captured" || res.status === "authorized")
        return "captured";
      if (res.status === "failed") return "failed";
    } catch {}
    await new Promise((r) => setTimeout(r, 2000));
  }
  return "pending";
}

export default function OrdersScreen() {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const router = useRouter();
  const { t } = useTranslation();
  const { status } = useLocalSearchParams<{ status?: string }>();
  const [tab, setTab] = useState<OrderStatus | "all">(
    (status as OrderStatus | "all") || "all",
  );
  const { orders, isLoading } = useOrders(tab);
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const cancelOrder = useCancelOrder();
  const deleteOrder = useDeleteOrder();
  const payExisting = usePayExistingOrder();
  const startConversation = useStartConversation();

  // Sheet de paiement pour commande existante
  const [paySheet, setPaySheet] = useState<{
    orderId: string;
    orderNumber: string;
    storeId: string | null;
  } | null>(null);
  const [payMethods, setPayMethods] = useState<
    { provider: string; displayName: string; type: string }[]
  >([]);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["orders"] });
    setRefreshing(false);
  }, [queryClient]);

  const handleCancel = (orderId: string, orderNumber: string) => {
    Alert.alert(
      t("order.cancelConfirmTitle"),
      t("order.cancelConfirmBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("order.cancelOrder"),
          style: "destructive",
          onPress: async () => {
            try {
              await cancelOrder.mutateAsync(orderId);
              // Message système dans l'inbox
              try {
                await startConversation.mutateAsync({
                  orderId,
                  subject: `Annulation commande #${orderNumber}`,
                });
              } catch {}
              Alert.alert("", t("order.cancelSuccess"));
            } catch (e) {
              Alert.alert(
                t("common.error", "Erreur"),
                e instanceof Error ? e.message : t("checkout.paymentError"),
              );
            }
          },
        },
      ],
    );
  };

  const handleDelete = (orderId: string) => {
    Alert.alert(
      t("order.deleteConfirmTitle"),
      t("order.deleteConfirmBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("order.deleteOrder"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteOrder.mutateAsync(orderId);
            } catch (e) {
              Alert.alert(
                t("common.error", "Erreur"),
                e instanceof Error ? e.message : t("checkout.paymentError"),
              );
            }
          },
        },
      ],
    );
  };

  const openPaySheet = async (
    orderId: string,
    orderNumber: string,
    storeId: string | null,
  ) => {
    setPaySheet({ orderId, orderNumber, storeId });
    setPayError(null);
    setPayLoading(true);
    try {
      const methods = storeId
        ? await storeService.getStorePaymentMethods(storeId)
        : [];
      const cod = {
        provider: COD_PROVIDER,
        displayName: t("payment.cod"),
        type: "cash_on_delivery",
      };
      const hasCod = methods.some((m) => m.type === "cash_on_delivery");
      setPayMethods([
        ...methods.map((m) => ({
          provider: m.provider,
          displayName: m.displayName,
          type: m.type,
        })),
        ...(hasCod ? [] : [cod]),
      ]);
    } catch {
      setPayMethods([
        {
          provider: COD_PROVIDER,
          displayName: t("payment.cod"),
          type: "cash_on_delivery",
        },
      ]);
    } finally {
      setPayLoading(false);
    }
  };

  const handlePayWithMethod = async (provider: string) => {
    if (!paySheet) return;
    setPayLoading(true);
    setPayError(null);
    try {
      const returnUrl = Linking.createURL("payment-return");
      const res = await payExisting.mutateAsync({
        id: paySheet.orderId,
        paymentMethod: provider,
      });
      if (res.paymentUrl) {
        await WebBrowser.openAuthSessionAsync(res.paymentUrl, returnUrl);
        const status = await pollPaymentStatus(paySheet.orderId);
        if (status === "failed") throw new Error(t("checkout.paymentError"));
      }
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setPaySheet(null);
      router.push(`/orders/${paySheet.orderId}`);
    } catch (e) {
      setPayError(
        e instanceof Error ? e.message : t("checkout.paymentError"),
      );
    } finally {
      setPayLoading(false);
    }
  };

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
          contentContainerStyle={{
            padding: spacing.lg,
            gap: spacing.md,
            paddingBottom: spacing.xxxl * 2,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {orders.map((order) => {
            const firstItem = order.items[0] as any;
            const firstItemId = firstItem?.productId ?? firstItem?.id;
            const firstItemImage = firstItem?.image ?? firstItem?.images?.[0];
            const orderNumber = (order as any).orderNumber ?? order.id;
            const storeId = (order as any).storeId ?? null;
            const canCancel = CANCELLABLE.has(order.status);
            const canDelete = DELETABLE.has(order.status);

            return (
              <View key={order.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.orderId} numberOfLines={1}>
                    {t("order.numberPrefix")}{orderNumber}
                  </Text>
                  <Text style={styles.orderStatus}>
                    {t(STATUS_LABELS[order.status] ?? "account.unpaid")}
                  </Text>
                </View>

                {firstItem ? (
                  <Pressable
                    style={styles.itemRow}
                    onPress={() =>
                      firstItemId
                        ? router.push(`/product/${firstItemId}`)
                        : undefined
                    }
                  >
                    {firstItemImage ? (
                      <Image
                        source={{ uri: firstItemImage }}
                        style={styles.itemImg}
                        contentFit="cover"
                      />
                    ) : (
                      <View
                        style={[
                          styles.itemImg,
                          { alignItems: "center", justifyContent: "center" },
                        ]}
                      >
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
                          +{order.items.length - 1}{" "}
                          {t("order.otherItems", {
                            count: order.items.length - 1,
                          })}
                        </Text>
                      )}
                    </View>
                  </Pressable>
                ) : null}

                <View style={styles.cardActions}>
                  {order.status === "unpaid" && (
                    <Button
                      label={t("order.payNow")}
                      size="sm"
                      onPress={() =>
                        openPaySheet(order.id, orderNumber, storeId)
                      }
                    />
                  )}
                  {order.status === "shipped" && (
                    <Button
                      label={t("order.track")}
                      size="sm"
                      variant="outline"
                      onPress={() =>
                        router.push(`/orders/tracking?id=${order.id}`)
                      }
                    />
                  )}
                  {order.status !== "unpaid" && (
                    <Button
                      label={t("order.details")}
                      size="sm"
                      variant="outline"
                      onPress={() => router.push(`/orders/${order.id}`)}
                    />
                  )}
                  {canCancel && (
                    <Button
                      label={t("order.cancelOrder")}
                      size="sm"
                      variant="ghost"
                      loading={cancelOrder.isPending}
                      onPress={() => handleCancel(order.id, orderNumber)}
                    />
                  )}
                  {canDelete && (
                    <Pressable
                      hitSlop={8}
                      onPress={() => handleDelete(order.id)}
                      style={styles.deleteIcon}
                    >
                      <Icon name="trash" size={18} color={colors.danger} />
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Sheet : payer une commande existante */}
      <Modal
        visible={!!paySheet}
        transparent
        animationType="slide"
        onRequestClose={() => setPaySheet(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setPaySheet(null)}
        />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>
            {t("order.payOrderTitle", {
              number: paySheet?.orderNumber ?? "",
            })}
          </Text>
          {payLoading ? (
            <Text style={styles.sheetHint}>{t("common.loading")}</Text>
          ) : (
            payMethods.map((m) => (
              <Pressable
                key={m.provider}
                style={styles.methodRow}
                onPress={() => handlePayWithMethod(m.provider)}
              >
                <Text style={styles.methodLabel}>{m.displayName}</Text>
                <Icon name="chevronRight" size={16} color={colors.textMuted} />
              </Pressable>
            ))
          )}
          {payError ? (
            <Text style={styles.errorText}>{payError}</Text>
          ) : null}
          <Button
            label={t("common.cancel")}
            variant="ghost"
            size="md"
            fullWidth
            onPress={() => setPaySheet(null)}
            style={{ marginTop: spacing.sm }}
          />
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    emptyWrap: { flex: 1, justifyContent: "center", paddingBottom: spacing.xxxl },
    tabsWrap: {
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tabs: { paddingHorizontal: spacing.lg, gap: spacing.xl },
    tab: { paddingVertical: spacing.md, alignItems: "center" },
    tabText: { fontSize: fontSize.md, color: colors.textSecondary, fontWeight: "600" },
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
    orderStatus: { fontSize: fontSize.sm, color: colors.primary, fontWeight: "700" },
    itemRow: { flexDirection: "row", gap: spacing.md },
    itemImg: {
      width: 72,
      height: 72,
      borderRadius: radius.md,
      backgroundColor: colors.background,
    },
    itemTitle: { fontSize: fontSize.sm, color: colors.text, lineHeight: 18, marginBottom: 4 },
    cardActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
      gap: spacing.sm,
      flexWrap: "wrap",
    },
    deleteIcon: { padding: spacing.xs },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      padding: spacing.xl,
      gap: spacing.sm,
      paddingBottom: spacing.xxxl,
    },
    sheetTitle: {
      fontSize: fontSize.lg,
      fontWeight: "800",
      color: colors.text,
      marginBottom: spacing.sm,
    },
    sheetHint: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: "center" },
    methodRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    methodLabel: { fontSize: fontSize.md, color: colors.text, fontWeight: "600" },
    errorText: { fontSize: fontSize.sm, color: colors.danger, textAlign: "center" },
  });
