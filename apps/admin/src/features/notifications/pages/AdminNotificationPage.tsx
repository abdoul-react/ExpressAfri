import { useState } from 'react'
import { BellRing, Clock, Pencil, Plus, Send, Trash2 } from 'lucide-react'
import { useNotificationTemplates, useNotificationLogs, useCreateTemplate, useUpdateTemplate, useDeleteTemplate, useSendTest, useSendBatch } from '../hooks/useAdminNotifications'
import type { TemplateQueryParams, NotificationQueryParams } from '@/infrastructure/data-source/AdminNotificationDataSource'
import {
  PageHeader, Tabs, TabsList, TabsTrigger, TabsContent,
  Card, Badge, StatusBadge, Button, Input, Select, Textarea, Checkbox, FormField,
  SearchInput, DataTable, Pagination, EmptyState, LoadingBlock, Modal, ConfirmDialog,
  type Column,
} from '@/components/ui'
import { NOTIFICATION_STATUS, type StatusVariant } from '@/lib/status'
import { toast } from '@/lib/toast'

// Le type de canal n'est pas dans le registre central : petite map locale → variante Badge.
const TYPE_META: Record<string, { label: string; variant: StatusVariant }> = {
  email: { label: 'Email', variant: 'info' },
  push: { label: 'Push', variant: 'purple' },
  sms: { label: 'SMS', variant: 'success' },
}

const TYPE_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'push', label: 'Push' },
  { value: 'sms', label: 'SMS' },
]

const CATEGORY_OPTIONS = [
  { value: 'order', label: 'Commande' },
  { value: 'payment', label: 'Paiement' },
  { value: 'delivery', label: 'Livraison' },
  { value: 'account', label: 'Compte' },
  { value: 'promotion', label: 'Promotion' },
  { value: 'system', label: 'Système' },
]

type LogRow = {
  id: string
  templateName: string
  recipient: string
  subject: string
  type: string
  status: string
  openedAt?: string
  sentAt: string
}

export function AdminNotificationPage() {
  const [tab, setTab] = useState<'templates' | 'logs'>('templates')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', type: 'email', category: 'order', subject: '', body: '', isActive: true })
  const [showForm, setShowForm] = useState(false)
  const [testModal, setTestModal] = useState<{ id: string; name: string; type: string } | null>(null)
  const [testRecipient, setTestRecipient] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null)

  const tParams: TemplateQueryParams = { page, limit: 10, search: search || undefined, type: (typeFilter as any) || undefined }
  const { data: templates, isLoading, isError, error } = useNotificationTemplates(tParams)

  const lParams: NotificationQueryParams = { page, limit: 10, search: search || undefined, type: (typeFilter as any) || undefined }
  const { data: logs, isLoading: logsLoading } = useNotificationLogs(lParams)

  const createTmpl = useCreateTemplate()
  const updateTmpl = useUpdateTemplate()
  const deleteTmpl = useDeleteTemplate()
  const sendTest = useSendTest()

  function resetForm() { setForm({ name: '', type: 'email', category: 'order', subject: '', body: '', isActive: true }); setEditId(null); setShowForm(false) }

  function editTemplate(t: any) { setForm({ name: t.name, type: t.type, category: t.category, subject: t.subject, body: t.body, isActive: t.isActive }); setEditId(t.id); setShowForm(true) }

  async function handleSave() {
    if (!form.name.trim() || !form.subject.trim()) return
    try {
      if (editId) await updateTmpl.mutateAsync({ id: editId, data: form })
      else await createTmpl.mutateAsync(form)
      toast.success(editId ? 'Template mis à jour' : 'Template créé')
      resetForm()
    } catch {
      toast.error("Erreur lors de l'enregistrement du template")
    }
  }

  const logColumns: Column<LogRow>[] = [
    { key: 'templateName', header: 'Template', cell: (l) => <span className="font-medium text-gray-900 dark:text-gray-100">{l.templateName}</span> },
    { key: 'recipient', header: 'Destinataire' },
    { key: 'subject', header: 'Sujet', hideBelow: 'md', cell: (l) => <span className="block max-w-[250px] truncate text-gray-500 dark:text-gray-400">{l.subject}</span> },
    { key: 'type', header: 'Type', cell: (l) => { const m = TYPE_META[l.type] ?? TYPE_META.email; return <Badge variant={m.variant} size="sm">{m.label}</Badge> } },
    {
      key: 'status', header: 'Statut',
      cell: (l) => (
        <span className="inline-flex items-center gap-1.5">
          <StatusBadge map={NOTIFICATION_STATUS} value={l.status} size="sm" dot />
          {l.openedAt && <span className="text-xs text-gray-400 dark:text-gray-500">({new Date(l.openedAt).toLocaleDateString('fr-FR')})</span>}
        </span>
      ),
    },
    {
      key: 'sentAt', header: 'Date', hideBelow: 'sm',
      cell: (l) => (
        <span className="text-gray-500 dark:text-gray-400">
          {new Date(l.sentAt).toLocaleDateString('fr-FR')} {new Date(l.sentAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Templates de notifications et historique des envois"
        actions={tab === 'templates' && !showForm ? (
          <Button leftIcon={Plus} onClick={() => { resetForm(); setShowForm(true) }}>
            Nouveau template
          </Button>
        ) : undefined}
      />

      <Tabs value={tab} onValueChange={(v) => { setTab(v as 'templates' | 'logs'); setPage(1) }}>
        <TabsList variant="pills">
          <TabsTrigger value="templates" icon={BellRing}>Templates</TabsTrigger>
          <TabsTrigger value="logs" icon={Clock}>Historique d'envoi</TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          {showForm ? (
            <Card className="mb-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{editId ? 'Modifier le template' : 'Nouveau template'}</h2>
              <div className="max-w-2xl space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <FormField label="Nom" htmlFor="tmpl-name">
                    <Input id="tmpl-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Confirmation commande" />
                  </FormField>
                  <FormField label="Type" htmlFor="tmpl-type">
                    <Select id="tmpl-type" value={form.type} onChange={(v) => setForm({ ...form, type: v })} options={TYPE_OPTIONS} className="w-full" />
                  </FormField>
                  <FormField label="Catégorie" htmlFor="tmpl-category">
                    <Select id="tmpl-category" value={form.category} onChange={(v) => setForm({ ...form, category: v })} options={CATEGORY_OPTIONS} className="w-full" />
                  </FormField>
                </div>
                <FormField
                  label="Sujet"
                  htmlFor="tmpl-subject"
                  hint={`Utilisez {{variable}} pour les champs dynamiques`}
                >
                  <Input id="tmpl-subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Confirmation de votre commande #{{orderId}}" />
                </FormField>
                <FormField label="Corps du message" htmlFor="tmpl-body">
                  <Textarea id="tmpl-body" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={8} className="w-full" placeholder="Bonjour {{customerName}},..." />
                </FormField>
                <Checkbox checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} label="Template actif" />
                <div className="flex gap-3">
                  <Button
                    onClick={handleSave}
                    loading={createTmpl.isPending || updateTmpl.isPending}
                    disabled={!form.name.trim() || !form.subject.trim()}
                  >
                    {editId ? 'Enregistrer' : 'Créer'}
                  </Button>
                  <Button variant="outline" onClick={resetForm}>Annuler</Button>
                </div>
              </div>
            </Card>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap gap-3">
                <SearchInput
                  value={search}
                  onChange={(v) => { setSearch(v); setPage(1) }}
                  placeholder="Rechercher un template…"
                  size="sm"
                  className="min-w-[200px] flex-1"
                />
                <Select
                  value={typeFilter}
                  onChange={(v) => { setTypeFilter(v); setPage(1) }}
                  options={TYPE_OPTIONS}
                  placeholder="Tous types"
                  size="sm"
                />
              </div>

              {isLoading && <Card padding="none"><LoadingBlock label="Chargement des templates…" /></Card>}
              {isError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                  Erreur : {(error as Error)?.message}
                </div>
              )}

              {templates && !isLoading && (
                <div className="space-y-3">
                  {templates.data.map((t: any) => {
                    const typeMeta = TYPE_META[t.type] ?? TYPE_META.email
                    return (
                      <Card key={t.id} className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t.name}</h3>
                            <Badge variant={typeMeta.variant} size="sm">{typeMeta.label}</Badge>
                            <Badge variant="neutral" size="sm">{t.category}</Badge>
                            {!t.isActive && <Badge variant="danger" size="sm">Inactif</Badge>}
                          </div>
                          <p className="mt-1 truncate text-sm text-gray-500 dark:text-gray-400">{t.subject}</p>
                          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">Modifié le {new Date(t.lastEditedAt).toLocaleDateString('fr-FR')}</p>
                        </div>
                        <div className="ml-4 flex flex-shrink-0 items-center gap-1.5">
                          <Button variant="ghost" size="sm" leftIcon={Pencil} onClick={() => editTemplate(t)}>Modifier</Button>
                          <Button variant="ghost" size="sm" leftIcon={Send} onClick={() => setTestModal({ id: t.id, name: t.name, type: t.type })}>Tester</Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={Trash2}
                            className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                            disabled={deleteTmpl.isPending}
                            onClick={() => setConfirmDelete({ id: t.id, name: t.name })}
                          >
                            Supprimer
                          </Button>
                        </div>
                      </Card>
                    )
                  })}
                  {templates.data.length === 0 && (
                    <Card padding="none">
                      <EmptyState
                        icon={BellRing}
                        title="Aucun template trouvé"
                        description="Créez un template pour envoyer des notifications aux utilisateurs."
                        action={<Button size="sm" leftIcon={Plus} onClick={() => { resetForm(); setShowForm(true) }}>Nouveau template</Button>}
                      />
                    </Card>
                  )}
                  <Pagination page={page} pageSize={10} total={templates.total ?? templates.totalPages * 10} onPageChange={setPage} />
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="logs">
          <div className="mb-4 flex flex-wrap gap-3">
            <SearchInput
              value={search}
              onChange={(v) => { setSearch(v); setPage(1) }}
              placeholder="Rechercher par destinataire ou sujet…"
              size="sm"
              className="min-w-[200px] flex-1"
            />
            <Select
              value={typeFilter}
              onChange={(v) => { setTypeFilter(v); setPage(1) }}
              options={TYPE_OPTIONS}
              placeholder="Tous types"
              size="sm"
            />
          </div>

          <DataTable<LogRow>
            data={(logs?.data ?? []) as LogRow[]}
            columns={logColumns}
            rowKey={(l) => l.id}
            loading={logsLoading}
            empty={{ icon: BellRing, title: 'Aucun envoi trouvé', description: "Aucune notification ne correspond à ces critères." }}
            pagination={logs ? { page, pageSize: 10, total: logs.total ?? logs.totalPages * 10, onPageChange: setPage } : undefined}
          />
        </TabsContent>
      </Tabs>

      {/* Modale d'envoi de test */}
      <Modal
        open={!!testModal}
        onOpenChange={(o) => { if (!o) { setTestModal(null); setTestRecipient('') } }}
        title="Tester le template"
        description={testModal ? `${testModal.name} (${testModal.type})` : undefined}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => { setTestModal(null); setTestRecipient('') }}>Annuler</Button>
            <Button
              loading={sendTest.isPending}
              disabled={!testRecipient.trim()}
              leftIcon={Send}
              onClick={async () => {
                if (!testModal) return
                try {
                  await sendTest.mutateAsync({ templateId: testModal.id, recipient: testRecipient })
                  toast.success('Notification de test envoyée')
                  setTestModal(null)
                  setTestRecipient('')
                } catch {
                  toast.error("Erreur lors de l'envoi du test")
                }
              }}
            >
              Envoyer le test
            </Button>
          </>
        }
      >
        <FormField label={`Adresse ${testModal?.type === 'email' ? 'email' : 'de notification'}`} htmlFor="test-recipient">
          <Input
            id="test-recipient"
            value={testRecipient}
            onChange={(e) => setTestRecipient(e.target.value)}
            placeholder={testModal?.type === 'email' ? 'test@email.com' : 'Ex: admin@expressafri.com'}
            className="w-full"
          />
        </FormField>
      </Modal>

      {/* Confirmation de suppression */}
      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => { if (!o) setConfirmDelete(null) }}
        title="Supprimer le template ?"
        description={confirmDelete ? `Le template « ${confirmDelete.name} » sera supprimé définitivement.` : undefined}
        confirmLabel="Supprimer"
        variant="danger"
        onConfirm={async () => {
          if (!confirmDelete) return
          try {
            await deleteTmpl.mutateAsync(confirmDelete.id)
            toast.success('Template supprimé')
          } catch {
            toast.error('Erreur lors de la suppression')
          }
        }}
      />
    </div>
  )
}
