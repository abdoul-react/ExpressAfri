import React from 'react';
import Svg, { Path, Circle, G } from 'react-native-svg';
import { useColors } from '@/design-system';

/** Marque du soleil du Niger — étoile rayonnante orange. Icône pure (aucune dépendance CMS). */
export function SunMark({ size = 26, color }: { size?: number; color?: string }) {
  const themeColors = useColors();
  const resolved = color ?? themeColors.primary;
  const rays = Array.from({ length: 12 }).map((_, i) => {
    const angle = (i * Math.PI) / 6;
    const x1 = 12 + Math.cos(angle) * 7.5;
    const y1 = 12 + Math.sin(angle) * 7.5;
    const x2 = 12 + Math.cos(angle) * 10.5;
    const y2 = 12 + Math.sin(angle) * 10.5;
    return `M${x1.toFixed(2)} ${y1.toFixed(2)} L${x2.toFixed(2)} ${y2.toFixed(2)}`;
  });
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={5.5} fill={resolved} />
      <G>
        {rays.map((d, i) => (
          <Path key={i} d={d} stroke={resolved} strokeWidth={2} strokeLinecap="round" />
        ))}
      </G>
    </Svg>
  );
}
