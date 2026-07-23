import { useAppLogos } from '../useAppLogos';

/** Écarte les URLs de remplissage (placeholders, data-URI) — on préfère le fallback local. */
function cleanUrl(url: string | null): string | null {
  if (!url) return null;
  const u = url.trim();
  if (!u || u.includes('placehold.co') || u.includes('placeholder') || u.startsWith('data:')) {
    return null;
  }
  return u;
}

/**
 * URL du logo CMS pour un contexte donné (`header`, `login`, ...).
 * Si le contexte demandé n'a pas de logo exploitable, on retombe sur le
 * logo `header` afin que l'admin n'ait qu'un seul upload obligatoire.
 */
export function useBrandLogo(context = 'header'): string | null {
  const { getLogo } = useAppLogos();
  const direct = cleanUrl(getLogo(context));
  if (direct) return direct;
  return context !== 'header' ? cleanUrl(getLogo('header')) : null;
}
