import { Button, KeyboardScreen, ScreenHeader } from "@/components";
import {
  fontSize,
  radius,
  spacing,
  useColors,
  useThemedStyles,
  type Colors,
} from "@/design-system";
import { Icon } from "@/icons";
import { useAuth } from "@/features/auth";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function RegisterScreen() {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const router = useRouter();
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signIn = useAuthStore((s) => s.signIn);
  const { registerWithEmail } = useAuth();

  const canSubmit =
    name.trim().length >= 2 && email.includes("@") && password.length >= 6;

  const submit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      // Inscription réelle : crée le compte côté API et retourne les vrais tokens
      const [firstName, ...rest] = name.trim().split(/\s+/);
      const response = await registerWithEmail({
        firstName,
        lastName: rest.join(" ") || firstName,
        email: email.trim(),
        password,
      });
      const user = response.user ?? { name: name.trim(), email: email.trim() };
      const tokens = {
        access: response.accessToken ?? response.access,
        refresh: response.refreshToken ?? response.refresh,
      };
      signIn(user, tokens);
      router.replace("/");
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(
        message.includes("409")
          ? t("auth.emailAlreadyUsed", "Cet email est déjà utilisé")
          : t("auth.registerFailed", "Inscription impossible — vérifiez votre connexion"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardScreen style={styles.container}>
      <ScreenHeader title={t("auth.signUp")} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Field
          label={t("auth.fullName")}
          value={name}
          onChange={setName}
          placeholder={t("auth.namePlaceholder")}
          icon="account"
        />
        {name.trim().length > 0 && name.trim().length < 2 ? (
          <Text style={styles.errorText}>
            {t("auth.nameTooShort")}
          </Text>
        ) : null}
        <Field
          label={t("auth.email")}
          value={email}
          onChange={setEmail}
          placeholder="exemple@email.com"
          icon="mail"
          keyboard="email-address"
        />
        {email.trim().length > 0 && !email.includes("@") ? (
          <Text style={styles.errorText}>{t("auth.invalidEmailFormat")}</Text>
        ) : null}
        <View>
          <Text style={styles.label}>{t("auth.password")}</Text>
          <View style={styles.field}>
            <Icon name="lock" size={20} color={colors.textMuted} />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder={t("auth.passwordPlaceholder")}
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showPass}
              accessibilityLabel={t("auth.passwordLabel")}
            />
            <Pressable
              onPress={() => setShowPass((v) => !v)}
              hitSlop={8}
               accessibilityLabel={showPass ? t("auth.hidePassword") : t("auth.showPassword")}
            >
              <Icon
                name={showPass ? "eyeOff" : "eye"}
                size={20}
                color={colors.textMuted}
              />
            </Pressable>
          </View>
        </View>
        {password.length > 0 && password.length < 6 ? (
          <Text style={styles.errorText}>
            {t("auth.passwordTooShort")}
          </Text>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button
          label={t("auth.signUp")}
          size="lg"
          fullWidth
          loading={isSubmitting}
          disabled={!canSubmit || isSubmitting}
          onPress={submit}
          style={{ marginTop: spacing.lg }}
        />

        <Pressable onPress={() => router.back()} style={styles.signin}>
          <Text style={styles.signinText}>
            {t("auth.alreadyAccount")}{" "}
            <Text style={styles.signinLink}>{t("auth.signIn")}</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardScreen>
  );
}

import { type TextInputProps } from "react-native";
import { type IconName } from "@/icons";

function Field({ label, value, onChange, placeholder, icon, keyboard }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  icon: IconName;
  keyboard?: TextInputProps["keyboardType"];
}) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.field}>
        <Icon name={icon} size={20} color={colors.textMuted} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={keyboard}
          autoCapitalize={keyboard === "email-address" ? "none" : "words"}
          accessibilityLabel={label}
        />
      </View>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surface },
    body: { padding: spacing.xl, gap: spacing.lg },
    label: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
      fontWeight: "600",
    },
    field: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.md,
      height: 52,
      paddingHorizontal: spacing.md,
    },
    input: { flex: 1, fontSize: fontSize.md, color: colors.text },
    signin: { alignItems: "center", marginTop: spacing.md },
    signinText: { fontSize: fontSize.sm, color: colors.textSecondary },
    signinLink: { color: colors.primary, fontWeight: "800" },
    errorText: {
      marginTop: spacing.xs,
      color: colors.danger,
      fontSize: fontSize.sm,
    },
  });
