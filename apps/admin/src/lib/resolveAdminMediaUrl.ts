/**
 * Résout une URL média retournée par l'API NestJS.
 *
 * - Si l'URL est absolue (http/https) → retournée telle quelle.
 * - Si c'est un chemin relatif (/uploads/…) → préfixé avec l'origine de l'API.
 * - Si vide ou undefined → retourne undefined.
 *
 * Usage dans les composants admin :
 *   <img src={resolveAdminMediaUrl(method.logoUrl)} />
 */
export function resolveAdminMediaUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined

  // Déjà absolue
  if (/^https?:\/\//.test(url) || url.startsWith('data:')) return url

  // Chemin relatif (/uploads/...) → préfixer avec l'origine de l'API
  const apiBase = import.meta.env.VITE_API_URL ?? '/api'
  // Retirer le segment /api final pour obtenir l'origine du serveur
  const origin = apiBase.replace(/\/api\/?$/, '')

  // Si pas d'origine (ex: VITE_API_URL = '/api' relatif),
  // retourner le chemin tel quel (le proxy Vite s'en occupe en dev)
  if (!origin || origin.startsWith('/')) return url

  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`
}

/**
 * Retourne true si l'URL pointe vers un SVG
 * (non supporté nativement dans React Native et problématique dans certains navigateurs)
 */
export function isSvgUrl(url: string | null | undefined): boolean {
  if (!url) return false
  return /\.svg(\?.*)?$/i.test(url) || url.includes('image/svg')
}
