import { useState } from 'react'
import { Copy, Pencil, Settings, Shield, ShieldCheck, ShieldOff } from 'lucide-react'
import { useAdminSettings, useUpdateSetting } from '../hooks/useAdminSettings'
import { PermissionGuard } from '@/components/guards/PermissionGuard'
import {
  PageHeader, Button, Badge, Card, CardHeader, CardTitle, CardDescription,
  Input, Select, Switch, FormField, LoadingBlock, EmptyState, Modal,
} from '@/components/ui'
import { toast } from '@/lib/toast'
import { useAdminAuth } from '@/features/auth'
import api from '@/lib/api'

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

  // TOTP 2FA
  const { admin } = useAdminAuth()
  const [totpEnabled, setTotpEnabled] = useState<boolean>(() => admin?.totpEnabled ?? false)
  const [totpModal, setTotpModal] = useState<'setup' | 'disable' | null>(null)
  const [totpSecret, setTotpSecret] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [totpLoading, setTotpLoading] = useState(false)

  async function openSetup() {
    setTotpLoading(true)
    try {
      const { data } = await api.get('/auth/totp/setup')
      setTotpSecret(data.secret)
      setTotpCode('')
      setTotpModal('setup')
    } catch {
      toast.error('Impossible de générer le QR code')
    } finally {
      setTotpLoading(false)
    }
  }

  async function handleEnableTotp() {
    setTotpLoading(true)
    try {
      await api.post('/auth/totp/enable', { secret: totpSecret, code: totpCode })
      setTotpEnabled(true)
      setTotpModal(null)
      toast.success('Authentification à deux facteurs activée')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Code invalide')
    } finally {
      setTotpLoading(false)
    }
  }

  async function handleDisableTotp() {
    setTotpLoading(true)
    try {
      await api.delete('/auth/totp', { data: { code: totpCode } })
      setTotpEnabled(false)
      setTotpModal(null)
      toast.success('Authentification à deux facteurs désactivée')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Code invalide')
    } finally {
      setTotpLoading(false)
    }
  }

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

      {/* Sécurité — TOTP 2FA */}
      <div className="mb-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                  Sécurité — Authentification à deux facteurs
                </CardTitle>
                <CardDescription>
                  Protégez votre compte avec une application TOTP (Google Authenticator, Authy…)
                </CardDescription>
              </div>
              <Badge variant={totpEnabled ? 'success' : 'neutral'} dot>
                {totpEnabled ? 'Activé' : 'Désactivé'}
              </Badge>
            </div>
          </CardHeader>
          <div className="flex items-center gap-3">
            {totpEnabled ? (
              <Button
                variant="outline"
                size="sm"
                leftIcon={ShieldOff}
                loading={totpLoading}
                onClick={() => { setTotpCode(''); setTotpModal('disable') }}
              >
                Désactiver le 2FA
              </Button>
            ) : (
              <Button
                size="sm"
                leftIcon={ShieldCheck}
                loading={totpLoading}
                onClick={openSetup}
              >
                Activer le 2FA
              </Button>
            )}
          </div>
        </Card>
      </div>

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

      {/* Modal activation TOTP */}
      <Modal
        open={totpModal === 'setup'}
        onOpenChange={(o) => !o && setTotpModal(null)}
        title="Activer l'authentification à deux facteurs"
        description="Scannez le QR code avec votre application TOTP puis entrez le code affiché."
        footer={
          <>
            <Button variant="outline" onClick={() => setTotpModal(null)}>Annuler</Button>
            <Button loading={totpLoading} onClick={handleEnableTotp} disabled={totpCode.length !== 6}>
              Activer
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-primary-100 bg-primary-50 p-3 dark:border-primary-500/20 dark:bg-primary-500/10">
            <p className="mb-1 text-xs font-medium text-primary-700 dark:text-primary-400">
              Ouvrez votre application TOTP (Google Authenticator, Authy…) et entrez manuellement la clé ci-dessous, ou scannez l'URI avec une application compatible.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
            <code className="flex-1 break-all font-mono text-sm text-gray-900 dark:text-gray-100">{totpSecret}</code>
            <button
              type="button"
              onClick={() => { navigator.clipboard.writeText(totpSecret); toast.success('Clé copiée') }}
              className="flex-shrink-0 rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-300"
              aria-label="Copier la clé"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <FormField label="Code de vérification" htmlFor="totp-verify">
            <Input
              id="totp-verify"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="text-center text-lg tracking-[0.4em]"
              autoComplete="one-time-code"
              autoFocus
            />
          </FormField>
        </div>
      </Modal>

      {/* Modal désactivation TOTP */}
      <Modal
        open={totpModal === 'disable'}
        onOpenChange={(o) => !o && setTotpModal(null)}
        title="Désactiver le 2FA"
        description="Saisissez votre code TOTP actuel pour confirmer la désactivation."
        footer={
          <>
            <Button variant="outline" onClick={() => setTotpModal(null)}>Annuler</Button>
            <Button variant="danger" loading={totpLoading} onClick={handleDisableTotp} disabled={totpCode.length !== 6}>
              Désactiver
            </Button>
          </>
        }
      >
        <FormField label="Code TOTP" htmlFor="totp-disable">
          <Input
            id="totp-disable"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="text-center text-lg tracking-[0.4em]"
            autoComplete="one-time-code"
            autoFocus
          />
        </FormField>
      </Modal>
    </div>
  )
}
