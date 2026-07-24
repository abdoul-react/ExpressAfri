import { useState } from 'react'
import type React from 'react'
import { KeyRound, Plus, Pencil, Trash2, Shield } from 'lucide-react'
import type { Permission } from '@/types/Permission'
import { PermissionGuard } from '@/components/guards/PermissionGuard'
import { useAdminRoles, useCreateRole, useUpdateRole, useDeleteRole } from '../hooks/useAdminRoles'
import { useAdminPermissions } from '../hooks/useAdminPermissions'
import {
  PageHeader, Button, Badge, Card, Modal, ConfirmDialog, Checkbox,
  Input, Textarea, FormField, LoadingBlock, EmptyState,
} from '@/components/ui'
import { toast } from '@/lib/toast'

const RESOURCE_LABELS: Record<string, string> = {
  admins: 'Admins', roles: 'Rôles', permissions: 'Permissions',
  users: 'Clients', products: 'Produits', categories: 'Catégories',
  stores: 'Boutiques', orders: 'Commandes', payments: 'Paiements',
  content: 'Contenu', promotions: 'Promotions', coupons: 'Coupons',
  campaigns: 'Campagnes', analytics: 'Analytics', audit: 'Audit',
  messages: 'Messages', notifications: 'Notifications',
  settings: 'Paramètres', features: 'Fonctionnalités',
  shipping: 'Livraison', reports: 'Signalements',
}

const ACTION_LABELS: Record<string, string> = {
  create: 'Créer', read: 'Lire', update: 'Modifier', delete: 'Supprimer',
  export: 'Exporter', manage: 'Gérer', moderate: 'Modérer', approve: 'Approuver',
}

function groupPermissions(perms: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {}
  for (const p of perms) {
    const [resource] = p.split('.')
    if (!groups[resource]) groups[resource] = []
    groups[resource].push(p)
  }
  return groups
}

function PermissionsView({ permissions }: { permissions: string[] | '*' }) {
  if (permissions === '*') return (
    <Badge variant="warning">Toutes les permissions</Badge>
  )
  const grouped = groupPermissions(permissions)
  return (
    <div className="flex max-w-lg flex-wrap gap-1.5">
      {Object.entries(grouped).map(([resource, perms]) => (
        <Badge key={resource} variant="info" size="sm">
          {RESOURCE_LABELS[resource] ?? resource} ({perms.length})
        </Badge>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Matrice de permissions — ressources en lignes, actions en colonnes
// ---------------------------------------------------------------------------
function PermissionMatrix({
  allPermissions,
  selected,
  onToggle,
}: {
  allPermissions: { key: Permission; label: string }[] | undefined
  selected: Permission[]
  onToggle: (p: Permission) => void
}) {
  const perms = allPermissions ?? []

  // Ressources (lignes) et actions (colonnes) dans l'ordre d'apparition
  const resources: string[] = []
  const actions: string[] = []
  const byCell = new Map<string, { key: Permission; label: string }>()
  for (const p of perms) {
    const [res, act] = p.key.split('.')
    if (!resources.includes(res)) resources.push(res)
    if (!actions.includes(act)) actions.push(act)
    byCell.set(`${res}.${act}`, p)
  }

  return (
    <Card padding="none" className="max-h-72 overflow-auto">
      <table className="w-full border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="sticky left-0 top-0 z-20 border-b border-gray-100 bg-gray-50 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
              Ressource
            </th>
            {actions.map((a) => (
              <th
                key={a}
                className="sticky top-0 z-10 border-b border-gray-100 bg-gray-50 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400"
              >
                {ACTION_LABELS[a] ?? a}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {resources.map((res) => (
            <tr key={res} className="group">
              <td className="sticky left-0 z-10 border-b border-gray-100 bg-white px-3 py-2 text-xs font-medium text-gray-700 group-hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:group-hover:bg-gray-800/60">
                {RESOURCE_LABELS[res] ?? res}
              </td>
              {actions.map((act) => {
                const perm = byCell.get(`${res}.${act}`)
                return (
                  <td
                    key={act}
                    className="border-b border-gray-100 px-3 py-2 text-center group-hover:bg-gray-50/60 dark:border-gray-800 dark:group-hover:bg-gray-800/40"
                  >
                    {perm ? (
                      <span title={perm.label} className="inline-flex">
                        <Checkbox
                          checked={selected.includes(perm.key)}
                          onCheckedChange={() => onToggle(perm.key)}
                        />
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300 dark:text-gray-700">—</span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

export function AdminRoleListPage() {
  const { data: roles, isLoading } = useAdminRoles()
  const deleteRole = useDeleteRole()
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; label: string } | null>(null)

  return (
    <div>
      <PageHeader
        title="Rôles"
        description="Gérer les rôles et leurs permissions"
        actions={
          <PermissionGuard permission="roles.create"><CreateRoleModal /></PermissionGuard>
        }
      />

      {isLoading ? (
        <LoadingBlock label="Chargement des rôles…" />
      ) : (
        <div className="space-y-4">
          {roles?.map((role) => (
            <Card key={role.id} padding="sm" className="p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{role.label}</h3>
                    {role.isSuperAdmin && (
                      <Badge variant="warning" size="sm">
                        <Shield className="h-3 w-3" />
                        Super Admin
                      </Badge>
                    )}
                    {role.id.startsWith('custom_') && (
                      <Badge variant="purple" size="sm">Personnalisé</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{role.description}</p>
                  <span className="mt-1 block font-mono text-xs text-gray-400 dark:text-gray-500">{role.id}</span>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1">
                  <PermissionGuard permission="roles.update">
                    <EditRoleModal role={role as any} />
                  </PermissionGuard>
                  {!role.isSuperAdmin && (
                    <PermissionGuard permission="roles.delete">
                      <Button
                        variant="ghost" size="sm" leftIcon={Trash2}
                        className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10"
                        onClick={() => setConfirmDelete({ id: role.id, label: role.label })}
                      >
                        Supprimer
                      </Button>
                    </PermissionGuard>
                  )}
                </div>
              </div>
              <PermissionsView permissions={role.permissions} />
            </Card>
          ))}
          {(!roles || roles.length === 0) && (
            <Card padding="none">
              <EmptyState
                icon={KeyRound}
                title="Aucun rôle défini"
                description="Créez un rôle personnalisé pour déléguer des permissions."
              />
            </Card>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => { if (!o) setConfirmDelete(null) }}
        title="Supprimer ce rôle ?"
        description={`Le rôle « ${confirmDelete?.label ?? ''} » sera supprimé. Les administrateurs qui l'utilisent perdront les permissions associées.`}
        confirmLabel="Supprimer"
        variant="danger"
        onConfirm={async () => {
          if (!confirmDelete) return
          try {
            await deleteRole.mutateAsync(confirmDelete.id)
            toast.success('Rôle supprimé')
            setConfirmDelete(null)
          } catch (e: any) {
            toast.error(e?.response?.data?.message ?? e.message ?? 'Erreur lors de la suppression du rôle')
          }
        }}
      />
    </div>
  )
}

function CreateRoleModal() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ label: '', description: '', permissions: [] as Permission[] })
  const { data: allPermissions } = useAdminPermissions()
  const createRole = useCreateRole()
  const [error, setError] = useState('')

  function togglePermission(p: Permission) {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(p) ? f.permissions.filter((x) => x !== p) : [...f.permissions, p],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.permissions.length === 0) { setError('Sélectionnez au moins une permission'); return }
    try {
      await createRole.mutateAsync(form)
      setOpen(false)
      setForm({ label: '', description: '', permissions: [] })
      setError('')
      toast.success('Rôle créé')
    } catch (e: any) {
      setError(e.message)
      toast.error(e.message || 'Erreur lors de la création du rôle')
    }
  }

  return (
    <>
      <Button leftIcon={Plus} onClick={() => setOpen(true)}>
        Nouveau rôle
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Nouveau rôle personnalisé"
        description="Définissez les permissions accordées à ce rôle"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" form="create-role-form" loading={createRole.isPending}>Créer le rôle</Button>
          </>
        }
      >
        <form id="create-role-form" onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">{error}</div>}
          <FormField label="Nom du rôle" required>
            <Input required size="sm" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          </FormField>
          <FormField label="Description">
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </FormField>
          <FormField label="Permissions" hint={`${form.permissions.length} permission${form.permissions.length > 1 ? 's' : ''} sélectionnée${form.permissions.length > 1 ? 's' : ''}`}>
            <PermissionMatrix
              allPermissions={allPermissions}
              selected={form.permissions}
              onToggle={togglePermission}
            />
          </FormField>
        </form>
      </Modal>
    </>
  )
}

function EditRoleModal({ role }: { role: { id: string; label: string; description: string; permissions: string[] | '*' } }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ label: role.label, description: role.description, permissions: role.permissions === '*' ? [] as Permission[] : [...role.permissions] as Permission[] })
  const { data: allPermissions } = useAdminPermissions()
  const updateRole = useUpdateRole()
  const [error, setError] = useState('')

  function togglePermission(p: Permission) {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(p) ? f.permissions.filter((x) => x !== p) : [...f.permissions, p],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.permissions.length === 0 && role.id !== 'super_admin') { setError('Sélectionnez au moins une permission'); return }
    try {
      await updateRole.mutateAsync({ id: role.id, data: form as any })
      setOpen(false)
      setError('')
      toast.success('Rôle mis à jour')
    } catch (e: any) {
      setError(e.message)
      toast.error(e.message || 'Erreur lors de la mise à jour du rôle')
    }
  }

  return (
    <>
      <Button variant="ghost" size="sm" leftIcon={Pencil} onClick={() => {
        setForm({
          label: role.label,
          description: role.description,
          permissions: role.permissions === '*' ? [] as Permission[] : [...role.permissions] as Permission[],
        })
        setError('')
        setOpen(true)
      }}>
        Modifier
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title={`Modifier ${role.label}`}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" form={`edit-role-form-${role.id}`} loading={updateRole.isPending}>Enregistrer</Button>
          </>
        }
      >
        <form id={`edit-role-form-${role.id}`} onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">{error}</div>}
          {role.permissions === '*' && role.id === 'super_admin' && (
            <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
              Le Super Admin a toutes les permissions. Vous pouvez modifier le nom et la description uniquement.
            </div>
          )}
          <FormField label="Nom" required>
            <Input required size="sm" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          </FormField>
          <FormField label="Description">
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </FormField>
          {role.id !== 'super_admin' && (
            <FormField label="Permissions" hint={`${form.permissions.length} permission${form.permissions.length > 1 ? 's' : ''} sélectionnée${form.permissions.length > 1 ? 's' : ''}`}>
              <PermissionMatrix
                allPermissions={allPermissions}
                selected={form.permissions}
                onToggle={togglePermission}
              />
            </FormField>
          )}
        </form>
      </Modal>
    </>
  )
}
