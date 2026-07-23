import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, Check, ChevronLeft, ChevronRight, Plus, Trash2, X } from 'lucide-react'
import { useAdminProduct } from '../hooks/useAdminProducts'
import { useCreateProduct } from '../hooks/useCreateProduct'
import { useUpdateProduct } from '../hooks/useUpdateProduct'
import { useAdminCategories } from '@/features/categories'
import { useAdminFeedSections } from '@/features/content'
import { PermissionGuard } from '@/components/guards/PermissionGuard'
import type { CreateProductInput, ProductVariant, ProductAttribute } from '@/infrastructure/data-source/AdminProductDataSource'
import { resolveAdminMediaUrl } from '@/lib/resolveAdminMediaUrl'
import { COLOR_PALETTE, isColorAttribute, paletteHex } from '../colorPalette'
import { formatPrice } from '@/lib/format'
import { ValidationError } from '@/lib/validate'
import {
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  DataTable,
  FormField,
  Input,
  LoadingBlock,
  PageHeader,
  Select,
  Switch,
  Textarea,
  type Column,
} from '@/components/ui'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/cn'

function formatPriceInput(value: string) {
  const digits = value.replace(/[^\d]/g, '')
  return digits
}

/**
 * Découpe la saisie libre d'un attribut en valeurs (virgule OU point-virgule).
 * Le texte brut reste dans l'état tel que tapé : découper à chaque frappe
 * dans un input contrôlé « mange » la virgule au moment où on la tape.
 */
function parseAttrValues(text: string): string[] {
  const seen = new Set<string>()
  return text
    .split(/[,;]/)
    .map((v) => v.trim())
    .filter((v) => {
      if (!v || seen.has(v)) return false
      seen.add(v)
      return true
    })
}

// Messages de validation existants → champ concerné (pour l'affichage inline).
const FIELD_ERROR_MESSAGES = {
  name: 'Le nom est requis',
  price: 'Le prix doit être supérieur à 0',
  compareAtPrice: 'Le prix barré doit être supérieur au prix de vente',
  sku: 'Le SKU est requis',
} as const

export function AdminProductFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = !!id

  // The hook must always be called. `useAdminProduct` disables its query when no id is provided.
  const { data: product, isLoading: loadingProduct } = useAdminProduct(id ?? '')
  const { data: categories } = useAdminCategories()
  const { data: feedSections } = useAdminFeedSections()
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct(id ?? '')

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [compareAtPrice, setCompareAtPrice] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [stock, setStock] = useState('')
  const [sku, setSku] = useState('')
  const [isActive, setIsActive] = useState(true)
  // Galerie du produit : la 1re image est la principale (affichée dans les
  // listes) ; les suivantes défilent en carrousel sur la fiche produit mobile.
  const [images, setImages] = useState<string[]>([])
  const [hasVariants, setHasVariants] = useState(false)
  // valuesText = saisie brute ("S, M, L") ; les valeurs sont extraites via
  // parseAttrValues au moment de générer les variantes.
  const [attrGroups, setAttrGroups] = useState<{ name: string; valuesText: string }[]>([])
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [error, setError] = useState<string | null>(null)
  // Section CMS : affecter ce produit à une feed_section via un tag
  const [selectedSectionId, setSelectedSectionId] = useState<string>('')

  useEffect(() => {
    if (product) {
      setName(product.name ?? '')
      setDescription(product.description ?? '')
      setPrice(String(product.price ?? ''))
      setCompareAtPrice(product.compareAtPrice ? String(product.compareAtPrice) : '')
      setCategoryId(product.categoryId ?? '')
      // sku/stock sont remontés par l'API depuis la variante par défaut du
      // produit (la table products n'a pas ces colonnes). totalStock = somme
      // des variantes actives.
      setStock(String(product.totalStock ?? product.stock ?? ''))
      setSku(product.sku ?? '')
      setIsActive(product.isActive ?? true)
      setImages(
        product.images?.length
          ? product.images
          : product.imageUrl
            ? [product.imageUrl]
            : [],
      )
      // Récupérer le sectionId depuis les tags du produit (format "section:UUID")
      const sectionTag = (product.tags ?? []).find((t: string) => t.startsWith('section:'))
      if (sectionTag) setSelectedSectionId(sectionTag.replace('section:', ''))
      if (product.variants && product.variants.length > 0) {
        setHasVariants(true)
        setVariants(product.variants)
        const groups: { name: string; values: string[] }[] = []
        product.variants.forEach((v: ProductVariant) => {
          ;(v.attributes ?? []).forEach((a: ProductAttribute) => {
            const existing = groups.find((g) => g.name === a.name)
            if (existing) {
              if (!existing.values.includes(a.value)) existing.values.push(a.value)
            } else {
              groups.push({ name: a.name, values: [a.value] })
            }
          })
        })
        setAttrGroups(groups.map((g) => ({ name: g.name, valuesText: g.values.join(', ') })))
      }
    }
  }, [product])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) { setError('Le nom est requis'); return }
    if (!description.trim()) { setError('La description est requise'); return }
    const numericPrice = Number(price)
    const numericCompareAtPrice = compareAtPrice ? Number(compareAtPrice) : undefined

    if (!price || numericPrice <= 0) { setError('Le prix doit être supérieur à 0'); return }
    if (numericCompareAtPrice !== undefined && numericCompareAtPrice <= numericPrice) {
      setError('Le prix barré doit être supérieur au prix de vente')
      return
    }
    if (!sku.trim()) { setError('Le SKU est requis'); return }

    const data: CreateProductInput & { variants?: ProductVariant[] } = {
      name: name.trim(),
      description: description.trim(),
      price: numericPrice,
      compareAtPrice: numericCompareAtPrice,
      categoryId,
      images,
      stock: hasVariants ? variants.reduce((sum, v) => sum + v.stock, 0) : (Number(stock) || 0),
      sku: sku.trim(),
      isActive,
      // Encoder l'affectation de section dans les tags (format "section:UUID")
      tags: selectedSectionId ? [`section:${selectedSectionId}`] : [],
      variants: hasVariants ? variants : undefined,
    }

    try {
      if (isEditing) {
        await updateProduct.mutateAsync(data)
      } else {
        await createProduct.mutateAsync(data)
      }
      toast.success(isEditing ? 'Produit mis à jour' : 'Produit créé')
      navigate('/products')
    } catch (err) {
      const message = err instanceof ValidationError
        ? Object.values(err.fields)[0] ?? 'Erreur de validation'
        : err instanceof Error ? err.message : 'Erreur lors de la sauvegarde'
      setError(message)
      toast.error(message)
    }
  }

  if (isEditing && loadingProduct) {
    return <LoadingBlock label="Chargement du produit…" />
  }

  function generateVariants() {
    const activeGroups = attrGroups
      .map((g) => ({ name: g.name, values: parseAttrValues(g.valuesText) }))
      .filter((g) => g.values.length > 0 && g.name.trim())
    if (activeGroups.length === 0) return
    const combos: { name: string; value: string }[][] = activeGroups.reduce(
      (acc, group) => {
        const result: { name: string; value: string }[][] = []
        acc.forEach((existing) => {
          group.values.forEach((val) => {
            result.push([...existing, { name: group.name, value: val }])
          })
        })
        return result
      },
      [[]] as { name: string; value: string }[][],
    )

    const newVariants: ProductVariant[] = combos.map((combo, idx) => {
      const attrSuffix = combo.map((a) => a.value).join('-')
      const existing = variants.find((v) =>
        v.attributes.every((a) => combo.some((c) => c.name === a.name && c.value === a.value)),
      )
      return existing ?? {
        id: `var_new_${idx}`,
        sku: `${sku || 'VAR'}-${attrSuffix}`,
        price: Number(price) || 0,
        stock: 0,
        attributes: combo,
        isActive: true,
      }
    })
    setVariants(newVariants)
  }

  function updateVariant(id: string, field: string, value: any) {
    setVariants((prev) => prev.map((v) => (v.id === id ? { ...v, [field]: value } : v)))
  }

  function removeVariant(id: string) {
    setVariants((prev) => prev.filter((v) => v.id !== id))
  }

  function addAttrGroup() {
    setAttrGroups((prev) => [...prev, { name: '', valuesText: '' }])
  }

  function updateAttrGroup(index: number, field: 'name' | 'values', value: string) {
    setAttrGroups((prev) => {
      const updated = [...prev]
      if (field === 'name') {
        updated[index] = { ...updated[index], name: value }
      } else {
        // Texte brut conservé tel quel — jamais re-normalisé pendant la frappe.
        updated[index] = { ...updated[index], valuesText: value }
      }
      return updated
    })
  }

  function removeAttrGroup(index: number) {
    setAttrGroups((prev) => prev.filter((_, i) => i !== index))
    setVariants([])
  }

  /** Palette couleur : coche/décoche une couleur dans le groupe d'attributs. */
  function toggleAttrValue(index: number, value: string) {
    setAttrGroups((prev) => {
      const updated = [...prev]
      const group = updated[index]
      const values = parseAttrValues(group.valuesText)
      const next = values.includes(value)
        ? values.filter((v) => v !== value)
        : [...values, value]
      updated[index] = { ...group, valuesText: next.join(', ') }
      return updated
    })
  }

  const isPending = createProduct.isPending || updateProduct.isPending

  const fieldErrors = {
    name: error === FIELD_ERROR_MESSAGES.name ? error : undefined,
    price: error === FIELD_ERROR_MESSAGES.price ? error : undefined,
    compareAtPrice: error === FIELD_ERROR_MESSAGES.compareAtPrice ? error : undefined,
    sku: error === FIELD_ERROR_MESSAGES.sku ? error : undefined,
  }
  const isFieldError = Object.values(fieldErrors).some(Boolean)

  const variantColumns: Column<ProductVariant>[] = [
    {
      key: 'attributes',
      header: 'Attributs',
      cell: (v) => (
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-700 dark:text-gray-300">
          {(v.attributes ?? []).map((a, i) => {
            const hex = isColorAttribute(a.name) ? paletteHex(a.value) : undefined
            return (
              <span key={i} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                {hex && (
                  <span
                    className="h-3 w-3 flex-shrink-0 rounded-full border border-black/15 dark:border-white/25"
                    style={{ backgroundColor: hex }}
                  />
                )}
                {a.name}: {a.value}
              </span>
            )
          })}
        </span>
      ),
    },
    {
      key: 'sku',
      header: 'SKU',
      cell: (v) => (
        <Input
          size="sm"
          value={v.sku}
          onChange={(e) => updateVariant(v.id, 'sku', e.target.value)}
          className="w-32 text-xs"
        />
      ),
    },
    {
      key: 'price',
      header: 'Prix',
      cell: (v) => (
        <Input
          size="sm"
          value={v.price}
          onChange={(e) => updateVariant(v.id, 'price', Number(e.target.value.replace(/[^\d]/g, '')) || 0)}
          className="w-24 text-xs"
        />
      ),
    },
    {
      key: 'stock',
      header: 'Stock',
      cell: (v) => (
        <Input
          size="sm"
          value={v.stock}
          onChange={(e) => updateVariant(v.id, 'stock', Number(e.target.value.replace(/[^\d]/g, '')) || 0)}
          className="w-20 text-xs"
        />
      ),
    },
    {
      key: 'isActive',
      header: 'Actif',
      align: 'center',
      cell: (v) => (
        <Checkbox
          checked={v.isActive}
          onCheckedChange={(checked) => updateVariant(v.id, 'isActive', checked)}
        />
      ),
    },
    {
      key: 'remove',
      header: '',
      align: 'right',
      cell: (v) => (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-red-500 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
          onClick={() => removeVariant(v.id)}
          aria-label="Supprimer la variante"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ]

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={isEditing ? 'Modifier le produit' : 'Nouveau produit'}
        description={isEditing ? 'Mettez à jour les informations du produit.' : 'Renseignez les informations du nouveau produit.'}
        breadcrumbs={[
          { label: 'Produits', href: '/products' },
          { label: isEditing ? 'Modifier' : 'Nouveau' },
        ]}
        backHref="/products"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && !isFieldError && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Informations générales</CardTitle>
              <CardDescription>Nom, description et catégorie du produit.</CardDescription>
            </div>
          </CardHeader>

          <div className="space-y-5">
            <FormField label="Nom du produit" htmlFor="product-name" required error={fieldErrors.name}>
              <Input
                id="product-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="T-shirt Niger Classique"
                className="w-full"
              />
            </FormField>

            <FormField label="Description" htmlFor="product-description">
              <Textarea
                id="product-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Description détaillée du produit…"
                className="w-full"
              />
            </FormField>

            <FormField label="Catégorie" htmlFor="product-category">
              <Select
                id="product-category"
                value={categoryId}
                onChange={setCategoryId}
                options={(categories ?? [])
                  .filter((c: any) => !c.parentId)
                  .map((cat: any) => ({ value: cat.id, label: cat.name }))}
                placeholder="Sélectionner une catégorie"
                className="w-full"
              />
            </FormField>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Prix &amp; stock</CardTitle>
              <CardDescription>Tarification et disponibilité.</CardDescription>
            </div>
          </CardHeader>

          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Prix (FCFA)" htmlFor="product-price" required error={fieldErrors.price}>
                <Input
                  id="product-price"
                  value={price}
                  onChange={(e) => setPrice(formatPriceInput(e.target.value))}
                  placeholder="15000"
                  className="w-full"
                />
              </FormField>
              <FormField
                label="Prix barré (FCFA)"
                htmlFor="product-compare-price"
                error={fieldErrors.compareAtPrice}
                hint="Doit être supérieur au prix de vente."
              >
                <Input
                  id="product-compare-price"
                  value={compareAtPrice}
                  onChange={(e) => setCompareAtPrice(formatPriceInput(e.target.value))}
                  placeholder="18000"
                  className="w-full"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="SKU" htmlFor="product-sku" required error={fieldErrors.sku}>
                <Input
                  id="product-sku"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="SKU-NGR-0001"
                  className="w-full"
                />
              </FormField>
              <FormField
                label="Stock"
                htmlFor="product-stock"
                hint={hasVariants ? 'Calculé automatiquement depuis les variantes.' : undefined}
              >
                <Input
                  id="product-stock"
                  value={stock}
                  onChange={(e) => setStock(formatPriceInput(e.target.value))}
                  placeholder="10"
                  className="w-full"
                />
              </FormField>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Médias</CardTitle>
              <CardDescription>
                Jusqu'à 8 photos — la 1re est la photo principale, les autres défilent en carrousel sur la fiche produit.
              </CardDescription>
            </div>
          </CardHeader>

          <div className="flex flex-wrap items-center gap-3">
            {images.map((img, idx) => (
              <div key={idx} className="group relative">
                <img
                  src={resolveAdminMediaUrl(img)}
                  alt={`Photo ${idx + 1}`}
                  className={cn(
                    'h-20 w-20 rounded-lg border object-cover',
                    idx === 0
                      ? 'border-primary-500 ring-2 ring-primary-200 dark:ring-primary-800'
                      : 'border-gray-200 dark:border-gray-700',
                  )}
                  onError={() => setError(`Impossible d'afficher la photo ${idx + 1}`)}
                />
                {idx === 0 && (
                  <span className="absolute -left-1 -top-1 rounded bg-primary-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    Principale
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-gray-700 text-white transition-colors hover:bg-red-600 dark:bg-gray-600"
                  aria-label={`Supprimer la photo ${idx + 1}`}
                >
                  <X className="h-3 w-3" />
                </button>
                {/* Réordonner : flèches gauche/droite au survol */}
                <div className="absolute inset-x-0 bottom-0 hidden justify-between rounded-b-lg bg-gray-950/50 px-1 group-hover:flex">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => setImages((prev) => {
                      const next = [...prev]
                      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
                      return next
                    })}
                    className="text-white disabled:opacity-30"
                    aria-label="Déplacer vers la gauche"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === images.length - 1}
                    onClick={() => setImages((prev) => {
                      const next = [...prev]
                      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
                      return next
                    })}
                    className="text-white disabled:opacity-30"
                    aria-label="Déplacer vers la droite"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {images.length < 8 && (
              <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 text-xs text-gray-500 transition-colors hover:border-primary-400 hover:text-primary-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-primary-500 dark:hover:text-primary-400">
                <Plus className="h-5 w-5" />
                Ajouter
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? [])
                    e.target.value = ''
                    if (!files.length) return
                    for (const file of files) {
                      if (!file.type.startsWith('image/')) {
                        setError('Veuillez sélectionner des fichiers image valides')
                        return
                      }
                      if (file.size > 5 * 1024 * 1024) {
                        setError('Chaque image ne doit pas dépasser 5 Mo')
                        return
                      }
                    }
                    setError(null)
                    files.slice(0, 8 - images.length).forEach((file) => {
                      const reader = new FileReader()
                      reader.onload = () => {
                        if (typeof reader.result === 'string') {
                          const result = reader.result
                          setImages((prev) => (prev.length < 8 ? [...prev, result] : prev))
                        }
                      }
                      reader.onerror = () => setError("Impossible de lire l'image sélectionnée")
                      reader.readAsDataURL(file)
                    })
                  }}
                />
              </label>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Options</CardTitle>
              <CardDescription>Visibilité et mise en avant sur la page d'accueil.</CardDescription>
            </div>
          </CardHeader>

          <div className="space-y-5">
            {/* Affectation à une section CMS ─────────────────────────────── */}
            <FormField
              label="Section de la page d'accueil"
              htmlFor="product-section"
              hint={'Facultatif — seules les sections de type "Produits" sont listées. Gérez les sections dans CMS → Sections.'}
            >
              <Select
                id="product-section"
                value={selectedSectionId}
                onChange={setSelectedSectionId}
                options={(feedSections ?? [])
                  .filter((s: any) => s.type === 'products' && s.isActive)
                  .map((s: any) => ({ value: s.id, label: s.title }))}
                placeholder="Aucune section spécifique"
                className="w-full"
              />
            </FormField>

            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              label="Produit actif (visible dans la boutique)"
            />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Variantes</CardTitle>
              <CardDescription>Tailles, couleurs et autres déclinaisons du produit.</CardDescription>
            </div>
          </CardHeader>

          <Switch
            checked={hasVariants}
            onCheckedChange={(checked) => {
              setHasVariants(checked)
              if (!checked) { setVariants([]); setAttrGroups([]) }
            }}
            label="Ce produit a des variantes (tailles, couleurs, etc.)"
            className="mb-4"
          />

          {hasVariants && (
            <div className="space-y-4">
              <div className="space-y-2">
                {attrGroups.map((group, gi) => (
                  <div key={gi} className="flex items-start gap-2">
                    <div className="w-40 flex-shrink-0">
                      <Input
                        placeholder="Attribut (ex: Taille)"
                        value={group.name}
                        onChange={(e) => updateAttrGroup(gi, 'name', e.target.value)}
                        className="w-full"
                      />
                    </div>
                    {isColorAttribute(group.name) ? (
                      /* Palette : l'admin clique sur les couleurs, aucun code à saisir */
                      <div className="flex flex-1 flex-wrap gap-1.5 rounded-lg border border-gray-200 bg-gray-50/60 p-2 dark:border-gray-800 dark:bg-gray-900/40">
                        {COLOR_PALETTE.map((c) => {
                          const selected = parseAttrValues(group.valuesText).includes(c.name)
                          return (
                            <button
                              key={c.name}
                              type="button"
                              onClick={() => toggleAttrValue(gi, c.name)}
                              aria-pressed={selected}
                              className={cn(
                                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors',
                                selected
                                  ? 'border-primary-500 bg-primary-50 font-semibold text-primary-700 dark:border-primary-400 dark:bg-primary-900/30 dark:text-primary-300'
                                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-500',
                              )}
                            >
                              <span
                                className="h-3.5 w-3.5 flex-shrink-0 rounded-full border border-black/15 dark:border-white/25"
                                style={
                                  c.name === 'Multicolore'
                                    ? { background: 'conic-gradient(#E53935, #FB8C00, #FDD835, #43A047, #1E88E5, #8E24AA, #E53935)' }
                                    : { backgroundColor: c.hex }
                                }
                              />
                              {c.name}
                              {selected && <Check className="h-3 w-3" />}
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="flex-1">
                        <Input
                          placeholder="Valeurs séparées par des virgules (ex: S, M, L, XL)"
                          value={group.valuesText}
                          onChange={(e) => updateAttrGroup(gi, 'values', e.target.value)}
                          className="w-full"
                        />
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
                      onClick={() => removeAttrGroup(gi)}
                      aria-label="Supprimer l'attribut"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="ghost" size="sm" leftIcon={Plus} onClick={addAttrGroup}>
                    Ajouter un attribut
                  </Button>
                  {/* Préréglages : un clic préremplit le nom de l'attribut */}
                  {['Taille', 'Couleur', 'Pointure', 'Matière']
                    .filter((preset) => !attrGroups.some((g) => g.name.trim().toLowerCase() === preset.toLowerCase()))
                    .map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAttrGroups((prev) => [...prev, { name: preset, valuesText: '' }])}
                        className="rounded-full border border-dashed border-gray-300 px-2.5 py-1 text-xs text-gray-500 transition-colors hover:border-primary-400 hover:text-primary-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-primary-500 dark:hover:text-primary-400"
                      >
                        + {preset}
                      </button>
                    ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Pour l'attribut « Couleur », cliquez sur les couleurs de la palette : elles s'affichent avec une
                  pastille sur la fiche produit mobile, comme sur les grands sites e-commerce.
                </p>
              </div>

              {attrGroups.some((g) => parseAttrValues(g.valuesText).length > 0 && g.name.trim()) && (
                <div className="flex justify-end">
                  <Button type="button" variant="secondary" size="sm" onClick={generateVariants}>
                    Générer les variantes
                  </Button>
                </div>
              )}

              {variants.length > 0 && (
                <DataTable
                  bare
                  data={variants}
                  columns={variantColumns}
                  rowKey={(v) => v.id}
                  className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-800"
                />
              )}
            </div>
          )}
        </Card>

        <PermissionGuard permission={isEditing ? 'products.update' : 'products.create'}>
          <div className="sticky bottom-0 z-10 -mx-2 rounded-t-xl border-t border-gray-200 bg-white/85 px-2 py-4 backdrop-blur dark:border-gray-800 dark:bg-gray-950/85">
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => navigate('/products')}>
                Annuler
              </Button>
              <Button type="submit" loading={isPending}>
                {isEditing ? 'Enregistrer les modifications' : 'Créer le produit'}
              </Button>
            </div>
          </div>
        </PermissionGuard>
      </form>
    </div>
  )
}
