import { Button } from "@/components";
import {
  fontSize,
  radius,
  spacing,
  useColors,
  useThemedStyles,
  type Colors,
} from "@/design-system";
import { useAuth } from "@/features/auth";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ForgotPasswordScreen() {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { requestPasswordReset } = useAuth();

  const isEmailValid = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      await requestPasswordReset(email.trim());
      router.replace({ pathname: "/auth/forgot-password-sent" });
      return;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : String(e),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
    >
      <View style={[styles.body, { paddingTop: insets.top + spacing.lg }]}>
        <Text style={styles.title}>{t("auth.forgotPassword")}</Text>
        <Text style={styles.subtitle}>
          Entrez votre adresse email pour recevoir un lien de réinitialisation.
        </Text>

        <View style={styles.field}>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {message ? <Text style={styles.successText}>{message}</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button
          label={t("auth.sendResetLink")}
          fullWidth
          size="lg"
          loading={isSubmitting}
          disabled={!isEmailValid(email) || isSubmitting}
          onPress={handleSubmit}
        />

        <Pressable
          onPress={() => router.back()}
          style={styles.backLink}
          hitSlop={8}
        >
          <Text style={styles.backText}>{t("auth.backToLogin")}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surface },
    body: { flex: 1, paddingHorizontal: spacing.xl, gap: spacing.lg },
    title: { fontSize: fontSize["2xl"], fontWeight: "800", color: colors.text },
    subtitle: {
      fontSize: fontSize.md,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    field: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.md,
      height: 52,
      paddingHorizontal: spacing.md,
      justifyContent: "center",
    },
    input: { fontSize: fontSize.lg, color: colors.text },
    successText: {
      color: colors.success,
      fontSize: fontSize.sm,
      marginBottom: spacing.sm,
    },
    errorText: {
      color: colors.danger,
      fontSize: fontSize.sm,
      marginBottom: spacing.sm,
    },
    backLink: { alignSelf: "center", marginTop: spacing.lg },
    backText: {
      fontSize: fontSize.sm,
      color: colors.primary,
      fontWeight: "700",
    },
  });
