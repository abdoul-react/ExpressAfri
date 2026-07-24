import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { spacing, radius, fontSize, useColors, useThemedStyles, type Colors } from '@/design-system';
import { Icon } from '@/icons';
import { Button, ProductCard } from '@/components';
import { useFeatureFlags } from '@/features/content';
import { useTranslation } from 'react-i18next';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import type { Product } from '@/types';

type Phase = 'camera' | 'scanning' | 'results' | 'error';
const RESULT_TABS_KEY: ('suggestions' | 'orders' | 'prices')[] = ['suggestions', 'orders', 'prices'];

/** Upload d'une image vers l'endpoint /mobile/search/by-image */
async function uploadImageSearch(uri: string): Promise<Product[]> {
  // EXPO_PUBLIC_API_URL inclut déjà le préfixe /api (ex: https://api.expressafri.com/api)
  const apiBase = process.env.EXPO_PUBLIC_API_URL ?? '';
  const formData = new FormData();
  const filename = uri.split('/').pop() ?? 'photo.jpg';
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mimeTypes: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
  const type = mimeTypes[ext] ?? 'image/jpeg';
  // @ts-ignore — React Native accepte un objet { uri, name, type } dans FormData
  formData.append('image', { uri, name: filename, type });
  const response = await fetch(`${apiBase}/mobile/search/by-image`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) throw new Error(`Erreur serveur ${response.status}`);
  return response.json();
}

/** Recherche visuelle : caméra → scan → résultats similaires (façon AliExpress). */
export default function CameraScreen() {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const { isEnabled } = useFeatureFlags();
  const [permission, requestPermission] = useCameraPermissions();
  const camRef = useRef<CameraView>(null);

  const [phase, setPhase] = useState<Phase>('camera');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [tab, setTab] = useState(0);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  const startScan = async (uri: string) => {
    setPhotoUri(uri);
    setPhase('scanning');
    setSearchError(null);
    try {
      const results = await uploadImageSearch(uri);
      if (results.length === 0) {
        setSearchResults([]);
        setSearchError(t('camera.noResults', 'Aucun produit similaire trouvé.'));
      } else {
        setSearchResults(results);
      }
      setPhase('results');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSearchResults([]);
      setSearchError(msg);
      setPhase('error');
    }
  };

  const shoot = async () => {
    try {
      const pic = await camRef.current?.takePictureAsync({ quality: 0.5 });
      if (pic?.uri) startScan(pic.uri);
    } catch (e) {
      console.warn("Camera shot failed", e);
    }
  };

  const pickFromAlbum = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (!res.canceled && res.assets[0]?.uri) startScan(res.assets[0].uri);
  };

  const retake = () => {
    setPhotoUri(null);
    setPhase('camera');
    setSearchResults([]);
    setSearchError(null);
  };

  // Onglet Prix : tri par prix croissant
  const results = tab === 2 ? [...searchResults].sort((a, b) => a.priceUsd - b.priceUsd) : searchResults;
  const toggleWish = useWishlistStore((s) => s.toggle);
  const addToCart = useCartStore((s) => s.add);
  const wishedIds = useWishlistStore((s) => s.ids);

  if (!isEnabled('mobile.cameraSearch')) {
    return (
      <View style={[styles.container, styles.center]}>
        <StatusBar style="light" />
        <View style={styles.permCircle}>
          <Icon name="camera" size={40} color={colors.white} />
        </View>
        <Text style={styles.permTitle}>Fonctionnalité non disponible</Text>
        <Text style={styles.permText}>Cette fonctionnalité a été désactivée par l&apos;administrateur.</Text>
        <Pressable onPress={() => router.back()} style={[styles.topClose, { top: insets.top + spacing.sm }]}>
          <Icon name="close" size={26} color={colors.white} />
        </Pressable>
      </View>
    );
  }

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.center]}>
        <StatusBar style="light" />
        <View style={styles.permCircle}>
          <Icon name="camera" size={40} color={colors.white} />
        </View>
        <Text style={styles.permTitle}>{t("camera.photoSearch")}</Text>
        <Text style={styles.permText}>
          {t("camera.allowHint")}
        </Text>
        <Button label={t("camera.allow")} size="lg" onPress={requestPermission} style={{ marginTop: spacing.lg, alignSelf: 'center' }} />
        <Pressable onPress={pickFromAlbum} style={{ marginTop: spacing.lg }}>
          <Text style={styles.link}>{t("camera.chooseAlbum")}</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={[styles.topClose, { top: insets.top + spacing.sm }]}>
          <Icon name="close" size={26} color={colors.white} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Fond : caméra live OU photo figée */}
      {phase === 'camera' ? (
        <CameraView ref={camRef} style={StyleSheet.absoluteFill} facing="back" />
      ) : (
        photoUri && <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      )}

      {/* Barre haut */}
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable hitSlop={8} onPress={() => (phase === 'camera' ? router.back() : retake())}>
          <Icon name="chevronLeft" size={26} color={colors.white} />
        </Pressable>
        <Pressable hitSlop={8}>
          <Icon name="help" size={24} color={colors.white} />
        </Pressable>
      </View>

      {/* PHASE CAMÉRA */}
      {phase === 'camera' && (
        <>
          <View style={styles.viewport} pointerEvents="none">
            <View style={styles.frame} />
            <Text style={styles.hint}>{t("camera.placeHint")}</Text>
          </View>
          <View style={[styles.controls, { paddingBottom: insets.bottom + spacing.xl }]}>
            <Pressable style={styles.sideBtn} onPress={pickFromAlbum}>
              <View style={styles.sideIcon}><Icon name="box" size={22} color={colors.white} /></View>
              <Text style={styles.sideLabel}>{t("camera.album")}</Text>
            </Pressable>
            <Pressable style={styles.shutter} onPress={shoot}>
              <View style={styles.shutterInner} />
            </Pressable>
            <View style={styles.sideBtn} />
          </View>
        </>
      )}

      {/* PHASE SCAN */}
      {phase === 'scanning' && (
        <View style={styles.scanOverlay}>
          <View style={styles.dots}>
            <View style={[styles.dot, { backgroundColor: colors.primary }]} />
            <View style={[styles.dot, { backgroundColor: colors.sale }]} />
          </View>
          <Text style={styles.scanText}>{t("camera.searching")}</Text>
          <Text style={styles.scanSubText}>Analyse de l&apos;image en cours…</Text>
          <Pressable style={styles.scanClose} onPress={retake}>
            <Icon name="close" size={26} color={colors.white} />
          </Pressable>
        </View>
      )}

      {/* PHASE RÉSULTATS — panneau bas */}
      {phase === 'results' && (
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            {/* Vignette photo (toucher pour reprendre) */}
            <Pressable style={styles.thumbWrap} onPress={retake}>
              {photoUri && <Image source={{ uri: photoUri }} style={styles.thumb} contentFit="cover" />}
            </Pressable>
            <View style={styles.tabs}>
              {RESULT_TABS_KEY.map((key, i) => (
                <Pressable key={key} onPress={() => setTab(i)} style={styles.tabBtn}>
                  <Text style={[styles.tabText, tab === i && styles.tabTextActive]}>{t(`camera.${key}`)}</Text>
                  {i > 0 && <Icon name="chevronDown" size={12} color={colors.textMuted} />}
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.sheetClose} hitSlop={8} onPress={retake}>
              <Icon name="close" size={20} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.grid}>
            {searchError ? (
              <View style={styles.errorBlock}>
                <Text style={styles.errorHint}>{searchError}</Text>
                <Pressable onPress={retake} style={styles.retryBtn}>
                  <Text style={styles.retryText}>{t('common.retry', 'Réessayer')}</Text>
                </Pressable>
              </View>
            ) : null}
            {results.map((p) => (
              <View key={p.id} style={styles.gridItem}>
                <ProductCard product={p} isWished={wishedIds.includes(p.id)} onToggleWish={toggleWish} onAddToCart={addToCart} />
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxxl },
  topClose: { position: 'absolute', left: spacing.lg },
  permCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  permTitle: { color: colors.white, fontSize: fontSize.xl, fontWeight: '800', textAlign: 'center' },
  permText: { color: 'rgba(255,255,255,0.75)', fontSize: fontSize.md, textAlign: 'center', marginTop: spacing.sm, lineHeight: 22 },
  link: { color: colors.white, fontSize: fontSize.md, fontWeight: '700', textDecorationLine: 'underline' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  viewport: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xl },
  frame: { width: 230, height: 230, borderRadius: radius.xl, borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)' },
  hint: { color: colors.white, fontSize: fontSize.sm, textAlign: 'center', paddingHorizontal: spacing.xxxl },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  sideBtn: { alignItems: 'center', gap: 6, width: 72 },
  sideIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  sideLabel: { color: colors.white, fontSize: fontSize.xs },
  shutter: { width: 78, height: 78, borderRadius: 39, borderWidth: 4, borderColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.white },
  // Scan
  scanOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  dots: { flexDirection: 'row', gap: spacing.sm },
  dot: { width: 12, height: 12, borderRadius: 6 },
  scanText: { color: colors.white, fontSize: fontSize.md, fontWeight: '600' },
  scanSubText: { color: 'rgba(255,255,255,0.7)', fontSize: fontSize.sm, marginTop: spacing.xs },
  scanClose: { marginTop: spacing.xl, width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center' },
  // Résultats
  errorBlock: { width: '100%', alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.md },
  errorHint: { color: colors.danger, fontSize: fontSize.sm, textAlign: 'center', paddingHorizontal: spacing.lg },
  retryBtn: { paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.primary },
  retryText: { color: colors.primary, fontWeight: '700', fontSize: fontSize.sm },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, top: '30%', backgroundColor: colors.background, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, overflow: 'hidden' },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginTop: spacing.sm },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  thumbWrap: { width: 40, height: 52, borderRadius: radius.sm, borderWidth: 2, borderColor: colors.sale, overflow: 'hidden' },
  thumb: { width: '100%', height: '100%' },
  tabs: { flex: 1, flexDirection: 'row', gap: spacing.lg },
  tabBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  tabText: { fontSize: fontSize.md, fontWeight: '700', color: colors.textSecondary },
  tabTextActive: { color: colors.sale },
  sheetClose: { padding: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl },
  gridItem: { width: '48%', marginBottom: spacing.md },
});
