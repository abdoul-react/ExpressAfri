import { Button } from "@/components";
import {
  fontSize,
  radius,
  spacing,
  useColors,
  useThemedStyles,
  type Colors,
} from "@/design-system";
import { Icon, GoogleIcon, AppleIcon, FacebookIcon } from "@/icons";
import { BrandMark } from "@/features/content";
import { useAuth } from "@/features/auth";
import { useAuthStore } from "@/store/authStore";
import { COUNTRIES, useSettingsStore } from "@/store/settingsStore";
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

type Mode = "phone" | "email";

export default function LoginScreen() {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>("phone");
  const [value, setValue] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { loginWithEmail, requestOtp } = useAuth();
  const signIn = useAuthStore((s) => s.signIn);
  const continueAsGuest = useAuthStore((s) => s.continueAsGuest);
  const countryCode = useSettingsStore((s) => s.country);
  const country = COUNTRIES.find((c) => c.code === countryCode)!;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEmailValid = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canContinue =
    mode === "phone"
      ? value.trim().length >= 6
      : isEmailValid(value.trim()) && password.trim().length >= 6;

  const handleContinue = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      if (mode === "email") {
        const response = await loginWithEmail(
          value.trim(),
          password.trim(),
        );
        const user = response.user ?? {
          name: "Utilisateur",
          email: value.trim(),
        };
        const tokens = {
          access: response.accessToken ?? response.access,
          refresh: response.refreshToken ?? response.refresh,
        };
        signIn(user, tokens);
        router.replace("/");
        return;
      }

      await requestOtp(value.trim(), mode);
      router.push({
        pathname: "/auth/otp-sent",
        params: { contact: value.trim() },
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = () => {
    router.push("/auth/forgot-password");
  };

  const socialSignIn = (_provider: string) => {
    // La connexion sociale n'est pas encore branchée côté API : une fausse session
    // locale (sans token) rendrait les commandes invisibles dans « Mes commandes »
    setError(t("auth.socialUnavailable", "Connexion sociale bientôt disponible — utilisez l'email ou le téléphone"));
  };

  const guest = () => {
    continueAsGuest();
    router.replace("/");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
    >
      <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={guest} hitSlop={8} style={styles.close}>
          <Icon name="close" size={26} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={styles.logoWrap}>
          <BrandMark context="login" logoSize={44} nameSize={26} />
          <Text style={styles.tagline}>{t("onboarding.tagline")}</Text>
        </View>

        {/* Onglets Téléphone / Email */}
        <View style={styles.tabs}>
          {(["phone", "email"] as Mode[]).map((m) => (
            <Pressable
              key={m}
              style={[styles.tab, mode === m && styles.tabActive]}
              onPress={() => {
                setMode(m);
                setValue("");
                setPassword("");
                setError(null);
              }}
            >
              <Text
                style={[styles.tabText, mode === m && styles.tabTextActive]}
              >
                {t(m === "phone" ? "auth.phone" : "auth.email")}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Champ */}
        <View style={styles.field}>
          {mode === "phone" && (
            <View style={styles.dial}>
              <Text style={styles.dialText}>{country.dial}</Text>
            </View>
          )}
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={setValue}
            placeholder={mode === "phone" ? "90 00 00 00" : "exemple@email.com"}
            placeholderTextColor={colors.textMuted}
            keyboardType={mode === "phone" ? "phone-pad" : "email-address"}
            autoCapitalize="none"
              accessibilityLabel={mode === "phone" ? t("auth.phone") : t("auth.email")}
          />
        </View>

        {mode === "email" && (
          <>
            <View style={styles.field}>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder={t("auth.password")}
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                autoCapitalize="none"
                accessibilityLabel={t("auth.passwordLabel")}
              />
            </View>
            <Pressable
              onPress={handleForgotPassword}
              style={styles.forgotPassword}
              hitSlop={8}
            >
              <Text style={styles.forgotPasswordText}>
                {t("auth.forgotPassword")}
              </Text>
            </Pressable>
          </>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button
          label={t("common.confirm")}
          size="lg"
          fullWidth
          loading={isSubmitting}
          disabled={!canContinue || isSubmitting}
          onPress={handleContinue}
          style={{ marginTop: spacing.lg }}
        />
        {!canContinue && value.trim().length > 0 ? (
          <Text style={styles.errorText}>
            {mode === "phone"
              ? t("auth.invalidPhone")
              : t("auth.invalidEmail")}
          </Text>
        ) : null}

        <Pressable
          onPress={() => router.push("/auth/register")}
          style={styles.register}
        >
          <Text style={styles.registerText}>
            {t("auth.newToPlatform")}
            <Text style={styles.registerLink}>{t("auth.signUp")}</Text>
          </Text>
        </Pressable>

        {/* Séparateur */}
        <View style={styles.sep}>
          <View style={styles.sepLine} />
          <Text style={styles.sepText}>{t("auth.continueWith")}</Text>
          <View style={styles.sepLine} />
        </View>

        {/* Social */}
        <View style={styles.social}>
          <SocialButton
            icon="google"
            label="Google"
            onPress={() => socialSignIn("google")}
            disabled={isSubmitting}
          />
          <SocialButton
            icon="apple"
            label="Apple"
            onPress={() => socialSignIn("apple")}
            disabled={isSubmitting}
          />
          <SocialButton
            icon="facebook"
            label="Facebook"
            onPress={() => socialSignIn("facebook")}
            disabled={isSubmitting}
          />
        </View>
      </View>

      <View
        style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}
      >
        <Pressable onPress={guest} hitSlop={8}>
          <Text style={styles.guestText}>{t("auth.continueAsGuest")}</Text>
        </Pressable>
        <Text style={styles.terms}>
          {t("auth.termsAccept")}
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

function SocialButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: "google" | "apple" | "facebook";
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  const BrandIcon =
    icon === "google"
      ? GoogleIcon
      : icon === "apple"
        ? AppleIcon
        : FacebookIcon;
  return (
    <Pressable
      style={[styles.socialBtn, disabled && styles.socialBtnDisabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
    >
      <BrandIcon size={22} />
      <Text style={styles.socialLabel}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surface },
    top: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
    close: { alignSelf: "flex-start", padding: 4 },
    body: { flex: 1, paddingHorizontal: spacing.xl },
    logoWrap: {
      alignItems: "center",
      marginTop: spacing.lg,
      marginBottom: spacing.xxl,
      gap: spacing.sm,
    },
    tagline: { fontSize: fontSize.sm, color: colors.textSecondary },
    tabs: { flexDirection: "row", gap: spacing.xl, marginBottom: spacing.lg },
    tab: { paddingBottom: spacing.sm },
    tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
    tabText: {
      fontSize: fontSize.lg,
      fontWeight: "700",
      color: colors.textMuted,
    },
    tabTextActive: { color: colors.text },
    field: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.md,
      height: 52,
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
    },
    dial: {
      borderRightWidth: 1,
      borderRightColor: colors.border,
      paddingRight: spacing.md,
    },
    dialText: { fontSize: fontSize.lg, color: colors.text, fontWeight: "700" },
    input: { flex: 1, fontSize: fontSize.lg, color: colors.text },
    register: { marginTop: spacing.lg, alignItems: "center" },
    registerText: { fontSize: fontSize.sm, color: colors.textSecondary },
    registerLink: { color: colors.primary, fontWeight: "800" },
    forgotPassword: { alignSelf: "flex-end", marginTop: spacing.sm },
    forgotPasswordText: {
      fontSize: fontSize.sm,
      color: colors.primary,
      fontWeight: "700",
    },
    errorText: {
      marginTop: spacing.sm,
      color: colors.danger,
      fontSize: fontSize.sm,
    },
    sep: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      marginVertical: spacing.xl,
    },
    sepLine: { flex: 1, height: 1, backgroundColor: colors.border },
    sepText: { fontSize: fontSize.sm, color: colors.textMuted },
    social: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: spacing.md,
    },
    socialBtn: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: "center",
      gap: 4,
    },
    socialBtnDisabled: { opacity: 0.5 },
    socialLabel: {
      fontSize: fontSize.xs,
      color: colors.text,
      fontWeight: "600",
    },
    footer: {
      paddingHorizontal: spacing.xl,
      alignItems: "center",
      gap: spacing.sm,
    },
    guestText: {
      fontSize: fontSize.md,
      color: colors.primary,
      fontWeight: "700",
    },
    terms: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      textAlign: "center",
      lineHeight: 16,
    },
  });
