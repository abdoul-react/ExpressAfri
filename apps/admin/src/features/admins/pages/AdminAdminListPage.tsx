import { useState, useEffect } from 'react'
import type React from 'react'

function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}
import { UserCog, Plus, Pencil, KeyRound, Trash2, ShieldCheck, Store } from 'lucide-react'
import { PermissionGuard } from '@/components/guards/PermissionGuard'
import { useAdminAdminList, useCreateAdmin, useUpdateAdmin, useUpdateAdminPassword, useDeleteAdmin } from '../hooks/useAdminAdminList'
import { useAdminRoles } from '@/features/roles/hooks/useAdminRoles'
import { useAdminStores } from '@/features/stores/hooks/useAdminStores'
import type { AdminUser } from '@/types/AdminUser'
import {
  PageHeader, Button, Badge, DataTable, type Column, Modal, ConfirmDialog,
  SearchInput, Select, Input, FormField,
} from '@/components/ui'
import { toast } from '@/lib/toast'

export function AdminAdminListPage() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [roleFilter, setRoleFilter] = useState('')
  const [page, setPage] = useState(1)
  const { data: roles } = useAdminRoles()
  const { data, isLoading } = useAdminAdminList({ page, search: debouncedSearch || undefined, role: roleFilter || undefined })
  const deleteAdmin = useDeleteAdmin()
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null)

  const columns: Column<AdminUser>[] = [
    {
      key: 'name',
      header: 'Nom',
      cell: (admin) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary-700 dark:bg-primary-500/10 dark:text-primary-400">
            {admin.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <span className="font-medium text-gray-900 dark:text-gray-100">{admin.name}</span>
          {admin.isSuperAdmin && (
            <Badge variant="warning" size="sm">
              <ShieldCheck className="h-3 w-3" />
              Super Admin
            </Badge>
          )}
        </div>
      ),
    },
    { key: 'email', header: 'Email', hideBelow: 'md', cell: (admin) => admin.email },
    {
      key: 'role',
      header: 'Rôle',
      cell: (admin) => <Badge variant="neutral">{admin.role}</Badge>,
    },
    {
      key: 'storeName',
      header: 'Boutique',
      hideBelow: 'lg',
      cell: (admin) => admin.storeName
        ? (
          <div className="flex items-center gap-1.5">
            <Store className="h-3.5 w-3.5 shrink-0 text-primary-500" />
            <span className="text-sm font-medium text-primary-700 dark:text-primary-400">{admin.storeName}</span>
          </div>
        )
        : <span className="text-xs text-gray-400">—</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (admin) => (
        <div className="flex items-center justify-end gap-1">
          <PermissionGuard permission="admins.update">
            <EditAdminModal admin={admin} />
          </PermissionGuard>
          <PermissionGuard permission="admins.update">
            <PasswordModal adminId={admin.id} />
          </PermissionGuard>
          {!admin.isSuperAdmin && (
            <PermissionGuard permission="admins.delete">
              <Button
                variant="ghost" size="sm" leftIcon={Trash2}
                className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10"
                onClick={() => setConfirmDelete(admin)}
              >
                Supprimer
              </Button>
            </PermissionGuard>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Administrateurs"
        description="Gérer les accès au panneau d'administration"
        actions={
          <PermissionGuard permission="admins.create">
            <CreateAdminModal onCreated={() => setPage(1)} />
          </PermissionGuard>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <SearchInput
          className="min-w-[220px] flex-1"
          value={search}
          onChange={(v) => { setSearch(v); setPage(1) }}
          placeholder="Rechercher par nom ou email…"
        />
        <Select
          size="sm"
          value={roleFilter}
          onChange={(v) => { setRoleFilter(v); setPage(1) }}
          placeholder="Tous les rôles"
          options={(roles ?? []).map((r) => ({ value: r.id, label: r.label }))}
        />
      </div>

      <DataTable<AdminUser>
        data={data?.data ?? []}
        columns={columns}
        rowKey={(admin) => admin.id}
        loading={isLoading}
        empty={{
          icon: UserCog,
          title: 'Aucun administrateur trouvé',
          description: 'Ajustez votre recherche ou créez un nouvel administrateur.',
        }}
        pagination={{
          page,
          pageSize: 10,
          total: data?.total ?? 0,
          onPageChange: setPage,
        }}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => { if (!o) setConfirmDelete(null) }}
        title="Supprimer cet administrateur ?"
        description={`Le compte de ${confirmDelete?.name ?? ''} sera supprimé et son accès révoqué immédiatement.`}
        confirmLabel="Supprimer"
        variant="danger"
        onConfirm={async () => {
          if (!confirmDelete) return
          try {
            await deleteAdmin.mutateAsync(confirmDelete.id)
            toast.success('Administrateur supprimé')
          } catch {
            toast.error('Erreur lors de la suppression')
          }
          setConfirmDelete(null)
        }}
      />
    </div>
  )
}

function CreateAdminModal({ onCreated }: { onCreated: () => void }) {
  const EMPTY_FORM = { email: '', name: '', password: '', role: '', storeId: '' }
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const { data: roles } = useAdminRoles()
  const { data: storesData } = useAdminStores({ limit: 200, status: 'approved' })
  const createAdmin = useCreateAdmin()

  const availableRoles = (roles ?? []).filter((r) => !r.isSuperAdmin)
  const selectedRole = availableRoles.find((r) => r.id === form.role)
  const isStoreManager = selectedRole?.label === 'Gérant de boutique'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.role) { toast.error('Veuillez choisir un rôle'); return }
    if (isStoreManager && !form.storeId) { toast.error('Veuillez choisir la boutique à gérer'); return }
    try {
      await createAdmin.mutateAsync({ ...form, storeId: isStoreManager ? form.storeId : null })
      setOpen(false)
      setForm(EMPTY_FORM)
      toast.success('Administrateur créé')
      onCreated()
    } catch {
      toast.error("Erreur lors de la création de l'administrateur")
    }
  }

  return (
    <>
      <Button leftIcon={Plus} onClick={() => setOpen(true)}>
        Nouvel admin
      </Button>
      <Modal
        open={open}
        onOpenChange={(o) => { if (!o) setForm(EMPTY_FORM); setOpen(o) }}
        title="Nouvel administrateur"
        description="Créez un compte avec un rôle et un mot de passe initial"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" form="create-admin-form" loading={createAdmin.isPending}>Créer</Button>
          </>
        }
      >
        <form id="create-admin-form" onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Nom" required>
            <Input required size="sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <FormField label="Email" required>
            <Input required type="email" size="sm" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </FormField>
          <FormField label="Mot de passe" required>
            <Input required type="password" size="sm" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </FormField>
          <FormField label="Rôle" required>
            <Select
              size="sm"
              className="w-full"
              value={form.role}
              onChange={(v) => setForm({ ...form, role: v, storeId: '' })}
              placeholder="Choisir un rôle…"
              options={availableRoles.map((r) => ({ value: r.id, label: r.label }))}
            />
          </FormField>

          {isStoreManager && (
            <FormField
              label="Boutique à gérer"
              required
              hint="Le gérant n'aura accès qu'aux données de cette boutique"
            >
              <Select
                size="sm"
                className="w-full"
                value={form.storeId}
                onChange={(v) => setForm({ ...form, storeId: v })}
                placeholder="Choisir une boutique…"
                options={(storesData?.data ?? []).map((s) => ({ value: s.id, label: s.name }))}
              />
            </FormField>
          )}
        </form>
      </Modal>
    </>
  )
}

function EditAdminModal({ admin }: { admin: AdminUser }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: admin.name, role: admin.role as string, storeId: admin.storeId ?? '' })
  const updateAdmin = useUpdateAdmin()
  const { data: roles } = useAdminRoles()
  const { data: storesData } = useAdminStores({ limit: 200, status: 'approved' })

  const availableRoles = (roles ?? []).filter((r) => !r.isSuperAdmin || admin.isSuperAdmin)
  const selectedRole = availableRoles.find((r) => r.id === form.role)
  const isStoreManager = selectedRole?.label === 'Gérant de boutique'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isStoreManager && !form.storeId) { toast.error('Veuillez choisir la boutique à gérer'); return }
    try {
      await updateAdmin.mutateAsync({
        id: admin.id,
        data: { name: form.name, role: form.role, storeId: isStoreManager ? form.storeId : null },
      })
      setOpen(false)
      toast.success('Administrateur mis à jour')
    } catch {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  return (
    <>
      <Button
        variant="ghost" size="sm" leftIcon={Pencil}
        onClick={() => { setOpen(true); setForm({ name: admin.name, role: admin.role as string, storeId: admin.storeId ?? '' }) }}
      >
        Modifier
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title={`Modifier ${admin.name}`}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" form={`edit-admin-form-${admin.id}`} loading={updateAdmin.isPending}>Enregistrer</Button>
          </>
        }
      >
        <form id={`edit-admin-form-${admin.id}`} onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Nom" required>
            <Input required size="sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <FormField label="Rôle" required>
            <Select
              size="sm"
              className="w-full"
              value={form.role}
              onChange={(v) => setForm({ ...form, role: v, storeId: '' })}
              options={availableRoles.map((r) => ({ value: r.id, label: r.label }))}
            />
          </FormField>

          {isStoreManager && (
            <FormField
              label="Boutique à gérer"
              required
              hint="Le gérant n'aura accès qu'aux données de cette boutique"
            >
              <Select
                size="sm"
                className="w-full"
                value={form.storeId}
                onChange={(v) => setForm({ ...form, storeId: v })}
                placeholder="Choisir une boutique…"
                options={(storesData?.data ?? []).map((s) => ({ value: s.id, label: s.name }))}
              />
            </FormField>
          )}
        </form>
      </Modal>
    </>
  )
}

function PasswordModal({ adminId }: { adminId: string }) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const updatePassword = useUpdateAdminPassword()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères'); return }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas'); return }
    try {
      await updatePassword.mutateAsync({ id: adminId, password })
      setOpen(false)
      setPassword('')
      setConfirm('')
      setError('')
      toast.success('Mot de passe mis à jour')
    } catch {
      toast.error('Erreur lors de la mise à jour du mot de passe')
    }
  }

  return (
    <>
      <Button variant="ghost" size="sm" leftIcon={KeyRound} onClick={() => { setPassword(''); setConfirm(''); setError(''); setOpen(true) }}>
        Mot de passe
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Changer le mot de passe"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" form={`password-form-${adminId}`} loading={updatePassword.isPending}>Mettre à jour</Button>
          </>
        }
      >
        <form id={`password-form-${adminId}`} onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">{error}</div>}
          <FormField label="Nouveau mot de passe" required hint="8 caractères minimum">
            <Input required type="password" size="sm" value={password} onChange={(e) => setPassword(e.target.value)} />
          </FormField>
          <FormField label="Confirmer le mot de passe" required>
            <Input required type="password" size="sm" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </FormField>
        </form>
      </Modal>
    </>
  )
}
