import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useColors,
  useThemedStyles,
  type Colors,
  spacing,
  radius,
  fontSize,
} from '@/design-system';
import {
  ScreenHeader,
  MasonryGrid,
  SearchBar,
  StatusState,
  StoreCard,
  StoreGroupSection,
} from '@/components';
import { useStores, useStoreGroups } from '@/features/stores';

const PAGE_SIZE = 20;

/**
 * Découverte de boutiques : grille de cartes boutique paginée.
 * La pagination s'appuie sur `limit` croissant plutôt que sur un curseur —
 * l'API renvoie un tableau simple, sans total ni page suivante.
 */
export default function StoresScreen() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search.trim());
      setLimit(PAGE_SIZE);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const query = useStores({ limit, search: debounced || undefined });
  const groups = useStoreGroups();
  const stores = query.data ?? [];
  const canLoadMore = stores.length >= limit;

  // Les sections thématiques ne sont pertinentes qu'en navigation libre : dès
  // qu'on recherche, le client attend des résultats, pas la vitrine.
  const showGroups = !debounced && (groups.data?.length ?? 0) > 0;

  // Toutes les cartes boutique ont désormais une hauteur fixe : les colonnes
  // s'équilibrent donc par simple alternance, sans estimation.
  const estimateHeight = useCallback(() => 1, []);

  const body = () => {
    if (query.isLoading) {
      return <StatusState status="loading" title={t('common.loading')} />;
    }
    if (query.isError) {
      return (
        <StatusState
          status="error"
          title={t('stores.error')}
          actionLabel={t('common.retry')}
          onAction={() => query.refetch()}
        />
      );
    }
    if (stores.length === 0) {
      return (
        <StatusState
          status="empty"
          icon="store"
          title={debounced ? t('stores.emptySearch') : t('stores.empty')}
        />
      );
    }
    return (
      <>
        {showGroups && (
          <>
            {groups.data!.map((g) => (
              <StoreGroupSection key={g.id} group={g} />
            ))}
            <Text style={styles.catalogTitle}>{t('stores.allStores')}</Text>
          </>
        )}
        <MasonryGrid
          items={stores}
          estimateHeight={estimateHeight}
          keyExtractor={(s) => s.id}
          renderItem={(s) => <StoreCard store={s} />}
        />
        {canLoadMore && (
          <Pressable
            style={styles.moreBtn}
            onPress={() => setLimit((n) => n + PAGE_SIZE)}
            disabled={query.isFetching}
          >
            <Text style={styles.moreText}>
              {query.isFetching ? t('common.loading') : t('common.seeMore')}
            </Text>
          </Pressable>
        )}
      </>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('stores.title')} />
      <View style={styles.searchWrap}>
        <SearchBar
          editable
          value={search}
          onChangeText={setSearch}
          placeholder={t('stores.search')}
          onCameraPress={() => router.push('/camera')}
          autoFocus={false}
        />
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + spacing.xxxl },
        ]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => {
              query.refetch();
              groups.refetch();
            }}
            tintColor={colors.primary}
          />
        }
      >
        {body()}
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    // Même habillage que `HomeHeader` : surface, spacing.lg, coins bas arrondis
    // et ombre douce — la barre de recherche doit être identique à l'accueil.
    searchWrap: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xs,
      paddingBottom: spacing.sm,
      borderBottomLeftRadius: radius.xl,
      borderBottomRightRadius: radius.xl,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
      zIndex: 10,
    },
    // Le bas de page est complété par l'inset système à l'usage : la grille ne
    // doit pas se terminer sous la barre de navigation du téléphone.
    scroll: { flexGrow: 1 },
    catalogTitle: {
      fontSize: fontSize.lg,
      fontWeight: '800',
      color: colors.text,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
    },
    moreBtn: {
      alignSelf: 'center',
      marginTop: spacing.lg,
      paddingHorizontal: spacing.xxl,
      paddingVertical: spacing.md,
      borderRadius: radius.pill,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    moreText: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  });
