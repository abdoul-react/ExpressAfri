import { useState } from 'react'
import { CheckCircle2, Eye, EyeOff, Plug, RefreshCw, XCircle } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FormField,
  Input,
  LoadingBlock,
  Switch,
} from '@/components/ui'
import { toast } from '@/lib/toast'
import { SensitiveActionGuard } from '@/components/guards/SensitiveActionGuard'
import {
  useAdminGateways,
  useUpdateGateway,
  useTestGateway,
} from '../hooks/useAdminGateways'
import type { PaymentGateway } from '@/infrastructure/data-source/api/ApiAdminGatewayDataSource'

/**
 * Carte de configuration d'une passerelle. Les champs de clés partent
 * TOUJOURS vides : une valeur déjà enregistrée est signalée par son masque
 * (••••1234) sous le champ. Laisser vide = ne pas toucher à la clé existante.
 */
function GatewayCard({ gateway }: { gateway: PaymentGateway }) {
  const updateGateway = useUpdateGateway()
  const testGateway = useTestGateway()
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})
  const [webhookSecret, setWebhookSecret] = useState('')
  const [apiEndpoint, setApiEndpoint] = useState(gateway.apiEndpoint ?? '')
  const [visible, setVisible] = useState<Record<string, boolean>>({})
  const [testResult, setTestResult] = useState<{ ok: boolean; message?: string } | null>(null)

  async function handleSave() {
    try {
      // Seuls les champs réellement saisis sont envoyés : les autres gardent
      // leur valeur en base (le backend fusionne).
      const credentials: Record<string, string> = {}
      for (const [k, v] of Object.entries(values)) {
        if (v.trim()) credentials[k] = v.trim()
      }
      await updateGateway.mutateAsync({
        code: gateway.code,
        payload: {
          credentials,
          ...(webhookSecret.trim() ? { webhookSecret: webhookSecret.trim() } : {}),
          apiEndpoint: apiEndpoint.trim() || null,
        },
      })
      setValues({})
      setWebhookSecret('')
      toast.success('Configuration enregistrée')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
    }
  }

  async function handleToggle(enabled: boolean) {
    try {
      await updateGateway.mutateAsync({
        code: gateway.code,
        payload: { isEnabled: enabled },
      })
      toast.success(enabled ? 'Passerelle activée' : 'Passerelle désactivée')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
    }
  }

  async function handleSandbox(sandbox: boolean) {
    try {
      await updateGateway.mutateAsync({
        code: gateway.code,
        payload: { isSandbox: sandbox },
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
    }
  }

  async function handleTest() {
    setTestResult(null)
    try {
      const result = await testGateway.mutateAsync(gateway.code)
      setTestResult(result)
    } catch (err) {
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : 'Erreur',
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Plug className="h-4 w-4 text-gray-400" />
          <CardTitle className="flex-1">{gateway.label}</CardTitle>
          {gateway.isConfigured ? (
            <Badge size="sm" variant="success" dot>Configurée</Badge>
          ) : (
            <Badge size="sm" variant="neutral" dot>Non configurée</Badge>
          )}
          {gateway.isSandbox && <Badge size="sm" variant="warning">Sandbox</Badge>}
          <Switch
            checked={gateway.isEnabled}
            onCheckedChange={handleToggle}
            label="Activer"
          />
        </div>
        <CardDescription>
          {gateway.routedMethods.length > 0 ? (
            <>Traite : {gateway.routedMethods.map((m) => m.name).join(', ')}</>
          ) : (
            <>Aucune méthode de paiement routée vers cette passerelle</>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
          {gateway.supportsStatusCheck && <span>· Vérification de statut</span>}
          {gateway.supportsRefund && <span>· Remboursement automatique</span>}
          {gateway.supportsTest && <span>· Test de connexion</span>}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Masquer la configuration' : 'Configurer les clés API'}
        </Button>

        {open && (
          <div className="space-y-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            {gateway.credentialKeys.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Cette passerelle ne demande aucune clé.
              </p>
            )}
            {gateway.credentialKeys.map((field) => (
              <FormField
                key={field.key}
                label={field.label}
                htmlFor={`${gateway.code}-${field.key}`}
                hint={field.hint}
              >
                <div className="relative">
                  <Input
                    id={`${gateway.code}-${field.key}`}
                    type={field.secret && !visible[field.key] ? 'password' : 'text'}
                    value={values[field.key] ?? ''}
                    placeholder={
                      gateway.credentials[field.key]
                        ? `Enregistrée : ${gateway.credentials[field.key]}`
                        : 'Non renseignée'
                    }
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    autoComplete="off"
                  />
                  {field.secret && (
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() =>
                        setVisible((prev) => ({ ...prev, [field.key]: !prev[field.key] }))
                      }
                      aria-label={visible[field.key] ? 'Masquer' : 'Afficher'}
                    >
                      {visible[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  )}
                </div>
              </FormField>
            ))}

            <FormField
              label="Secret de signature des webhooks"
              htmlFor={`${gateway.code}-webhook`}
              hint={
                gateway.hasWebhookSecret
                  ? 'Un secret est déjà enregistré — laisser vide pour le conserver'
                  : "Optionnel selon la passerelle ; requis pour vérifier l'authenticité des notifications"
              }
            >
              <Input
                id={`${gateway.code}-webhook`}
                type="password"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder={gateway.hasWebhookSecret ? 'Enregistré : ••••' : 'Non renseigné'}
                autoComplete="off"
              />
            </FormField>

            <FormField
              label="URL de l'API (optionnel)"
              htmlFor={`${gateway.code}-endpoint`}
              hint="Laisser vide pour utiliser l'URL officielle selon le mode sandbox/production"
            >
              <Input
                id={`${gateway.code}-endpoint`}
                value={apiEndpoint}
                onChange={(e) => setApiEndpoint(e.target.value)}
                placeholder="https://…"
              />
            </FormField>

            <Switch
              checked={gateway.isSandbox}
              onCheckedChange={handleSandbox}
              label="Mode sandbox (test)"
            />

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Button onClick={handleSave} loading={updateGateway.isPending}>
                Enregistrer
              </Button>
              {gateway.supportsTest && (
                <Button
                  variant="outline"
                  leftIcon={RefreshCw}
                  onClick={handleTest}
                  loading={testGateway.isPending}
                >
                  Tester la connexion
                </Button>
              )}
              {testResult && (
                <span
                  className={`flex items-center gap-1 text-sm ${
                    testResult.ok
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {testResult.ok ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  {testResult.message ?? (testResult.ok ? 'Connexion OK' : 'Échec')}
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Onglet « Passerelles » : le tuyau qui traite réellement les paiements.
 * L'admin colle ses clés API le jour où un contrat PSP est signé — aucun
 * déploiement n'est nécessaire, le routage se fait dans l'onglet Paiements.
 */
export function PaymentGatewaysTab() {
  const { data: gateways, isLoading, isError } = useAdminGateways()

  if (isLoading) return <LoadingBlock label="Chargement des passerelles..." />
  if (isError)
    return <p className="text-sm text-red-600 dark:text-red-400">Erreur de chargement</p>

  return (
    <SensitiveActionGuard>
      <div className="space-y-4">
        <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
          Les passerelles traitent les paiements. Configurez vos clés ici, puis
          associez chaque moyen de paiement à sa passerelle dans l'onglet
          « Paiements ». Tant qu'aucune passerelle n'est activée, seul le
          paiement à la livraison reste disponible.
        </div>
        {(gateways ?? []).map((gateway) => (
          <GatewayCard key={gateway.code} gateway={gateway} />
        ))}
      </div>
    </SensitiveActionGuard>
  )
}
