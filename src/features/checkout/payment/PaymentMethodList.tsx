import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import {
  fontSize,
  radius,
  spacing,
  useColors,
  useThemedStyles,
  type Colors,
} from "@/design-system";
import { Icon, type IconName } from "@/icons";
import type { StorePaymentMethod } from "@/infrastructure/data-source/StoreDataSource";
import { resolveMediaUrl, isSvgUrl } from "@/utils/resolveMediaUrl";

export function iconForType(type: StorePaymentMethod["type"]): IconName {
  if (type === "mobile_money") return "cellphone";
  if (type === "card") return "creditCard";
  if (type === "wallet") return "wallet";
  return "cash";
}

/**
 * Liste des moyens de paiement d'une boutique — sélection radio avec logo.
 * Le formulaire de saisie vit dans un sous-écran dédié, pas ici.
 */
export function PaymentMethodList({
  methods,
  activeProvider,
  onSelect,
}: {
  methods: StorePaymentMethod[];
  activeProvider: string;
  onSelect: (provider: string) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();

  return (
    <View>
      {methods.map((m) => {
        const active = activeProvider === m.provider;
        const logoUri = resolveMediaUrl(m.logoUrl);
        const useLogo = !!logoUri && !isSvgUrl(m.logoUrl);
        return (
          <Pressable
            key={m.id}
            style={[styles.method, active && styles.methodActive]}
            onPress={() => onSelect(m.provider)}
          >
            <View style={styles.methodIcon}>
              {useLogo ? (
                <Image
                  source={{ uri: logoUri }}
                  style={styles.methodLogo}
                  contentFit="contain"
                  accessibilityLabel={m.displayName}
                />
              ) : (
                <Icon
                  name={iconForType(m.type)}
                  size={24}
                  color={active ? colors.primary : colors.text}
                />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.methodLabel}>{m.displayName}</Text>
              {m.description ? (
                <Text style={styles.methodHint} numberOfLines={2}>
                  {m.description}
                </Text>
              ) : null}
            </View>
            <View style={[styles.radio, active && styles.radioOn]}>
              {active && <View style={styles.radioDot} />}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
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
    methodLogo: { width: 36, height: 36, borderRadius: 8 },
    methodLabel: { fontSize: fontSize.md, fontWeight: "700", color: colors.text },
    methodHint: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
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
  });
