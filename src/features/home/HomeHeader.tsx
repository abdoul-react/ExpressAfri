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
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  activeTab: "forYou" | "deals";
  onTabChange: (t: "forYou" | "deals") => void;
  activeCat: string | null;
  onCatChange: (id: string | null) => void;
  categories?: Category[];
};

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
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);

  const tintTop = hexToRgba(c1, 0.1);
  const tintBottom = hexToRgba(c2, 0.02);

  // Tous les items de navigation
  const allNavItems = [
    {
      key: "forYou",
      label: t("home.tabForYou"),
      active: activeTab === "forYou" && activeCat === null,
      onPress: () => { onTabChange("forYou"); onCatChange(null); },
    },
    {
      key: "deals",
      label: t("home.tabDeals"),
      active: activeTab === "deals" && activeCat === null,
      onPress: () => { onTabChange("deals"); onCatChange(null); },
    },
    ...(categories ?? []).map((c) => ({
      key: c.id,
      label: c.name,
      active: activeCat === c.id,
      onPress: () => onCatChange(c.id),
    })),
  ];

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

      {/* Rangée marque */}
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
              <Text style={styles.bellBadgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
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

      {/* Onglets + bouton > */}
      <View style={styles.tabRow}>
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
              () => { onTabChange(tab); onCatChange(null); },
              tab === "deals",
            ),
          )}
          {(categories ?? []).map((c) =>
            renderNavItem(c.id, c.name, activeCat === c.id, () => onCatChange(c.id)),
          )}
        </ScrollView>

        <Pressable style={styles.chevronBtn} onPress={() => setModalVisible(true)}>
          <Icon name="chevronRight" size={16} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* Modale liste complète */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setModalVisible(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{t("home.tabForYou")}</Text>
          <ScrollView>
            {allNavItems.map((item) => (
              <Pressable
                key={item.key}
                style={styles.modalRow}
                onPress={() => { item.onPress(); setModalVisible(false); }}
              >
                <Text style={[styles.modalRowText, item.active && { color: c1, fontWeight: "800" }]}>
                  {item.label}
                </Text>
                {item.active && (
                  <LinearGradient
                    colors={[c1, c2]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.modalActiveDot}
                  />
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
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
      shadowColor: "#000",
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
    tabRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: spacing.md,
    },
    tabRowContent: {
      gap: spacing.xl,
      alignItems: "center",
      paddingRight: spacing.sm,
    },
    tab: { alignItems: "center" },
    tabText: {
      fontSize: fontSize.xl,
      fontWeight: "700",
      color: colors.textSecondary,
    },
    tabTextActive: { color: colors.text, fontWeight: "800" },
    underline: {
      marginTop: 4,
      height: 3,
      alignSelf: "stretch",
      borderRadius: 2,
    },
    underlineGhost: {
      marginTop: 4,
      height: 3,
      alignSelf: "stretch",
      backgroundColor: "transparent",
    },
    chevronBtn: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      justifyContent: "center",
      alignItems: "center",
    },
    bellWrap: {
      position: "relative",
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.backgroundSoft,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    bellBadge: {
      position: "absolute",
      top: -2,
      right: -2,
      backgroundColor: colors.sale,
      borderRadius: 8,
      minWidth: 16,
      height: 16,
      paddingHorizontal: 3,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: colors.surface,
    },
    bellBadgeText: { color: colors.white, fontSize: 9, fontWeight: "800" },
    // Modal
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingTop: spacing.sm,
      paddingHorizontal: spacing.lg,
      maxHeight: "70%",
    },
    sheetHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: "center",
      marginBottom: spacing.md,
    },
    sheetTitle: {
      fontSize: fontSize.lg,
      fontWeight: "800",
      color: colors.text,
      marginBottom: spacing.sm,
    },
    modalRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    modalRowText: {
      fontSize: fontSize.md,
      fontWeight: "600",
      color: colors.text,
    },
    modalActiveDot: {
      width: 24,
      height: 3,
      borderRadius: 2,
    },
  });
