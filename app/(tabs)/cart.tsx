import {
  BrandHeaderGradient,
  Button,
  EmptyState,
  Price,
  ProductCard,
  QuantityStepper,
  StatusState,
} from "@/components";
import {
  fontSize,
  radius,
  spacing,
  useColors,
  useThemedStyles,
  type Colors,
} from "@/design-system";
import { useCartData, useCartRecommendations } from "@/features/cart";
import { useAppSettings } from "@/features/content";
import { usePrice } from "@/hooks/usePrice";
import { useWishlistStore } from "@/store/wishlistStore";
import { Icon } from "@/icons";
import { useCartStore } from "@/store/cartStore";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const { priceXof } = usePrice();
  const { getNumber } = useAppSettings();
  const FREE_SHIP_THRESHOLD_XOF = getNumber('commerce.freeShippingThreshold', 10000);
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);

  const { items, isLoading, isError, refetch } = useCartData();
  const setQuantity = useCartStore((s) => s.setQuantity);
  const toggleSelected = useCartStore((s) => s.toggleSelected);
  const setAllSelected = useCartStore((s) => s.setAllSelected);
  const remove = useCartStore((s) => s.remove);
  const suggestions = useCartRecommendations();
  const toggleWish = useWishlistStore((s) => s.toggle);
  const addToCart = useCartStore((s) => s.add);
  const wishedIds = useWishlistStore((s) => s.ids);

  const selected = items.filter((i) => i.selected);
  const subtotal = selected.reduce(
    (sum, i) => sum + i.priceUsd * i.quantity,
    0,
  );
  const allSelected = items.length > 0 && items.every((i) => i.selected);
  const progress = Math.min(1, subtotal / FREE_SHIP_THRESHOLD_XOF);
  const remaining = Math.max(0, FREE_SHIP_THRESHOLD_XOF - subtotal);

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header count={0} />
        <StatusState
          status="loading"
          title={t("cart.loadingTitle")}
          hint={t("cart.verifying")}
        />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header count={0} />
        <StatusState
          status="error"
          title={t("cart.errorTitle")}
          hint={t("cart.connectionError")}
          actionLabel={t("common.retry")}
          onAction={() => refetch()}
        />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header count={0} />
        <EmptyState
          icon="cart"
          title={t("cart.empty")}
          hint={t("cart.emptyHint")}
          actionLabel={t("checkout.continueShopping")}
          onAction={() => router.replace("/")}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header count={items.length} />

      {/* Barre livraison gratuite */}
      <View style={styles.freeBar}>
        <Icon name="truck" size={18} color={colors.freeShipping} />
        <Text style={styles.freeText}>
          {remaining > 0
            ? `${t("cart.freeShipProgress")} (${priceXof(remaining)})`
            : t("home.freeShipFrom")}
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 116 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {items.map((item) => (
          <View
            key={item.productId + (item.variantLabel ?? "")}
            style={styles.item}
          >
            <Pressable
              onPress={() => toggleSelected(item.productId)}
              hitSlop={8}
            >
              <View style={[styles.check, item.selected && styles.checkOn]}>
                {item.selected && (
                  <Icon name="check" size={14} color={colors.white} />
                )}
              </View>
            </Pressable>
            <Image
              source={{ uri: item.image }}
              style={styles.itemImg}
              contentFit="cover"
            />
            <View style={styles.itemBody}>
              <Text style={[styles.itemTitle, styles.itemTitleSpace]} numberOfLines={2}>
                {item.title}
              </Text>
              {item.variantLabel && (
                <Text style={styles.variant}>{item.variantLabel}</Text>
              )}
              <View style={styles.itemFooter}>
                {/* Le prix peut rétrécir ; le compteur garde sa largeur et reste dans la carte */}
                <View style={styles.itemPriceWrap}>
                  <Price priceUsd={item.priceUsd} size="sm" />
                </View>
                <QuantityStepper
                  compact
                  value={item.quantity}
                  onChange={(v) => setQuantity(item.productId, v)}
                />
              </View>
            </View>
            {/* Corbeille en haut à droite de la carte */}
            <Pressable
              onPress={() => remove(item.productId)}
              hitSlop={8}
              style={styles.trash}
            >
              <Icon name="trash" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
        ))}

        {/* Vous aimerez aussi — produits de la section choisie par l'admin */}
        {suggestions.length > 0 && (
          <>
            <Text style={styles.suggestTitle}>{t("cart.youMayLike")}</Text>
            <View style={styles.suggestGrid}>
              {suggestions.map((p) => (
                <View key={p.id} style={{ width: "47%", marginBottom: spacing.sm }}>
                  <ProductCard product={p} isWished={wishedIds.includes(p.id)} onToggleWish={toggleWish} onAddToCart={addToCart} />
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* Barre de paiement collante — 2 lignes pour supporter les gros montants (₦, FCFA…).
          Compacte : le paddingBottom absorbe l'inset système sans l'additionner. */}
      <View
        style={[
          styles.checkoutBar,
          { paddingBottom: Math.max(insets.bottom, spacing.sm) },
        ]}
      >
        <View style={styles.checkoutTopRow}>
          <Pressable
            style={styles.selectAll}
            onPress={() => setAllSelected(!allSelected)}
          >
            <View style={[styles.check, allSelected && styles.checkOn]}>
              {allSelected && (
                <Icon name="check" size={14} color={colors.white} />
              )}
            </View>
            <Text style={styles.selectAllText} numberOfLines={1}>
              {t("cart.selectAll")}
            </Text>
          </Pressable>
          <View style={styles.totalWrap}>
            <Text style={styles.totalLabel}>{t("common.total")}</Text>
            <Price priceUsd={subtotal} size="md" />
          </View>
        </View>
        <Button
          label={`${t("cart.checkout")} (${selected.length})`}
          onPress={() => router.push("/checkout")}
          disabled={selected.length === 0}
          size="md"
          fullWidth
        />
      </View>
    </View>
  );
}

function Header({ count }: { count: number }) {
  const { t } = useTranslation();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.header}>
      <BrandHeaderGradient />
      <Text style={styles.headerTitle}>
        {t("cart.title")} {count > 0 ? `(${count})` : ""}
      </Text>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: colors.surface,
    },
    headerTitle: {
      fontSize: fontSize["2xl"],
      fontWeight: "800",
      color: colors.text,
    },
    freeBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
    },
    freeText: {
      fontSize: fontSize.sm,
      color: colors.text,
      flex: 1,
      fontWeight: "600",
    },
    progressTrack: {
      height: 6,
      backgroundColor: colors.border,
      borderRadius: 3,
      marginHorizontal: spacing.lg,
      marginTop: spacing.sm,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      backgroundColor: colors.freeShipping,
      borderRadius: 3,
    },
    item: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: colors.surface,
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      padding: spacing.md,
      borderRadius: radius.lg,
    },
    check: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: colors.borderStrong,
      alignItems: "center",
      justifyContent: "center",
    },
    checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    itemImg: {
      width: 72,
      height: 72,
      borderRadius: radius.md,
      backgroundColor: colors.background,
    },
    // minWidth: 0 : autorise la colonne à rétrécir dans la ligne flex (sinon le contenu déborde de la carte)
    itemBody: { flex: 1, minWidth: 0, gap: 4 },
    itemTitle: { fontSize: fontSize.md, color: colors.text, lineHeight: 18 },
    // Réserve la place de la corbeille (haut droit) pour que le titre ne passe pas dessous
    itemTitleSpace: { paddingRight: 28 },
    variant: { fontSize: fontSize.xs, color: colors.textMuted },
    itemFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    itemPriceWrap: { flexShrink: 1, minWidth: 0 },
    trash: {
      position: "absolute",
      top: spacing.sm,
      right: spacing.sm,
      padding: 4,
    },
    suggestTitle: {
      fontSize: fontSize.lg,
      fontWeight: "800",
      color: colors.text,
      padding: spacing.lg,
    },
    suggestGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
    },
    checkoutBar: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xs,
      gap: spacing.xs,
    },
    checkoutTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
    },
    selectAll: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      flexShrink: 0,
    },
    selectAllText: { fontSize: fontSize.sm, color: colors.text },
    // Le total peut rétrécir mais reste aligné à droite, sur sa propre ligne avec le label
    totalWrap: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: spacing.sm,
      flexShrink: 1,
      minWidth: 0,
    },
    totalLabel: { fontSize: fontSize.sm, color: colors.textMuted },
  });
