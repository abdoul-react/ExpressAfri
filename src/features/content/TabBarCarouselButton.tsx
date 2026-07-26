import React, { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { radius, shadows, useColors, useThemedStyles, type Colors } from '@/design-system';
import { Icon } from '@/icons';
import { resolveMediaUrl } from '@/utils/resolveMediaUrl';
import { useScreenBanners } from './useScreenBanners';

/** Cadence de rotation des visuels du bouton central. */
const ROTATE_MS = 3000;

/**
 * Bouton central « Boutiques » de la barre de navigation : un rectangle qui
 * fait défiler en fondu les visuels configurés par l'admin (CMS → Bannières,
 * écran « Bouton central (tabbar) »). Sans visuel configuré — ou tant qu'ils
 * chargent — on retombe sur le cercle + icône « plus » historique : le bouton
 * reste toujours utilisable.
 */
export function TabBarCarouselButton() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();
  const banners = useScreenBanners('tabbar');

  const images = banners
    .map((b) => resolveMediaUrl(b.imageUrl))
    .filter((u): u is string => !!u);

  const [index, setIndex] = useState(0);
  const appActive = useRef(true);

  // Rotation : uniquement avec 2 visuels ou plus, et app au premier plan —
  // pas de travail JS pour rien quand l'app est en arrière-plan.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      appActive.current = s === 'active';
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (images.length < 2) return;
    const timer = setInterval(() => {
      if (appActive.current) setIndex((i) => (i + 1) % images.length);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [images.length]);

  // Le visuel courant peut disparaître si l'admin retire des bannières
  const safeIndex = images.length ? index % images.length : 0;

  return (
    <Pressable
      style={styles.wrap}
      accessibilityRole="button"
      accessibilityLabel={t('tabs.stores')}
      onPress={() => router.push('/stores')}
    >
      {images.length > 0 ? (
        <View style={styles.carousel}>
          {/* expo-image fond la transition d'URI : changer de source suffit
              pour un cross-fade propre, sans superposer deux images. */}
          <Image
            source={{ uri: images[safeIndex] }}
            style={styles.image}
            contentFit="cover"
            transition={400}
          />
        </View>
      ) : (
        <View style={styles.fallbackBtn}>
          <Icon name="plus" size={26} color={colors.white} />
        </View>
      )}
    </Pressable>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    wrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    carousel: {
      width: 64,
      height: 44,
      borderRadius: radius.md,
      marginTop: -8,
      overflow: 'hidden',
      backgroundColor: colors.primary,
      borderWidth: 1.5,
      borderColor: colors.surface,
      ...shadows.md,
    },
    image: { width: '100%', height: '100%' },
    fallbackBtn: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: -8,
      ...shadows.md,
    },
  });
