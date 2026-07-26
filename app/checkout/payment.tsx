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
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import React, { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueries, useQueryClient } from "@tanstack/react-query";

/**
 * Réconciliation post-navigateur : le webhook PSP peut mettre quelques
 * secondes — on interroge le statut serveur (qui interroge lui-même le PSP
 * quand l'adaptateur le permet) avant de conclure. `pending` n'est pas un
 * échec : la commande reste, le webhook la confirmera.
 */
async function pollPaymentStatus(
  orderId: string,
): Promise<"captured" | "pending" | "failed"> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await paymentService.getOrderPaymentStatus(orderId);
      if (res.status === "captured" || res.status === "authorized")
        return "captured";
      if (res.status === "failed") return "failed";
    } catch {
      // Réseau instable au retour du navigateur : on réessaie
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return "pending";
}

export default function PaymentScreen() {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
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

  // La machine ne sert plus qu'à porter les choix (et leur reset quand le
  // panier change) : la navigation entre boutiques est un pager libre.
  const flow = usePaymentFlow(groups);
  const [pageIndex, setPageIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStore, setProcessingStore] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const pagerRef = useRef<ScrollView>(null);

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

  const groupValid = (storeId: string | null) =>
    isChoiceValid(methodOf(storeId), flow.choices[flow.keyOf(storeId)]);

  const allValid = groups.every((g) => groupValid(g.storeId));
  const canPay = groups.length > 0 && !!defaultAddressId && allValid;

  const total = items.reduce((sum, i) => sum + i.priceUsd * i.quantity, 0);

  const goToPage = (i: number) => {
    pagerRef.current?.scrollTo({ x: i * width, animated: true });
    setPageIndex(i);
  };

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

  /** Toutes les boutiques validées : créer les commandes puis initialiser chaque paiement. */
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
      // Deep link de retour : le PSP renvoie le client dans l'app après le
      // paiement sur sa page hébergée.
      const returnUrl = Linking.createURL("payment-return");
      let anyPending = false;
      for (const order of result.orders) {
        const method = order.paymentMethod ?? COD_PROVIDER;
        if (method === COD_PROVIDER || method === "cod") continue;
        setProcessingStore(order.storeName ?? t("cart.unknownStore"));
        const psp = await paymentService.initializePayment(
          order.id,
          method,
          returnUrl,
        );
        if (!psp || psp.status === "failed") {
          throw new Error(
            `${order.storeName ?? t("cart.unknownStore")} : ${psp?.message ?? t("checkout.paymentError")}`,
          );
        }

        // Page de paiement hébergée (CinetPay, Wave, Stripe…) : on l'ouvre et
        // on attend le retour du client dans l'app.
        if (psp.paymentUrl) {
          await WebBrowser.openAuthSessionAsync(psp.paymentUrl, returnUrl);
          // Retour (ou fermeture manuelle) : réconcilier le statut côté
          // serveur — le webhook peut prendre quelques secondes.
          const status = await pollPaymentStatus(order.id);
          if (status === "failed") {
            throw new Error(
              `${order.storeName ?? t("cart.unknownStore")} : ${t("checkout.paymentError")}`,
            );
          }
          if (status === "pending") anyPending = true;
        } else if (psp.status === "pending") {
          // Pas de page web (MTN MoMo : validation sur le téléphone) — le
          // statut se confirme par polling, la commande reste en attente.
          const status = await pollPaymentStatus(order.id);
          if (status === "failed") {
            throw new Error(
              `${order.storeName ?? t("cart.unknownStore")} : ${t("checkout.paymentError")}`,
            );
          }
          if (status === "pending") anyPending = true;
        }
      }

      clearSelected();
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      router.replace({
        pathname: "/checkout/success",
        params: {
          orderNumbers: result.orders.map((o) => o.orderNumber).join(","),
          ...(anyPending ? { pending: "1" } : {}),
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

  if (groups.length === 0) {
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

  return (
    <KeyboardScreen style={styles.container}>
      <ScreenHeader title={t("checkout.paymentMethod")} />

      {/* Indicateur : une pastille par boutique, tappable pour y sauter.
          Verte = complète, contour = en cours, grise = à faire. */}
      {groups.length > 1 && (
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>
            {t("checkout.paymentStep", {
              current: pageIndex + 1,
              total: groups.length,
              store:
                groups[pageIndex]?.storeName ?? t("cart.unknownStore"),
            })}
          </Text>
          <View style={styles.dots}>
            {groups.map((g, i) => {
              const done = groupValid(g.storeId);
              const current = i === pageIndex;
              return (
                <Pressable
                  key={flow.keyOf(g.storeId)}
                  hitSlop={8}
                  onPress={() => goToPage(i)}
                  style={[
                    styles.dot,
                    done && styles.dotDone,
                    current && styles.dotCurrent,
                  ]}
                >
                  {done && (
                    <Icon name="check" size={9} color={colors.white} strokeWidth={3.5} />
                  )}
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.swipeHint}>{t("checkout.swipeHint")}</Text>
        </View>
      )}

      {/* Pager horizontal : une page par boutique, glissement libre —
          l'utilisateur règle ses boutiques dans l'ordre qu'il veut. */}
      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onMomentumScrollEnd={(e) =>
          setPageIndex(
            Math.round(e.nativeEvent.contentOffset.x / Math.max(1, width)),
          )
        }
      >
        {groups.map((group) => {
          const storeName = group.storeName ?? t("cart.unknownStore");
          const query = group.storeId ? byStore.get(group.storeId) : undefined;
          const method = methodOf(group.storeId);
          const choice = flow.choices[flow.keyOf(group.storeId)];
          const quote = group.storeId
            ? quotesByStore.get(group.storeId)
            : undefined;
          const groupSubtotal = calculateSubtotal(group.items);
          const methods = methodsFor(group.storeId);
          const onlyCod =
            methods.length === 1 && methods[0].provider === COD_PROVIDER;

          return (
            <ScrollView
              key={flow.keyOf(group.storeId)}
              style={{ width }}
              contentContainerStyle={{
                padding: spacing.lg,
                paddingBottom: 100 + insets.bottom,
              }}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              <StorePaymentHeader
                storeName={storeName}
                subtotal={groupSubtotal}
                shippingCost={quote?.shippingCost ?? null}
                isFreeShipping={quote?.isFree ?? false}
              />

              {query?.isError ? (
                <Text style={styles.errorText} onPress={() => query.refetch()}>
                  {t("checkout.paymentError")}
                </Text>
              ) : null}

              {onlyCod && group.storeId ? (
                <Text style={styles.storeNoticeText}>
                  {t("checkout.storeNoPaymentMethod")}
                </Text>
              ) : null}

              <PaymentMethodList
                methods={methods}
                activeProvider={providerFor(group.storeId)}
                onSelect={(provider) =>
                  flow.patch(group.storeId, { provider })
                }
              />

              {/* Formulaire dédié à la méthode retenue, sur la même page */}
              {method?.type === "mobile_money" ? (
                <MobileMoneyForm
                  method={method}
                  countryCode={
                    choice?.phoneCountry ||
                    defaultAddress?.countryCode ||
                    null
                  }
                  onChangeCountry={(code) =>
                    flow.patch(group.storeId, { phoneCountry: code })
                  }
                  phone={choice?.phone ?? ""}
                  onChangePhone={(v) =>
                    flow.patch(group.storeId, { phone: v })
                  }
                />
              ) : method?.type === "card" ? (
                <CardPaymentForm
                  choice={choice}
                  onPatch={(values) => flow.patch(group.storeId, values)}
                />
              ) : method ? (
                <CodConfirmation />
              ) : null}

              {onlyCod && group.storeId ? (
                <View style={{ marginTop: spacing.md }}>
                  <Button
                    label={t("checkout.contactStore")}
                    variant="outline"
                    size="md"
                    fullWidth
                    loading={startConversation.isPending}
                    onPress={() =>
                      openStoreChat(group.storeId!, group.storeName)
                    }
                  />
                </View>
              ) : null}

              <View style={styles.secure}>
                <Icon name="lock" size={16} color={colors.secondary} />
                <Text style={styles.secureText}>
                  {t("product.buyerProtection")} · {t("checkout.securePayment")}
                </Text>
              </View>
            </ScrollView>
          );
        })}
      </ScrollView>

      {payError ? <Text style={styles.errorText}>{payError}</Text> : null}

      <View style={[styles.bar, { paddingBottom: insets.bottom + spacing.sm }]}>
        <View>
          <Text style={styles.barLabel}>{t("common.total")}</Text>
          <Price priceUsd={total} size="md" />
        </View>
        <Button
          label={
            isProcessing
              ? t("common.loading")
              : allValid
                ? t("checkout.confirmAndPay")
                : t("checkout.completeAllStores", {
                    remaining: groups.filter((g) => !groupValid(g.storeId))
                      .length,
                  })
          }
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
    progressRow: {
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      gap: 6,
    },
    progressText: {
      fontSize: fontSize.md,
      fontWeight: "800",
      color: colors.text,
      textAlign: "center",
    },
    dots: { flexDirection: "row", gap: spacing.sm },
    dot: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    dotDone: { backgroundColor: colors.secondary },
    dotCurrent: {
      borderWidth: 2,
      borderColor: colors.primary,
    },
    swipeHint: { fontSize: fontSize.xs, color: colors.textMuted },
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
