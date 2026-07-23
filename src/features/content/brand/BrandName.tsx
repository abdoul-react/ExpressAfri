import React from 'react';
import { Platform, StyleSheet, Text } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppSettings } from '../useAppSettings';
import { useBrandColors } from './useBrandColors';

type Props = {
  size?: number;
};

/**
 * Nom de l'application en dégradé bicolore (façon AliExpress).
 * Entièrement piloté par le CMS admin :
 *  - `app.name`          → le texte affiché
 *  - `brand.nameColor1`  → début du dégradé
 *  - `brand.nameColor2`  → fin du dégradé
 *  - `brand.showName`    → affichage on/off (géré par le parent, cf. BrandMark)
 */
export function BrandName({ size = 22 }: Props) {
  const { get } = useAppSettings();
  const { c1, c2, isGradient } = useBrandColors();
  const name = get('app.name', 'ExpressAfri');

  // Couleurs identiques → pas besoin du masque dégradé
  if (!isGradient) {
    return (
      <Text style={[styles.name, { fontSize: size, color: c1 }]} numberOfLines={1}>
        {name}
      </Text>
    );
  }

  const textEl = (
    <Text style={[styles.name, { fontSize: size }]} numberOfLines={1}>
      {name}
    </Text>
  );

  return (
    <MaskedView maskElement={textEl} style={styles.mask}>
      <LinearGradient colors={[c1, c2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        {/* Texte invisible : donne sa taille au dégradé */}
        <Text style={[styles.name, styles.ghost, { fontSize: size }]} numberOfLines={1}>
          {name}
        </Text>
      </LinearGradient>
    </MaskedView>
  );
}

const styles = StyleSheet.create({
  name: {
    fontWeight: '900',
    letterSpacing: Platform.select({ ios: -0.6, default: -0.4 }),
  },
  ghost: { opacity: 0 },
  mask: { flexShrink: 1 },
});
