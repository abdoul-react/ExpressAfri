import type { Banner } from "@/types";
import {
  fontSize,
  radius,
  spacing,
  useColors,
  useThemedStyles,
  type Colors,
} from "@/design-system";
import { Icon } from "@/icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

type Props = { banners: Banner[] };

export function BannerCarousel({ banners }: Props) {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const scrollRef = useRef<ScrollView>(null);
  const cardWidth = width - spacing.lg * 2;

  if (!banners || banners.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {banners.length === 1 ? (
        /* Bandeau statique unique (pas de carrousel ni pagination) */
        <Pressable
          onPress={() => banners[0].linkUrl ? router.push(banners[0].linkUrl as any) : null}
          style={{ paddingHorizontal: spacing.lg }}
        >
          <View
            style={[
              styles.card,
              { backgroundColor: banners[0].backgroundColor ?? colors.primary },
            ]}
          >
            {banners[0].imageUrl ? (
              <Image
                source={{ uri: banners[0].imageUrl }}
                style={styles.image}
                contentFit="cover"
              />
            ) : (
              <View style={styles.textContent}>
                <Text style={styles.title} numberOfLines={2}>{banners[0].title}</Text>
                {banners[0].subtitle && (
                  <Text style={styles.subtitle} numberOfLines={1}>{banners[0].subtitle}</Text>
                )}
                {banners[0].discountLabel && (
                  <View style={styles.discountRow}>
                    <Text style={styles.discount}>{banners[0].discountLabel}</Text>
                  </View>
                )}
                {banners[0].ctaText && (
                  <View style={styles.ctaBtn}>
                    <Text style={styles.ctaText}>{banners[0].ctaText}</Text>
                    <Icon name="chevronRight" size={14} color={colors.primary} />
                  </View>
                )}
              </View>
            )}
            {banners[0].discountLabel && banners[0].imageUrl && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountBadgeText}>{banners[0].discountLabel}</Text>
              </View>
            )}
          </View>
        </Pressable>
      ) : (
        /* Carrousel multi-bannières */
        <>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={cardWidth + spacing.sm}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}
            onMomentumScrollEnd={(e) =>
              setIndex(Math.round(e.nativeEvent.contentOffset.x / (cardWidth + spacing.sm)))
            }
          >
            {banners.map((b) => (
              <Pressable
                key={b.id}
                onPress={() => b.linkUrl ? router.push(b.linkUrl as any) : null}
              >
                <View
                  style={[
                    styles.card,
                    { width: cardWidth, backgroundColor: b.backgroundColor ?? colors.primary },
                  ]}
                >
                  {b.imageUrl ? (
                    <Image
                      source={{ uri: b.imageUrl }}
                      style={styles.image}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={styles.textContent}>
                      <Text style={styles.title} numberOfLines={2}>{b.title}</Text>
                      {b.subtitle && (
                        <Text style={styles.subtitle} numberOfLines={1}>{b.subtitle}</Text>
                      )}
                      {b.discountLabel && (
                        <View style={styles.discountRow}>
                          <Text style={styles.discount}>{b.discountLabel}</Text>
                        </View>
                      )}
                      {b.ctaText && (
                        <View style={styles.ctaBtn}>
                          <Text style={styles.ctaText}>{b.ctaText}</Text>
                          <Icon name="chevronRight" size={14} color={colors.primary} />
                        </View>
                      )}
                    </View>
                  )}
                  {b.discountLabel && b.imageUrl && (
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountBadgeText}>{b.discountLabel}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            ))}
          </ScrollView>

          {banners.length > 1 && (
            <View style={styles.dots}>
              {banners.map((_, i) => (
                <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    wrap: { paddingVertical: spacing.sm },
    card: {
      height: 130,
      borderRadius: radius.lg,
      overflow: "hidden",
      position: "relative",
    },
    image: { width: "100%", height: "100%" },
    textContent: {
      flex: 1,
      padding: spacing.lg,
      justifyContent: "center",
      gap: spacing.xs,
    },
    title: { color: colors.white, fontSize: fontSize.xl, fontWeight: "800" },
    subtitle: { color: "rgba(255,255,255,0.9)", fontSize: fontSize.sm },
    discountRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
    discount: { color: "#DFFF3E", fontSize: 36, fontWeight: "900", letterSpacing: -1 },
    ctaBtn: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: colors.white,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: 4,
      marginTop: spacing.sm,
      gap: 4,
    },
    ctaText: { fontSize: fontSize.xs, fontWeight: "800", color: colors.primary },
    discountBadge: {
      position: "absolute",
      top: spacing.sm,
      right: spacing.sm,
      backgroundColor: colors.sale,
      borderRadius: radius.sm,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    discountBadgeText: { color: colors.white, fontSize: fontSize.xs, fontWeight: "800" },
    dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: spacing.sm },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.borderStrong },
    dotActive: { backgroundColor: colors.primary, width: 16 },
  });
