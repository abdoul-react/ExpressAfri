import {
  fontSize,
  spacing,
  useColors,
  useThemedStyles,
  type Colors,
} from "@/design-system";
import { Icon } from "@/icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useHomeShortcuts } from "./useHomeShortcuts";

/** Nombre d'items pleinement visibles par défaut (au-delà : défilement). */
const VISIBLE_COUNT = 6;

/**
 * Rail de raccourcis sous le carrousel — piloté par le CMS admin.
 * - ≤ 6 items : pas de défilement, distribution équidistante sur toute la largeur.
 * - > 6 items : défilement horizontal ; les 6 premiers occupent exactement
 *   toute la largeur de l'écran (bord à bord), les suivants sont entièrement
 *   masqués jusqu'au coulissement — jamais d'item coupé en deux à l'ouverture.
 */
export function ShortcutRail() {
  const { t, i18n } = useTranslation();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const shortcuts = useHomeShortcuts();
  const { width } = useWindowDimensions();
  const router = useRouter();

  // Libellé : clé de traduction si elle existe, sinon texte brut saisi dans l'admin
  const label = (key: string) => (i18n.exists(key) ? t(key) : key);

  // Navigation selon la destination configurée par l'admin sur chaque raccourci
  const openShortcut = (s: (typeof shortcuts)[number]) => {
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
  // Chaque cellule = 1/6 de la largeur totale : les 6 premières remplissent
  // exactement l'écran, l'espacement vit à l'intérieur de la cellule (contenu
  // centré) → marges identiques des deux côtés, aucun item tronqué.
  const itemWidth = width / VISIBLE_COUNT;

  const renderItem = (s: (typeof shortcuts)[number]) => (
    <Pressable
      key={s.id}
      style={[styles.item, scrollable ? { width: itemWidth } : styles.itemFluid]}
      onPress={() => openShortcut(s)}
    >
      <LinearGradient
        colors={[colors.primarySun, colors.primary]}
        style={styles.circle}
      >
        <Icon name={s.icon} size={22} color={colors.white} />
      </LinearGradient>
      <Text style={styles.label} numberOfLines={1}>
        {label(s.labelKey)}
      </Text>
    </Pressable>
  );

  // ≤ 6 items : rangée fixe, répartition équidistante — aucun défilement
  if (!scrollable) {
    return <View style={styles.fixedRow}>{shortcuts.map(renderItem)}</View>;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      snapToInterval={itemWidth}
      decelerationRate="fast"
    >
      {shortcuts.map(renderItem)}
    </ScrollView>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    fixedRow: {
      flexDirection: "row",
      justifyContent: "space-evenly",
      alignItems: "flex-start",
      paddingVertical: spacing.sm,
    },
    scrollContent: {
      paddingVertical: spacing.sm,
    },
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
  });
