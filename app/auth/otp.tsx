import { Button, KeyboardScreen, ScreenHeader } from "@/components";
import {
  fontSize,
  radius,
  spacing,
  useThemedStyles,
  type Colors,
} from "@/design-system";
import { useAuth } from "@/features/auth";
import { useAuthStore } from "@/store/authStore";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const LENGTH = 4;

export default function OtpScreen() {
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { contact } = useLocalSearchParams<{ contact: string; mode: string }>();
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(""));
  const [seconds, setSeconds] = useState(59);
  const inputs = useRef<(TextInput | null)[]>([]);
  const { verifyOtp } = useAuth();
  const signIn = useAuthStore((s) => s.signIn);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);

  const setDigit = (i: number, val: string) => {
    const clean = val.replace(/[^0-9]/g, "").slice(-1);
    const next = [...digits];
    next[i] = clean;
    setDigits(next);
    if (clean && i < LENGTH - 1) inputs.current[i + 1]?.focus();
  };

  const code = digits.join("");
  const complete = code.length === LENGTH;

  const verify = async () => {
    if (!complete) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const resp = await verifyOtp(contact as string, code);
      const user = resp.user ?? { name: "Utilisateur", phone: contact };
      const tokens = {
        access: resp.accessToken ?? resp.access,
        refresh: resp.refreshToken ?? resp.refresh,
      };
      signIn(user, tokens);
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardScreen style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader title={t("auth.otp")} />
      <View style={styles.body}>
        <Text style={styles.hint}>
          {t("auth.enterCode", { count: LENGTH })}{" "}
          <Text style={styles.contact}>{contact}</Text>
        </Text>

        <View style={styles.boxes}>
          {digits.map((d, i) => (
            <TextInput
              key={i}
              ref={(r) => {
                inputs.current[i] = r;
              }}
              style={[styles.box, d && styles.boxFilled]}
              value={d}
              onChangeText={(v) => setDigit(i, v)}
              keyboardType="number-pad"
              maxLength={1}
              autoFocus={i === 0}
              accessibilityLabel={t("auth.digitLabel", { number: i + 1 })}
              onKeyPress={({ nativeEvent }) => {
                if (nativeEvent.key === "Backspace" && !digits[i] && i > 0) {
                  inputs.current[i - 1]?.focus();
                }
              }}
            />
          ))}
        </View>

        <View style={styles.resendRow}>
          {seconds > 0 ? (
            <Text style={styles.resendMuted}>
              {t("auth.resendIn", { seconds })}
            </Text>
          ) : (
            <Pressable onPress={() => setSeconds(59)}>
              <Text style={styles.resend}>{t("auth.resend")}</Text>
            </Pressable>
          )}
        </View>

        {!complete ? (
          <Text style={styles.errorText}>
            {t("auth.completeCode", { count: LENGTH })}
          </Text>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button
          label={t("common.confirm")}
          size="lg"
          fullWidth
          loading={isSubmitting}
          disabled={!complete || isSubmitting}
          onPress={verify}
        />
      </View>
    </KeyboardScreen>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surface },
    body: { padding: spacing.xl, gap: spacing.xl },
    hint: {
      fontSize: fontSize.md,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    contact: { color: colors.text, fontWeight: "700" },
    boxes: { flexDirection: "row", justifyContent: "center", gap: spacing.md },
    box: {
      width: 56,
      height: 64,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.md,
      textAlign: "center",
      fontSize: fontSize["3xl"],
      fontWeight: "800",
      color: colors.text,
    },
    boxFilled: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    resendRow: { alignItems: "center" },
    resendMuted: { fontSize: fontSize.sm, color: colors.textMuted },
    resend: { fontSize: fontSize.sm, color: colors.primary, fontWeight: "700" },
    errorText: {
      color: colors.danger,
      fontSize: fontSize.sm,
      marginBottom: spacing.sm,
    },
  });
