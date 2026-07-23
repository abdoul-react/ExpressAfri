import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { radius, spacing, useColors } from '@/design-system';
import { SunMark } from '@/icons';
import { useAppSettings } from '../useAppSettings';
import { useBrandLogo } from './useBrandLogo';
import { BrandName } from './BrandName';

type Props = {
  /** Contexte CMS du logo (`header`, `login`, ...). */
  context?: string;
  /** Hauteur du logo en points. Le nom est dimensionné proportionnellement. */
  logoSize?: number;
  /** Taille du nom ; par défaut ~62 % du logo. */
  nameSize?: number;
  /** Forcer l'affichage/masquage du nom (sinon piloté par `brand.showName`). */
  showName?: boolean;
  /** Encadrer le logo d'une pastille (fond doux + liseré) — rendu premium. */
  framed?: boolean;
};

/**
 * Bloc marque unifié : logo (CMS ou soleil de repli) + nom bicolore.
 * Source unique pour l'en-tête accueil, le login, l'onboarding, le splash…
 * Tout est piloté par le CMS admin : logo (onglet Logos), nom (app.name),
 * couleurs du nom (brand.nameColor1/2), visibilité (brand.showName).
 */
export function BrandMark({
  context = 'header',
  logoSize = 34,
  nameSize,
  showName,
  framed = true,
}: Props) {
  const colors = useColors();
  const { getBool } = useAppSettings();
  const logoUrl = useBrandLogo(context);
  const nameVisible = showName ?? getBool('brand.showName', true);
  const resolvedNameSize = nameSize ?? Math.round(logoSize * 0.62);

  const logo = logoUrl ? (
    <Image
      source={{ uri: logoUrl }}
      style={{ width: logoSize, height: logoSize, borderRadius: radius.sm }}
      contentFit="contain"
      transition={150}
      accessibilityLabel="Logo"
    />
  ) : (
    <SunMark size={Math.round(logoSize * 0.82)} />
  );

  return (
    <View style={styles.row}>
      {framed ? (
        <View
          style={[
            styles.frame,
            {
              width: logoSize + 8,
              height: logoSize + 8,
              backgroundColor: colors.primarySoft,
              borderColor: colors.border,
            },
          ]}
        >
          {logo}
        </View>
      ) : (
        logo
      )}
      {nameVisible && <BrandName size={resolvedNameSize} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  frame: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
