import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FlashList } from '@shopify/flash-list';
import { useThemedStyles, type Colors, spacing } from '@/design-system';
import { ScreenHeader, ProductCard, EmptyState } from '@/components';
import { useWishlistProducts } from '@/features/catalog';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';

export default function WishlistScreen() {
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { t } = useTranslation();
  const products = useWishlistProducts();
  const toggleWish = useWishlistStore((s) => s.toggle);
  const addToCart = useCartStore((s) => s.add);

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('account.wishlist')} />
      {products.length === 0 ? (
        <EmptyState
          icon="heart"
          title="Aucun favori"
          hint="Touchez le cœur sur un produit pour l'ajouter ici."
          actionLabel={t('checkout.continueShopping')}
          onAction={() => router.replace('/')}
        />
      ) : (
        <FlashList
          data={products}
          numColumns={2}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: spacing.sm, paddingBottom: spacing.xxl }}
          renderItem={({ item }) => (
            <View style={{ flex: 1, margin: spacing.xs }}>
              <ProductCard product={item} isWished onToggleWish={toggleWish} onAddToCart={addToCart} />
            </View>
          )}
        />
      )}
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
});
