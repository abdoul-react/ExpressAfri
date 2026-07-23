import { Button } from "@/components";
import {
  fontSize,
  spacing,
  useColors,
  useThemedStyles,
  type Colors,
} from "@/design-system";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function OtpSentScreen() {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const { contact } = useLocalSearchParams<{ contact: string }>();

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xl }]}>
      <Text style={styles.title}>{t("auth.checkInbox")}</Text>
      <Text style={styles.subtitle}>
        Un code de confirmation a été envoyé à{" "}
        <Text style={styles.contact}>{contact}</Text>. Vérifiez votre boîte de
        réception et vos spams.
      </Text>
      <Button
        label={t("auth.enterCode")}
        fullWidth
        size="lg"
        onPress={() =>
          router.push({
            pathname: "/auth/otp",
            params: { contact, mode: "phone" },
          })
        }
      />
      <Pressable
        onPress={() => router.replace("/auth/login")}
        hitSlop={8}
        style={styles.secondaryButton}
      >
        <Text style={styles.secondaryText}>{t("auth.backToLogin")}</Text>
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
    contact: { color: colors.text, fontWeight: "700" },
    secondaryButton: { marginTop: spacing.sm, alignItems: "center" },
    secondaryText: {
      fontSize: fontSize.sm,
      color: colors.primary,
      fontWeight: "700",
    },
  });
