import { useState } from 'react'
import {
  ArrowDown, ArrowUp, CreditCard, KeyRound, Plus, ShieldCheck, Trash2,
} from 'lucide-react'
import {
  useStorePaymentProviders, useStorePaymentMethods,
  useCreateStorePaymentMethod, useUpdateStorePaymentMethod,
  useDeleteStorePaymentMethod, useReorderStorePaymentMethods,
  useValidateStorePaymentMethod,
} from '../hooks/useAdminStores'
import type {
  StorePaymentMethod, StorePaymentType,
} from '@/infrastructure/data-source/AdminStoreDataSource'
import {
  Card, CardHeader, CardTitle, CardContent, Button, ConfirmDialog, LoadingBlock,
  EmptyState, Modal, Input, Select, Switch, FormField,
} from '@/components/ui'
import { resolveAdminMediaUrl } from '@/lib/resolveAdminMediaUrl'
import { toast } from '@/lib/toast'

const TYPE_LABELS: Record<StorePaymentType, string> = {
  mobile_money: 'Mobile Money',
  card: 'Carte bancaire',
  wallet: 'Portefeuille',
  cash_on_delivery: 'Paiement à la livraison',
}

/**
 * Champs sensibles saisissables. La liste doit rester alignée sur `SECRET_KEYS`
 * du service API : une clé absente là-bas serait stockée en clair.
 */
const SECRET_FIELDS: { key: string; label: string; hint: string }[] = [
  { key: 'apiKey', label: 'Clé API', hint: 'Fournie par le provider' },
  { key: 'apiSecret', label: 'Secret API', hint: 'Ne sera plus jamais réaffiché' },
  { key: 'webhookSecret', label: 'Secret webhook', hint: 'Signature des notifications' },
]

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

/**
 * Moyens de paiement de la boutique — cloisonnés au boutiquier.
 *
 * L'admin central n'intervient pas ici : il alimente le catalogue de providers,
 * qui borne ce que le boutiquier peut activer. Les secrets saisis ne sont jamais
 * relus par l'API : le formulaire affiche un aperçu masqué (`••••1234`) et un
 * champ vide, pour qu'une sauvegarde sans ressaisie ne les écrase pas.
 */
export function StorePaymentMethodsSection({ storeId }: { storeId: string }) {
  const { data: methods, isLoading } = useStorePaymentMethods(storeId)
  const { data: providers } = useStorePaymentProviders(storeId)
  const create = useCreateStorePaymentMethod(storeId)
  const update = useUpdateStorePaymentMethod(storeId)
  const remove = useDeleteStorePaymentMethod(storeId)
  const reorder = useReorderStorePaymentMethods(storeId)
  const validate = useValidateStorePaymentMethod(storeId)

  const [creating, setCreating] = useState(false)
  const [provider, setProvider] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<StorePaymentMethod | null>(null)
  const [editing, setEditing] = useState<StorePaymentMethod | null>(null)

  const list = methods ?? []
  const catalog = providers ?? []
  // Un provider déjà configuré ne doit pas être reproposé : la contrainte
  // d'unicité (store_id, provider) refuserait l'insertion.
  const available = catalog.filter((p) => !list.some((m) => m.provider === p.code))

  async function handleCreate() {
    if (!provider) {
      toast.error('Choisissez un provider')
      return
    }
    try {
      await create.mutateAsync({ provider })
      toast.success('Moyen de paiement ajouté — configurez-le puis activez-le')
      setCreating(false)
      setProvider('')
    } catch (err) {
      toast.error(errorMessage(err, "Échec de l'ajout"))
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= list.length) return
    const ids = list.map((m) => m.id)
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    try {
      await reorder.mutateAsync(ids)
    } catch (err) {
      toast.error(errorMessage(err, 'Échec du réordonnancement'))
    }
  }

  async function setEnabled(method: StorePaymentMethod, isEnabled: boolean) {
    try {
      await update.mutateAsync({ methodId: method.id, payload: { isEnabled } })
    } catch (err) {
      toast.error(errorMessage(err, 'Échec de la modification'))
    }
  }

  async function runValidate(method: StorePaymentMethod) {
    try {
      const result = await validate.mutateAsync(method.id)
      if (result.ok) toast.success(result.message)
      else toast.error(result.message)
    } catch (err) {
      toast.error(errorMessage(err, 'Échec de la vérification'))
    }
  }

  if (isLoading) return <LoadingBlock />

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            Moyens de paiement
            {list.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">({list.length})</span>
            )}
          </CardTitle>
          <Button
            size="sm"
            leftIcon={Plus}
            disabled={available.length === 0}
            onClick={() => setCreating(true)}
          >
            Ajouter
          </Button>
        </CardHeader>
        <CardContent>
          {list.length > 0 ? (
            <div className="space-y-3">
              {list.map((method, index) => (
                <div
                  key={method.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-100 p-3 dark:border-gray-800"
                >
                  <div className="flex flex-col">
                    <button
                      type="button"
                      aria-label="Monter le moyen de paiement"
                      disabled={index === 0 || reorder.isPending}
                      onClick={() => move(index, -1)}
                      className="rounded p-0.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-800"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Descendre le moyen de paiement"
                      disabled={index === list.length - 1 || reorder.isPending}
                      onClick={() => move(index, 1)}
                      className="rounded p-0.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-800"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>

                  {method.logoUrl ? (
                    <img
                      src={resolveAdminMediaUrl(method.logoUrl)}
                      alt=""
                      className="h-8 w-8 rounded object-contain"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-gray-100 dark:bg-gray-800">
                      <CreditCard className="h-4 w-4 text-gray-400" />
                    </div>
                  )}

                  <div className="min-w-[10rem] flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{method.displayName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {TYPE_LABELS[method.type] ?? method.type} · {method.provider}
                      {Object.keys(method.secrets).length > 0 ? ' · clés configurées' : ' · aucune clé'}
                    </p>
                  </div>

                  <Switch
                    checked={method.isEnabled}
                    onCheckedChange={(v) => setEnabled(method, v)}
                    label={method.isEnabled ? 'Actif' : 'Inactif'}
                  />

                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={ShieldCheck}
                    loading={validate.isPending}
                    onClick={() => runValidate(method)}
                  >
                    Vérifier
                  </Button>

                  <Button size="sm" variant="outline" leftIcon={KeyRound} onClick={() => setEditing(method)}>
                    Configurer
                  </Button>

                  <button
                    type="button"
                    aria-label="Supprimer le moyen de paiement"
                    onClick={() => setConfirmDelete(method)}
                    className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CreditCard}
              title="Aucun moyen de paiement"
              description={
                catalog.length === 0
                  ? "La plateforme n'a encore déclaré aucun provider disponible."
                  : 'Ajoutez les moyens de paiement que votre boutique accepte : Mobile Money, carte, paiement à la livraison…'
              }
            />
          )}
        </CardContent>
      </Card>

      <Modal
        open={creating}
        onOpenChange={setCreating}
        title="Ajouter un moyen de paiement"
        description="Seuls les providers proposés par la plateforme sont disponibles."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreating(false)}>Annuler</Button>
            <Button loading={create.isPending} onClick={handleCreate}>Ajouter</Button>
          </>
        }
      >
        <FormField label="Provider" required>
          <Select
            value={provider}
            onChange={setProvider}
            options={available.map((p) => ({
              value: p.code,
              label: `${p.name} — ${TYPE_LABELS[p.type] ?? p.type}`,
            }))}
            placeholder="Choisir un provider"
          />
        </FormField>
      </Modal>

      {editing && (
        <PaymentMethodModal
          storeId={storeId}
          method={editing}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title="Supprimer ce moyen de paiement ?"
        description={`« ${confirmDelete?.displayName} » ne sera plus proposé à vos clients. Les commandes déjà payées ne sont pas affectées.`}
        variant="danger"
        onConfirm={async () => {
          if (!confirmDelete) return
          try {
            await remove.mutateAsync(confirmDelete.id)
            toast.success('Moyen de paiement supprimé')
            setConfirmDelete(null)
          } catch (err) {
            toast.error(errorMessage(err, 'Échec de la suppression'))
          }
        }}
      />
    </div>
  )
}

/**
 * Édition d'un moyen de paiement : libellé visible, instructions client et
 * clés PSP.
 *
 * Les champs sensibles démarrent toujours vides, même quand une valeur est déjà
 * enregistrée : l'API ne les renvoie pas, donc les préremplir serait mentir.
 * Un champ laissé vide est simplement ignoré à la sauvegarde.
 */
function PaymentMethodModal({
  storeId,
  method,
  onClose,
}: {
  storeId: string
  method: StorePaymentMethod
  onClose: () => void
}) {
  const update = useUpdateStorePaymentMethod(storeId)

  const [displayName, setDisplayName] = useState(method.displayName)
  const [description, setDescription] = useState(method.description ?? '')
  const [instructions, setInstructions] = useState(method.instructions ?? '')
  const [isPublic, setIsPublic] = useState(method.isPublic)
  const [secrets, setSecrets] = useState<Record<string, string>>({})

  async function save() {
    if (!displayName.trim()) {
      toast.error('Le nom visible est obligatoire')
      return
    }
    // Seules les clés effectivement ressaisies partent : envoyer une chaîne
    // vide supprimerait le secret existant côté API.
    const config = Object.fromEntries(
      Object.entries(secrets).filter(([, v]) => v.trim() !== ''),
    )
    try {
      await update.mutateAsync({
        methodId: method.id,
        payload: {
          displayName: displayName.trim(),
          description: description.trim() || null,
          instructions: instructions.trim() || null,
          isPublic,
          config: Object.keys(config).length ? config : undefined,
        },
      })
      toast.success('Moyen de paiement mis à jour')
      onClose()
    } catch (err) {
      toast.error(errorMessage(err, 'Échec de la modification'))
    }
  }

  return (
    <Modal
      open
      onOpenChange={(v) => !v && onClose()}
      title={method.displayName}
      description={`${TYPE_LABELS[method.type] ?? method.type} · ${method.provider}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button loading={update.isPending} onClick={save}>Enregistrer</Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Nom visible par le client" required>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </FormField>
        <FormField label="Description">
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Paiement instantané depuis votre téléphone"
          />
        </FormField>
        <FormField label="Instructions client" hint="Affichées au moment du paiement">
          <Input
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Composez le #144# puis validez avec votre code"
          />
        </FormField>
        <Switch
          checked={isPublic}
          onCheckedChange={setIsPublic}
          label={isPublic ? 'Proposé aux clients' : 'Masqué aux clients'}
        />

        {method.type !== 'cash_on_delivery' && (
          <div className="space-y-4 rounded-lg border border-gray-100 p-3 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Les clés sont chiffrées et ne sont jamais réaffichées. Laissez un champ
              vide pour conserver la valeur enregistrée.
            </p>
            {SECRET_FIELDS.map((field) => (
              <FormField
                key={field.key}
                label={field.label}
                hint={method.secrets[field.key] ? `Enregistrée : ${method.secrets[field.key]}` : field.hint}
              >
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={secrets[field.key] ?? ''}
                  onChange={(e) => setSecrets({ ...secrets, [field.key]: e.target.value })}
                  placeholder={method.secrets[field.key] ? 'Inchangée' : ''}
                />
              </FormField>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
