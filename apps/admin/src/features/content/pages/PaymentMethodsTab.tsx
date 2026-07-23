import { useState } from 'react'
import { ChevronDown, ChevronRight, CreditCard, Eye, EyeOff, ImagePlus, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle,
  ConfirmDialog, EmptyState, FormField, Input, LoadingBlock, Modal, Select, Switch, type BadgeProps,
} from '@/components/ui'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/cn'
import {
  useAdminPaymentMethods, useCreatePaymentMethod, useUpdatePaymentMethod, useDeletePaymentMethod, useUploadPaymentMethodLogo,
} from '../hooks/useAdminPaymentMethods'
import type { PaymentMethod } from '@/infrastructure/data-source/AdminContentDataSource'
import { SensitiveActionGuard } from '@/components/guards/SensitiveActionGuard'
import { resolveAdminMediaUrl, isSvgUrl } from '@/lib/resolveAdminMediaUrl'

const TYPE_LABELS: Record<string, string> = {
  'mobile-money': 'Mobile Money', card: 'Carte bancaire',
  wallet: 'Portefeuille', cod: 'Paiement livraison',
}
const TYPE_VARIANTS: Record<string, BadgeProps['variant']> = {
  'mobile-money': 'info', card: 'purple', wallet: 'success', cod: 'warning',
}

function PaymentMethodFormModal({ initial, onClose }: { initial?: PaymentMethod | null; onClose: () => void }) {
  const createMethod = useCreatePaymentMethod()
  const updateMethod = useUpdatePaymentMethod(initial?.id ?? '')
  const uploadLogo = useUploadPaymentMethodLogo()
  const [code, setCode] = useState(initial?.code ?? '')
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [logoUrl, setLogoUrl] = useState(initial?.logoUrl ?? '')
  const [type, setType] = useState<PaymentMethod['type']>(initial?.type ?? 'mobile-money')
  const [position, setPosition] = useState(String(initial?.position ?? ''))
  const [feePercent, setFeePercent] = useState(String(initial?.feePercent ?? ''))
  const [feeFixed, setFeeFixed] = useState(String(initial?.feeFixed ?? ''))
  const [minAmount, setMinAmount] = useState(String(initial?.minAmount ?? ''))
  const [maxAmount, setMaxAmount] = useState(String(initial?.maxAmount ?? ''))
  const [supportedCountries, setSupportedCountries] = useState((initial?.supportedCountries ?? []).join(', '))
  const [apiKey, setApiKey] = useState(initial?.apiKey ?? '')
  const [apiSecret, setApiSecret] = useState(initial?.apiSecret ?? '')
  const [apiEndpoint, setApiEndpoint] = useState(initial?.apiEndpoint ?? '')
  const [isSandbox, setIsSandbox] = useState(initial?.isSandbox ?? true)
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [showSecret, setShowSecret] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Fichier choisi avant création : uploadé juste après le POST (l'endpoint d'upload exige un id)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingPreview, setPendingPreview] = useState<string | null>(null)
  const isPending = createMethod.isPending || updateMethod.isPending || uploadLogo.isPending

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null)
    if (!code.trim()) { setError('Le code est requis'); return }
    if (!name.trim()) { setError('Le nom est requis'); return }
    if (!logoUrl.trim() && !pendingFile) { setError("Le logo est requis : collez une URL ou uploadez une image"); return }
    try {
      const data = {
        code: code.trim().toLowerCase().replace(/\s+/g, '-'), name: name.trim(),
        description: description.trim() || undefined, logoUrl: logoUrl.trim(), type,
        position: Number(position) || 0, feePercent: Number(feePercent) || 0, feeFixed: Number(feeFixed) || 0,
        minAmount: minAmount ? Number(minAmount) : undefined,
        maxAmount: maxAmount ? Number(maxAmount) : undefined,
        supportedCountries: supportedCountries.split(',').map((s) => s.trim()).filter(Boolean),
        apiKey: apiKey.trim() || undefined, apiSecret: apiSecret.trim() || undefined,
        apiEndpoint: apiEndpoint.trim() || undefined, isSandbox, isActive,
      }
      if (initial) {
        await updateMethod.mutateAsync(data)
        if (pendingFile) await uploadLogo.mutateAsync({ id: initial.id, file: pendingFile })
      } else {
        const created = await createMethod.mutateAsync(data)
        if (pendingFile && created?.id) await uploadLogo.mutateAsync({ id: created.id, file: pendingFile })
      }
      toast.success('Enregistré')
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur'
      setError(message)
      toast.error(message)
    }
  }

  return (
    <Modal
      open
      onOpenChange={(o) => { if (!o) onClose() }}
      title={initial ? 'Modifier le moyen de paiement' : 'Nouveau moyen de paiement'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button type="submit" form="payment-method-form" loading={isPending}>
            {initial ? 'Enregistrer' : 'Créer'}
          </Button>
        </>
      }
    >
      <form id="payment-method-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</p>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Code" required htmlFor="pm-code">
            <Input id="pm-code" size="sm" className="w-full font-mono" value={code} onChange={(e) => setCode(e.target.value)} placeholder="wave" />
          </FormField>
          <FormField label="Nom" required htmlFor="pm-name">
            <Input id="pm-name" size="sm" className="w-full" value={name} onChange={(e) => setName(e.target.value)} placeholder="Wave" />
          </FormField>
          <FormField label="Description" htmlFor="pm-description" className="sm:col-span-2">
            <Input id="pm-description" size="sm" className="w-full" value={description} onChange={(e) => setDescription(e.target.value)} />
          </FormField>
          <FormField label="Logo" required className="sm:col-span-2">
            <div className="flex items-start gap-4">
              {(pendingPreview || logoUrl) && (
                <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800">
                  {pendingPreview
                    ? <img src={pendingPreview} alt="Aperçu" className="h-full w-full object-contain" />
                    : isSvgUrl(logoUrl)
                      ? <div className="flex h-full w-full items-center justify-center text-center text-xs leading-tight text-amber-600 dark:text-amber-400">SVG<br />non supporté</div>
                      : <img src={resolveAdminMediaUrl(logoUrl)} alt="Aperçu" className="h-full w-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  }
                </div>
              )}
              <div className="flex-1 space-y-2">
                <Input size="sm" className="w-full font-mono" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://exemple.com/logo.png" />
                {isSvgUrl(logoUrl) && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">Les SVG ne s'affichent pas sur mobile. Utilisez un PNG, JPG ou WebP.</p>
                )}
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-xs text-gray-500 transition-colors hover:border-primary-400 hover:text-primary-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-primary-500 dark:hover:text-primary-400">
                  <ImagePlus className="h-4 w-4" />
                  <span>{uploadLogo.isPending ? 'Upload...' : pendingFile ? `Image prête : ${pendingFile.name}` : 'Uploader une image'}</span>
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setError(null)
                    if (initial?.id) {
                      // Méthode existante → upload immédiat
                      try {
                        const result = await uploadLogo.mutateAsync({ id: initial.id, file })
                        if (result?.logoUrl) setLogoUrl(result.logoUrl)
                        toast.success('Logo uploadé')
                      } catch (err) {
                        const message = err instanceof Error ? err.message : 'Erreur upload logo'
                        setError(message)
                        toast.error(message)
                      }
                    } else {
                      // Nouvelle méthode → mémoriser le fichier, uploadé après la création
                      setPendingFile(file)
                      setPendingPreview(URL.createObjectURL(file))
                    }
                    e.target.value = ''
                  }} />
                </label>
                {pendingFile && !initial?.id && (
                  <p className="text-xs text-blue-600 dark:text-blue-400">L'image sera envoyée à la création de la méthode.</p>
                )}
              </div>
            </div>
          </FormField>
          <FormField label="Type" htmlFor="pm-type">
            <Select
              id="pm-type"
              size="sm"
              className="w-full"
              value={type}
              onChange={(v) => setType(v as PaymentMethod['type'])}
              options={Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))}
            />
          </FormField>
          <FormField label="Position" htmlFor="pm-position">
            <Input id="pm-position" size="sm" className="w-full" type="number" value={position} onChange={(e) => setPosition(e.target.value)} />
          </FormField>
          <FormField label="Frais (%)" htmlFor="pm-fee-percent">
            <Input id="pm-fee-percent" size="sm" className="w-full" type="number" step="0.1" value={feePercent} onChange={(e) => setFeePercent(e.target.value)} />
          </FormField>
          <FormField label="Frais fixe (FCFA)" htmlFor="pm-fee-fixed">
            <Input id="pm-fee-fixed" size="sm" className="w-full" type="number" step="0.1" value={feeFixed} onChange={(e) => setFeeFixed(e.target.value)} />
          </FormField>
          <FormField label="Montant min." htmlFor="pm-min-amount">
            <Input id="pm-min-amount" size="sm" className="w-full" type="number" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} />
          </FormField>
          <FormField label="Montant max." htmlFor="pm-max-amount">
            <Input id="pm-max-amount" size="sm" className="w-full" type="number" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} />
          </FormField>
          <FormField label="Pays supportés (codes séparés par virgule, * = tous)" htmlFor="pm-countries" className="sm:col-span-2">
            <Input id="pm-countries" size="sm" className="w-full font-mono" value={supportedCountries} onChange={(e) => setSupportedCountries(e.target.value)} placeholder="CI, SN, ML, BF" />
          </FormField>
        </div>

        <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
          <h4 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Configuration API</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="API Endpoint" htmlFor="pm-endpoint" className="sm:col-span-2">
              <Input id="pm-endpoint" size="sm" className="w-full font-mono" value={apiEndpoint} onChange={(e) => setApiEndpoint(e.target.value)} />
            </FormField>
            <FormField label="Clé API (public)" htmlFor="pm-api-key">
              <Input id="pm-api-key" size="sm" className="w-full font-mono" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
            </FormField>
            <FormField label="Secret API" htmlFor="pm-api-secret">
              <div className="flex gap-2">
                <Input
                  id="pm-api-secret"
                  size="sm"
                  className="w-full flex-1 font-mono"
                  type={showSecret ? 'text' : 'password'}
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={showSecret ? 'Masquer le secret' : 'Afficher le secret'}
                  onClick={() => setShowSecret(!showSecret)}
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </FormField>
          </div>
        </div>

        <div className="flex items-center gap-6 pt-2">
          <Switch checked={isActive} onCheckedChange={setIsActive} label="Actif" />
          <Switch checked={isSandbox} onCheckedChange={setIsSandbox} label="Mode sandbox (test)" />
        </div>
      </form>
    </Modal>
  )
}

function PaymentMethodsContent() {
  const { data: methods, isLoading, isError } = useAdminPaymentMethods()
  const deleteMethod = useDeletePaymentMethod()
  const [showForm, setShowForm] = useState(false)
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [expandApi, setExpandApi] = useState<string | null>(null)

  if (isLoading) return <LoadingBlock label="Chargement des méthodes de paiement…" />
  if (isError) return <p className="text-sm text-red-600 dark:text-red-400">Erreur de chargement</p>

  const orderedMethods = [...(methods ?? [])].sort((a, b) => a.position - b.position)

  return (
    <Card padding="sm">
      <CardHeader>
        <div>
          <CardTitle>Méthodes de paiement</CardTitle>
          <CardDescription>
            {orderedMethods.length} méthode{orderedMethods.length > 1 ? 's' : ''} de paiement
          </CardDescription>
        </div>
        <Button size="sm" leftIcon={Plus} onClick={() => { setEditingMethod(null); setShowForm(true) }}>
          Nouvelle méthode
        </Button>
      </CardHeader>
      <CardContent>
        {orderedMethods.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="Aucune méthode de paiement"
            description="Ajoutez la première méthode de paiement disponible dans l'application."
            action={
              <Button size="sm" leftIcon={Plus} onClick={() => { setEditingMethod(null); setShowForm(true) }}>
                Nouvelle méthode
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3">
            {orderedMethods.map((method) => (
              <div
                key={method.id}
                className={cn(
                  'rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900',
                  !method.isActive && 'opacity-60',
                )}
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-50 p-2 dark:bg-gray-800">
                    {method.logoUrl && !isSvgUrl(method.logoUrl)
                      ? <img src={resolveAdminMediaUrl(method.logoUrl)} alt={method.name} className="h-full w-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      : method.logoUrl && isSvgUrl(method.logoUrl)
                        ? <span className="text-center text-xs leading-tight text-amber-600 dark:text-amber-400">SVG</span>
                        : <CreditCard className="h-5 w-5 text-gray-300 dark:text-gray-600" />
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium text-gray-900 dark:text-gray-100">{method.name}</h3>
                          <Badge size="sm" dot variant={method.isActive ? 'success' : 'neutral'}>
                            {method.isActive ? 'Actif' : 'Inactif'}
                          </Badge>
                          {method.isSandbox && <Badge size="sm" variant="warning">Sandbox</Badge>}
                        </div>
                        <p className="mt-0.5 font-mono text-xs text-gray-500 dark:text-gray-400">{method.code}</p>
                        {method.description && (
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{method.description}</p>
                        )}
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Modifier"
                          onClick={() => { setEditingMethod(method); setShowForm(true) }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Supprimer"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
                          onClick={() => setConfirmDelete(method.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <Badge size="sm" variant={TYPE_VARIANTS[method.type] ?? 'neutral'}>
                        {TYPE_LABELS[method.type] ?? method.type}
                      </Badge>
                      <span>Position {method.position}</span>
                      {method.feePercent > 0 && <span>Frais : {method.feePercent}%</span>}
                      {method.feeFixed > 0 && <span>+ {method.feeFixed} FCFA</span>}
                      <span>Pays : {method.supportedCountries.includes('*') ? 'Tous' : method.supportedCountries.join(', ')}</span>
                    </div>
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => setExpandApi(expandApi === method.id ? null : method.id)}
                        className="flex items-center gap-1 text-xs text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        {expandApi === method.id
                          ? <ChevronDown className="h-3.5 w-3.5" />
                          : <ChevronRight className="h-3.5 w-3.5" />}
                        Configuration API
                      </button>
                      {expandApi === method.id && (
                        <div className="mt-2 grid grid-cols-1 gap-3 rounded-lg bg-gray-50 p-3 font-mono text-xs text-gray-600 dark:bg-gray-800/50 dark:text-gray-400 sm:grid-cols-2">
                          <div><span className="text-gray-400 dark:text-gray-500">Endpoint :</span> {method.apiEndpoint || '—'}</div>
                          <div><span className="text-gray-400 dark:text-gray-500">Clé API :</span> {method.apiKey ? method.apiKey.substring(0, 20) + '...' : '—'}</div>
                          <div><span className="text-gray-400 dark:text-gray-500">Secret :</span> {method.apiSecret ? '••••••••' : '—'}</div>
                          <div><span className="text-gray-400 dark:text-gray-500">Mode :</span> {method.isSandbox ? 'Sandbox' : 'Production'}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {showForm && (
        <PaymentMethodFormModal initial={editingMethod} onClose={() => { setShowForm(false); setEditingMethod(null) }} />
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(o) => { if (!o) setConfirmDelete(null) }}
        title="Supprimer la méthode de paiement"
        description="Cette action est irréversible. La méthode sera retirée de l'application."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="danger"
        onConfirm={async () => {
          if (!confirmDelete) return
          try {
            await deleteMethod.mutateAsync(confirmDelete)
            toast.success('Méthode supprimée')
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression')
          }
        }}
      />
    </Card>
  )
}


export function PaymentMethodsTab() {
  return (
    <SensitiveActionGuard label="la configuration des méthodes de paiement">
      <PaymentMethodsContent />
    </SensitiveActionGuard>
  )
}
