import { useState } from 'react'
import { Pencil, Settings } from 'lucide-react'
import { useAdminSettings, useUpdateSetting } from '../hooks/useAdminSettings'
import { PermissionGuard } from '@/components/guards/PermissionGuard'
import {
  PageHeader, Button, Badge, Card, CardHeader, CardTitle, CardDescription,
  Input, Select, Switch, FormField, LoadingBlock, EmptyState,
} from '@/components/ui'
import { toast } from '@/lib/toast'

const GROUP_LABELS: Record<string, string> = {
  general: 'Général', shipping: 'Livraison', payment: 'Paiement',
  social: 'Réseaux sociaux', seo: 'SEO', features: 'Fonctionnalités', appearance: 'Apparence',
}

const GROUP_DESCRIPTIONS: Record<string, string> = {
  general: 'Identité et comportement global de la plateforme',
  shipping: 'Paramètres liés à la livraison des commandes',
  payment: 'Options et fournisseurs de paiement',
  social: 'Liens et intégrations réseaux sociaux',
  seo: 'Référencement et métadonnées du site',
  features: 'Réglages liés aux fonctionnalités',
  appearance: 'Apparence et thème de la plateforme',
}

export function AdminSettingsPage() {
  const { data: settings, isLoading } = useAdminSettings()
  const updateSetting = useUpdateSetting()
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  if (isLoading) return <LoadingBlock label="Chargement des paramètres…" />

  const grouped = (settings ?? []).reduce<Record<string, NonNullable<typeof settings>>>((acc, s) => {
    if (!acc[s.group]) acc[s.group] = []
    acc[s.group].push(s)
    return acc
  }, {})

  async function handleSave(key: string, value?: string) {
    try {
      await updateSetting.mutateAsync({ key, value: value ?? editValue })
      setEditingKey(null)
      toast.success('Paramètre mis à jour')
    } catch {
      toast.error('Erreur lors de la mise à jour du paramètre')
    }
  }

  function renderControl(setting: NonNullable<typeof settings>[0]) {
    // Booléens : Switch direct, sans mode édition
    if (setting.type === 'boolean') {
      return (
        <div className="flex min-h-[40px] items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-800/60">
          <Badge variant={setting.value === 'true' ? 'success' : 'neutral'} size="sm" dot>
            {setting.value === 'true' ? 'Activé' : 'Désactivé'}
          </Badge>
          <PermissionGuard permission="settings.update">
            <Switch
              checked={setting.value === 'true'}
              disabled={updateSetting.isPending}
              onCheckedChange={(v) => handleSave(setting.key, String(v))}
            />
          </PermissionGuard>
        </div>
      )
    }

    if (editingKey === setting.key) {
      return (
        <div className="flex gap-2">
          {setting.type === 'select' && setting.options ? (
            <Select
              size="sm"
              className="flex-1"
              value={editValue}
              onChange={setEditValue}
              options={setting.options.map((o: string) => ({ value: o, label: o }))}
            />
          ) : setting.type === 'color' ? (
            <div className="flex flex-1 gap-2">
              <input
                type="color"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded border border-gray-300 dark:border-gray-700"
              />
              <Input size="sm" className="flex-1 font-mono" value={editValue} onChange={(e) => setEditValue(e.target.value)} />
            </div>
          ) : (
            <Input
              size="sm"
              className="flex-1"
              type={setting.type === 'number' ? 'number' : 'text'}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave(setting.key)
                if (e.key === 'Escape') setEditingKey(null)
              }}
            />
          )}
          <PermissionGuard permission="settings.update">
            <Button size="sm" loading={updateSetting.isPending} onClick={() => handleSave(setting.key)}>
              Enregistrer
            </Button>
          </PermissionGuard>
          <Button size="sm" variant="outline" onClick={() => setEditingKey(null)}>
            Annuler
          </Button>
        </div>
      )
    }

    return (
      <div className="flex min-h-[40px] items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-800/60">
        <div className="flex min-w-0 items-center gap-3">
          {setting.type === 'color' && (
            <span
              className="h-6 w-6 flex-shrink-0 rounded border border-gray-300 dark:border-gray-700"
              style={{ backgroundColor: setting.value }}
            />
          )}
          <span className="break-all text-sm text-gray-900 dark:text-gray-100">{setting.value}</span>
        </div>
        <PermissionGuard permission="settings.update">
          <Button
            variant="ghost" size="sm" leftIcon={Pencil}
            className="ml-2 flex-shrink-0"
            onClick={() => { setEditingKey(setting.key); setEditValue(setting.value) }}
          >
            Modifier
          </Button>
        </PermissionGuard>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Paramètres globaux"
        description="Configuration générale de la plateforme"
      />

      {Object.keys(grouped).length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={Settings}
            title="Aucun paramètre disponible"
            description="Les paramètres de la plateforme apparaîtront ici."
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([group, items]) => (
            <Card key={group}>
              <CardHeader>
                <div>
                  <CardTitle>{GROUP_LABELS[group] ?? group}</CardTitle>
                  {GROUP_DESCRIPTIONS[group] && <CardDescription>{GROUP_DESCRIPTIONS[group]}</CardDescription>}
                </div>
              </CardHeader>
              <div className="space-y-4">
                {(items ?? []).map((setting) => (
                  <FormField
                    key={setting.key}
                    label={
                      <>
                        {setting.label}
                        <span className="ml-2 font-mono text-xs font-normal text-gray-400 dark:text-gray-500">({setting.key})</span>
                      </>
                    }
                    hint={setting.description}
                  >
                    {renderControl(setting)}
                  </FormField>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
