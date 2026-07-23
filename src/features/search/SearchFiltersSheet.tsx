import React, { forwardRef, useRef, useImperativeHandle } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Sheet, type SheetHandle } from '@/components';
import { useColors, useThemedStyles, type Colors, spacing, radius, fontSize } from '@/design-system';
import { Icon } from '@/icons';
import type { SearchFilters, SortOption } from './useSearchFilters';

type Props = {
  filters: SearchFilters;
  categories: { id: string; name: string }[];
  onUpdateFilter: <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => void;
  onReset: () => void;
  onApply: () => void;
};

export const SearchFiltersSheet = forwardRef<SheetHandle, Props>(
  ({ filters, categories, onUpdateFilter, onReset, onApply }, ref) => {
    const sheetRef = useRef<SheetHandle>(null);
    const { t } = useTranslation();
    const colors = useColors();
    const styles = useThemedStyles(makeStyles);

    useImperativeHandle(ref, () => ({
      present: () => sheetRef.current?.present(),
      dismiss: () => sheetRef.current?.dismiss(),
    }));

    const SORT_OPTIONS: { key: SortOption; labelKey: string }[] = [
      { key: 'featured', labelKey: 'search.sortFeatured' },
      { key: 'priceLow', labelKey: 'search.sortPriceLow' },
      { key: 'priceHigh', labelKey: 'search.sortPriceHigh' },
      { key: 'rating', labelKey: 'search.sortRating' },
      { key: 'newest', labelKey: 'search.sortNewest' },
    ];

    const RATING_OPTIONS = [
      { value: null, labelKey: 'search.anyRating' },
      { value: 4, labelKey: 'search.rating4' },
      { value: 3, labelKey: 'search.rating3' },
      { value: 2, labelKey: 'search.rating2' },
    ];

    return (
      <Sheet ref={sheetRef} snapPoints={['60%', '90%']} title={t('search.filters')} icon="filter">
        <ScrollView contentContainerStyle={{ gap: spacing.xl }} showsVerticalScrollIndicator={false}>
          {/* Sort */}
          <View>
            <Text style={styles.label}>{t('search.sortBy')}</Text>
            <View style={styles.chips}>
              {SORT_OPTIONS.map((opt) => {
                const active = filters.sort === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => onUpdateFilter('sort', opt.key)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {t(opt.labelKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Category */}
          <View>
            <Text style={styles.label}>{t('search.category')}</Text>
            <View style={styles.chips}>
              <Pressable
                style={[styles.chip, !filters.categoryId && styles.chipActive]}
                onPress={() => onUpdateFilter('categoryId', null)}
              >
                <Text style={[styles.chipText, !filters.categoryId && styles.chipTextActive]}>
                  {t('search.allCategories')}
                </Text>
              </Pressable>
              {categories.map((cat) => {
                const active = filters.categoryId === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => onUpdateFilter('categoryId', cat.id)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {t(cat.name)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Price Range */}
          <View>
            <Text style={styles.label}>{t('search.priceRange')}</Text>
            <View style={styles.priceRow}>
              <View style={styles.priceInput}>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder={t('search.minPrice')}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={filters.minPrice != null ? String(filters.minPrice) : ''}
                  onChangeText={(v) => onUpdateFilter('minPrice', v ? Number(v) : null)}
                />
              </View>
              <Text style={styles.priceSep}>—</Text>
              <View style={styles.priceInput}>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder={t('search.maxPrice')}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={filters.maxPrice != null ? String(filters.maxPrice) : ''}
                  onChangeText={(v) => onUpdateFilter('maxPrice', v ? Number(v) : null)}
                />
              </View>
            </View>
          </View>

          {/* Rating */}
          <View>
            <Text style={styles.label}>{t('search.rating')}</Text>
            <View style={styles.chips}>
              {RATING_OPTIONS.map((opt) => {
                const active = filters.minRating === opt.value;
                return (
                  <Pressable
                    key={String(opt.value)}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => onUpdateFilter('minRating', opt.value)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {opt.value ? `${opt.value}+ ★` : t(opt.labelKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Toggles */}
          <View style={styles.toggles}>
            <Pressable
              style={[styles.toggle, filters.freeShippingOnly && styles.toggleActive]}
              onPress={() => onUpdateFilter('freeShippingOnly', !filters.freeShippingOnly)}
            >
              <Icon name="truck" size={16} color={filters.freeShippingOnly ? colors.white : colors.text} />
              <Text style={[styles.toggleText, filters.freeShippingOnly && styles.toggleTextActive]}>
                {t('search.freeShipping')}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.toggle, filters.onSaleOnly && styles.toggleActive]}
              onPress={() => onUpdateFilter('onSaleOnly', !filters.onSaleOnly)}
            >
              <Icon name="tag" size={16} color={filters.onSaleOnly ? colors.white : colors.text} />
              <Text style={[styles.toggleText, filters.onSaleOnly && styles.toggleTextActive]}>
                {t('search.onSale')}
              </Text>
            </Pressable>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable style={styles.resetBtn} onPress={onReset}>
              <Text style={styles.resetText}>{t('search.clearAll')}</Text>
            </Pressable>
            <Pressable
              style={styles.applyBtn}
              onPress={() => {
                onApply();
                sheetRef.current?.dismiss();
              }}
            >
              <Text style={styles.applyText}>{t('common.apply')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </Sheet>
    );
  }
);

SearchFiltersSheet.displayName = 'SearchFiltersSheet';

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    label: {
      fontSize: fontSize.md,
      fontWeight: '700',
      color: colors.text,
      marginBottom: spacing.sm,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipActive: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary,
    },
    chipText: {
      fontSize: fontSize.sm,
      color: colors.text,
      fontWeight: '600',
    },
    chipTextActive: {
      color: colors.primary,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    priceInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    input: {
      fontSize: fontSize.md,
      padding: 0,
    },
    priceSep: {
      color: colors.textMuted,
      fontSize: fontSize.lg,
    },
    toggles: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    toggle: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    toggleActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    toggleText: {
      fontSize: fontSize.sm,
      fontWeight: '700',
      color: colors.text,
    },
    toggleTextActive: {
      color: colors.white,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.md,
      paddingTop: spacing.md,
    },
    resetBtn: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: radius.pill,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
    },
    resetText: {
      fontSize: fontSize.md,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    applyBtn: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: radius.pill,
      backgroundColor: colors.primary,
      alignItems: 'center',
    },
    applyText: {
      fontSize: fontSize.md,
      fontWeight: '700',
      color: colors.white,
    },
  });
