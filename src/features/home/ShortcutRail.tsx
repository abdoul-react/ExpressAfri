import {
  fontSize,
  radius,
  spacing,
  useColors,
  useThemedStyles,
  type Colors,
} from "@/design-system";
import { Icon } from "@/icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHomeShortcuts } from "./useHomeShortcuts";
import { useBrandColors } from "@/features/content/brand";

const VISIBLE_COUNT = 6;

export function ShortcutRail() {
  const { t, i18n } = useTranslation();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const shortcuts = useHomeShortcuts();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c1, c2 } = useBrandColors();
  const [modalVisible, setModalVisible] = useState(false);

  const label = (key: string) => (i18n.exists(key) ? t(key) : key);

  const openShortcut = (s: (typeof shortcuts)[number]) => {
    setModalVisible(false);
    const target = s.target;
    if (!target?.value) return;
    switch (target.type) {
      case "category":
        router.push(`/category/${target.value}` as never);
        break;
      case "section":
        router.push(`/section/${target.value}` as never);
        break;
      case "screen":
        router.push(target.value as never);
        break;
      case "search":
        router.push(`/search?q=${encodeURIComponent(target.value)}` as never);
        break;
    }
  };

  if (shortcuts.length === 0) return null;

  const scrollable = shortcuts.length > VISIBLE_COUNT;
  const itemWidth = width / VISIBLE_COUNT;

  const renderItem = (s: (typeof shortcuts)[number], inModal = false) => (
    <Pressable
      key={s.id}
      style={[
        inModal ? styles.modalItem : styles.item,
        !inModal && (scrollable ? { width: itemWidth } : styles.itemFluid),
      ]}
      onPress={() => openShortcut(s)}
    >
      <LinearGradient
        colors={[c1, c2]}
        style={inModal ? styles.modalCircle : styles.circle}
      >
        <Icon name={s.icon} size={inModal ? 24 : 22} color={colors.white} />
      </LinearGradient>
      <Text
        style={inModal ? styles.modalLabel : styles.label}
        numberOfLines={2}
      >
        {label(s.labelKey)}
      </Text>
    </Pressable>
  );

  const chevronBtn = (
    <Pressable style={styles.chevronBtn} onPress={() => setModalVisible(true)}>
      <Icon name="chevronRight" size={18} color={colors.textMuted} />
    </Pressable>
  );

  const rail = !scrollable ? (
    <View style={styles.fixedRow}>
      {shortcuts.map((s) => renderItem(s))}
      {chevronBtn}
    </View>
  ) : (
    <View style={styles.scrollRow}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        snapToInterval={itemWidth}
        decelerationRate="fast"
        style={{ flex: 1 }}
      >
        {shortcuts.map((s) => renderItem(s))}
      </ScrollView>
      {chevronBtn}
    </View>
  );

  return (
    <>
      {rail}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => setModalVisible(false)}
        />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{t("home.tabForYou")}</Text>
          <ScrollView contentContainerStyle={styles.modalGrid}>
            {shortcuts.map((s) => renderItem(s, true))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    fixedRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.sm,
    },
    scrollRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.sm,
    },
    scrollContent: { paddingVertical: spacing.xs },
    item: { alignItems: "center", gap: 4 },
    itemFluid: { flex: 1, maxWidth: 96 },
    circle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
    },
    label: {
      fontSize: fontSize.xs,
      color: colors.text,
      fontWeight: "600",
      textAlign: "center",
      paddingHorizontal: 2,
    },
    chevronBtn: {
      width: 28,
      alignItems: "center",
      justifyContent: "center",
      paddingRight: spacing.xs,
    },
    // Modal
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
    },
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
      marginBottom: spacing.lg,
    },
    modalGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.lg,
      paddingBottom: spacing.md,
    },
    modalItem: {
      width: "22%",
      alignItems: "center",
      gap: spacing.xs,
    },
    modalCircle: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: "center",
      justifyContent: "center",
    },
    modalLabel: {
      fontSize: fontSize.xs,
      color: colors.text,
      fontWeight: "600",
      textAlign: "center",
    },
  });
