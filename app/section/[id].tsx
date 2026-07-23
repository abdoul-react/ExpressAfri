import { ProductCard, SkeletonProductGrid, StatusState } from "@/components";
import { spacing, useThemedStyles, type Colors } from "@/design-system";
import { ScreenHeader } from "@/components";
import { apiAdapter } from "@/infrastructure/api/apiAdapter";
import { useCartStore } from "@/store/cartStore";
import { useCartBadge } from "@/hooks/useCartBadge";
import { useWishlistStore } from "@/store/wishlistStore";
import { FlashList } from "@shopify/flash-list";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import type { Product } from "@/types";

type SectionDetail = {
  id: string;
  title: string;
  displayStyle: string;
  items: Product[];
};

/**
 * Écran « Voir tout » d'une section d'accueil : le titre de la section
 * et l'intégralité de ses produits en grille 2 colonnes.
 */
export default function SectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const cartBadge = useCartBadge();
  const { t } = useTranslation();
  const toggleWish = useWishlistStore((s) => s.toggle);
  const wishedIds = useWishlistStore((s) => s.ids);
  const addToCart = useCartStore((s) => s.add);

  const { data, isLoading } = useQuery<SectionDetail>({
    queryKey: ["section", id],
    queryFn: () => apiAdapter.get(`/mobile/feed-sections/${id}/products`),
    enabled: !!id,
  });

  if (!id) return null;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={data?.title ?? t("common.loading", "Chargement…")}
        actions={[{ icon: "cart", badge: cartBadge, onPress: () => router.push("/cart") }]}
      />
      {isLoading ? (
        <SkeletonProductGrid />
      ) : !data?.items?.length ? (
        <StatusState
          status="empty"
          title={t("sectionScreen.empty", "Aucun produit dans cette sélection")}
          actionLabel={t("product.back", "Retour")}
          onAction={() => router.back()}
        />
      ) : (
        <FlashList
          data={data.items}
          numColumns={2}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: spacing.xxl, paddingTop: spacing.sm }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <View
              style={{
                flex: 1,
                marginLeft: index % 2 === 0 ? spacing.lg : spacing.sm / 2,
                marginRight: index % 2 === 0 ? spacing.sm / 2 : spacing.lg,
                marginBottom: spacing.sm,
              }}
            >
              <ProductCard
                product={item}
                isWished={wishedIds.includes(item.id)}
                onToggleWish={toggleWish}
                onAddToCart={addToCart}
              />
            </View>
          )}
        />
      )}
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
  });
