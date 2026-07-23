import {
  Button,
  EmptyState,
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
import { usePaymentMethods } from "@/features/payment";
import { createOrder } from "@/features/checkout/checkoutApiService";
import { useAddressStore } from "@/store/addressStore";
import { Icon } from "@/icons";
import { useCartStore } from "@/store/cartStore";
import { useSettingsStore } from "@/store/settingsStore";
import { resolveMediaUrl, isSvgUrl } from "@/utils/resolveMediaUrl";
import type { PaymentMethodId } from "@/types";
import { useRouter } from "expo-router";
import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Image } from "expo-image";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";

const CARD_NUMBER_LENGTH = 19;
const CARD_EXPIRY_LENGTH = 5;
const CARD_CVV_LENGTH = 3;

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

export default function PaymentScreen() {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const countryCode = useSettingsStore((s) => s.country);
  const { methods, isLoading, error, refetch } = usePaymentMethods();
  const mobileMoneyMethods = methods.filter(
    (m) =>
      m.type === 'mobile-money' &&
      (m.supportedCountries?.length === 0 || m.supportedCountries?.includes(countryCode))
  );

  const [method, setMethod] = useState<PaymentMethodId | string>('');
  const [operator, setOperator] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  // Valeur effective : méthode choisie par l'utilisateur ou première de la liste
  const effectiveMethod = method || methods[0]?.id || '';
  // Valeur effective : opérateur choisi ou premier opérateur mobile money disponible
  const effectiveOperator = operator || mobileMoneyMethods[0]?.id || '';

  // Card form state
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardName, setCardName] = useState("");

  const expiryRef = useRef<TextInput>(null);
  const cvvRef = useRef<TextInput>(null);
  const nameRef = useRef<TextInput>(null);

  const clearSelected = useCartStore((s) => s.clearSelected);
  const queryClient = useQueryClient();
  const subtotal = useCartStore((s) =>
    s.items
      .filter((i) => i.selected)
      .reduce((sum, i) => sum + i.priceUsd * i.quantity, 0),
  );
  const defaultAddressId = useAddressStore((s) => s.defaultId);
  const total = subtotal; // Le calcul final est fait côté serveur

  const formatCardNumber = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  const formatExpiry = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 2) return digits.slice(0, 2) + "/" + digits.slice(2);
    return digits;
  };

  const isCardValid =
    cardNumber.replace(/\s/g, "").length === 16 &&
    cardExpiry.length === 5 &&
    cardCvv.length >= 3 &&
    cardName.trim().length >= 2;

  const isMobileMoneyValid = effectiveOperator && phoneNumber.trim().length >= 8;

  const selectedMethodObj = methods.find((m) => m.id === effectiveMethod);
  const isMobileMoney = selectedMethodObj?.type === 'mobile-money';
  const isCard = effectiveMethod === "card";
  const canPay = isCard ? isCardValid : isMobileMoney ? isMobileMoneyValid : !!effectiveMethod;

  const handlePay = async () => {
    setIsProcessing(true);
    setPayError(null);
    try {
      const cartItems = useCartStore.getState().items.filter((i) => i.selected);

      const order = await createOrder({
        items: cartItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        shippingAddressId: defaultAddressId ?? '',
        paymentMethod: effectiveMethod,
      });

      // Ne retirer que les articles achetés (les non sélectionnés restent au panier)
      clearSelected();
      // La nouvelle commande doit apparaître immédiatement dans « Mes commandes »
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      router.replace({
        pathname: "/checkout/success",
        params: order?.id ? { orderId: order.id, orderNumber: order.orderNumber ?? '' } : {},
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erreur lors du paiement';
      setPayError(
        message.includes('401')
          ? 'Session expirée — reconnectez-vous pour passer la commande'
          : message,
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // selectedMethodObj déjà défini plus haut

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

  if (error) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t("checkout.paymentMethod")} />
        <StatusState
          status="error"
          title={t("checkout.paymentError")}
          hint={t("checkout.connectionError")}
          actionLabel={t("common.retry")}
          onAction={() => refetch()}
        />
      </View>
    );
  }

  if (methods.length === 0) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t("checkout.paymentMethod")} />
        <EmptyState
          icon="wallet"
          title={t("checkout.noPaymentMethod")}
          hint={t("checkout.noPaymentHint")}
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
        {methods.map((m) => {
          const active = effectiveMethod === m.id;
          const logoUri = resolveMediaUrl(m.logoUrl);
          // expo-image ne supporte pas le SVG nativement — utiliser l'icône de fallback
          const useLogo = !!logoUri && !isSvgUrl(m.logoUrl);
          return (
            <View key={m.id}>
              <Pressable
                style={[styles.method, active && styles.methodActive]}
                onPress={() => setMethod(m.id)}
              >
                <View style={styles.methodIcon}>
                  {useLogo ? (
                    <Image
                      source={{ uri: logoUri }}
                      style={styles.methodLogo}
                      contentFit="contain"
                      accessibilityLabel={m.labelKey}
                    />
                  ) : (
                    <Icon
                      name={m.icon}
                      size={24}
                      color={active ? colors.primary : colors.text}
                    />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.methodLabel}>{t(m.labelKey)}</Text>
                  <Text style={styles.methodHint}>{t(m.hintKey)}</Text>
                </View>
                <View style={[styles.radio, active && styles.radioOn]}>
                  {active && <View style={styles.radioDot} />}
                </View>
              </Pressable>

              {/* Opérateurs mobile money — filtrés par pays */}
              {active && isMobileMoney && (
                <View style={styles.operatorsWrap}>
                  <Text style={styles.operatorsCountry}>
                    Opérateurs disponibles dans votre pays
                  </Text>
                  <View style={styles.operators}>
                    {mobileMoneyMethods.map((op) => (
                      <Pressable
                        key={op.id}
                        style={[
                          styles.operator,
                          effectiveOperator === op.id && styles.operatorActive,
                        ]}
                        onPress={() => setOperator(op.id)}
                      >
                        <Text
                          style={[
                            styles.operatorText,
                            effectiveOperator === op.id && styles.operatorTextActive,
                          ]}
                        >
                          {op.labelKey}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {/* Numéro de téléphone Mobile Money */}
              {active && isMobileMoney && effectiveOperator && (
                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Numéro de téléphone*</Text>
                  <TextInput
                    style={styles.cardInput}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    placeholder="90 00 00 00"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="phone-pad"
                    maxLength={15}
                  />
                </View>
              )}

              {/* Formulaire carte bancaire */}
              {active && isCard && (
                <View style={styles.formSection}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.formLabel}>Numéro de carte*</Text>
                    {detectCardBrand(cardNumber) && (
                      <View style={styles.brandBadge}>
                        <Text style={styles.brandBadgeText}>
                          {detectCardBrand(cardNumber)}
                        </Text>
                      </View>
                    )}
                  </View>
                  <TextInput
                    style={styles.cardInput}
                    value={cardNumber}
                    onChangeText={(t) => setCardNumber(formatCardNumber(t))}
                    placeholder="1234 5678 9012 3456"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={CARD_NUMBER_LENGTH}
                    returnKeyType="next"
                    onSubmitEditing={() => expiryRef.current?.focus()}
                  />
                  <View style={styles.cardRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabel}>Date d&apos;expiration*</Text>
                      <TextInput
                        ref={expiryRef}
                        style={styles.cardInput}
                        value={cardExpiry}
                        onChangeText={(t) => setCardExpiry(formatExpiry(t))}
                        placeholder="MM/AA"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="number-pad"
                        maxLength={CARD_EXPIRY_LENGTH}
                        returnKeyType="next"
                        onSubmitEditing={() => cvvRef.current?.focus()}
                      />
                    </View>
                    <View style={{ width: spacing.giant }}>
                      <Text style={styles.formLabel}>CVV*</Text>
                      <TextInput
                        ref={cvvRef}
                        style={styles.cardInput}
                        value={cardCvv}
                        onChangeText={(t) => setCardCvv(t.replace(/\D/g, "").slice(0, 3))}
                        placeholder="123"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="number-pad"
                        maxLength={CARD_CVV_LENGTH}
                        returnKeyType="next"
                        onSubmitEditing={() => nameRef.current?.focus()}
                      />
                    </View>
                  </View>
                  <Text style={styles.formLabel}>Nom du titulaire*</Text>
                  <TextInput
                    ref={nameRef}
                    style={styles.cardInput}
                    value={cardName}
                    onChangeText={setCardName}
                    placeholder="JEAN DUPONT"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="characters"
                    returnKeyType="done"
                  />
                </View>
              )}
            </View>
          );
        })}

        <View style={styles.secure}>
          <Icon name="lock" size={16} color={colors.secondary} />
          <Text style={styles.secureText}>
            {t("product.buyerProtection")} · {t("checkout.securePayment")}
          </Text>
        </View>

        {payError ? (
          <Text style={styles.errorText}>{payError}</Text>
        ) : null}

        {selectedMethodObj && (
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>{t("checkout.confirmPayment")}</Text>
            <Text style={styles.confirmText}>
              {t("checkout.youWillPay")} {selectedMethodObj.labelKey}.
            </Text>
            <Text style={styles.confirmText}>
              {t("checkout.afterValidation")}
            </Text>
          </View>
        )}
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
          disabled={!canPay || isProcessing || !selectedMethodObj}
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
    methodLogo: {
      width: 36,
      height: 36,
      borderRadius: 8,
    },
    methodLabel: {
      fontSize: fontSize.md,
      fontWeight: "700",
      color: colors.text,
    },
    methodHint: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      marginTop: 2,
    },
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
    radioDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.primary,
    },
    operatorsWrap: { marginBottom: spacing.sm },
    operatorsCountry: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.xs,
    },
    operators: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      marginTop: -spacing.xs,
      marginBottom: spacing.md,
      paddingHorizontal: spacing.xs,
    },
    operator: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    operatorActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    operatorText: { fontSize: fontSize.sm, color: colors.text },
    operatorTextActive: { color: colors.primary, fontWeight: "700" },
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
    formSection: {
      backgroundColor: colors.background,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
      gap: spacing.sm,
    },
    formLabel: {
      fontSize: fontSize.sm,
      fontWeight: "600",
      color: colors.text,
    },
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
    cardRow: {
      flexDirection: "row",
      gap: spacing.md,
    },
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
    brandBadgeText: {
      fontSize: fontSize.xs,
      fontWeight: "800",
      color: colors.primary,
    },
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
