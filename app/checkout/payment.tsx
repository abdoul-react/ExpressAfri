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
import { useCheckout } from "@/features/checkout";
import { calculateSubtotal } from "@/features/checkout";
import {
  usePaymentFlow,
  isChoiceValid,
  COD_PROVIDER,
  PaymentProgress,
  StorePaymentHeader,
  PaymentMethodList,
  MobileMoneyForm,
  CardPaymentForm,
  CodConfirmation,
} from "@/features/checkout/payment";
import { useStartConversation } from "@/features/messages/useMessages";
import { storeService } from "@/features/stores/storeService";
import type { StorePaymentMethod } from "@/infrastructure/data-source/StoreDataSource";
import { useAddressStore, getDefaultAddress } from "@/store/addressStore";
import { useAuthStore } from "@/store/authStore";
import { COUNTRIES } from "@/data/countries";
import { Icon } from "@/icons";
import { useCartStore } from "@/store/cartStore";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { BackHandler, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueries, useQueryClient } from "@tanstack/react-query";

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

  const { items, groups, quotesByStore } = useCheckout();
  const clearSelected = useCartStore((s) => s.clearSelected);
  const defaultAddressId = useAddressStore((s) => s.defaultId);
  const defaultAddress = useAddressStore(getDefaultAddress);
  const queryClient = useQueryClient();
  const startConversation = useStartConversation();

  const flow = usePaymentFlow(groups);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStore, setProcessingStore] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  // Clé d'idempotence stable pour TOUTE la tentative : un double-tap ou un
  // retry réseau rejoue la même clé et ne recrée pas les commandes.
  const idempotencyKey = useRef(
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  ).current;

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

  const providerFor = (storeId: string | null) => {
    const key = flow.keyOf(storeId);
    return (
      flow.choices[key]?.provider || methodsFor(storeId)[0]?.provider || ""
    );
  };

  const methodOf = (storeId: string | null) => {
    const provider = providerFor(storeId);
    return methodsFor(storeId).find((m) => m.provider === provider);
  };

  // Retour matériel : détails → méthodes → boutique précédente → écran précédent
  useFocusEffect(
    React.useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () =>
        flow.goBack(),
      );
      return () => sub.remove();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [flow.stepIndex, flow.subStep]),
  );

  const group = flow.currentGroup;
  const currentMethod = group ? methodOf(group.storeId) : undefined;
  const currentChoice = group
    ? flow.choices[flow.keyOf(group.storeId)]
    : undefined;
  const currentValid = isChoiceValid(currentMethod, currentChoice);
  const quote = group?.storeId ? quotesByStore.get(group.storeId) : undefined;
  const groupSubtotal = group ? calculateSubtotal(group.items) : 0;
  const onlyCod =
    group != null &&
    methodsFor(group.storeId).length === 1 &&
    methodsFor(group.storeId)[0].provider === COD_PROVIDER;

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

  /** Dernière boutique validée : créer les commandes puis initialiser chaque paiement. */
  const handlePay = async () => {
    setIsProcessing(true);
    setPayError(null);
    try {
      const payments: StorePaymentChoice[] = groups
        .filter((g) => !!g.storeId)
        .map((g) => {
          const provider = providerFor(g.storeId);
          const method = methodsFor(g.storeId).find(
            (m) => m.provider === provider,
          );
          const choice = flow.choices[flow.keyOf(g.storeId)];
          // Numéro complet indicatif inclus : le commerçant rapproche ses
          // encaissements sans deviner le pays du payeur.
          const dial = COUNTRIES.find(
            (c) =>
              c.code ===
              (choice?.phoneCountry || defaultAddress?.countryCode || ""),
          )?.dial;
          const rawPhone = (choice?.phone ?? "").replace(/\D/g, "");
          return {
            storeId: g.storeId!,
            paymentMethod: provider,
            phoneNumber:
              method?.type === "mobile_money" && rawPhone
                ? `${dial ?? ""}${rawPhone}`
                : undefined,
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
        idempotencyKey,
      });

      // Une commande par boutique : chaque paiement s'initialise séparément.
      // En cas d'échec on ne vide pas le panier et on nomme la boutique fautive.
      for (const order of result.orders) {
        const method = order.paymentMethod ?? COD_PROVIDER;
        if (method === COD_PROVIDER || method === "cod") continue;
        setProcessingStore(order.storeName ?? t("cart.unknownStore"));
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
      const message =
        e instanceof Error ? e.message : t("checkout.paymentError");
      setPayError(
        message.includes("401")
          ? "Session expirée - reconnectez-vous pour passer la commande"
          : message,
      );
    } finally {
      setIsProcessing(false);
      setProcessingStore(null);
    }
  };

  const onContinue = () => {
    if (flow.subStep === "method") {
      // COD / wallet : rien à saisir, on passe directement à la suite
      if (
        currentMethod &&
        currentMethod.type !== "mobile_money" &&
        currentMethod.type !== "card"
      ) {
        // Sélection implicite si l'utilisateur n'a pas touché la liste
        flow.patch(group?.storeId ?? null, { provider: currentMethod.provider });
        flow.goToDetails();
        return;
      }
      flow.patch(group?.storeId ?? null, {
        provider: currentMethod?.provider ?? "",
      });
      flow.goToDetails();
      return;
    }
    // Sous-étape détails validée
    if (flow.isLastStep) {
      void handlePay();
    } else {
      flow.goNext();
    }
  };

  const continueDisabled =
    !group ||
    (flow.subStep === "method" ? !currentMethod : !currentValid) ||
    (flow.isLastStep && flow.subStep === "details" && !defaultAddressId);

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

  if (!group) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t("checkout.paymentMethod")} />
        <StatusState
          status="empty"
          title={t("checkout.noItems")}
          hint={t("checkout.noItemsHint")}
          actionLabel={t("checkout.backToCart")}
          onAction={() => router.replace("/")}
        />
      </View>
    );
  }

  // Écran d'attente pendant l'initialisation des paiements par boutique
  if (isProcessing && processingStore) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t("checkout.paymentMethod")} />
        <StatusState
          status="loading"
          title={t("checkout.processingStorePayment", {
            store: processingStore,
          })}
          hint={t("checkout.afterValidation")}
        />
      </View>
    );
  }

  const storeName = group.storeName ?? t("cart.unknownStore");
  const query = group.storeId ? byStore.get(group.storeId) : undefined;

  return (
    <KeyboardScreen style={styles.container}>
      <ScreenHeader
        title={t("checkout.paymentMethod")}
        onBack={() => {
          if (!flow.goBack()) router.back();
        }}
      />
      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: 90 + insets.bottom,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <PaymentProgress
          current={flow.stepIndex}
          total={groups.length}
          storeName={storeName}
        />

        <StorePaymentHeader
          storeName={storeName}
          subtotal={groupSubtotal}
          shippingCost={quote?.shippingCost ?? null}
          isFreeShipping={quote?.isFree ?? false}
        />

        {query?.isError ? (
          <Text
            style={styles.errorText}
            onPress={() => query.refetch()}
          >
            {t("checkout.paymentError")}
          </Text>
        ) : null}

        {flow.subStep === "method" ? (
          <>
            {onlyCod && group.storeId ? (
              <Text style={styles.storeNoticeText}>
                {t("checkout.storeNoPaymentMethod")}
              </Text>
            ) : null}
            <PaymentMethodList
              methods={methodsFor(group.storeId)}
              activeProvider={providerFor(group.storeId)}
              onSelect={(provider) =>
                flow.patch(group.storeId, { provider })
              }
            />
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
          </>
        ) : currentMethod?.type === "mobile_money" ? (
          <MobileMoneyForm
            method={currentMethod}
            countryCode={
              currentChoice?.phoneCountry ||
              defaultAddress?.countryCode ||
              null
            }
            onChangeCountry={(code) =>
              flow.patch(group.storeId, { phoneCountry: code })
            }
            phone={currentChoice?.phone ?? ""}
            onChangePhone={(v) => flow.patch(group.storeId, { phone: v })}
          />
        ) : currentMethod?.type === "card" ? (
          <CardPaymentForm
            choice={currentChoice}
            onPatch={(values) => flow.patch(group.storeId, values)}
          />
        ) : (
          <CodConfirmation />
        )}

        <View style={styles.secure}>
          <Icon name="lock" size={16} color={colors.secondary} />
          <Text style={styles.secureText}>
            {t("product.buyerProtection")} · {t("checkout.securePayment")}
          </Text>
        </View>

        {payError ? <Text style={styles.errorText}>{payError}</Text> : null}

        {flow.isLastStep && flow.subStep === "details" ? (
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>
              {t("checkout.confirmPayment")}
            </Text>
            <Text style={styles.confirmText}>
              {t("checkout.ordersWillBeCreated", { count: groups.length })}
            </Text>
            <Text style={styles.confirmText}>
              {t("checkout.afterValidation")}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: insets.bottom + spacing.sm }]}>
        <View>
          <Text style={styles.barLabel}>{t("common.total")}</Text>
          <Price priceUsd={total} size="md" />
        </View>
        <Button
          label={
            isProcessing
              ? t("common.loading")
              : flow.subStep === "method"
                ? t("common.continue")
                : flow.isLastStep
                  ? t("checkout.confirmAndPay")
                  : t("checkout.continueToNext")
          }
          size="lg"
          onPress={onContinue}
          disabled={continueDisabled || isProcessing}
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
    storeNoticeText: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      marginBottom: spacing.sm,
    },
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
    confirmTitle: {
      fontSize: fontSize.md,
      fontWeight: "800",
      color: colors.text,
    },
    confirmText: { fontSize: fontSize.sm, color: colors.textSecondary },
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
