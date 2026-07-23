import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';
import { useColors } from '@/design-system';
import { ICONS, IconName, IconPath } from './paths';

export type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  /** Épaisseur du trait (icônes en ligne). */
  strokeWidth?: number;
  /** Force le remplissage (sinon selon le tracé). */
  fill?: boolean;
};

/**
 * Composant d'icône SVG unifié.
 * Usage : <Icon name="cart" size={24} color={colors.primary} />
 */
export function Icon({
  name,
  size = 24,
  color,
  strokeWidth = 2,
  fill,
}: IconProps) {
  const themeColors = useColors();
  const resolved = color ?? themeColors.text;
  // Sécurité : si le nom vient du backend et n'existe pas, on retombe sur "tag"
  // au lieu de crasher toute l'app. ICONS peut être partiellement initialisé
  // lors du premier rendu (cycle Metro) — on recalcule après chaque render.
  const iconEntry = ICONS[name as IconName];
  const icon = (iconEntry ?? ICONS.tag) as IconPath;
  if (process.env.NODE_ENV !== 'production' && !iconEntry) {
    // eslint-disable-next-line no-console
    console.warn(`[Icon] Icône inconnue "${name}" — fallback sur "tag"`);
  }
  const isFilled = fill ?? icon.filled ?? false;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {icon.d?.map((d, i) => (
        <Path
          key={i}
          d={d}
          stroke={isFilled ? 'none' : resolved}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={isFilled ? resolved : 'none'}
        />
      ))}
      {icon.circles?.map(([cx, cy, r], i) => (
        <Circle
          key={`c${i}`}
          cx={cx}
          cy={cy}
          r={r}
          stroke={isFilled ? 'none' : resolved}
          strokeWidth={strokeWidth}
          fill={isFilled ? resolved : 'none'}
        />
      ))}
    </Svg>
  );
}

export type { IconName };
