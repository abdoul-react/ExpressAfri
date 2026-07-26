import React from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
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
import {
  detectCardBrand,
  formatCardNumber,
  formatExpiry,
  type PaymentChoice,
} from "./usePaymentFlow";

const CARD_NUMBER_LENGTH = 19;
const CARD_EXPIRY_LENGTH = 5;
const CARD_CVV_LENGTH = 3;

/**
 * Formulaire carte bancaire dédié : numéro (détection de marque), expiration,
 * CVV, titulaire. Les données carte ne quittent JAMAIS le client vers nos
 * tables — elles ne servent qu'au PSP à l'initialisation du paiement.
 */
export function CardPaymentForm({
  choice,
  onPatch,
}: {
  choice: PaymentChoice | undefined;
  onPatch: (values: Partial<PaymentChoice>) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const { t } = useTranslation();
  const brand = detectCardBrand(choice?.cardNumber ?? "");

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.logoWrap}>
          <Icon name="creditCard" size={26} color={colors.primary} />
        </View>
        <Text style={styles.title}>{t("checkout.cardPayment")}</Text>
        {brand ? (
          <View style={styles.brandBadge}>
            <Text style={styles.brandBadgeText}>{brand}</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.label}>{t("checkout.cardNumber")}*</Text>
      <TextInput
        style={styles.input}
        value={choice?.cardNumber ?? ""}
        onChangeText={(v) => onPatch({ cardNumber: formatCardNumber(v) })}
        placeholder="1234 5678 9012 3456"
        placeholderTextColor={colors.textMuted}
        keyboardType="number-pad"
        maxLength={CARD_NUMBER_LENGTH}
      />

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{t("checkout.cardExpiry")}*</Text>
          <TextInput
            style={styles.input}
            value={choice?.cardExpiry ?? ""}
            onChangeText={(v) => onPatch({ cardExpiry: formatExpiry(v) })}
            placeholder="MM/AA"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            maxLength={CARD_EXPIRY_LENGTH}
          />
        </View>
        <View style={{ width: 100 }}>
          <Text style={styles.label}>CVV*</Text>
          <TextInput
            style={styles.input}
            value={choice?.cardCvv ?? ""}
            onChangeText={(v) =>
              onPatch({ cardCvv: v.replace(/\D/g, "").slice(0, 3) })
            }
            placeholder="123"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            maxLength={CARD_CVV_LENGTH}
            secureTextEntry
          />
        </View>
      </View>

      <Text style={styles.label}>{t("checkout.cardHolder")}*</Text>
      <TextInput
        style={styles.input}
        value={choice?.cardName ?? ""}
        onChangeText={(v) => onPatch({ cardName: v })}
        placeholder="JEAN DUPONT"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="characters"
      />

      <View style={styles.secureRow}>
        <Icon name="lock" size={14} color={colors.secondary} />
        <Text style={styles.secureText}>{t("checkout.securePayment")}</Text>
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
      gap: spacing.sm,
      ...shadows.sm,
    },
    head: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      marginBottom: spacing.sm,
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
    label: { fontSize: fontSize.sm, fontWeight: "600", color: colors.text },
    input: {
      height: 48,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      fontSize: fontSize.md,
      color: colors.text,
      backgroundColor: colors.background,
    },
    row: { flexDirection: "row", gap: spacing.md },
    secureRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      justifyContent: "center",
      marginTop: spacing.xs,
    },
    secureText: { fontSize: fontSize.xs, color: colors.textSecondary },
  });
