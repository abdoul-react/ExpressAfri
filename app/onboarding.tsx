import { Button } from "@/components";
import {
  fontSize,
  spacing,
  useColors,
  useThemedStyles,
  type Colors,
} from "@/design-system";
import { Icon, IconName } from "@/icons";
import { BrandMark } from "@/features/content";
import { useAuthStore } from "@/store/authStore";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Onboarding() {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);

  const SLIDES: { icon: IconName; title: string; text: string }[] = [
    {
      icon: "globe",
      title: t("onboarding.tagline"),
      text: t("onboarding.millions"),
    },
    {
      icon: "truck",
      title: t("onboarding.livraisonTitle"),
      text: t("onboarding.tracking"),
    },
    {
      icon: "wallet",
      title: t("onboarding.payezTitle"),
      text: t("onboarding.payment"),
    },
  ];

  const finish = () => {
    completeOnboarding();
    router.replace("/auth/login");
  };

  const next = () => {
    if (index < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
      setIndex(index + 1);
    } else {
      finish();
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <BrandMark context="header" logoSize={30} nameSize={18} />
        <Pressable
          onPress={finish}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t("onboarding.passOnboarding")}
        >
          <Text style={styles.skip}>{t("onboarding.skip")}</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) =>
          setIndex(Math.round(e.nativeEvent.contentOffset.x / width))
        }
      >
        {SLIDES.map((s, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            <LinearGradient
              colors={[colors.primarySun, colors.primary]}
              style={styles.iconCircle}
            >
              <Icon
                name={s.icon}
                size={72}
                color={colors.white}
                strokeWidth={1.6}
              />
            </LinearGradient>
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.text}>{s.text}</Text>
          </View>
        ))}
      </ScrollView>

      <View
        style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}
      >
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === index && styles.dotActive]}
            />
          ))}
        </View>
        <Button
          label={index === SLIDES.length - 1 ? t("onboarding.start") : t("onboarding.next")}
          icon="arrowRight"
          size="lg"
          fullWidth
          onPress={next}
        />
      </View>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surface },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    skip: {
      color: colors.textSecondary,
      fontSize: fontSize.md,
      fontWeight: "600",
    },
    slide: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.xxxl,
      gap: spacing.lg,
    },
    iconCircle: {
      width: 160,
      height: 160,
      borderRadius: 80,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.xl,
    },
    title: {
      fontSize: fontSize["3xl"],
      fontWeight: "900",
      color: colors.text,
      textAlign: "center",
    },
    text: {
      fontSize: fontSize.md,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 22,
    },
    footer: { paddingHorizontal: spacing.xl, gap: spacing.lg },
    progressRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    progressText: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      fontWeight: "700",
    },
    dots: { flexDirection: "row", justifyContent: "center", gap: 6 },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: colors.border,
    },
    dotActive: { backgroundColor: colors.primary, width: 20 },
  });
