import { Button, ScreenHeader, StatusState } from "@/components";
import {
  fontSize,
  radius,
  spacing,
  useColors,
  useThemedStyles,
  type Colors,
} from "@/design-system";
import { usePaymentMethods } from "@/features/payment";
import { resolveMediaUrl, isSvgUrl } from "@/utils/resolveMediaUrl";
import { Icon } from "@/icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export default function PaymentMethodsScreen() {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const router = useRouter();
  const { t } = useTranslation();
  const { methods, isLoading, error, refetch } = usePaymentMethods();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ScreenHeader
          title={t("payment.title")}
          actions={[{ icon: "headset", onPress: () => router.push("/messages") }]}
        />
        <StatusState
          status="loading"
          title={t("payment.loadingTitle")}
          hint={t("payment.loadingHint")}
        />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ScreenHeader
          title={t("payment.title")}
          actions={[{ icon: "headset", onPress: () => router.push("/messages") }]}
        />
        <StatusState
          status="error"
          title={t("payment.errorTitle")}
          hint={t("payment.retryHint")}
          actionLabel={t("common.retry")}
          onAction={() => refetch()}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t("payment.title")}
          actions={[{ icon: "headset", onPress: () => router.push("/messages") }]}
      />
      <View style={styles.secureBar}>
        <Icon name="shield" size={16} color={colors.secondary} />
        <Text style={styles.secureText}>
          {t("payment.encryptedText")}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl * 2 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {/* Cartes */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t("payment.cards")}</Text>
              <Icon name="arrowRight" size={18} color={colors.text} />
            </View>
            <View style={styles.sectionBody}>
              <Text style={styles.sectionDesc}>
                {t("payment.addCardHint")}
              </Text>
              <Button
                label={t("payment.add")}
                variant="dark"
                size="sm"
                onPress={() => router.push("/checkout/payment?addCard=1")}
              />
            </View>
          </View>

          <View style={styles.divider} />

          {/* Bonus */}
          <Pressable
            style={styles.sectionHeader}
            onPress={() => router.push("/wallet/bonus")}
          >
            <Text style={styles.sectionTitle}>{t("payment.bonus")}</Text>
            <Icon name="arrowRight" size={18} color={colors.text} />
          </Pressable>
        </View>

        {/* Moyens de paiement configurés par l'admin — avec leurs vrais logos */}
        <Text style={styles.groupTitle}>{t("payment.availableMethods")}</Text>
        <View style={styles.methods}>
          {methods.map((m, i) => {
            // Logo uploadé par l'admin en priorité ; icône générique en secours
            // (les SVG ne sont pas décodés par expo-image → fallback icône)
            const logoUri = resolveMediaUrl(m.logoUrl);
            const useLogo = !!logoUri && !isSvgUrl(m.logoUrl);
            return (
              <View
                key={m.id}
                style={[styles.method, i === methods.length - 1 && styles.methodLast]}
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
                    <Icon name={m.icon as any} size={22} color={colors.primary} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.methodLabel}>{m.labelKey}</Text>
                  {!!m.hintKey && <Text style={styles.methodHint}>{m.hintKey}</Text>}
                </View>
              </View>
            );
          })}
          {methods.length === 0 && (
            <Text style={styles.emptyMethods}>{t("payment.noMethods", "Aucun moyen de paiement disponible pour le moment.")}</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    secureBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
      backgroundColor: colors.surface,
    },
    secureText: {
      fontSize: fontSize.sm,
      color: colors.secondary,
      fontWeight: "600",
    },
    card: {
      backgroundColor: colors.backgroundSoft,
      borderRadius: radius.lg,
      padding: spacing.lg,
    },
    section: {},
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    sectionTitle: {
      fontSize: fontSize["2xl"],
      fontWeight: "800",
      color: colors.text,
    },
    sectionBody: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      marginTop: spacing.sm,
    },
    sectionDesc: {
      flex: 1,
      fontSize: fontSize.md,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: spacing.lg,
    },
    groupTitle: {
      fontSize: fontSize.lg,
      fontWeight: "800",
      color: colors.text,
      marginTop: spacing.xl,
      marginBottom: spacing.md,
    },
    methods: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      overflow: "hidden",
    },
    method: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    methodIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    methodLogo: { width: 44, height: 44 },
    methodLast: { borderBottomWidth: 0 },
    emptyMethods: {
      padding: spacing.lg,
      fontSize: fontSize.sm,
      color: colors.textMuted,
      textAlign: "center",
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
  });
