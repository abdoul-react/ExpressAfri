import React, { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
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
import { COUNTRIES, type Country } from "@/store/settingsStore";
import { useTranslation } from "react-i18next";

/**
 * Formulaire Mobile Money dédié : logo de l'opérateur, indicatif sélectionnable
 * parmi tous les pays couverts (défaut : pays de l'adresse de livraison),
 * numéro du payeur et instructions du commerçant. Le numéro complet
 * (indicatif + numéro) est transmis au serveur (payments.metadata) pour le
 * rapprochement des encaissements côté boutique.
 */
export function MobileMoneyForm({
  method,
  countryCode,
  onChangeCountry,
  phone,
  onChangePhone,
}: {
  method: StorePaymentMethod;
  /** Code ISO-2 du pays de l'indicatif sélectionné (ex. NE, CI). */
  countryCode: string | null;
  onChangeCountry: (code: string) => void;
  phone: string;
  onChangePhone: (v: string) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const { t } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const logoUri = resolveMediaUrl(method.logoUrl);
  const useLogo = !!logoUri && !isSvgUrl(method.logoUrl);

  const country =
    COUNTRIES.find((c) => c.code === (countryCode ?? "").toUpperCase()) ??
    COUNTRIES[0];

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
        <Pressable
          style={styles.dialBox}
          onPress={() => setPickerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t("checkout.selectCountry")}
        >
          <Text style={styles.dialFlag}>{country.flag}</Text>
          <Text style={styles.dialText}>{country.dial}</Text>
          <Icon name="chevronDown" size={14} color={colors.textMuted} />
        </Pressable>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={onChangePhone}
          placeholder="90 00 00 00"
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
          maxLength={15}
        />
      </View>
      <Text style={styles.phoneHint}>{t("checkout.mobileMoneyHint")}</Text>

      {method.instructions ? (
        <View style={styles.instructions}>
          <Icon name="help" size={16} color={colors.secondaryDark} />
          <Text style={styles.instructionsText}>{method.instructions}</Text>
        </View>
      ) : null}

      <Modal
        visible={pickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>{t("checkout.selectCountry")}</Text>
            <FlatList
              data={COUNTRIES}
              keyExtractor={(c: Country) => c.code}
              renderItem={({ item }) => {
                const active = item.code === country.code;
                return (
                  <Pressable
                    style={[styles.countryRow, active && styles.countryRowActive]}
                    onPress={() => {
                      onChangeCountry(item.code);
                      setPickerOpen(false);
                    }}
                  >
                    <Text style={styles.countryFlag}>{item.flag}</Text>
                    <Text style={styles.countryName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.countryDial}>{item.dial}</Text>
                    {active && (
                      <Icon name="check" size={16} color={colors.primary} />
                    )}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
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
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.background,
    },
    dialFlag: { fontSize: fontSize.md },
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
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingTop: spacing.lg,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xl,
      maxHeight: "70%",
    },
    sheetTitle: {
      fontSize: fontSize.lg,
      fontWeight: "800",
      color: colors.text,
      marginBottom: spacing.md,
    },
    countryRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.md,
    },
    countryRowActive: { backgroundColor: colors.primarySoft },
    countryFlag: { fontSize: fontSize.lg },
    countryName: { flex: 1, fontSize: fontSize.md, color: colors.text },
    countryDial: {
      fontSize: fontSize.md,
      fontWeight: "700",
      color: colors.textSecondary,
    },
  });
