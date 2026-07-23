import { Price } from "@/components";
import {
  fontSize,
  radius,
  spacing,
  useColors,
  useThemedStyles,
  type Colors,
} from "@/design-system";
import { Icon } from "@/icons";
import type { Product } from "@/types";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  visible: boolean;
  onClose: () => void;
  onDiscover: () => void;
  hero: Product | null;
};

/** Pop-up d'accueil "Nouvel acheteur" (comme les captures AliExpress). */
export function PromoModal({ visible, onClose, onDiscover, hero }: Props) {
  const { t } = useTranslation();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  // hero product is provided by the parent (no direct mock imports here)
  if (!hero) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.headline}>{t("home.bundleBadge")}</Text>
          <Text style={styles.sub}>{t("common.newBuyerOnly")}</Text>

          <View style={styles.card}>
            <Image
              source={{ uri: hero.images[0] }}
              style={styles.image}
              contentFit="cover"
            />
            <View style={styles.pricePill}>
              <Price priceUsd={hero.priceUsd} size="sm" />
            </View>
          </View>

          <LinearGradient
            colors={[colors.primarySun, colors.primary]}
            style={styles.box}
          >
            <Text style={styles.boxTitle}>{t("home.summerSale")}</Text>
          </LinearGradient>

          <Pressable style={styles.cta} onPress={onDiscover}>
            <Text style={styles.ctaText}>{t("common.discover")}</Text>
          </Pressable>
        </View>

        <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={10}>
          <Icon name="close" size={26} color={colors.white} />
        </Pressable>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      alignItems: "center",
      justifyContent: "center",
    },
    sheet: { width: 300, alignItems: "center" },
    headline: {
      color: "#DFFF3E",
      fontSize: fontSize["2xl"],
      fontWeight: "900",
      textAlign: "center",
    },
    sub: {
      color: colors.white,
      fontSize: fontSize.md,
      fontWeight: "600",
      marginTop: 4,
      marginBottom: spacing.md,
    },
    card: {
      width: 200,
      backgroundColor: colors.white,
      borderRadius: radius.lg,
      padding: spacing.sm,
      alignItems: "center",
    },
    image: {
      width: 180,
      height: 180,
      borderRadius: radius.md,
      backgroundColor: colors.background,
    },
    pricePill: { marginTop: spacing.sm, marginBottom: spacing.xs },
    box: {
      width: 240,
      borderRadius: radius.md,
      padding: spacing.md,
      alignItems: "center",
      marginTop: -12,
    },
    boxTitle: { color: colors.white, fontWeight: "800", fontSize: fontSize.md },
    cta: {
      marginTop: spacing.lg,
      backgroundColor: "#DFFF3E",
      borderRadius: radius.pill,
      paddingHorizontal: spacing.giant,
      paddingVertical: spacing.md,
    },
    ctaText: { color: colors.text, fontWeight: "800", fontSize: fontSize.lg },
    closeBtn: {
      marginTop: spacing.xxl,
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 2,
      borderColor: colors.white,
      alignItems: "center",
      justifyContent: "center",
    },
  });
