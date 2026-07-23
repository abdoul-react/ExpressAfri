import { useState } from 'react'
import { KeyRound, UserPlus, Users } from 'lucide-react'
import { PermissionGuard } from '@/components/guards/PermissionGuard'
import {
  useStoreManagers, useCreateStoreManager, useSetManagerActive, useResetManagerPassword,
} from '../hooks/useStoreManagers'
import {
  Card, CardHeader, CardTitle, CardContent, Button, Badge, Modal, ConfirmDialog, FormField, Input, LoadingBlock, EmptyState,
} from '@/components/ui'
import { toast } from '@/lib/toast'

/**
 * Gérants de la boutique : comptes qui se connectent au panneau admin
 * mais ne voient QUE cette boutique (produits, commandes).
 * La création/désactivation est réservée à l'équipe plateforme.
 */
export function StoreManagersSection({ storeId }: { storeId: string }) {
  const { data: managers, isLoading } = useStoreManagers(storeId)
  const createManager = useCreateStoreManager(storeId)
  const setActive = useSetManagerActive(storeId)
  const resetPassword = useResetManagerPassword(storeId)

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [resettingId, setResettingId] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [resetError, setResetError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<{ managerId: string; name: string; isActive: boolean } | null>(null)

  function closeForm() {
    setShowForm(false)
    setName(''); setEmail(''); setPassword('')
    setError(null)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim() || !email.trim()) { setError('Nom et email requis'); return }
    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères'); return }
    try {
      await createManager.mutateAsync({ name: name.trim(), email: email.trim(), password })
      closeForm()
      toast.success('Gérant créé — transmettez-lui son email et son mot de passe')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création')
    }
  }

  async function handleResetPassword() {
    if (!resettingId) return
    setResetError(null)
    if (newPassword.length < 8) { setResetError('Le mot de passe doit contenir au moins 8 caractères'); return }
    try {
      await resetPassword.mutateAsync({ managerId: resettingId, password: newPassword })
      setResettingId(null)
      setNewPassword('')
      toast.success('Mot de passe réinitialisé')
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Erreur lors de la réinitialisation')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gérants</CardTitle>
        <PermissionGuard permission="admins.create">
          <Button size="sm" leftIcon={UserPlus} onClick={() => { setError(null); setShowForm(true) }}>
            Ajouter un gérant
          </Button>
        </PermissionGuard>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-xs text-gray-400 dark:text-gray-500">
          Un gérant se connecte au même panneau d'administration mais ne voit que cette boutique :
          ses produits et ses commandes. Il ne peut ni modérer, ni changer la commission.
        </p>

        {isLoading ? (
          <LoadingBlock label="Chargement des gérants…" />
        ) : !managers?.length ? (
          <EmptyState icon={Users} title="Aucun gérant" description="Aucun gérant pour cette boutique." className="py-8" />
        ) : (
          <ul className="space-y-2">
            {managers.map((m) => (
              <li key={m.id} className="rounded-lg border border-gray-100 p-3 dark:border-gray-800">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{m.name}</p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">{m.email}</p>
                  </div>
                  <Badge variant={m.isActive ? 'success' : 'neutral'} size="sm" dot>
                    {m.isActive ? 'Actif' : 'Désactivé'}
                  </Badge>
                </div>
                <PermissionGuard permission="admins.update">
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={m.isActive
                        ? 'text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10'
                        : 'text-green-600 hover:bg-green-50 hover:text-green-700 dark:text-green-400 dark:hover:bg-green-500/10'}
                      disabled={setActive.isPending}
                      onClick={() => setConfirm({ managerId: m.id, name: m.name, isActive: m.isActive })}
                    >
                      {m.isActive ? 'Désactiver' : 'Réactiver'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={KeyRound}
                      className="text-primary-600 hover:text-primary-700 dark:text-primary-400"
                      onClick={() => { setNewPassword(''); setResetError(null); setResettingId(m.id) }}
                    >
                      Réinitialiser le mot de passe
                    </Button>
                  </div>
                </PermissionGuard>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      {/* Modale d'ajout de gérant */}
      <Modal
        open={showForm}
        onOpenChange={(open) => { if (!open) closeForm() }}
        title="Ajouter un gérant"
        description="Le compte sera cloisonné à cette boutique."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={closeForm}>Annuler</Button>
            <Button type="submit" form="store-manager-create-form" loading={createManager.isPending}>
              Créer le compte
            </Button>
          </>
        }
      >
        <form id="store-manager-create-form" onSubmit={handleCreate} className="space-y-4">
          <FormField label="Nom complet" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom complet" autoFocus className="w-full" />
          </FormField>
          <FormField label="Email" required>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemple.com" className="w-full" />
          </FormField>
          <FormField label="Mot de passe" required hint="Minimum 8 caractères." error={error ?? undefined}>
            <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe (min. 8 caractères)" className="w-full" />
          </FormField>
        </form>
      </Modal>

      {/* Modale de réinitialisation du mot de passe */}
      <Modal
        open={resettingId !== null}
        onOpenChange={(open) => { if (!open) { setResettingId(null); setNewPassword(''); setResetError(null) } }}
        title="Réinitialiser le mot de passe"
        description="Transmettez le nouveau mot de passe au gérant."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => { setResettingId(null); setNewPassword('') }}>Annuler</Button>
            <Button loading={resetPassword.isPending} onClick={handleResetPassword}>
              Réinitialiser
            </Button>
          </>
        }
      >
        <FormField label="Nouveau mot de passe" required hint="Minimum 8 caractères." error={resetError ?? undefined}>
          <Input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nouveau mot de passe" autoFocus className="w-full" />
        </FormField>
      </Modal>

      {/* Confirmation activation / désactivation */}
      {confirm && (
        <ConfirmDialog
          open
          onOpenChange={(open) => { if (!open) setConfirm(null) }}
          title={confirm.isActive ? 'Désactiver le gérant' : 'Réactiver le gérant'}
          description={confirm.isActive
            ? `${confirm.name} ne pourra plus se connecter au panneau d'administration.`
            : `${confirm.name} pourra de nouveau se connecter et gérer cette boutique.`}
          confirmLabel={confirm.isActive ? 'Désactiver' : 'Réactiver'}
          variant={confirm.isActive ? 'danger' : 'default'}
          onConfirm={async () => {
            try {
              await setActive.mutateAsync({ managerId: confirm.managerId, isActive: !confirm.isActive })
              toast.success(confirm.isActive ? 'Gérant désactivé' : 'Gérant réactivé')
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Une erreur est survenue')
            }
          }}
        />
      )}
    </Card>
  )
}
