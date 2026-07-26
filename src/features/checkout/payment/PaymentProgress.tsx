import React from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  fontSize,
  spacing,
  useThemedStyles,
  type Colors,
} from "@/design-system";
import { useTranslation } from "react-i18next";

/**
 * « Paiement 1/3 — Boutique X » + points de progression. Un point rempli par
 * boutique déjà traitée, le point courant en anneau, le reste en gris.
 */
export function PaymentProgress({
  current,
  total,
  storeName,
}: {
  current: number; // 0-based
  total: number;
  storeName: string;
}) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>
        {t("checkout.paymentStep", {
          current: current + 1,
          total,
          store: storeName,
        })}
      </Text>
      {total > 1 && (
        <View style={styles.dots}>
          {Array.from({ length: total }, (_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i < current && styles.dotDone,
                i === current && styles.dotCurrent,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    wrap: { alignItems: "center", marginBottom: spacing.md },
    title: {
      fontSize: fontSize.md,
      fontWeight: "800",
      color: colors.text,
      textAlign: "center",
    },
    dots: {
      flexDirection: "row",
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.border,
    },
    dotDone: { backgroundColor: colors.secondary },
    dotCurrent: {
      backgroundColor: colors.primary,
      width: 22,
    },
  });
