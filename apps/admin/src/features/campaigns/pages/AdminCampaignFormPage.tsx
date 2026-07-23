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
  FormField,
  Input,
  PageHeader,
  Select,
  Switch,
  Textarea,
} from '@/components/ui'
import { toast } from '@/lib/toast'
import { useAdminCampaign, useCreateCampaign, useUpdateCampaign } from '../hooks/useAdminCampaigns'
import type { Campaign, CreateCampaignInput } from '@/infrastructure/data-source/AdminCampaignDataSource'
import { TargetSelector } from '@/components/forms/TargetSelector'

const TYPE_OPTIONS = [
  { value: 'seasonal', label: 'Saisonnière' },
  { value: 'flash_sale', label: 'Flash' },
  { value: 'new_arrival', label: 'Nouveauté' },
  { value: 'clearance', label: 'Écoulement' },
  { value: 'custom', label: 'Personnalisée' },
]

export function AdminCampaignFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = !!id
  // The query hook must always be called; it is disabled internally when id is empty.
  const { data: campaign } = useAdminCampaign(id ?? '')
  const createCamp = useCreateCampaign()
  const updateCamp = useUpdateCampaign(id ?? '')
  const [form, setForm] = useState<{
    name: string; description: string; type: Campaign['type']
    startDate: string; endDate: string; budget: string
    target: Campaign['target']; targetId: string; targetName: string; isActive: boolean
  }>({
    name: '', description: '', type: 'seasonal',
    startDate: '', endDate: '', budget: '',
    target: 'all', targetId: '', targetName: '', isActive: true,
  })
  const [error, setError] = useState<string | null>(null)
  const saving = createCamp.isPending || updateCamp.isPending

  useEffect(() => {
    if (campaign) {
      setForm({
        name: campaign.name, description: campaign.description ?? '',
        type: campaign.type,
        startDate: campaign.startDate.split('T')[0], endDate: campaign.endDate.split('T')[0],
        budget: String(campaign.budget),
        target: campaign.target, targetId: campaign.targetId ?? '', targetName: campaign.targetName ?? '',
        isActive: campaign.isActive,
      })
    }
  }, [campaign])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setError(null)
    if (!form.name.trim()) { setError('Le nom est requis'); return }
    if (!form.startDate) { setError('La date de début est requise'); return }
    if (!form.endDate) { setError('La date de fin est requise'); return }
    if (form.target !== 'all' && !form.targetId) { setError('Veuillez sélectionner la cible de la campagne'); return }
    const data: CreateCampaignInput = {
      name: form.name.trim(), description: form.description.trim() || undefined, type: form.type,
      startDate: new Date(form.startDate).toISOString(), endDate: new Date(form.endDate).toISOString(),
      isActive: form.isActive,
      budget: form.budget ? Number(form.budget) : undefined,
      target: form.target, targetId: form.targetId || undefined, targetName: form.targetName || undefined,
    }
    try {
      isEditing ? await updateCamp.mutateAsync(data) : await createCamp.mutateAsync(data)
      toast.success(isEditing ? 'Campagne mise à jour' : 'Campagne créée')
      navigate('/campaigns')
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
          { label: 'Campagnes', href: '/campaigns' },
          { label: isEditing ? 'Modifier la campagne' : 'Nouvelle campagne' },
        ]}
        backHref="/campaigns"
        title={isEditing ? 'Modifier la campagne' : 'Nouvelle campagne'}
        description={isEditing ? 'Mettez à jour les informations de la campagne.' : 'Configurez une nouvelle campagne marketing.'}
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
              <CardDescription>Nom, description et type de la campagne.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField label="Nom" htmlFor="campaign-name" required className="sm:col-span-2">
              <Input id="campaign-name" type="text" value={form.name} onChange={(e) => set('name', e.target.value)} className="w-full" />
            </FormField>
            <FormField label="Description" htmlFor="campaign-description" className="sm:col-span-2">
              <Textarea
                id="campaign-description"
                rows={2}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                className="w-full"
              />
            </FormField>
            <FormField label="Type" htmlFor="campaign-type">
              <Select
                id="campaign-type"
                value={form.type}
                onChange={(v) => set('type', v as Campaign['type'])}
                options={TYPE_OPTIONS}
                className="w-full"
              />
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Budget et période</CardTitle>
              <CardDescription>Enveloppe budgétaire et dates de diffusion.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField label="Budget (FCFA)" htmlFor="campaign-budget" className="sm:col-span-2">
              <Input id="campaign-budget" type="number" value={form.budget} onChange={(e) => set('budget', e.target.value)} className="w-full" />
            </FormField>
            <FormField label="Début" htmlFor="campaign-start" required>
              <Input id="campaign-start" type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} className="w-full" />
            </FormField>
            <FormField label="Fin" htmlFor="campaign-end" required>
              <Input id="campaign-end" type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} className="w-full" />
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Ciblage et activation</CardTitle>
              <CardDescription>Portée de la campagne et statut.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <TargetSelector
                target={form.target}
                targetId={form.targetId}
                onTargetChange={(target) => setForm((prev) => ({ ...prev, target: target as Campaign['target'], targetId: '', targetName: '' }))}
                onSelectionChange={(targetId, targetName) => setForm((prev) => ({ ...prev, targetId, targetName }))}
              />
            </div>
            <Switch checked={form.isActive} onCheckedChange={(v) => set('isActive', v)} label="Active" />
          </CardContent>
          <CardFooter>
            <Button type="button" variant="outline" onClick={() => navigate('/campaigns')} disabled={saving}>
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
