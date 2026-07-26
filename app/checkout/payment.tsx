import {
  Button,
  KeyboardScreen,
  Price,
  ScreenHeader,
  StatusState,
} from "@/components";
import {
  fontSize,
  radius,
  spacing,
  useColors,
  useThemedStyles,
  type Colors,
} from "@/design-system";
import { paymentService } from "@/features/payment/paymentService";
import {
  createOrder,
  type StorePaymentChoice,
} from "@/features/checkout/checkoutApiService";
import { useCartStoreGroups } from "@/features/cart";
import { useStartConversation } from "@/features/messages/useMessages";
import { storeService } from "@/features/stores/storeService";
import type { StorePaymentMethod } from "@/infrastructure/data-source/StoreDataSource";
import { useAddressStore } from "@/store/addressStore";
import { useAuthStore } from "@/store/authStore";
import { Icon, type IconName } from "@/icons";
import { useCartStore } from "@/store/cartStore";
import { resolveMediaUrl, isSvgUrl } from "@/utils/resolveMediaUrl";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Image } from "expo-image";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueries, useQueryClient } from "@tanstack/react-query";

const CARD_NUMBER_LENGTH = 19;
const CARD_EXPIRY_LENGTH = 5;
const CARD_CVV_LENGTH = 3;

/** Provider du paiement à la livraison, tel que l'API le reconnaît. */
const COD_PROVIDER = "cash_on_delivery";

/** Groupe des articles dont la boutique est inconnue (paniers d'avant la migration). */
const UNKNOWN_KEY = "__unknown__";

type Choice = {
  provider: string;
  phone: string;
  cardNumber: string;
  cardExpiry: string;
  cardCvv: string;
  cardName: string;
};

const EMPTY_CHOICE: Omit<Choice, "provider"> = {
  phone: "",
  cardNumber: "",
  cardExpiry: "",
  cardCvv: "",
  cardName: "",
};

function detectCardBrand(number: string): string | null {
  const clean = number.replace(/\s/g, "");
  if (/^4/.test(clean)) return "VISA";
  if (/^5[1-5]/.test(clean)) return "Mastercard";
  if (/^3[47]/.test(clean)) return "Amex";
  if (/^6(?:011|5)/.test(clean)) return "Discover";
  if (/^35(?:2[89]|[3-8])/.test(clean)) return "JCB";
  if (/^3(?:0[0-5]|[68])/.test(clean)) return "Diners";
  return null;
}

function formatCardNumber(text: string) {
  const digits = text.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatExpiry(text: string) {
  const digits = text.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 2) return digits.slice(0, 2) + "/" + digits.slice(2);
  return digits;
}

function iconForType(type: StorePaymentMethod["type"]): IconName {
  if (type === "mobile_money") return "cellphone";
  if (type === "card") return "creditCard";
  if (type === "wallet") return "wallet";
  return "cash";
}

export default function PaymentScreen() {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Garde : un invité ne peut pas passer commande. La redirection est posée
  // ici, mais le `return null` attend que tous les hooks aient été appelés —
  // sortir avant changerait leur nombre entre deux rendus.
  React.useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [isAuthenticated, router]);

  const allItems = useCartStore((s) => s.items);
  const items = useMemo(() => allItems.filter((i) => i.selected), [allItems]);
  const groups = useCartStoreGroups(items);
  const clearSelected = useCartStore((s) => s.clearSelected);
  const defaultAddressId = useAddressStore((s) => s.defaultId);
  const queryClient = useQueryClient();
  const startConversation = useStartConversation();

  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  // Un moyen de paiement par boutique : le nombre de requêtes suit le panier,
  // d'où `useQueries`. La clé est celle de `useStorePaymentMethods` pour
  // réutiliser le cache déjà rempli par l'écran boutique.
  const storeIds = useMemo(
    () => groups.map((g) => g.storeId).filter((id): id is string => !!id),
    [groups],
  );
  const results = useQueries({
    queries: storeIds.map((id) => ({
      queryKey: ["store", id, "payment-methods"],
      queryFn: () => storeService.getStorePaymentMethods(id),
    })),
  });

  const byStore = new Map(storeIds.map((id, i) => [id, results[i]]));
  const isLoading = results.some((r) => r.isLoading);

  /**
   * Le paiement à la livraison ne demande aucune configuration au commerçant :
   * l'API l'autorise toujours, il est donc ajouté d'office quand la boutique
   * n'en propose pas — c'est le repli qui garantit qu'un panier reste payable.
   */
  const methodsFor = (storeId: string | null): StorePaymentMethod[] => {
    const cod: StorePaymentMethod = {
      id: "cod-fallback",
      type: "cash_on_delivery",
      provider: COD_PROVIDER,
      displayName: t("payment.cod"),
      description: t("payment.codHint"),
      logoUrl: null,
      iconUrl: null,
      instructions: null,
    };
    const fetched = storeId ? (byStore.get(storeId)?.data ?? []) : [];
    if (fetched.some((m) => m.type === "cash_on_delivery")) return fetched;
    return [...fetched, cod];
  };

  const keyOf = (storeId: string | null) => storeId ?? UNKNOWN_KEY;

  const providerFor = (storeId: string | null) => {
    const key = keyOf(storeId);
    return choices[key]?.provider ?? methodsFor(storeId)[0]?.provider ?? "";
  };

  const patch = (storeId: string | null, values: Partial<Choice>) => {
    const key = keyOf(storeId);
    const current: Choice = choices[key] ?? { ...EMPTY_CHOICE, provider: providerFor(storeId) };
    setChoices((prev) => ({ ...prev, [key]: { ...current, ...values } }));
  };

  const isGroupValid = (storeId: string | null) => {
    const provider = providerFor(storeId);
    if (!provider) return false;
    const method = methodsFor(storeId).find((m) => m.provider === provider);
    const choice = choices[keyOf(storeId)];
    if (method?.type === "mobile_money") {
      // L'opérateur EST la méthode sélectionnée : il ne reste que le numéro.
      return (choice?.phone ?? "").replace(/\D/g, "").length >= 8;
    }
    if (method?.type === "card") {
      return (
        (choice?.cardNumber ?? "").replace(/\s/g, "").length === 16 &&
        (choice?.cardExpiry ?? "").length === 5 &&
        (choice?.cardCvv ?? "").length >= 3 &&
        (choice?.cardName ?? "").trim().length >= 2
      );
    }
    return true;
  };

  const canPay =
    groups.length > 0 && !!defaultAddressId && groups.every((g) => isGroupValid(g.storeId));

  const total = items.reduce((sum, i) => sum + i.priceUsd * i.quantity, 0);

  const openStoreChat = async (storeId: string, storeName: string | null) => {
    try {
      const conversation = await startConversation.mutateAsync({
        storeId,
        subject: storeName ?? undefined,
      });
      router.push("/messages/" + conversation.id);
    } catch {
      setPayError(t("checkout.contactStoreFailed"));
    }
  };

  const handlePay = async () => {
    setIsProcessing(true);
    setPayError(null);
    try {
      const payments: StorePaymentChoice[] = groups
        .filter((g) => !!g.storeId)
        .map((g) => {
          const provider = providerFor(g.storeId);
          const method = methodsFor(g.storeId).find((m) => m.provider === provider);
          const choice = choices[keyOf(g.storeId)];
          return {
            storeId: g.storeId!,
            paymentMethod: provider,
            phoneNumber:
              method?.type === "mobile_money" ? choice?.phone.replace(/\D/g, "") : undefined,
          };
        });

      const result = await createOrder({
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        shippingAddressId: defaultAddressId ?? "",
        payments,
        // Repli pour les articles dont la boutique est inconnue : l'API les
        // rattache à la boutique système, dont le client n'a pas l'identifiant.
        paymentMethod: COD_PROVIDER,
      });

      // Une commande par boutique : chaque paiement s'initialise séparément.
      // En cas d'échec on ne vide pas le panier et on nomme la boutique fautive.
      for (const order of result.orders) {
        const method = order.paymentMethod ?? COD_PROVIDER;
        if (method === COD_PROVIDER || method === "cod") continue;
        const psp = await paymentService.initializePayment(order.id, method);
        if (!psp || psp.status === "failed") {
          throw new Error(
            `${order.storeName ?? t("cart.unknownStore")} : ${psp?.message ?? t("checkout.paymentError")}`,
          );
        }
      }

      clearSelected();
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      router.replace({
        pathname: "/checkout/success",
        params: {
          orderNumbers: result.orders.map((o) => o.orderNumber).join(","),
        },
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : t("checkout.paymentError");
      setPayError(
        message.includes("401")
          ? "Session expirée - reconnectez-vous pour passer la commande"
          : message,
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isAuthenticated) return null;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t("checkout.paymentMethod")} />
        <StatusState
          status="loading"
          title={t("checkout.loadingPayment")}
          hint={t("checkout.loadingPaymentHint")}
        />
      </View>
    );
  }

  return (
    <KeyboardScreen style={styles.container}>
      <ScreenHeader title={t("checkout.paymentMethod")} />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
      >
        {groups.map((group) => {
          const key = keyOf(group.storeId);
          const query = group.storeId ? byStore.get(group.storeId) : undefined;
          const methods = methodsFor(group.storeId);
          const activeProvider = providerFor(group.storeId);
          const choice = choices[key];
          const groupSubtotal = group.items.reduce(
            (sum, i) => sum + i.priceUsd * i.quantity,
            0,
          );
          const onlyCod = methods.length === 1 && methods[0].provider === COD_PROVIDER;

          return (
            <View key={key} style={styles.storeBlock}>
              <View style={styles.storeHead}>
                <Icon name="store" size={16} color={colors.secondaryDark} />
                <Text style={styles.storeName} numberOfLines={1}>
                  {group.storeName ?? t("cart.unknownStore")}
                </Text>
                <Price priceUsd={groupSubtotal} size="sm" />
              </View>

              {query?.isError ? (
                <Pressable style={styles.storeNotice} onPress={() => query.refetch()}>
                  <Icon name="return" size={14} color={colors.danger} />
                  <Text style={styles.storeNoticeError}>{t("checkout.paymentError")}</Text>
                </Pressable>
              ) : onlyCod && group.storeId ? (
                <Text style={styles.storeNoticeText}>{t("checkout.storeNoPaymentMethod")}</Text>
              ) : null}

              {methods.map((m) => {
                const active = activeProvider === m.provider;
                const logoUri = resolveMediaUrl(m.logoUrl);
                const useLogo = !!logoUri && !isSvgUrl(m.logoUrl);
                return (
                  <View key={m.id}>
                    <Pressable
                      style={[styles.method, active && styles.methodActive]}
                      onPress={() => patch(group.storeId, { provider: m.provider })}
                    >
                      <View style={styles.methodIcon}>
                        {useLogo ? (
                          <Image
                            source={{ uri: logoUri }}
                            style={styles.methodLogo}
                            contentFit="contain"
                            accessibilityLabel={m.displayName}
                          />
                        ) : (
                          <Icon
                            name={iconForType(m.type)}
                            size={24}
                            color={active ? colors.primary : colors.text}
                          />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.methodLabel}>{m.displayName}</Text>
                        {m.description ? (
                          <Text style={styles.methodHint} numberOfLines={2}>
                            {m.description}
                          </Text>
                        ) : null}
                      </View>
                      <View style={[styles.radio, active && styles.radioOn]}>
                        {active && <View style={styles.radioDot} />}
                      </View>
                    </Pressable>

                    {active && m.type === "mobile_money" && (
                      <View style={styles.formSection}>
                        <Text style={styles.formLabel}>{t("checkout.phoneNumber")}*</Text>
                        <TextInput
                          style={styles.cardInput}
                          value={choice?.phone ?? ""}
                          onChangeText={(v) => patch(group.storeId, { phone: v })}
                          placeholder="90 00 00 00"
                          placeholderTextColor={colors.textMuted}
                          keyboardType="phone-pad"
                          maxLength={15}
                        />
                        {m.instructions ? (
                          <Text style={styles.methodHint}>{m.instructions}</Text>
                        ) : null}
                      </View>
                    )}

                    {active && m.type === "card" && (
                      <View style={styles.formSection}>
                        <View style={styles.cardHeaderRow}>
                          <Text style={styles.formLabel}>{t("checkout.cardNumber")}*</Text>
                          {detectCardBrand(choice?.cardNumber ?? "") && (
                            <View style={styles.brandBadge}>
                              <Text style={styles.brandBadgeText}>
                                {detectCardBrand(choice?.cardNumber ?? "")}
                              </Text>
                            </View>
                          )}
                        </View>
                        <TextInput
                          style={styles.cardInput}
                          value={choice?.cardNumber ?? ""}
                          onChangeText={(v) =>
                            patch(group.storeId, { cardNumber: formatCardNumber(v) })
                          }
                          placeholder="1234 5678 9012 3456"
                          placeholderTextColor={colors.textMuted}
                          keyboardType="number-pad"
                          maxLength={CARD_NUMBER_LENGTH}
                        />
                        <View style={styles.cardRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.formLabel}>{t("checkout.cardExpiry")}*</Text>
                            <TextInput
                              style={styles.cardInput}
                              value={choice?.cardExpiry ?? ""}
                              onChangeText={(v) =>
                                patch(group.storeId, { cardExpiry: formatExpiry(v) })
                              }
                              placeholder="MM/AA"
                              placeholderTextColor={colors.textMuted}
                              keyboardType="number-pad"
                              maxLength={CARD_EXPIRY_LENGTH}
                            />
                          </View>
                          <View style={{ width: spacing.giant }}>
                            <Text style={styles.formLabel}>CVV*</Text>
                            <TextInput
                              style={styles.cardInput}
                              value={choice?.cardCvv ?? ""}
                              onChangeText={(v) =>
                                patch(group.storeId, {
                                  cardCvv: v.replace(/\D/g, "").slice(0, 3),
                                })
                              }
                              placeholder="123"
                              placeholderTextColor={colors.textMuted}
                              keyboardType="number-pad"
                              maxLength={CARD_CVV_LENGTH}
                            />
                          </View>
                        </View>
                        <Text style={styles.formLabel}>{t("checkout.cardHolder")}*</Text>
                        <TextInput
                          style={styles.cardInput}
                          value={choice?.cardName ?? ""}
                          onChangeText={(v) => patch(group.storeId, { cardName: v })}
                          placeholder="JEAN DUPONT"
                          placeholderTextColor={colors.textMuted}
                          autoCapitalize="characters"
                        />
                      </View>
                    )}
                  </View>
                );
              })}

              {/* La boutique n'a rien configuré : payer à la livraison reste
                  possible, et le client peut aussi poser sa question. */}
              {onlyCod && group.storeId ? (
                <Button
                  label={t("checkout.contactStore")}
                  variant="outline"
                  size="md"
                  fullWidth
                  loading={startConversation.isPending}
                  onPress={() => openStoreChat(group.storeId!, group.storeName)}
                />
              ) : null}
            </View>
          );
        })}

        <View style={styles.secure}>
          <Icon name="lock" size={16} color={colors.secondary} />
          <Text style={styles.secureText}>
            {t("product.buyerProtection")} · {t("checkout.securePayment")}
          </Text>
        </View>

        {payError ? <Text style={styles.errorText}>{payError}</Text> : null}

        <View style={styles.confirmCard}>
          <Text style={styles.confirmTitle}>{t("checkout.confirmPayment")}</Text>
          <Text style={styles.confirmText}>
            {t("checkout.ordersWillBeCreated", { count: groups.length })}
          </Text>
          <Text style={styles.confirmText}>{t("checkout.afterValidation")}</Text>
        </View>
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: insets.bottom + spacing.sm }]}>
        <View>
          <Text style={styles.barLabel}>{t("common.total")}</Text>
          <Price priceUsd={total} size="md" />
        </View>
        <Button
          label={isProcessing ? t("common.loading") : t("checkout.placeOrder")}
          size="lg"
          onPress={handlePay}
          disabled={!canPay || isProcessing}
          loading={isProcessing}
          style={{ flex: 1, marginLeft: spacing.lg }}
        />
      </View>
    </KeyboardScreen>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    storeBlock: { marginBottom: spacing.lg },
    storeHead: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    storeName: { flex: 1, fontSize: fontSize.md, fontWeight: "800", color: colors.text },
    storeNotice: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginBottom: spacing.sm },
    storeNoticeError: { fontSize: fontSize.xs, color: colors.danger },
    storeNoticeText: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      marginBottom: spacing.sm,
    },
    method: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      marginBottom: spacing.md,
      borderWidth: 1.5,
      borderColor: colors.surface,
    },
    methodActive: { borderColor: colors.primary },
    methodIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    methodLogo: { width: 36, height: 36, borderRadius: 8 },
    methodLabel: { fontSize: fontSize.md, fontWeight: "700", color: colors.text },
    methodHint: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: colors.borderStrong,
      alignItems: "center",
      justifyContent: "center",
    },
    radioOn: { borderColor: colors.primary },
    radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
    secure: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.md,
      justifyContent: "center",
    },
    secureText: { fontSize: fontSize.sm, color: colors.textSecondary },
    confirmCard: {
      marginTop: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.xs,
    },
    confirmTitle: { fontSize: fontSize.md, fontWeight: "800", color: colors.text },
    confirmText: { fontSize: fontSize.sm, color: colors.textSecondary },
    formSection: {
      backgroundColor: colors.background,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
      gap: spacing.sm,
    },
    formLabel: { fontSize: fontSize.sm, fontWeight: "600", color: colors.text },
    cardInput: {
      height: 48,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      fontSize: fontSize.md,
      color: colors.text,
      backgroundColor: colors.surface,
    },
    cardRow: { flexDirection: "row", gap: spacing.md },
    cardHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    brandBadge: {
      backgroundColor: colors.primarySoft,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
    },
    brandBadgeText: { fontSize: fontSize.xs, fontWeight: "800", color: colors.primary },
    errorText: {
      marginTop: spacing.sm,
      color: colors.danger,
      fontSize: fontSize.sm,
      textAlign: "center",
    },
    bar: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
    },
    barLabel: { fontSize: fontSize.xs, color: colors.textMuted },
  });
