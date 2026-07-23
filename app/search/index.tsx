import {
  ProductCard,
  SearchBar,
  SkeletonSearchResults,
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
import {
  SearchFiltersSheet,
  useFilteredProducts,
  useSearchFilters,
  useSearchHistory,
  useSearchTrending,
} from "@/features/search";
import { Icon, type IconName } from "@/icons";
import { useCartStore } from "@/store/cartStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { FlashList } from "@shopify/flash-list";
import { useRouter, useLocalSearchParams } from "expo-router";
import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";



export default function SearchScreen() {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  // q = recherche pré-remplie (raccourcis accueil configurés par l'admin)
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [query, setQuery] = useState(q ?? "");
  const [submitted, setSubmitted] = useState(!!q);
  const { history, addToHistory, clearHistory } = useSearchHistory();
  const { data: trending = [] } = useSearchTrending();

  const {
    filters,
    updateFilter,
    resetFilters,
    applyFilters,
    activeCount,
    hasActiveFilters,
  } = useSearchFilters();
  const { results, isLoading, categories } = useFilteredProducts({
    ...filters,
    query: submitted && query.trim() ? query : "",
  });
  const showResults = submitted && query.trim().length > 0;
  const toggleWish = useWishlistStore((s) => s.toggle);
  const addToCart = useCartStore((s) => s.add);
  const wishedIds = useWishlistStore((s) => s.ids);

  const sheetRef = useRef<any>(null);

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xs }]}>
      <View style={styles.headerRow}>
        <Pressable
          hitSlop={8}
          onPress={() => router.back()}
          style={{ padding: 4 }}
        >
          <Icon name="chevronLeft" size={26} color={colors.text} />
        </Pressable>
        <SearchBar
          editable
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            setSubmitted(false);
          }}
          onSubmit={() => { setSubmitted(true); addToHistory(query); }}
          onCameraPress={() => router.push("/camera")}
        />
      </View>

      {showResults ? (
        isLoading ? (
          <View style={[styles.container, { paddingTop: spacing.xs }]}>
            <SkeletonSearchResults />
          </View>
        ) : (
          <>
            <View style={styles.resultBar}>
              <Text style={styles.resultCount}>
                {t("search.resultsCount", { count: results.length })}
              </Text>
              <Pressable
                style={[
                  styles.filterBtn,
                  hasActiveFilters && styles.filterBtnActive,
                ]}
                onPress={() => sheetRef.current?.present()}
              >
                <Icon
                  name="filter"
                  size={16}
                  color={hasActiveFilters ? colors.white : colors.text}
                />
                <Text
                  style={[
                    styles.filterBtnText,
                    hasActiveFilters && styles.filterBtnTextActive,
                  ]}
                >
                  {t("search.filters")}
                </Text>
                {activeCount > 0 && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>{activeCount}</Text>
                  </View>
                )}
              </Pressable>
            </View>

            {results.length === 0 ? (
              <StatusState
                status="empty"
                title={t("search.noResults")}
                hint={t("search.noResultsHint", { query })}
              />
            ) : (
              <FlashList
                data={results}
                numColumns={2}
                keyExtractor={(i) => i.id}
                contentContainerStyle={{
                  padding: spacing.sm,
                  paddingBottom: spacing.xxl,
                }}
                renderItem={({ item }) => (
                  <View style={{ flex: 1, margin: spacing.xs }}>
                    <ProductCard product={item} isWished={wishedIds.includes(item.id)} onToggleWish={toggleWish} onAddToCart={addToCart} />
                  </View>
                )}
              />
            )}
          </>
        )
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl * 2 }}
          keyboardShouldPersistTaps="handled"
        >
          {history.length > 0 && (
            <Section title={t("search.recent")} icon="history" action={
              <Pressable onPress={clearHistory}>
                <Text style={styles.clearBtn}>Effacer</Text>
              </Pressable>
            }>
              {history.map((h) => (
                <Chip
                  key={h}
                  label={h}
                  onPress={() => {
                    setQuery(h);
                    setSubmitted(true);
                  }}
                />
              ))}
            </Section>
          )}
          {trending.length > 0 && (
            <Section title={t("search.trends")} icon="fire">
              {trending.map((h) => (
                <Chip
                  key={h}
                  label={h}
                  onPress={() => {
                    setQuery(h);
                    setSubmitted(true);
                  }}
                />
              ))}
            </Section>
          )}
          {history.length === 0 && trending.length === 0 && (
            <View style={styles.emptySearch}>
              <Icon name="search" size={40} color={colors.border} />
              <Text style={styles.emptySearchText}>{t("search.startTyping")}</Text>
            </View>
          )}
        </ScrollView>
      )}

      <SearchFiltersSheet
        ref={sheetRef}
        filters={filters}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        onUpdateFilter={updateFilter}
        onReset={resetFilters}
        onApply={applyFilters}
      />
    </View>
  );
}

function Section({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon: IconName;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Icon name={icon} size={18} color={colors.text} />
        <Text style={styles.sectionTitle}>{title}</Text>
        {action}
      </View>
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

function Chip({ label, onPress }: { label: string; onPress: () => void }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable style={styles.chip} onPress={onPress}>
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surface },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
    },
    resultBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    resultCount: { fontSize: fontSize.sm, color: colors.textSecondary },
    filterBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterBtnActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterBtnText: {
      fontSize: fontSize.sm,
      fontWeight: "600",
      color: colors.text,
    },
    filterBtnTextActive: { color: colors.white },
    filterBadge: {
      backgroundColor: colors.sale,
      borderRadius: 9,
      minWidth: 18,
      height: 18,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 4,
    },
    filterBadgeText: { color: colors.white, fontSize: 10, fontWeight: "800" },
    section: { marginBottom: spacing.xl },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    sectionTitle: {
      fontSize: fontSize.lg,
      fontWeight: "800",
      color: colors.text,
    },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    chip: {
      backgroundColor: colors.background,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    chipText: { fontSize: fontSize.sm, color: colors.text },
    clearBtn: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600', marginLeft: 'auto' },
    emptySearch: { alignItems: 'center', justifyContent: 'center', paddingTop: spacing.xxxl, gap: spacing.md },
    emptySearchText: { fontSize: fontSize.md, color: colors.textMuted, textAlign: 'center' },
  });
