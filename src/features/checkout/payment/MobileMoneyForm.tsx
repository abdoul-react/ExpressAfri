import React from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
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
import type { StorePaymentMethod } from "@/infrastructure/data-source/StoreDataSource";
import { resolveMediaUrl, isSvgUrl } from "@/utils/resolveMediaUrl";
import { useTranslation } from "react-i18next";

/**
 * Formulaire Mobile Money dédié : logo de l'opérateur, indicatif du pays de
 * livraison, numéro du payeur et instructions du commerçant. Le numéro est
 * transmis au serveur (payments.metadata) pour le rapprochement des
 * encaissements côté boutique.
 */
export function MobileMoneyForm({
  method,
  dialCode,
  phone,
  onChangePhone,
}: {
  method: StorePaymentMethod;
  dialCode: string | null;
  phone: string;
  onChangePhone: (v: string) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const { t } = useTranslation();
  const logoUri = resolveMediaUrl(method.logoUrl);
  const useLogo = !!logoUri && !isSvgUrl(method.logoUrl);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.logoWrap}>
          {useLogo ? (
            <Image
              source={{ uri: logoUri }}
              style={styles.logo}
              contentFit="contain"
              accessibilityLabel={method.displayName}
            />
          ) : (
            <Icon name="cellphone" size={26} color={colors.primary} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{method.displayName}</Text>
          {method.description ? (
            <Text style={styles.hint} numberOfLines={2}>
              {method.description}
            </Text>
          ) : null}
        </View>
      </View>

      <Text style={styles.label}>{t("checkout.phoneNumber")}*</Text>
      <View style={styles.phoneRow}>
        {dialCode ? (
          <View style={styles.dialBox}>
            <Text style={styles.dialText}>{dialCode}</Text>
          </View>
        ) : null}
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={onChangePhone}
          placeholder="90 00 00 00"
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
          maxLength={15}
          autoFocus
        />
      </View>
      <Text style={styles.phoneHint}>{t("checkout.mobileMoneyHint")}</Text>

      {method.instructions ? (
        <View style={styles.instructions}>
          <Icon name="help" size={16} color={colors.secondaryDark} />
          <Text style={styles.instructionsText}>{method.instructions}</Text>
        </View>
      ) : null}
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
    logo: { width: 42, height: 42, borderRadius: 10 },
    title: { fontSize: fontSize.lg, fontWeight: "800", color: colors.text },
    hint: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
    label: { fontSize: fontSize.sm, fontWeight: "600", color: colors.text },
    phoneRow: { flexDirection: "row", gap: spacing.sm },
    dialBox: {
      height: 48,
      paddingHorizontal: spacing.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background,
    },
    dialText: { fontSize: fontSize.md, fontWeight: "700", color: colors.text },
    input: {
      flex: 1,
      height: 48,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      fontSize: fontSize.md,
      color: colors.text,
      backgroundColor: colors.background,
    },
    phoneHint: { fontSize: fontSize.xs, color: colors.textMuted },
    instructions: {
      flexDirection: "row",
      gap: spacing.sm,
      backgroundColor: colors.background,
      borderRadius: radius.md,
      padding: spacing.md,
      marginTop: spacing.xs,
    },
    instructionsText: {
      flex: 1,
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      lineHeight: 18,
    },
  });
