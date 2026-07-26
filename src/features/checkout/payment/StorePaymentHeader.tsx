import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Price } from "@/components";
import {
  fontSize,
  radius,
  shadows,
  spacing,
  useColors,
  useThemedStyles,
  type Colors,
} from "@/design-system";
import { Icon } from "@/icons";
import { useTranslation } from "react-i18next";

/**
 * Carte d'en-tête de l'étape : boutique + décomposition du montant dû
 * (articles + livraison). Les montants viennent du même devis serveur que la
 * création de commande : ce qui est affiché est ce qui sera facturé.
 */
export function StorePaymentHeader({
  storeName,
  subtotal,
  shippingCost,
  isFreeShipping,
}: {
  storeName: string;
  subtotal: number;
  shippingCost: number | null;
  isFreeShipping: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const { t } = useTranslation();
  const amountDue = subtotal + (shippingCost ?? 0);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.storeIcon}>
          <Icon name="store" size={20} color={colors.primary} />
        </View>
        <Text style={styles.storeName} numberOfLines={1}>
          {storeName}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>{t("common.subtotal")}</Text>
        <Price priceUsd={subtotal} size="sm" color={colors.text} />
      </View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>{t("checkout.shippingFee")}</Text>
        {isFreeShipping ? (
          <Text style={styles.free}>{t("checkout.freeShipping")}</Text>
        ) : shippingCost != null ? (
          <Price priceUsd={shippingCost} size="sm" color={colors.text} />
        ) : (
          <Text style={styles.rowLabel}>—</Text>
        )}
      </View>
      <View style={styles.divider} />
      <View style={styles.row}>
        <Text style={styles.dueLabel}>{t("checkout.amountDue")}</Text>
        <Price priceUsd={amountDue} size="lg" />
      </View>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      marginBottom: spacing.lg,
      ...shadows.sm,
    },
    head: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    storeIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    storeName: {
      flex: 1,
      fontSize: fontSize.lg,
      fontWeight: "800",
      color: colors.text,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 4,
    },
    rowLabel: { fontSize: fontSize.md, color: colors.textSecondary },
    free: {
      fontSize: fontSize.sm,
      color: colors.secondaryDark,
      fontWeight: "800",
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: spacing.sm,
    },
    dueLabel: { fontSize: fontSize.md, fontWeight: "800", color: colors.text },
  });
