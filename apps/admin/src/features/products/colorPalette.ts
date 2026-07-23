/**
 * Palette de couleurs proposée à l'administrateur pour l'attribut « Couleur ».
 *
 * Les noms (pas les hex) sont enregistrés comme valeurs de variante : l'API
 * mobile (COLOR_HEX dans mobile.service.ts) retraduit ces mêmes noms en
 * pastilles hex sur la fiche produit. Garder les deux listes synchronisées.
 *
 * Exception à la règle « pas de hex en dur » : comme les couleurs CMS, ce
 * sont des données produit choisies par l'utilisateur, pas du style d'UI.
 */
export type PaletteColor = { name: string; hex: string }

export const COLOR_PALETTE: PaletteColor[] = [
  { name: 'Noir', hex: '#1A1A1A' },
  { name: 'Blanc', hex: '#FFFFFF' },
  { name: 'Gris', hex: '#8E8E93' },
  { name: 'Argent', hex: '#C0C0C0' },
  { name: 'Rouge', hex: '#E53935' },
  { name: 'Bordeaux', hex: '#7B1F2B' },
  { name: 'Rose', hex: '#F06292' },
  { name: 'Orange', hex: '#FB8C00' },
  { name: 'Jaune', hex: '#FDD835' },
  { name: 'Doré', hex: '#D4AF37' },
  { name: 'Vert', hex: '#43A047' },
  { name: 'Kaki', hex: '#7C7B46' },
  { name: 'Turquoise', hex: '#26C6DA' },
  { name: 'Bleu', hex: '#1E88E5' },
  { name: 'Marine', hex: '#173A5E' },
  { name: 'Violet', hex: '#8E24AA' },
  { name: 'Mauve', hex: '#B39DDB' },
  { name: 'Marron', hex: '#6D4C41' },
  { name: 'Beige', hex: '#D7C4A3' },
  { name: 'Crème', hex: '#F5F0E1' },
  { name: 'Multicolore', hex: '#FFFFFF' },
]

/** L'attribut est-il une couleur ? (détermine l'affichage palette vs texte) */
export function isColorAttribute(name: string): boolean {
  return /^(couleurs?|colors?|colours?)$/i.test(name.trim())
}

/** Hex d'une couleur de la palette (insensible casse/accents), sinon undefined. */
export function paletteHex(value: string): string | undefined {
  const normalize = (s: string) =>
    s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  return COLOR_PALETTE.find((c) => normalize(c.name) === normalize(value))?.hex
}
