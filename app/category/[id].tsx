import { ProductCard, ScreenHeader, SkeletonProductGrid, StatusState } from "@/components";
import { spacing, useThemedStyles, type Colors } from "@/design-system";
import { catalogService } from "@/features/catalog";
import { useCartStore } from "@/store/cartStore";
import { useCartBadge } from "@/hooks/useCartBadge";
import { useWishlistStore } from "@/store/wishlistStore";
import { FlashList } from "@shopify/flash-list";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import type { Category, Product } from "@/types";

/**
 * Écran catégorie : tous les produits d'une catégorie en grille 2 colonnes.
 * Ouvert par les raccourcis de l'accueil et les onglets de navigation.
 */
export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const cartBadge = useCartBadge();
  const { t } = useTranslation();
  const toggleWish = useWishlistStore((s) => s.toggle);
  const wishedIds = useWishlistStore((s) => s.ids);
  const addToCart = useCartStore((s) => s.add);

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["category-products", id],
    queryFn: () => catalogService.getByCategory(id!),
    enabled: !!id,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => catalogService.getCategories(),
  });
  const category = categories.find((c) => c.id === id);

  if (!id) return null;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={category ? t(category.name, category.name) : ""}
        actions={[
          { icon: "search", onPress: () => router.push("/search") },
          { icon: "cart", badge: cartBadge, onPress: () => router.push("/cart") },
        ]}
      />
      {isLoading ? (
        <SkeletonProductGrid />
      ) : products.length === 0 ? (
        <StatusState
          status="empty"
          title={t("categoryScreen.empty", "Aucun produit dans cette catégorie pour le moment")}
          actionLabel={t("product.back", "Retour")}
          onAction={() => router.back()}
        />
      ) : (
        <FlashList
          data={products}
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
