import { useColors } from '@/design-system';
import { useAppSettings } from '../useAppSettings';

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

/**
 * Couleurs de marque du nom de l'application, pilotées par le CMS admin :
 *  - `brand.nameColor1` → début du dégradé
 *  - `brand.nameColor2` → fin du dégradé
 * Repli sur la couleur primaire du thème si une valeur est absente ou invalide.
 */
export function useBrandColors() {
  const { get } = useAppSettings();
  const colors = useColors();
  const raw1 = get('brand.nameColor1', '');
  const raw2 = get('brand.nameColor2', '');
  const c1 = HEX_RE.test(raw1) ? raw1 : colors.primary;
  const c2 = HEX_RE.test(raw2) ? raw2 : colors.primary;
  return { c1, c2, isGradient: c1 !== c2 };
}
