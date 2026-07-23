/**
 * Résout une URL média retournée par l'API.
 *
 * - Si l'URL est déjà absolue (http/https ou data:) → retournée telle quelle.
 * - Si c'est un chemin relatif (/uploads/…) → préfixé avec l'origine de l'API
 *   (EXPO_PUBLIC_API_URL sans le segment /api).
 * - Si vide ou undefined → retourne undefined.
 */
export function resolveMediaUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;

  // Déjà absolue (http, https, data:…)
  if (/^https?:\/\//.test(url) || url.startsWith('data:')) return url;

  // Chemin relatif → préfixer avec l'origine de l'API
  const apiBase = process.env.EXPO_PUBLIC_API_URL ?? '';
  // Retirer le segment /api final pour obtenir l'origine du serveur
  const origin = apiBase.replace(/\/api\/?$/, '');
  if (!origin) return url;

  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
}

/**
 * Retourne true si l'URL pointe vers un fichier SVG.
 * Les SVG ne sont PAS supportés par expo-image / React Native Image sans
 * librairie dédiée (react-native-svg). Il faut afficher un fallback (icône).
 */
export function isSvgUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /\.svg(\?.*)?$/i.test(url) || url.includes('image/svg');
}
