import { Button } from "@/components";
import {
  fontSize,
  spacing,
  useColors,
  useThemedStyles,
  type Colors,
} from "@/design-system";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ForgotPasswordSentScreen() {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xl }]}>
      <Text style={styles.title}>{t("auth.resetLinkSent")}</Text>
      <Text style={styles.subtitle}>
        Nous avons envoyé un lien de réinitialisation à votre adresse email.
        Vérifiez votre boîte de réception et vos spams.
      </Text>
      <Button
        label={t("auth.backToLogin")}
        fullWidth
        size="lg"
        onPress={() => router.replace("/auth/login")}
      />
      <Pressable
        onPress={() => router.replace("/auth/login")}
        hitSlop={8}
        style={styles.secondaryButton}
      >
        <Text style={styles.secondaryText}>{t("auth.returnToLogin")}</Text>
      </Pressable>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.xl,
      gap: spacing.lg,
    },
    title: { fontSize: fontSize["2xl"], fontWeight: "800", color: colors.text },
    subtitle: {
      fontSize: fontSize.md,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    secondaryButton: { marginTop: spacing.sm, alignItems: "center" },
    secondaryText: {
      fontSize: fontSize.sm,
      color: colors.primary,
      fontWeight: "700",
    },
  });
