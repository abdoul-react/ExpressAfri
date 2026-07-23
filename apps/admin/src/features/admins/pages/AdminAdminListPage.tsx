import { useState } from 'react'
import type React from 'react'
import { UserCog, Plus, Pencil, KeyRound, Trash2, ShieldCheck } from 'lucide-react'
import { PermissionGuard } from '@/components/guards/PermissionGuard'
import { useAdminAdminList, useCreateAdmin, useUpdateAdmin, useUpdateAdminPassword, useDeleteAdmin } from '../hooks/useAdminAdminList'
import { useAdminRoles } from '@/features/roles/hooks/useAdminRoles'
import type { AdminUser } from '@/types/AdminUser'
import { ROLES } from '@/types/Role'
import {
  PageHeader, Button, Badge, DataTable, type Column, Modal, ConfirmDialog,
  SearchInput, Select, Input, FormField,
} from '@/components/ui'
import { toast } from '@/lib/toast'

export function AdminAdminListPage() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [page, setPage] = useState(1)
  const { data, isLoading } = useAdminAdminList({ page, search: search || undefined, role: roleFilter || undefined })
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
          options={Object.values(ROLES).map((role) => ({ value: role.id, label: role.label }))}
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
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ email: '', name: '', password: '', role: 'product_admin' })
  const { data: roles } = useAdminRoles()
  const createAdmin = useCreateAdmin()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await createAdmin.mutateAsync(form)
      setOpen(false)
      setForm({ email: '', name: '', password: '', role: 'product_admin' })
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
        onOpenChange={setOpen}
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
          <FormField label="Rôle">
            <Select
              size="sm"
              className="w-full"
              value={form.role}
              onChange={(v) => setForm({ ...form, role: v })}
              options={(roles ?? []).filter((r) => r.id !== 'super_admin').map((r) => ({ value: r.id, label: r.label }))}
            />
          </FormField>
        </form>
      </Modal>
    </>
  )
}

function EditAdminModal({ admin }: { admin: AdminUser }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', role: admin.role })
  const updateAdmin = useUpdateAdmin()
  const { data: roles } = useAdminRoles()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await updateAdmin.mutateAsync({ id: admin.id, data: { name: form.name, role: form.role } })
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
        onClick={() => { setOpen(true); setForm({ name: admin.name, role: admin.role }) }}
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
          <FormField label="Rôle">
            <Select
              size="sm"
              className="w-full"
              value={form.role}
              onChange={(v) => setForm({ ...form, role: v as AdminUser['role'] })}
              options={(roles ?? [])
                .filter((r) => r.id !== 'super_admin' || admin.role === 'super_admin')
                .map((r) => ({ value: r.id, label: r.label }))}
            />
          </FormField>
        </form>
      </Modal>
    </>
  )
}

function PasswordModal({ adminId }: { adminId: string }) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const updatePassword = useUpdateAdminPassword()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await updatePassword.mutateAsync({ id: adminId, password })
      setOpen(false)
      setPassword('')
      toast.success('Mot de passe mis à jour')
    } catch {
      toast.error('Erreur lors de la mise à jour du mot de passe')
    }
  }

  return (
    <>
      <Button variant="ghost" size="sm" leftIcon={KeyRound} onClick={() => setOpen(true)}>
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
          <FormField label="Nouveau mot de passe" required>
            <Input required type="password" size="sm" value={password} onChange={(e) => setPassword(e.target.value)} />
          </FormField>
        </form>
      </Modal>
    </>
  )
}
