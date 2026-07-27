import { Button, KeyboardScreen, Price, ScreenHeader, StatusState } from "@/components";
import {
  fontSize,
  radius,
  spacing,
  shadows,
  useColors,
  useThemedStyles,
  type Colors,
} from "@/design-system";
import { useCheckout } from "@/features/checkout";
import { calculateSubtotal } from "@/features/checkout";
import { usePaymentMethods } from "@/features/payment";
import { resolveMediaUrl, isSvgUrl } from "@/utils/resolveMediaUrl";
import { usePrice } from "@/hooks/usePrice";
import { useAuthStore } from "@/store/authStore";
import { Icon } from "@/icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function CheckoutScreen() {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const { priceXof } = usePrice();
  const { methods: paymentMethods } = usePaymentMethods();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Un compte authentifié (avec vrai token) est requis : sans lui, la commande
  // serait créée anonyme et invisible dans « Mes commandes »
  React.useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [isAuthenticated, router]);

  const {
    items,
    groups,
    subtotal,
    shipping,
    quotesByStore,
    discount,
    total,
    address,
    countryName,
    promo,
    isLoading,
    isError,
    refetch,
  } = useCheckout();

  if (!isAuthenticated) return null;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t("checkout.title")} />
        <StatusState
          status="loading"
          title={t("checkout.loadingTitle")}
          hint={t("checkout.preparing")}
        />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t("checkout.title")} />
        <StatusState
          status="error"
          title={t("checkout.errorTitle")}
          hint={t("checkout.connectionError")}
          actionLabel={t("common.retry")}
          onAction={() => refetch()}
        />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t("checkout.title")} />
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

  return (
    <KeyboardScreen style={styles.container}>
      <ScreenHeader title={t("checkout.title")} />
      <View style={styles.guaranteeBanner}>
        <Icon name="box" size={15} color={colors.sale} />
        <Text style={styles.guaranteeText}>{t("checkout.guarantee")}</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {address ? (
          <Pressable
            style={styles.card}
            onPress={() => router.push("/address")}
          >
            <Icon name="location" size={22} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.addrName}>
                {address.contactName} · {address.dialCode} {address.phone}
              </Text>
              <Text style={styles.addrText} numberOfLines={2}>
                {address.street}
                {address.apartment ? `, ${address.apartment}` : ""},{" "}
                {address.city}, {address.province}, {countryName}{" "}
                {address.postalCode}
              </Text>
            </View>
            <Icon name="chevronRight" size={20} color={colors.textMuted} />
          </Pressable>
        ) : (
          <Pressable
            style={styles.addAddr}
            onPress={() => router.push("/address/form")}
          >
            <Icon name="location" size={22} color={colors.primary} />
            <Text style={styles.addAddrText}>
              {t("checkout.addAddressBtn")}
            </Text>
            <Icon name="chevronRight" size={20} color={colors.textMuted} />
          </Pressable>
        )}

        {/* Un bloc par boutique : chaque boutique expédie et facture séparément,
            avec SES frais de livraison (même calcul que le serveur). */}
        {groups.map((group) => {
          const quote = group.storeId
            ? quotesByStore.get(group.storeId)
            : undefined;
          const groupSubtotal = calculateSubtotal(group.items);
          const groupShipping = quote?.shippingCost ?? null;
          return (
            <View key={group.storeId ?? "__unknown__"} style={styles.card}>
              <View style={styles.shipHead}>
                <Icon name="store" size={16} color={colors.secondaryDark} />
                <Text style={styles.shipHeadText} numberOfLines={1}>
                  {group.storeName ?? t("cart.unknownStore")}
                </Text>
              </View>
              {group.items.map((item) => (
                <View
                  key={item.productId + (item.variantLabel ?? "")}
                  style={styles.item}
                >
                  <Image
                    source={{ uri: item.image }}
                    style={styles.itemImg}
                    contentFit="cover"
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    {item.variantLabel && (
                      <Text style={styles.variant}>{item.variantLabel}</Text>
                    )}
                    <View style={styles.itemFooter}>
                      <Price priceUsd={item.priceUsd} size="sm" />
                      <Text style={styles.qty}>x{item.quantity}</Text>
                    </View>
                  </View>
                </View>
              ))}
              <View style={styles.divider} />
              <Row
                label={t("checkout.shippingFee")}
                value={
                  quote?.isFree ? (
                    <Text style={styles.freeShipping}>
                      {t("checkout.freeShipping")}
                    </Text>
                  ) : groupShipping != null ? (
                    <Price
                      priceUsd={groupShipping}
                      size="sm"
                      color={colors.text}
                    />
                  ) : (
                    <Text style={styles.deliveryText}>—</Text>
                  )
                }
              />
              {quote && (
                <Row
                  label={t("checkout.estimatedShipping")}
                  value={
                    <Text style={styles.deliveryText}>
                      {t("checkout.estimatedDaysRange", {
                        min: quote.estimatedDaysMin,
                        max: quote.estimatedDaysMax,
                      })}
                    </Text>
                  }
                />
              )}
              <Row
                label={t("checkout.storeSubtotal")}
                value={
                  <Price
                    priceUsd={groupSubtotal + (groupShipping ?? 0)}
                    size="sm"
                    color={colors.text}
                  />
                }
                bold
              />
            </View>
          );
        })}

        <View style={styles.card}>
          <Pressable style={styles.promoHead} onPress={promo.toggle}>
            <Icon name="coupon" size={18} color={colors.primary} />
            <Text style={styles.promoTitle}>{t("checkout.promoCode")}</Text>
            {promo.applied ? (
              <Text style={styles.promoApplied}>
                Appliqué (-{promo.ratePercent}%)
              </Text>
            ) : (
              <Icon
                name={promo.open ? "chevronDown" : "chevronRight"}
                size={18}
                color={colors.textMuted}
              />
            )}
          </Pressable>
          {promo.open && (
            <View style={styles.promoRow}>
              <TextInput
                style={styles.promoInput}
                placeholder={t("checkout.promoPlaceholder")}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                value={promo.code}
                onChangeText={promo.setCode}
              />
              <Button
                label={promo.applied ? t("checkout.promoRemove") : t("checkout.promoApply")}
                variant={promo.applied ? "outline" : "primary"}
                size="md"
                loading={promo.loading}
                onPress={promo.applied ? promo.remove : promo.apply}
              />
            </View>
          )}
          {promo.error ? (
            <Text style={{ fontSize: 12, color: '#e53e3e', marginTop: 6 }}>{promo.error}</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.summaryTitle}>{t("checkout.orderSummary")}</Text>
          <Row
            label={t("common.subtotal")}
            value={<Price priceUsd={subtotal} size="sm" color={colors.text} />}
          />
          <Row
            label={
              groups.length > 1
                ? t("checkout.shippingMultiStore", { count: groups.length })
                : t("checkout.shippingFee")
            }
            value={<Price priceUsd={shipping} size="sm" color={colors.text} />}
          />
          {promo.applied && (
            <Row
              label={t("checkout.discounts")}
              value={<Text style={styles.discountText}>-{priceXof(discount)}</Text>}
            />
          )}
          <View style={styles.divider} />
          <Row
            label={t("common.total")}
            value={<Price priceUsd={total} size="lg" />}
            bold
          />
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHead}>
            <Icon name="truck" size={20} color={colors.secondary} />
            <Text style={[styles.sectionHeadTitle]}>
              {t("checkout.fastDelivery")}
            </Text>
            <Icon name="chevronRight" size={18} color={colors.textMuted} />
          </View>
          <View style={styles.benefitRow}>
            <Icon name="check" size={16} color={colors.secondary} strokeWidth={3} />
            <Text style={styles.benefitText}>{t("checkout.couponIfLate")}</Text>
          </View>
          <View style={styles.benefitRow}>
            <Icon name="check" size={16} color={colors.secondary} strokeWidth={3} />
            <Text style={styles.benefitText}>{t("checkout.refundIfDamaged")}</Text>
          </View>
          <View style={styles.benefitRow}>
            <Icon name="check" size={16} color={colors.secondary} strokeWidth={3} />
            <Text style={styles.benefitText}>{t("checkout.refundIfLost")}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHead}>
            <Icon name="shield" size={20} color={colors.secondaryDark} />
            <Text style={[styles.sectionHeadTitle]}>
              {t("checkout.securityAndPrivacy")}
            </Text>
          </View>
          <Text style={styles.secondaryText}>{t("checkout.secureText")}</Text>
        </View>

        {/* Moyens de paiement acceptés — catalogue géré par l'admin (CMS →
            Moyens de paiement), logos compris. Rien n'est codé en dur : la
            section disparaît si l'admin n'a rien configuré. */}
        {paymentMethods.length > 0 && (
          <View style={styles.card}>
            <View style={styles.sectionHead}>
              <Icon name="lock" size={20} color={colors.secondaryDark} />
              <Text style={styles.sectionHeadTitle}>
                {t("checkout.securePayments")}
              </Text>
            </View>
            <View style={styles.brands}>
              {paymentMethods.map((m) => {
                const logo = resolveMediaUrl(m.logoUrl);
                return (
                  <View key={m.id} style={styles.brandPill}>
                    {logo && !isSvgUrl(m.logoUrl) ? (
                      <Image
                        source={{ uri: logo }}
                        style={styles.brandLogo}
                        contentFit="contain"
                        accessibilityLabel={t(m.labelKey)}
                      />
                    ) : (
                      <Icon name={m.icon} size={16} color={colors.textSecondary} />
                    )}
                    <Text style={styles.brandText} numberOfLines={1}>
                      {t(m.labelKey)}
                    </Text>
                  </View>
                );
              })}
            </View>
            <Text style={styles.secondaryText}>{t("checkout.paymentLogos")}</Text>
          </View>
        )}

        <Text style={styles.termsText}>
          {t("checkout.acceptTerms")}
          <Text
            style={styles.termsLink}
            onPress={() =>
              router.push("/static-page/cgv")
            }
          >
            {t("checkout.termsLink")}
          </Text>
        </Text>
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: insets.bottom + spacing.sm }]}>
        <View>
          <Text style={styles.barLabel}>{t("common.total")}</Text>
          <Price priceUsd={total} size="md" />
        </View>
        <Button
          label={address ? t("checkout.paymentMethod") : t("checkout.addAddress")}
          icon="arrowRight"
          size="lg"
          onPress={() =>
            router.push(address ? "/checkout/payment" : "/address/form")
          }
          style={{ flex: 1, marginLeft: spacing.lg }}
        />
      </View>
    </KeyboardScreen>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: React.ReactNode;
  bold?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  return (
    <View style={styles.row}>
      <Text
        style={[
          styles.rowLabel,
          bold && { color: colors.text, fontWeight: "800" },
        ]}
      >
        {label}
      </Text>
      {value}
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    card: {
      backgroundColor: colors.surface,
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      padding: spacing.lg,
      borderRadius: radius.lg,
      ...shadows.sm,
    },
    guaranteeBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
    },
    guaranteeText: {
      fontSize: fontSize.sm,
      color: colors.sale,
      fontWeight: "600",
    },
    addrName: { fontSize: fontSize.md, fontWeight: "700", color: colors.text },
    addrText: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      marginTop: 2,
      lineHeight: 18,
    },
    addAddr: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      backgroundColor: colors.surface,
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      padding: spacing.lg,
      borderRadius: radius.lg,
      ...shadows.sm,
      borderWidth: 1,
      borderColor: colors.primary,
      borderStyle: "dashed",
    },
    addAddrText: {
      flex: 1,
      fontSize: fontSize.md,
      fontWeight: "700",
      color: colors.primary,
    },
    shipHead: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: spacing.md,
    },
    shipHeadText: {
      fontSize: fontSize.sm,
      fontWeight: "800",
      color: colors.text,
    },
    item: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md },
    itemImg: {
      width: 64,
      height: 64,
      borderRadius: radius.md,
      backgroundColor: colors.background,
    },
    itemTitle: { fontSize: fontSize.md, color: colors.text, lineHeight: 20 },
    variant: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
    itemFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 4,
    },
    qty: { fontSize: fontSize.sm, color: colors.textSecondary },
    summaryTitle: {
      fontSize: fontSize.xl,
      fontWeight: "800",
      color: colors.text,
      marginBottom: spacing.sm,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 5,
    },
    rowLabel: { fontSize: fontSize.md, color: colors.textSecondary },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: spacing.sm,
    },
    promoHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    promoTitle: {
      flex: 1,
      fontSize: fontSize.md,
      fontWeight: "700",
      color: colors.text,
    },
    promoApplied: {
      fontSize: fontSize.sm,
      color: colors.secondaryDark,
      fontWeight: "700",
    },
    promoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    promoInput: {
      flex: 1,
      height: 44,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      fontSize: fontSize.md,
      color: colors.text,
    },
    discountText: {
      fontSize: fontSize.md,
      color: colors.sale,
      fontWeight: "700",
    },
    freeShipping: {
      fontSize: fontSize.sm,
      color: colors.secondaryDark,
      fontWeight: "800",
    },
    deliveryText: {
      fontSize: fontSize.sm,
      color: colors.text,
      fontWeight: "600",
    },
    sectionHead: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    sectionHeadTitle: {
      flex: 1,
      fontSize: fontSize.xl,
      fontWeight: "800",
      color: colors.text,
    },
    benefitRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: 4,
    },
    benefitText: {
      fontSize: fontSize.md,
      color: colors.text,
      lineHeight: 20,
    },
    secondaryText: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    brands: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    brandPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    brandLogo: { width: 22, height: 16 },
    brandText: {
      fontSize: fontSize.xs,
      fontWeight: "800",
      color: colors.textSecondary,
    },
    termsText: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      lineHeight: 17,
    },
    termsLink: {
      color: colors.primary,
      fontWeight: "700",
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
      ...shadows.md,
    },
    barLabel: { fontSize: fontSize.xs, color: colors.textMuted },
  });
