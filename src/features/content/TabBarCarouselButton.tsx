import React, { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { radius, shadows, useColors, useThemedStyles, type Colors } from '@/design-system';
import { Icon } from '@/icons';
import { resolveMediaUrl } from '@/utils/resolveMediaUrl';
import { useStores } from '@/features/stores';

/** Cadence de rotation des visuels du bouton central. */
const ROTATE_MS = 3000;

/**
 * Bouton central « Boutiques » de la barre de navigation : un rectangle qui
 * fait défiler en fondu les photos de couverture des boutiques — les mêmes
 * visuels qui coiffent leur espace. Aucun réglage admin : le bouton vit avec
 * le catalogue. Tant qu'aucune boutique n'a de couverture, un dégradé de
 * marque avec l'icône boutique prend le relais — même forme, même place.
 */
export function TabBarCarouselButton() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();
  // Même clé de cache que la grille de découverte (['stores', {limit: 8}]) :
  // l'accueil la précharge déjà, le bouton ne coûte aucune requête de plus.
  const { data: stores } = useStores({ limit: 8 });

  const images = (stores ?? [])
    .map((s) => resolveMediaUrl(s.coverUrl) ?? resolveMediaUrl(s.photos?.[0]))
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

  // Le visuel courant peut disparaître si la liste des boutiques change
  const safeIndex = images.length ? index % images.length : 0;

  return (
    <Pressable
      style={styles.wrap}
      accessibilityRole="button"
      accessibilityLabel={t('tabs.stores')}
      onPress={() => router.push('/stores')}
    >
      <View style={styles.carousel}>
        {images.length > 0 ? (
          // expo-image fond la transition d'URI : changer de source suffit
          // pour un cross-fade propre, sans superposer deux images.
          <Image
            source={{ uri: images[safeIndex] }}
            style={styles.image}
            contentFit="cover"
            transition={400}
          />
        ) : (
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fallbackGradient}
          >
            <Icon name="store" size={22} color={colors.white} />
          </LinearGradient>
        )}
      </View>
    </Pressable>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    wrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    carousel: {
      width: 66,
      height: 44,
      borderRadius: radius.lg,
      overflow: 'hidden',
      backgroundColor: colors.primary,
      borderWidth: 2,
      borderColor: colors.surface,
      ...shadows.md,
    },
    image: { width: '100%', height: '100%' },
    fallbackGradient: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
