import { useState } from 'react'
import { CheckCircle2, Eye, EyeOff, MessageSquareText, RefreshCw, XCircle } from 'lucide-react'
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
  useAdminSmsGateways,
  useUpdateSmsGateway,
  useTestSmsGateway,
} from '../hooks/useAdminSmsGateways'
import type { SmsGateway } from '@/infrastructure/data-source/api/ApiAdminSmsGatewayDataSource'

/**
 * Carte de configuration d'un fournisseur SMS. Même contrat que les
 * passerelles de paiement : champs de clés toujours vides, valeur existante
 * signalée par son masque, vide = inchangé. Un seul fournisseur actif à la
 * fois (activer l'un désactive les autres).
 */
function SmsGatewayCard({ gateway }: { gateway: SmsGateway }) {
  const updateGateway = useUpdateSmsGateway()
  const testGateway = useTestSmsGateway()
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})
  const [senderId, setSenderId] = useState(gateway.senderId ?? '')
  const [apiEndpoint, setApiEndpoint] = useState(gateway.apiEndpoint ?? '')
  const [visible, setVisible] = useState<Record<string, boolean>>({})
  const [testResult, setTestResult] = useState<{ ok: boolean; message?: string } | null>(null)

  async function handleSave() {
    try {
      const credentials: Record<string, string> = {}
      for (const [k, v] of Object.entries(values)) {
        if (v.trim()) credentials[k] = v.trim()
      }
      await updateGateway.mutateAsync({
        code: gateway.code,
        payload: {
          credentials,
          senderId: senderId.trim() || null,
          apiEndpoint: apiEndpoint.trim() || null,
        },
      })
      setValues({})
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
      toast.success(enabled ? 'Fournisseur activé (les autres sont désactivés)' : 'Fournisseur désactivé')
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
          <MessageSquareText className="h-4 w-4 text-gray-400" />
          <CardTitle className="flex-1">{gateway.label}</CardTitle>
          {gateway.isConfigured ? (
            <Badge size="sm" variant="success" dot>Configuré</Badge>
          ) : (
            <Badge size="sm" variant="neutral" dot>Non configuré</Badge>
          )}
          <Switch
            checked={gateway.isEnabled}
            onCheckedChange={handleToggle}
            label="Actif"
          />
        </div>
        <CardDescription>
          {gateway.isEnabled
            ? 'Fournisseur actif : les codes OTP partent par ce canal'
            : 'Inactif'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
          {open ? 'Masquer la configuration' : 'Configurer'}
        </Button>

        {open && (
          <div className="space-y-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            {gateway.credentialKeys.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Ce fournisseur ne demande aucune clé.
              </p>
            )}
            {gateway.credentialKeys.map((field) => (
              <FormField
                key={field.key}
                label={field.label}
                htmlFor={`sms-${gateway.code}-${field.key}`}
                hint={field.hint}
              >
                <div className="relative">
                  <Input
                    id={`sms-${gateway.code}-${field.key}`}
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
              label="Sender ID (nom d'expéditeur)"
              htmlFor={`sms-${gateway.code}-sender`}
              hint="Nom affiché sur le téléphone du client (ex. ExpressAfri) — soumis à enregistrement selon les pays"
            >
              <Input
                id={`sms-${gateway.code}-sender`}
                value={senderId}
                onChange={(e) => setSenderId(e.target.value)}
                placeholder="ExpressAfri"
                maxLength={11}
              />
            </FormField>

            <FormField
              label="URL de l'API (optionnel)"
              htmlFor={`sms-${gateway.code}-endpoint`}
              hint="Laisser vide pour utiliser l'URL officielle du fournisseur"
            >
              <Input
                id={`sms-${gateway.code}-endpoint`}
                value={apiEndpoint}
                onChange={(e) => setApiEndpoint(e.target.value)}
                placeholder="https://…"
              />
            </FormField>

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
 * Onglet « SMS » : le canal des codes OTP (connexion par téléphone,
 * réinitialisation de mot de passe). Un seul fournisseur actif à la fois.
 */
export function SmsGatewaysTab() {
  const { data: gateways, isLoading, isError } = useAdminSmsGateways()

  if (isLoading) return <LoadingBlock label="Chargement des fournisseurs SMS..." />
  if (isError)
    return <p className="text-sm text-red-600 dark:text-red-400">Erreur de chargement</p>

  return (
    <SensitiveActionGuard>
      <div className="space-y-4">
        <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
          Les codes de vérification (connexion par téléphone, réinitialisation
          de mot de passe) partent par le fournisseur actif. Sans fournisseur
          configuré, aucun SMS n'est envoyé — à régler avant le lancement.
        </div>
        {(gateways ?? []).map((gateway) => (
          <SmsGatewayCard key={gateway.code} gateway={gateway} />
        ))}
      </div>
    </SensitiveActionGuard>
  )
}
