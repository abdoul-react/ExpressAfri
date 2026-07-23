import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Download, Upload, XCircle } from 'lucide-react'
import { useCreateProduct } from '@/features/products'
import { useAdminCategories } from '@/features/categories'
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  PageHeader,
  type Column,
} from '@/components/ui'
import { toast } from '@/lib/toast'

interface CsvRow {
  name: string
  description: string
  price: number
  compareAtPrice: number
  categoryName: string
  stock: number
  sku: string
  imageUrl: string
  isActive: boolean
}

export function AdminProductImportPage() {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const createProduct = useCreateProduct()
  const { data: categories } = useAdminCategories()

  const [preview, setPreview] = useState<CsvRow[]>([])
  const [results, setResults] = useState<{ success: number; errors: { row: number; msg: string }[] } | null>(null)
  const [importing, setImporting] = useState(false)

  // Colonnes du modèle, dans l'ordre. `key` = clé technique (en-tête du fichier),
  // `label` = intitulé humain affiché dans la légende, `example` = valeur d'exemple.
  const TEMPLATE_COLUMNS = [
    { key: 'name', label: 'Nom du produit', required: true, hint: 'Obligatoire' },
    { key: 'description', label: 'Description', required: false, hint: 'Texte libre' },
    { key: 'price', label: 'Prix (FCFA)', required: true, hint: 'Nombre > 0' },
    { key: 'compareAtPrice', label: 'Prix barré (FCFA)', required: false, hint: 'Optionnel, > prix' },
    { key: 'category', label: 'Catégorie', required: false, hint: 'Nom exact de la catégorie' },
    { key: 'stock', label: 'Stock', required: false, hint: 'Nombre, défaut 0' },
    { key: 'sku', label: 'SKU', required: true, hint: 'Obligatoire, unique' },
    { key: 'imageUrl', label: 'URL image', required: false, hint: 'Optionnel' },
    { key: 'active', label: 'Actif', required: false, hint: 'true / false' },
  ] as const

  const TEMPLATE_ROWS = [
    ['T-shirt Niger Classique', 'T-shirt 100% coton, coupe droite', '15000', '18000', 'Vêtements', '50', 'TSH-NIG-001', 'https://example.com/tshirt.jpg', 'true'],
    ['Robe Wax Africaine', 'Robe en tissu wax authentique, motifs traditionnels', '25000', '32000', 'Vêtements', '20', 'ROB-WAX-002', 'https://example.com/robe.jpg', 'true'],
    ['Écouteurs Bluetooth', 'Écouteurs sans fil, autonomie 8h', '12000', '', 'Électronique', '35', 'ECO-BT-003', 'https://example.com/ecouteurs.jpg', 'true'],
    ['Sac à dos Cuir', 'Sac à dos en cuir véritable, 20L', '45000', '55000', 'Maroquinerie', '0', 'SAC-CUI-004', '', 'false'],
  ]

  /** Convertit une ligne d'objet {header→valeur} en CsvRow typée. */
  function toCsvRow(row: Record<string, string>): CsvRow {
    return {
      name: row.name ?? '',
      description: row.description ?? '',
      price: Number(row.price) || 0,
      compareAtPrice: Number(row.compareatprice ?? row['compare_at_price']) || 0,
      categoryName: row.category ?? row.categoryname ?? '',
      stock: Number(row.stock) || 0,
      sku: row.sku ?? '',
      imageUrl: row.imageurl ?? row.image ?? '',
      isActive: (row.active ?? row.isactive ?? 'true').toString().toLowerCase() === 'true',
    }
  }

  /**
   * Parse un fichier importé. Accepte 3 formats sans dépendance externe :
   *  - le modèle .xls téléchargé ici (tableau HTML) → lecture des <tr>/<td> ;
   *  - un CSV classique (séparateur , ou ; auto-détecté) ;
   *  - respecte les guillemets pour les descriptions contenant des virgules.
   */
  function parseSpreadsheet(text: string): CsvRow[] {
    const trimmed = text.trimStart()
    // Modèle .xls (tableau HTML) ou vrai HTML
    if (trimmed.startsWith('<') || /<table[\s>]/i.test(trimmed)) {
      const doc = new DOMParser().parseFromString(text, 'text/html')
      const trs = Array.from(doc.querySelectorAll('table tr'))
      if (trs.length < 2) return []
      const cellsOf = (tr: Element) => Array.from(tr.querySelectorAll('th,td')).map((c) => (c.textContent ?? '').trim())
      // Le modèle a plusieurs lignes d'en-tête (libellés, aides, clés) : on
      // repère celle qui porte les clés techniques (contient « name » et « sku »).
      const headerIdx = trs.findIndex((tr) => {
        const keys = cellsOf(tr).map((c) => c.toLowerCase())
        return keys.includes('name') && keys.includes('sku')
      })
      if (headerIdx === -1) return []
      const headers = cellsOf(trs[headerIdx]).map((c) => c.toLowerCase())
      return trs.slice(headerIdx + 1)
        .map((tr) => {
          const cells = Array.from(tr.querySelectorAll('td,th')).map((c) => (c.textContent ?? '').trim())
          const row: Record<string, string> = {}
          headers.forEach((h, i) => { row[h] = cells[i] ?? '' })
          return row
        })
        .filter((row) => (row.name ?? '').trim() || (row.sku ?? '').trim())
        .map(toCsvRow)
    }

    // CSV / TSV — auto-détection du séparateur sur la ligne d'en-tête
    const lines = text.split(/\r?\n/).filter((l) => l.trim())
    if (lines.length < 2) return []
    const sep = lines[0].includes(';') ? ';' : lines[0].includes('\t') ? '\t' : ','
    const parseLine = (line: string): string[] => {
      const out: string[] = []
      let cur = '', inQuotes = false
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ } else inQuotes = !inQuotes
        } else if (ch === sep && !inQuotes) {
          out.push(cur); cur = ''
        } else cur += ch
      }
      out.push(cur)
      return out.map((v) => v.trim())
    }
    const headers = parseLine(lines[0]).map((h) => h.toLowerCase())
    return lines.slice(1).map((line) => {
      const vals = parseLine(line)
      const row: Record<string, string> = {}
      headers.forEach((h, i) => { row[h] = vals[i] ?? '' })
      return toCsvRow(row)
    })
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : ''
      const rows = parseSpreadsheet(text)
      setPreview(rows)
      if (rows.length === 0) {
        toast.error('Aucun produit détecté dans le fichier')
      }
    }
    reader.readAsText(file)
  }

  async function handleImport() {
    if (!categories || preview.length === 0) return
    setImporting(true)
    const errors: { row: number; msg: string }[] = []
    let success = 0

    for (let i = 0; i < preview.length; i++) {
      const row = preview[i]
      if (!row.name.trim()) { errors.push({ row: i + 2, msg: 'Nom requis' }); continue }
      if (!row.sku.trim()) { errors.push({ row: i + 2, msg: 'SKU requis' }); continue }
      if (row.price <= 0) { errors.push({ row: i + 2, msg: 'Prix invalide' }); continue }

      const cat = categories.find((c: any) => c.name.toLowerCase() === row.categoryName.toLowerCase())
      try {
        await createProduct.mutateAsync({
          name: row.name,
          description: row.description,
          price: row.price,
          compareAtPrice: row.compareAtPrice > row.price ? row.compareAtPrice : undefined,
          categoryId: cat?.id ?? '',
          images: row.imageUrl ? [row.imageUrl] : [],
          stock: row.stock,
          sku: row.sku,
          isActive: row.isActive,
        })
        success++
      } catch (err) {
        errors.push({ row: i + 2, msg: err instanceof Error ? err.message : 'Erreur' })
      }
    }

    setResults({ success, errors })
    setImporting(false)

    if (success > 0) toast.success(`${success} produit(s) importé(s) avec succès`)
    if (errors.length > 0) toast.error(`${errors.length} erreur(s) lors de l'import`)
  }

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  /**
   * Génère un vrai classeur Excel (.xls) : un tableau HTML qu'Excel/LibreOffice
   * ouvrent comme une grille stylée — en-tête coloré, colonnes séparées et
   * bordures. Fini le CSV illisible « tout mélangé avec des virgules ».
   * Ligne 1 : intitulés lisibles. Ligne 2 : clés techniques (en-têtes lus à
   * l'import — NE PAS modifier). Lignes suivantes : 4 exemples à remplacer.
   */
  function downloadTemplate() {
    const th = (t: string, bg: string, color = '#111') =>
      `<td style="background:${bg};color:${color};font-weight:bold;border:1px solid #cbd5e1;padding:6px 10px;white-space:nowrap">${esc(t)}</td>`
    const td = (t: string) =>
      `<td style="border:1px solid #e2e8f0;padding:6px 10px;mso-number-format:'\\@'">${esc(t)}</td>`

    const labelRow = `<tr>${TEMPLATE_COLUMNS.map((c) => th(`${c.label}${c.required ? ' *' : ''}`, '#f97316', '#fff')).join('')}</tr>`
    const hintRow = `<tr>${TEMPLATE_COLUMNS.map((c) => th(c.hint, '#fff7ed')).join('')}</tr>`
    const keyRow = `<tr>${TEMPLATE_COLUMNS.map((c) => `<td style="background:#f1f5f9;color:#64748b;font-style:italic;border:1px solid #cbd5e1;padding:4px 10px">${c.key}</td>`).join('')}</tr>`
    const dataRows = TEMPLATE_ROWS.map((r) => `<tr>${r.map(td).join('')}</tr>`).join('')

    const html =
      `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">` +
      `<head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>` +
      `<x:Name>Produits</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>` +
      `</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>` +
      `<body><table border="1" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:13px">` +
      `<thead>${labelRow}${hintRow}${keyRow}</thead><tbody>${dataRows}</tbody></table>` +
      `<p style="font-family:Calibri,Arial;font-size:12px;color:#64748b">` +
      `Remplacez les lignes d'exemple par vos produits. Ne modifiez pas la ligne des clés techniques (name, price, sku…). ` +
      `Les colonnes marquées d'une * sont obligatoires. Enregistrez puis importez ce fichier.</p>` +
      `</body></html>`

    const blob = new Blob(['﻿' + html], { type: 'application/vnd.ms-excel;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'modele_import_produits.xls'; a.click()
    URL.revokeObjectURL(url)
  }

  const previewColumns: Column<CsvRow & { _key: string }>[] = [
    {
      key: 'name',
      header: 'Nom',
      cell: (row) =>
        row.name ? (
          <span className="text-sm text-gray-900 dark:text-gray-100">{row.name}</span>
        ) : (
          <Badge variant="danger" size="sm">vide</Badge>
        ),
    },
    {
      key: 'sku',
      header: 'SKU',
      cell: (row) =>
        row.sku ? (
          <span className="text-sm text-gray-500 dark:text-gray-400">{row.sku}</span>
        ) : (
          <Badge variant="danger" size="sm">vide</Badge>
        ),
    },
    {
      key: 'price',
      header: 'Prix',
      cell: (row) => `${row.price.toLocaleString('fr-FR')} FCFA`,
    },
    { key: 'stock', header: 'Stock' },
    {
      key: 'categoryName',
      header: 'Catégorie',
      cell: (row) => <span className="text-sm text-gray-500 dark:text-gray-400">{row.categoryName || '—'}</span>,
    },
  ]

  const previewRows = preview.slice(0, 10).map((row, i) => ({ ...row, _key: String(i) }))

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Import de produits"
        description="Importer des produits en masse depuis un fichier Excel ou CSV"
        breadcrumbs={[{ label: 'Produits', href: '/products' }, { label: 'Import' }]}
        backHref="/products"
        actions={
          <Button variant="outline" leftIcon={Download} onClick={downloadTemplate}>
            Télécharger le modèle Excel
          </Button>
        }
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Modèle &amp; colonnes attendues</CardTitle>
              <CardDescription>
                Téléchargez le modèle Excel (bouton en haut), remplissez une ligne par produit, puis réimportez-le.
                Le modèle s'ouvre comme un vrai tableau : chaque colonne est séparée et clairement identifiée.
              </CardDescription>
            </div>
          </CardHeader>

          {/* Légende des colonnes — reflète exactement l'en-tête du modèle Excel */}
          <div className="mb-6 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50">
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Colonne</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Clé (fichier)</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Requis</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Format</th>
                </tr>
              </thead>
              <tbody>
                {TEMPLATE_COLUMNS.map((c) => (
                  <tr key={c.key} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{c.label}</td>
                    <td className="px-3 py-2"><code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">{c.key}</code></td>
                    <td className="px-3 py-2">
                      {c.required
                        ? <Badge variant="danger" size="sm">Obligatoire</Badge>
                        : <span className="text-xs text-gray-400 dark:text-gray-500">Optionnel</span>}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">{c.hint}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <label className="group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 px-6 py-10 text-center transition-colors hover:border-primary-400 hover:bg-primary-50/40 dark:border-gray-700 dark:hover:border-primary-500 dark:hover:bg-primary-900/10">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 transition-colors group-hover:bg-primary-100 group-hover:text-primary-600 dark:bg-gray-800 dark:text-gray-500 dark:group-hover:bg-primary-900/30 dark:group-hover:text-primary-400">
              <Upload className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-200">
              Glissez votre fichier ici ou cliquez pour parcourir
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Formats acceptés : Excel (.xls) ou CSV</p>
            <input ref={fileRef} type="file" accept=".xls,.xlsx,.csv,text/csv,application/vnd.ms-excel" className="hidden" onChange={handleFile} />
          </label>

          {preview.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                Aperçu — {preview.length} produit(s) détecté(s)
              </h3>
              <DataTable
                bare
                data={previewRows}
                columns={previewColumns}
                rowKey={(row) => row._key}
                className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800"
                footer={
                  preview.length > 10 ? (
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      …et {preview.length - 10} produit(s) supplémentaire(s)
                    </p>
                  ) : undefined
                }
              />

              <div className="mt-4 flex gap-3">
                <Button
                  leftIcon={Upload}
                  loading={importing || createProduct.isPending}
                  onClick={handleImport}
                >
                  {importing ? 'Import en cours…' : `Importer ${preview.length} produit(s)`}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setPreview([]); setResults(null); if (fileRef.current) fileRef.current.value = '' }}
                >
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </Card>

        {results && (
          <Card>
            <CardHeader>
              <CardTitle>Résultat de l'import</CardTitle>
            </CardHeader>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {results.success} produit(s) importé(s) avec succès
                </span>
                <Badge variant="success" size="sm">{results.success}</Badge>
              </div>
              {results.errors.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <span className="text-sm font-medium text-red-600 dark:text-red-400">
                      {results.errors.length} erreur(s) :
                    </span>
                    <Badge variant="danger" size="sm">{results.errors.length}</Badge>
                  </div>
                  <ul className="space-y-1 pl-6">
                    {results.errors.slice(0, 10).map((e, i) => (
                      <li key={i} className="text-xs text-red-500 dark:text-red-400">
                        Ligne {e.row} : {e.msg}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="pt-1">
                <Button onClick={() => navigate('/products')}>Voir les produits</Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
