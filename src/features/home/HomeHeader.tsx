import { SearchBar } from "@/components";
import {
  fontSize,
  radius,
  spacing,
  useColors,
  useThemedStyles,
  type Colors,
} from "@/design-system";
import { Icon } from "@/icons";
import { useUnreadCount } from "@/features/messages";
import { BrandMark, useBrandColors } from "@/features/content";
import { hexToRgba } from "@/utils/color";
import type { Category } from "@/types";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

type Props = {
  activeTab: "forYou" | "deals";
  onTabChange: (t: "forYou" | "deals") => void;
  activeCat: string | null;
  onCatChange: (id: string | null) => void;
  categories?: Category[];
};

/**
 * En-tête premium de l'accueil.
 * - Voile dégradé aux couleurs de marque (brand.nameColor1/2), très léger,
 *   posé sur la surface du thème → s'adapte naturellement clair/sombre.
 * - Bloc marque unifié (BrandMark) : logo CMS + nom bicolore.
 * - Onglets avec soulignement dégradé aux couleurs de marque.
 */
export function HomeHeader({
  activeTab,
  onTabChange,
  activeCat,
  onCatChange,
  categories,
}: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const unreadCount = useUnreadCount();
  const { c1, c2 } = useBrandColors();

  // Voile de marque : alpha faible pour rester lisible sur surface claire ou sombre
  const tintTop = hexToRgba(c1, 0.1);
  const tintBottom = hexToRgba(c2, 0.02);

  // Rendu unique pour toute la rangée de navigation : Accueil, Promo et les
  // catégories CMS partagent exactement le même style (texte + soulignement).
  const renderNavItem = (
    key: string,
    label: string,
    active: boolean,
    onPress: () => void,
    accent = false,
  ) => (
    <Pressable key={key} style={styles.tab} onPress={onPress}>
      <Text
        style={[
          styles.tabText,
          active && styles.tabTextActive,
          accent && { color: active ? colors.primary : colors.textSecondary },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {active ? (
        <LinearGradient
          colors={[c1, c2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.underline}
        />
      ) : (
        <View style={styles.underlineGhost} />
      )}
    </Pressable>
  );

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={[tintTop, tintBottom]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* ── Rangée marque : logo + nom stylisé + cloche ─────────────── */}
      <View style={styles.topRow}>
        <BrandMark context="header" logoSize={36} nameSize={22} />
        <Pressable
          hitSlop={8}
          onPress={() => router.push("/messages")}
          style={styles.bellWrap}
          accessibilityRole="button"
          accessibilityLabel={t("home.notifications", "Notifications")}
        >
          <Icon name="bell" size={22} color={colors.text} />
          {unreadCount > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <SearchBar
          onPress={() => router.push("/search")}
          onCameraPress={() => router.push("/camera")}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRowContent}
      >
        {(["forYou", "deals"] as const).map((tab) =>
          renderNavItem(
            tab,
            t(tab === "forYou" ? "home.tabForYou" : "home.tabDeals"),
            activeTab === tab && activeCat === null,
            () => {
              onTabChange(tab);
              onCatChange(null);
            },
            tab === "deals",
          ),
        )}
        {(categories ?? []).map((c) =>
          renderNavItem(c.id, t(c.name), activeCat === c.id, () => onCatChange(c.id)),
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    wrap: {
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
      borderBottomLeftRadius: radius.xl,
      borderBottomRightRadius: radius.xl,
      overflow: "hidden",
      // Ombre douce sous l'en-tête — lecture « premium », séparation nette du contenu
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
      zIndex: 10,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: spacing.sm,
    },
    searchRow: { flexDirection: "row", marginTop: spacing.xs },
    // Pas de padding horizontal ici : `wrap` fournit déjà spacing.lg —
    // « Accueil » démarre ainsi aligné avec le logo et la barre de recherche.
    tabRowContent: {
      gap: spacing.xl,
      marginTop: spacing.md,
      alignItems: "center",
      paddingRight: spacing.lg,
    },
    tab: { alignItems: "center" },
    tabText: {
      fontSize: fontSize.xl,
      fontWeight: "700",
      color: colors.textSecondary,
    },
    tabTextActive: { color: colors.text, fontWeight: "800" },
    // Le soulignement épouse la largeur du libellé (alignSelf: stretch)
    underline: {
      marginTop: 4,
      height: 3,
      alignSelf: "stretch",
      borderRadius: 2,
    },
    // Réserve la hauteur du soulignement pour éviter le saut de mise en page
    underlineGhost: {
      marginTop: 4,
      height: 3,
      alignSelf: "stretch",
      backgroundColor: 'transparent',
    },
    bellWrap: {
      position: 'relative',
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.backgroundSoft,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    bellBadge: {
      position: 'absolute', top: -2, right: -2,
      backgroundColor: colors.sale, borderRadius: 8,
      minWidth: 16, height: 16, paddingHorizontal: 3,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1.5, borderColor: colors.surface,
    },
    bellBadgeText: { color: colors.white, fontSize: 9, fontWeight: '800' },
  });
