import { Badge, Price, ProductCard, Rating, ScreenHeader, SkeletonProductDetail, StatusState } from "@/components";
import {
  fontSize,
  radius,
  spacing,
  useColors,
  useThemedStyles,
  type Colors,
} from "@/design-system";
import { useProduct } from "@/features/product";
import { useAppSettings } from "@/features/content";
import { usePrice } from "@/hooks/usePrice";
import { useProductReviews, useSubmitReview } from "@/features/reviews";
import { Icon, type IconName } from "@/icons";
import { useCartStore } from "@/store/cartStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { useAuthStore } from "@/store/authStore";
import { COUNTRIES, useSettingsStore } from "@/store/settingsStore";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ProductScreen() {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();

  const { product, related, isLoading } = useProduct(id!);
  const { get, getNumber } = useAppSettings();
  const { priceXof } = usePrice();
  // Seuil de livraison gratuite (unité de référence, comme le panier). 0 = tout
  // est livré gratuitement ; sinon on affiche « Gratuite dès X » — honnête.
  const freeShipThreshold = getNumber("commerce.freeShippingThreshold", 10000);
  const { reviews } = useProductReviews(id);
  const submitReview = useSubmitReview(id!);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const countryCode = useSettingsStore((s) => s.country);
  const country = COUNTRIES.find((c) => c.code === countryCode);
  const [imgIndex, setImgIndex] = useState(0);
  const [selectedVariants, setSelectedVariants] = useState<
    Record<string, string>
  >({});
  const [reviewOpen, setReviewOpen] = useState(false);
  const [draftRating, setDraftRating] = useState(5);
  const [draftText, setDraftText] = useState("");

  const openReview = () => {
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }
    setDraftRating(5);
    setDraftText("");
    setReviewOpen(true);
  };

  const sendReview = () => {
    submitReview.mutate(
      { rating: draftRating, content: draftText.trim() || undefined },
      {
        onSuccess: () => setReviewOpen(false),
        onError: () =>
          Alert.alert(
            t("common.error", "Erreur"),
            t("product.reviewFailed", "Impossible d'envoyer votre avis. Réessayez."),
          ),
      },
    );
  };

  const addToCart = useCartStore((s) => s.add);
  const cartCount = useCartStore((s) =>
    s.items.reduce((n, i) => n + i.quantity, 0),
  );
  const isWished = useWishlistStore((s) =>
    product ? s.ids.includes(product.id) : false,
  );
  const toggleWish = useWishlistStore((s) => s.toggle);
  const wishedIds = useWishlistStore((s) => s.ids);

  // Libellé composé dans l'ordre des groupes (ex: "S · Rouge"), pas dans
  // l'ordre des clics de l'utilisateur.
  const variantGroups = product?.variants ?? [];
  const missingGroups = variantGroups.filter((g) => !selectedVariants[g.key]);
  const variantLabel =
    variantGroups
      .map((g) => selectedVariants[g.key])
      .filter(Boolean)
      .join(" · ") || undefined;

  // Sélection structurée (nom d'attribut → valeur) : le serveur s'en sert pour
  // résoudre la variante exacte et décrémenter son stock. Undefined si aucune.
  const selectedAttributes = variantGroups
    .map((g) => ({ name: g.key, value: selectedVariants[g.key] }))
    .filter((a) => !!a.value);
  const variantAttributes =
    selectedAttributes.length > 0 ? selectedAttributes : undefined;

  // E-commerce standard : impossible d'acheter sans avoir choisi ses options
  // (taille, couleur…). Retourne false et informe si un choix manque.
  const ensureVariantsSelected = (): boolean => {
    if (missingGroups.length === 0) return true;
    Alert.alert(
      t("product.selectVariant"),
      t("product.selectOptionsFirst", {
        options: missingGroups.map((g) => t(g.labelKey)).join(", "),
      }),
    );
    return false;
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <SkeletonProductDetail />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.container}>
        <StatusState
          status="empty"
          title={t("product.notFound")}
          hint={t("product.notAvailable")}
          actionLabel={t("product.back")}
          onAction={() => router.back()}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        transparent
        actions={[
          { icon: "share", onPress: () => { product && Share.share({ message: `${product.title} — ${t("common.shareFrom")} ${get('app.name', 'ExpressAfri')}` }); } },
          {
            icon: "cart",
            onPress: () => router.push("/cart"),
            badge: cartCount || undefined,
          },
        ]}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 70 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Galerie */}
        <View>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) =>
              setImgIndex(Math.round(e.nativeEvent.contentOffset.x / width))
            }
          >
            {product.images.map((uri) => (
              <Image
                key={uri}
                source={{ uri }}
                style={{ width, height: width }}
                contentFit="cover"
              />
            ))}
          </ScrollView>
          <View style={styles.counter}>
            <Text style={styles.counterText}>
              {imgIndex + 1}/{product.images.length}
            </Text>
          </View>
        </View>

        {/* Prix & titre */}
        <View style={styles.section}>
          <View style={styles.priceRow}>
            <Price
              priceUsd={product.priceUsd}
              originalPriceUsd={product.originalPriceUsd}
              size="lg"
            />
            {product.discountPercent ? (
              <Badge label={`-${product.discountPercent}%`} tone="sale" />
            ) : null}
          </View>
          <Rating
            value={product.rating}
            soldCount={product.soldCount}
            size={14}
          />
          <Text style={styles.title}>{product.title}</Text>
        </View>

        {/* Sélecteur d'options : le client choisit sa déclinaison (taille,
            couleur…) en tapant sur les boutons — obligatoire avant l'achat. */}
        {variantGroups.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("product.selectVariant")}</Text>
            {variantGroups.map((group) => (
              <View key={group.key} style={{ marginTop: spacing.md }}>
                <Text style={styles.label}>
                  {t(group.labelKey)}
                  {selectedVariants[group.key] ? (
                    <Text style={styles.labelSelected}>
                      {"  ·  "}
                      {selectedVariants[group.key]}
                    </Text>
                  ) : null}
                </Text>
                <View style={styles.variantRow}>
                  {group.options.map((opt) => {
                    const active = selectedVariants[group.key] === opt.id;
                    const outOfStock = (opt as any).stock === 0;
                    return (
                      <Pressable
                        key={opt.id}
                        style={[
                          styles.variant,
                          active && styles.variantActive,
                          outOfStock && styles.variantDisabled,
                        ]}
                        onPress={() => {
                          if (outOfStock) return;
                          setSelectedVariants((prev) => ({
                            ...prev,
                            [group.key]: opt.id,
                          }));
                        }}
                      >
                        {opt.swatch && (
                          <View
                            style={[styles.swatch, { backgroundColor: opt.swatch }]}
                          />
                        )}
                        <Text
                          style={[
                            styles.variantText,
                            active && styles.variantTextActive,
                            outOfStock && styles.variantTextDisabled,
                          ]}
                        >
                          {opt.label}
                        </Text>
                        {outOfStock ? (
                          <Text style={styles.epuiseText}>{t("product.outOfStock", "Épuisé")}</Text>
                        ) : active ? (
                          <Icon name="check" size={14} color={colors.primary} />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Garanties */}
        <View style={styles.section}>
          <Guarantee
            icon="truck"
            title={t("product.shipping")}
            value={
              freeShipThreshold > 0
                ? t("product.freeShippingFrom", { amount: priceXof(freeShipThreshold) })
                : t("common.free")
            }
          />
          <Guarantee
            icon="shield"
            title={t("product.buyerProtection")}
            value={t("product.freeReturns")}
          />
          <Guarantee
            icon="location"
            title={t("product.shipsTo")}
            value={country?.name ?? 'Niger'}
          />
        </View>

        {/* Spécifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("product.specifications")}</Text>
          {product.specs?.map((s) => (
            <View key={s.label} style={styles.specRow}>
              <Text style={styles.specLabel}>{s.label}</Text>
              <Text style={styles.specValue}>{s.value}</Text>
            </View>
          ))}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("product.description")}</Text>
          <Text style={styles.desc}>{product.description}</Text>
        </View>

        {/* Avis */}
        <View style={styles.section}>
          <View style={styles.reviewHeader}>
            <Text style={styles.sectionTitle}>
              {t("product.customerReviews")}
            </Text>
            <View style={styles.reviewScore}>
              <Icon name="star" size={16} color={colors.star} fill />
              <Text style={styles.scoreText}>{product.rating.toFixed(1)}</Text>
              <Text style={styles.scoreCount}>({product.reviewCount})</Text>
            </View>
          </View>

          {reviews.length === 0 ? (
            <Text style={styles.reviewEmpty}>
              {t("product.noReviews", "Aucun avis pour le moment. Soyez le premier !")}
            </Text>
          ) : (
            reviews.map((r) => (
              <View key={r.id} style={styles.review}>
                {r.authorAvatar ? (
                  <Image source={{ uri: r.authorAvatar }} style={styles.reviewAvatar} />
                ) : (
                  <View style={[styles.reviewAvatar, styles.reviewAvatarFallback]}>
                    <Icon name="account" size={18} color={colors.textMuted} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <View style={styles.reviewNameRow}>
                    <Text style={styles.reviewName}>{r.authorName}</Text>
                    {r.isVerified && (
                      <View style={styles.verifiedBadge}>
                        <Icon name="shield" size={10} color={colors.secondary} />
                        <Text style={styles.verifiedText}>
                          {t("product.verifiedPurchase", "Achat vérifié")}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.stars}>
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Icon
                        key={s}
                        name="star"
                        size={12}
                        color={s < r.rating ? colors.star : colors.border}
                        fill
                      />
                    ))}
                  </View>
                  {r.title ? <Text style={styles.reviewName}>{r.title}</Text> : null}
                  {r.content ? <Text style={styles.reviewText}>{r.content}</Text> : null}
                </View>
              </View>
            ))
          )}

          <Pressable style={styles.writeReviewBtn} onPress={openReview}>
            <Icon name="edit" size={16} color={colors.primary} />
            <Text style={styles.writeReviewText}>
              {t("product.writeReview", "Donner mon avis")}
            </Text>
          </Pressable>
        </View>

        {/* Produits similaires */}
        <Text style={styles.sectionTitle2}>{t("product.relatedProducts")}</Text>
        <View style={styles.relatedGrid}>
          {related.map((p) => (
            <View key={p.id} style={{ width: "47%", marginBottom: spacing.sm }}>
              <ProductCard product={p} isWished={wishedIds.includes(p.id)} onToggleWish={toggleWish} onAddToCart={addToCart} />
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Modale : donner mon avis */}
      <Modal visible={reviewOpen} transparent animationType="slide" onRequestClose={() => setReviewOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setReviewOpen(false)} />
        <View style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Text style={styles.modalTitle}>{t("product.writeReview", "Donner mon avis")}</Text>
          <View style={styles.ratingPicker}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setDraftRating(n)} hitSlop={6}>
                <Icon
                  name="star"
                  size={32}
                  color={n <= draftRating ? colors.star : colors.border}
                  fill
                />
              </Pressable>
            ))}
          </View>
          <TextInput
            style={styles.reviewInput}
            placeholder={t("product.reviewPlaceholder", "Partagez votre expérience (facultatif)")}
            placeholderTextColor={colors.textMuted}
            value={draftText}
            onChangeText={setDraftText}
            multiline
            maxLength={500}
          />
          <Pressable
            style={[styles.submitReviewBtn, submitReview.isPending && { opacity: 0.6 }]}
            onPress={sendReview}
            disabled={submitReview.isPending}
          >
            {submitReview.isPending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.submitReviewText}>{t("common.send", "Envoyer")}</Text>
            )}
          </Pressable>
        </View>
      </Modal>

      {/* Barre d'action */}
      <View
        style={[
          styles.actionBar,
          { paddingBottom: insets.bottom + spacing.sm },
        ]}
      >
        <Pressable
          style={styles.actionIcon}
          onPress={() => toggleWish(product.id)}
        >
          <Icon
            name="heart"
            size={24}
            color={isWished ? colors.sale : colors.text}
            fill={isWished}
          />
        </Pressable>
        <Pressable
          style={[styles.actionBtn, styles.cartBtn]}
          onPress={() => {
            if (!ensureVariantsSelected()) return;
            addToCart(product, 1, variantLabel, variantAttributes);
          }}
        >
          <Text
            style={styles.cartBtnText}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {t("common.addToCart")}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.actionBtn, styles.buyBtn]}
          onPress={() => {
            if (!ensureVariantsSelected()) return;
            addToCart(product, 1, variantLabel, variantAttributes);
            router.push("/checkout");
          }}
        >
          <Text
            style={styles.buyBtnText}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {t("common.buyNow")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function Guarantee({
  icon,
  title,
  value,
}: {
  icon: IconName;
  title: string;
  value: string;
}) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  return (
    <View style={styles.guarantee}>
      <Icon name={icon} size={18} color={colors.secondary} />
      <Text style={styles.guaranteeTitle}>{title}</Text>
      <Text style={styles.guaranteeValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    counter: {
      position: "absolute",
      bottom: spacing.md,
      right: spacing.lg,
      backgroundColor: "rgba(0,0,0,0.5)",
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: 3,
    },
    counterText: {
      color: colors.white,
      fontSize: fontSize.xs,
      fontWeight: "700",
    },
    section: {
      backgroundColor: colors.surface,
      padding: spacing.lg,
      marginTop: spacing.sm,
      gap: spacing.sm,
    },
    priceRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    title: {
      fontSize: fontSize.lg,
      color: colors.text,
      fontWeight: "600",
      lineHeight: 22,
    },
    label: { fontSize: fontSize.md, fontWeight: "700", color: colors.text },
    labelSelected: { fontSize: fontSize.md, fontWeight: "700", color: colors.primary },
    variantRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    variant: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    variantActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    variantText: { fontSize: fontSize.sm, color: colors.text },
    variantTextActive: { color: colors.primary, fontWeight: "700" },
    variantDisabled: { borderColor: colors.border, opacity: 0.45 },
    variantTextDisabled: { color: colors.textMuted },
    epuiseText: { fontSize: fontSize.xs, color: colors.textMuted, fontStyle: "italic" },
    swatch: {
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    guarantee: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    guaranteeTitle: { fontSize: fontSize.sm, color: colors.textSecondary },
    guaranteeValue: {
      fontSize: fontSize.sm,
      color: colors.text,
      fontWeight: "600",
      marginLeft: "auto",
    },
    sectionTitle: {
      fontSize: fontSize.lg,
      fontWeight: "800",
      color: colors.text,
    },
    sectionTitle2: {
      fontSize: fontSize.xl,
      fontWeight: "800",
      color: colors.text,
      padding: spacing.lg,
    },
    specRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 4,
    },
    specLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
    specValue: { fontSize: fontSize.sm, color: colors.text, fontWeight: "600" },
    desc: {
      fontSize: fontSize.md,
      color: colors.textSecondary,
      lineHeight: 21,
    },
    reviewHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    reviewScore: { flexDirection: "row", alignItems: "center", gap: 4 },
    scoreText: { fontSize: fontSize.lg, fontWeight: "800", color: colors.text },
    scoreCount: { fontSize: fontSize.sm, color: colors.textMuted },
    review: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
    reviewAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.background,
    },
    reviewAvatarFallback: { alignItems: "center", justifyContent: "center" },
    reviewNameRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    reviewName: {
      fontSize: fontSize.sm,
      fontWeight: "700",
      color: colors.text,
    },
    verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 2 },
    verifiedText: { fontSize: fontSize.xs, color: colors.secondary, fontWeight: "600" },
    stars: { flexDirection: "row", gap: 2, marginVertical: 2 },
    reviewText: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      lineHeight: 19,
    },
    reviewEmpty: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
      paddingVertical: spacing.md,
    },
    writeReviewBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      marginTop: spacing.md,
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderRadius: radius.pill,
      paddingVertical: spacing.sm,
    },
    writeReviewText: { color: colors.primary, fontWeight: "800", fontSize: fontSize.sm },
    modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
    modalSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.md,
    },
    modalTitle: { fontSize: fontSize.lg, fontWeight: "800", color: colors.text },
    ratingPicker: { flexDirection: "row", gap: spacing.sm, alignSelf: "center" },
    reviewInput: {
      minHeight: 90,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: spacing.md,
      fontSize: fontSize.md,
      color: colors.text,
      textAlignVertical: "top",
    },
    submitReviewBtn: {
      height: 48,
      borderRadius: radius.pill,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    submitReviewText: { color: colors.white, fontWeight: "800", fontSize: fontSize.md },
    relatedGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
    },
    actionBar: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
    },
    actionIcon: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    actionBtn: {
      flex: 1,
      height: 46,
      borderRadius: radius.pill,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.xs,
    },
    cartBtn: {
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    cartBtnText: {
      color: colors.primary,
      fontWeight: "800",
      fontSize: fontSize.sm,
    },
    buyBtn: { backgroundColor: colors.primary },
    buyBtnText: {
      color: colors.white,
      fontWeight: "800",
      fontSize: fontSize.sm,
    },
  });
