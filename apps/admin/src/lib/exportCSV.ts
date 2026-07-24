/**
 * Utilitaire d'export CSV
 * Encodage UTF-8 avec BOM pour compatibilité Excel / LibreOffice.
 */
import { toast } from './toast'

/**
 * Convertit un tableau d'objets en chaîne CSV.
 * Les colonnes sont déduites des clés du premier objet.
 */
const SEP = ';'

function toCsvString(data: Record<string, unknown>[]): string {
  if (data.length === 0) return ''

  const headers = Object.keys(data[0])
  const escape = (val: unknown): string => {
    const str = val == null ? '' : String(val)
    if (str.includes('"') || str.includes(SEP) || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  // sep= directive → Excel détecte automatiquement le séparateur
  const rows = data.map((row) => headers.map((h) => escape(row[h])).join(SEP))
  return [`sep=${SEP}`, headers.map(escape).join(SEP), ...rows].join('\r\n')
}

/**
 * Déclenche le téléchargement d'un fichier CSV depuis le navigateur.
 *
 * @param data     Tableau d'objets à exporter (les clés deviennent les en-têtes)
 * @param filename Nom du fichier sans extension (ex: "livreurs_2026-07-17")
 */
export function exportToCSV(data: Record<string, unknown>[], filename: string): void {
  if (data.length === 0) {
    toast.error('Aucune donnée à exporter.')
    return
  }

  const csvContent = toCsvString(data)
  // BOM UTF-8 (\uFEFF) pour que Excel reconnaisse l'encodage automatiquement
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
