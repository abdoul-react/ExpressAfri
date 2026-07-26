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

type Props = {
  banners: Banner[];
  /**
   * Variante discrète pour les campagnes de boutique : bandeau bas, texte
   * réduit. L'accueil garde le grand format promotionnel.
   */
  compact?: boolean;
};

/** Contenu d'une bannière — image plein cadre, ou bloc texte + CTA. */
function BannerBody({ banner, compact }: { banner: Banner; compact?: boolean }) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <>
      {banner.imageUrl ? (
        <Image
          source={{ uri: banner.imageUrl }}
          style={styles.image}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.textContent, compact && styles.textContentCompact]}>
          <Text
            style={[styles.title, compact && styles.titleCompact]}
            numberOfLines={compact ? 1 : 2}
          >
            {banner.title}
          </Text>
          {banner.subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {banner.subtitle}
            </Text>
          )}
          {banner.discountLabel && (
            <View style={styles.discountRow}>
              <Text style={[styles.discount, compact && styles.discountCompact]}>
                {banner.discountLabel}
              </Text>
            </View>
          )}
          {banner.ctaText && (
            <View style={[styles.ctaBtn, compact && styles.ctaBtnCompact]}>
              <Text style={styles.ctaText}>{banner.ctaText}</Text>
              <Icon name="chevronRight" size={14} color={colors.primary} />
            </View>
          )}
        </View>
      )}
      {banner.discountLabel && banner.imageUrl && (
        <View style={styles.discountBadge}>
          <Text style={styles.discountBadgeText}>{banner.discountLabel}</Text>
        </View>
      )}
    </>
  );
}

export function BannerCarousel({ banners, compact }: Props) {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const scrollRef = useRef<ScrollView>(null);
  const cardWidth = width - spacing.lg * 2;

  if (!banners || banners.length === 0) return null;

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      {banners.length === 1 ? (
        /* Bandeau statique unique (pas de carrousel ni pagination) */
        <Pressable
          onPress={() => banners[0].linkUrl ? router.push(banners[0].linkUrl as any) : null}
          style={{ paddingHorizontal: spacing.lg }}
        >
          <View
            style={[
              styles.card,
              compact && styles.cardCompact,
              { backgroundColor: banners[0].backgroundColor ?? colors.primary },
            ]}
          >
            <BannerBody banner={banners[0]} compact={compact} />
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
                    compact && styles.cardCompact,
                    { width: cardWidth, backgroundColor: b.backgroundColor ?? colors.primary },
                  ]}
                >
                  <BannerBody banner={b} compact={compact} />
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
    wrapCompact: { paddingVertical: spacing.xs },
    card: {
      height: 130,
      borderRadius: radius.lg,
      overflow: "hidden",
      position: "relative",
    },
    // Bandeau d'annonce : assez haut pour une image lisible, assez bas pour ne
    // pas voler la vedette au catalogue de la boutique.
    cardCompact: { height: 72, borderRadius: radius.md },
    image: { width: "100%", height: "100%" },
    textContent: {
      flex: 1,
      padding: spacing.lg,
      justifyContent: "center",
      gap: spacing.xs,
    },
    textContentCompact: { padding: spacing.md, gap: 2 },
    title: { color: colors.white, fontSize: fontSize.xl, fontWeight: "800" },
    titleCompact: { fontSize: fontSize.md },
    subtitle: { color: "rgba(255,255,255,0.9)", fontSize: fontSize.sm },
    discountRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
    discount: { color: "#DFFF3E", fontSize: 36, fontWeight: "900", letterSpacing: -1 },
    discountCompact: { fontSize: fontSize.lg, letterSpacing: 0 },
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
    ctaBtnCompact: { marginTop: 2, paddingVertical: 2 },
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
