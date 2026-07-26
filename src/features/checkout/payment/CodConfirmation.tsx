import React from "react";
import { StyleSheet, Text, View } from "react-native";
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
 * Confirmation « paiement à la livraison » : rien à saisir, un encart
 * explique au client qu'il règlera le livreur à la réception.
 */
export function CodConfirmation() {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.logoWrap}>
          <Icon name="cash" size={26} color={colors.secondaryDark} />
        </View>
        <Text style={styles.title}>{t("payment.cod")}</Text>
      </View>
      <View style={styles.infoBox}>
        <Icon name="truck" size={18} color={colors.secondaryDark} />
        <Text style={styles.infoText}>{t("checkout.codInfo")}</Text>
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
      gap: spacing.md,
      ...shadows.sm,
    },
    head: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
    },
    logoWrap: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      flex: 1,
      fontSize: fontSize.lg,
      fontWeight: "800",
      color: colors.text,
    },
    infoBox: {
      flexDirection: "row",
      gap: spacing.sm,
      backgroundColor: colors.background,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    infoText: {
      flex: 1,
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      lineHeight: 19,
    },
  });
