import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useBrandColors } from '@/features/content';
import { hexToRgba } from '@/utils/color';

/**
 * Voile dégradé signature des en-têtes — mêmes couleurs de marque CMS
 * (brand.nameColor1/2) et mêmes alphas que l'en-tête de l'accueil, pour une
 * harmonie visuelle sur TOUS les écrans. Se pose en fond absolu du header.
 */
export function BrandHeaderGradient() {
  const { c1, c2 } = useBrandColors();
  return (
    <LinearGradient
      colors={[hexToRgba(c1, 0.1), hexToRgba(c2, 0.02)]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />
  );
}
