import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useColors, useThemedStyles, type Colors, spacing, radius, fontSize } from '@/design-system';
import { Icon } from '@/icons';
import { ScreenHeader } from '@/components';
// Import direct pour éviter le cycle Metro : content/index → useScreenBanners → content/index
import { useScreenBanners } from '@/features/content/useScreenBanners';
import { useHomeStores } from '@/features/home/useHomeStores';
import { useFollowedStores, useToggleFollow } from '@/features/follows';

export default function StoresScreen() {
  const router = useRouter();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  // Bannières CMS ciblées "store" — gérées par l'admin (CMS > Bannières, écran store)
  const banners = useScreenBanners('store');
  // Boutiques suivies (réelles) et boutiques actives pour la section "Recommandé"
  const { stores: followed } = useFollowedStores();
  const { stores: recommended } = useHomeStores(10);
  const toggleFollow = useToggleFollow();

  const followedIds = useMemo(() => new Set(followed.map((s) => s.id)), [followed]);
  // Ne pas re-proposer dans "Recommandé" une boutique déjà suivie
  const reco = recommended.filter((s) => !followedIds.has(s.id));

  return (
    <View style={styles.container}>
      <ScreenHeader title="Boutiques suivies" />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxxl }}>
        {followed.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Icon name="store" size={44} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyText}>Aucune boutique n&apos;a encore été ajoutée</Text>
          </View>
        ) : (
          followed.map((s) => (
            <View key={s.id} style={styles.storeRow}>
              {s.avatar ? (
                <Image source={{ uri: s.avatar }} style={styles.storeAvatar} />
              ) : (
                <View style={[styles.storeAvatar, styles.storeAvatarFallback]}>
                  <Icon name="store" size={22} color={colors.textMuted} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.storeName}>{s.name}</Text>
                {s.followers ? (
                  <Text style={styles.storeFollowers}>{s.followers} abonnés</Text>
                ) : null}
              </View>
              <Pressable
                style={[styles.followBtn, styles.followingBtn]}
                onPress={() => toggleFollow.mutate({ storeId: s.id, follow: false })}
                disabled={toggleFollow.isPending}
              >
                <Text style={[styles.followBtnText, styles.followingBtnText]}>Suivi</Text>
              </Pressable>
            </View>
          ))
        )}

        {/* Découvrir — bannières CMS (screen=store), rien si vide */}
        {banners.length > 0 && (
          <View style={styles.discoverCard}>
            <View style={styles.discoverHeader}>
              <Text style={styles.discoverTitle}>Découvrez plus de boutiques AfriExpress</Text>
              <Icon name="chevronRight" size={18} color={colors.textMuted} />
            </View>
            <View style={styles.discoverRow}>
              {banners.slice(0, 3).map((b) => (
                <Pressable
                  key={b.id}
                  style={styles.discoverItem}
                  onPress={() => b.linkUrl ? router.push(b.linkUrl as any) : undefined}
                >
                  <Text style={styles.discoverName} numberOfLines={1}>{b.title}</Text>
                  <Image source={{ uri: b.imageUrl }} style={styles.discoverImg} contentFit="cover" />
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Recommandé — boutiques actives depuis l'API */}
        {reco.length > 0 && (
          <>
            <Text style={styles.recoTitle}>Recommandé pour vous</Text>
            {reco.map((s) => (
              <View key={s.id} style={styles.storeRow}>
                {s.avatar ? (
                  <Image source={{ uri: s.avatar }} style={styles.storeAvatar} />
                ) : (
                  <View style={[styles.storeAvatar, styles.storeAvatarFallback]}>
                    <Icon name="store" size={22} color={colors.textMuted} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.storeName}>{s.name}</Text>
                  {s.followers ? (
                    <Text style={styles.storeFollowers}>{s.followers} abonnés</Text>
                  ) : null}
                </View>
                <Pressable
                  style={styles.followBtn}
                  onPress={() => toggleFollow.mutate({ storeId: s.id, follow: true })}
                  disabled={toggleFollow.isPending}
                >
                  <Text style={styles.followBtnText}>Suivre</Text>
                </Pressable>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  empty: { alignItems: 'center', paddingVertical: spacing.giant, gap: spacing.md },
  emptyIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  discoverCard: { backgroundColor: colors.primarySoft, padding: spacing.lg },
  discoverHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  discoverTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text, flex: 1 },
  discoverRow: { flexDirection: 'row', gap: spacing.sm },
  discoverItem: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm, gap: spacing.sm },
  discoverName: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text, textAlign: 'center' },
  discoverImg: { width: '100%', aspectRatio: 1, borderRadius: radius.sm, backgroundColor: colors.background },
  recoTitle: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text, padding: spacing.lg },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  storeAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.background },
  storeAvatarFallback: { alignItems: 'center', justifyContent: 'center' },
  storeName: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  storeFollowers: { fontSize: fontSize.sm, color: colors.textMuted },
  followBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.primary },
  followBtnText: { fontSize: fontSize.sm, fontWeight: '800', color: colors.white },
  followingBtn: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  followingBtnText: { color: colors.textSecondary },
});
