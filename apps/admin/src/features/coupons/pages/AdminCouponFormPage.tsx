import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  FormField,
  Input,
  PageHeader,
  Select,
  Switch,
  Textarea,
} from '@/components/ui'
import { toast } from '@/lib/toast'
import { useAdminCoupon, useCreateCoupon, useUpdateCoupon } from '../hooks/useAdminCoupons'
import type { Coupon, CreateCouponInput } from '@/infrastructure/data-source/AdminCouponDataSource'
import { TargetSelector } from '@/components/forms/TargetSelector'
import { useAdminAffiliates } from '@/features/affiliates/hooks/useAdminAffiliates'

const TYPE_OPTIONS = [
  { value: 'percentage', label: 'Pourcentage (%)' },
  { value: 'fixed', label: 'Montant fixe (FCFA)' },
  { value: 'free_shipping', label: 'Livraison gratuite' },
]

export function AdminCouponFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = !!id
  // The query hook must always be called; it is disabled internally when id is empty.
  const { data: coupon } = useAdminCoupon(id ?? '')
  const createCoupon = useCreateCoupon()
  const updateCoupon = useUpdateCoupon(id ?? '')
  const { data: affiliates } = useAdminAffiliates({ page: 1, limit: 100 })
  const [form, setForm] = useState<{
    code: string; name: string; description: string; type: Coupon['type']; value: string
    minPurchase: string; maxDiscount: string; startDate: string; endDate: string
    usageLimitPerUser: string; usageLimitTotal: string; firstTimeOnly: boolean
    applicableTo: Coupon['applicableTo']; applicableId: string; applicableName: string; isActive: boolean
    affiliateId: string; affiliateName: string
  }>({
    code: '', name: '', description: '', type: 'percentage', value: '',
    minPurchase: '', maxDiscount: '', startDate: '', endDate: '',
    usageLimitPerUser: '', usageLimitTotal: '', firstTimeOnly: false,
    applicableTo: 'all', applicableId: '', applicableName: '', isActive: true,
    affiliateId: '', affiliateName: '',
  })
  const [error, setError] = useState<string | null>(null)
  const saving = createCoupon.isPending || updateCoupon.isPending

  useEffect(() => {
    if (coupon) {
      setForm({
        code: coupon.code, name: coupon.name, description: coupon.description ?? '',
        type: coupon.type, value: String(coupon.value),
        minPurchase: coupon.minPurchase ? String(coupon.minPurchase) : '',
        maxDiscount: coupon.maxDiscount ? String(coupon.maxDiscount) : '',
        startDate: coupon.startDate.split('T')[0], endDate: coupon.endDate.split('T')[0],
        usageLimitPerUser: coupon.usageLimitPerUser ? String(coupon.usageLimitPerUser) : '',
        usageLimitTotal: coupon.usageLimitTotal ? String(coupon.usageLimitTotal) : '',
        firstTimeOnly: coupon.firstTimeOnly, applicableTo: coupon.applicableTo,
        applicableId: coupon.applicableId ?? '', applicableName: coupon.applicableName ?? '',
        isActive: coupon.isActive,
        affiliateId: coupon.affiliateId ?? '', affiliateName: coupon.affiliateName ?? '',
      })
    }
  }, [coupon])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setError(null)
    if (!form.code.trim()) { setError('Le code est requis'); return }
    if (!form.name.trim()) { setError('Le nom est requis'); return }
    if (!form.value || (Number(form.value) <= 0 && form.type !== 'free_shipping')) { setError('La valeur doit être > 0'); return }
    if (!form.startDate) { setError('La date de début est requise'); return }
    if (!form.endDate) { setError('La date de fin est requise'); return }
    if (form.applicableTo !== 'all' && !form.applicableId) { setError('Veuillez sélectionner la cible du coupon'); return }
    const data: CreateCouponInput = {
      code: form.code.trim().toUpperCase(), name: form.name.trim(),
      description: form.description.trim() || undefined,
      type: form.type, value: Number(form.value),
      minPurchase: form.minPurchase ? Number(form.minPurchase) : undefined,
      maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
      isActive: form.isActive,
      usageLimitPerUser: form.usageLimitPerUser ? Number(form.usageLimitPerUser) : undefined,
      usageLimitTotal: form.usageLimitTotal ? Number(form.usageLimitTotal) : undefined,
      firstTimeOnly: form.firstTimeOnly,
      applicableTo: form.applicableTo,
      applicableId: form.applicableId || undefined,
      applicableName: form.applicableName || undefined,
      affiliateId: form.affiliateId || undefined,
      affiliateName: form.affiliateName || undefined,
    }
    try {
      isEditing ? await updateCoupon.mutateAsync(data) : await createCoupon.mutateAsync(data)
      toast.success(isEditing ? 'Coupon mis à jour' : 'Coupon créé')
      navigate('/coupons')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur'
      setError(message)
      toast.error(message)
    }
  }

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        breadcrumbs={[
          { label: 'Coupons', href: '/coupons' },
          { label: isEditing ? 'Modifier le coupon' : 'Nouveau coupon' },
        ]}
        backHref="/coupons"
        title={isEditing ? 'Modifier le coupon' : 'Nouveau coupon'}
        description={isEditing ? 'Mettez à jour les informations du coupon.' : 'Configurez un nouveau code de réduction.'}
      />

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Informations générales</CardTitle>
              <CardDescription>Code, nom et description du coupon.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField label="Code" htmlFor="coupon-code" required>
              <Input
                id="coupon-code"
                type="text"
                value={form.code}
                onChange={(e) => set('code', e.target.value.toUpperCase())}
                className="w-full font-mono uppercase"
              />
            </FormField>
            <FormField label="Nom" htmlFor="coupon-name" required>
              <Input id="coupon-name" type="text" value={form.name} onChange={(e) => set('name', e.target.value)} className="w-full" />
            </FormField>
            <FormField label="Description" htmlFor="coupon-description" className="sm:col-span-2">
              <Textarea
                id="coupon-description"
                rows={2}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                className="w-full"
              />
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Réduction</CardTitle>
              <CardDescription>Type et montant de la réduction accordée.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField label="Type" htmlFor="coupon-type">
              <Select
                id="coupon-type"
                value={form.type}
                onChange={(v) => set('type', v as Coupon['type'])}
                options={TYPE_OPTIONS}
                className="w-full"
              />
            </FormField>
            <FormField label="Valeur" htmlFor="coupon-value" required>
              <Input id="coupon-value" type="number" step="0.01" value={form.value} onChange={(e) => set('value', e.target.value)} className="w-full" />
            </FormField>
            <FormField label="Achat min." htmlFor="coupon-min-purchase" hint="Montant minimum de commande (FCFA)">
              <Input id="coupon-min-purchase" type="number" value={form.minPurchase} onChange={(e) => set('minPurchase', e.target.value)} className="w-full" />
            </FormField>
            <FormField label="Réduction max." htmlFor="coupon-max-discount" hint="Plafond de la réduction (FCFA)">
              <Input id="coupon-max-discount" type="number" value={form.maxDiscount} onChange={(e) => set('maxDiscount', e.target.value)} className="w-full" />
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Période de validité</CardTitle>
              <CardDescription>Dates de début et de fin du coupon.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField label="Début" htmlFor="coupon-start" required>
              <Input id="coupon-start" type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} className="w-full" />
            </FormField>
            <FormField label="Fin" htmlFor="coupon-end" required>
              <Input id="coupon-end" type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} className="w-full" />
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Ciblage</CardTitle>
              <CardDescription>Portée du coupon et affilié associé.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <TargetSelector
              target={form.applicableTo}
              targetId={form.applicableId}
              targetLabel="Applicable à"
              onTargetChange={(target) => setForm((prev) => ({ ...prev, applicableTo: target as Coupon['applicableTo'], applicableId: '', applicableName: '' }))}
              onSelectionChange={(applicableId, applicableName) => setForm((prev) => ({ ...prev, applicableId, applicableName }))}
            />
            <FormField
              label="Affilié (optionnel)"
              htmlFor="coupon-affiliate"
              hint="Si un affilié est sélectionné, ce coupon sera lié à son programme"
            >
              <Select
                id="coupon-affiliate"
                value={form.affiliateId}
                onChange={(v) => {
                  const a = affiliates?.data.find((x: any) => x.id === v)
                  setForm((prev) => ({ ...prev, affiliateId: v, affiliateName: a?.name ?? '' }))
                }}
                placeholder="Aucun affilié"
                options={(affiliates?.data ?? [])
                  .filter((a: any) => a.status === 'active')
                  .map((a: any) => ({ value: a.id, label: `${a.name} (${a.email})` }))}
                className="w-full"
              />
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Limites et activation</CardTitle>
              <CardDescription>Restrictions d'utilisation et statut du coupon.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField label="Limite utilisateur" htmlFor="coupon-limit-user" hint="Utilisations max. par client">
              <Input id="coupon-limit-user" type="number" value={form.usageLimitPerUser} onChange={(e) => set('usageLimitPerUser', e.target.value)} className="w-full" />
            </FormField>
            <FormField label="Limite totale" htmlFor="coupon-limit-total" hint="Utilisations max. au total">
              <Input id="coupon-limit-total" type="number" value={form.usageLimitTotal} onChange={(e) => set('usageLimitTotal', e.target.value)} className="w-full" />
            </FormField>
            <div className="flex flex-wrap items-center gap-6 sm:col-span-2">
              <Checkbox
                checked={form.firstTimeOnly}
                onCheckedChange={(v) => set('firstTimeOnly', v)}
                label="Nouveaux clients uniquement"
              />
              <Switch checked={form.isActive} onCheckedChange={(v) => set('isActive', v)} label="Actif" />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="button" variant="outline" onClick={() => navigate('/coupons')} disabled={saving}>
              Annuler
            </Button>
            <Button type="submit" loading={saving}>
              {isEditing ? 'Enregistrer' : 'Créer'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
