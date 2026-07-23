import { useState } from 'react'
import { FileText, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  useAdminStaticPages, useUpdateStaticPage, useCreateStaticPage, useDeleteStaticPage,
} from '../hooks/useAdminStaticPages'
import type { StaticPage } from '@/infrastructure/data-source/AdminContentDataSource'
import {
  Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle,
  ConfirmDialog, EmptyState, FormField, Input, LoadingBlock, Modal, Textarea,
} from '@/components/ui'
import { toast } from '@/lib/toast'

/* ─────────────────────────────────────────────────────────────────────────────
   Pages d'information (conditions générales, confidentialité, mentions
   légales…) éditées par un NON-CODEUR : l'admin écrit des titres et des
   paragraphes en texte simple ; la mise en forme HTML est générée pour lui.
   À l'inverse, le HTML existant est converti en texte simple à l'ouverture.
   ──────────────────────────────────────────────────────────────────────────── */

/** HTML → texte éditable : titres = ligne finissant par « : » ou précédée de ##, listes = lignes commençant par - */
function htmlToPlain(html: string): string {
  return html
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n## $1\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<\/(p|div|ul|ol)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
    .split('\n').map((l) => l.trim()).join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Texte simple → HTML propre : ## Titre, - puce, paragraphe sinon. */
function plainToHtml(text: string): string {
  const lines = text.split('\n')
  const out: string[] = []
  let listOpen = false
  const closeList = () => { if (listOpen) { out.push('</ul>'); listOpen = false } }
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) { closeList(); continue }
    if (line.startsWith('## ')) { closeList(); out.push(`<h2>${esc(line.slice(3))}</h2>`); continue }
    if (line.startsWith('- ')) {
      if (!listOpen) { out.push('<ul>'); listOpen = true }
      out.push(`<li>${esc(line.slice(2))}</li>`)
      continue
    }
    closeList()
    out.push(`<p>${esc(line)}</p>`)
  }
  closeList()
  return out.join('\n')
}

function StaticPageEditor({ page, onClose }: { page: StaticPage | null; onClose: () => void }) {
  const updatePage = useUpdateStaticPage(page?.id ?? '')
  const createPage = useCreateStaticPage()
  const [title, setTitle] = useState(page?.title ?? '')
  const [text, setText] = useState(page ? htmlToPlain(page.content) : '')
  const [error, setError] = useState<string | null>(null)
  const isPending = updatePage.isPending || createPage.isPending

  async function handleSave() {
    setError(null)
    if (!title.trim()) { setError('Le titre est requis'); return }
    if (!text.trim()) { setError('Le contenu est requis'); return }
    try {
      const content = plainToHtml(text)
      if (page) await updatePage.mutateAsync({ title: title.trim(), content })
      else await createPage.mutateAsync({ title: title.trim(), content })
      toast.success('Enregistré')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    }
  }

  return (
    <Modal
      open
      onOpenChange={(o) => { if (!o) onClose() }}
      title={page ? 'Modifier la page' : 'Nouvelle page d\'information'}
      description="Cette page sera visible dans l'application (Paramètres → Informations légales)."
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Annuler</Button>
          <Button onClick={handleSave} loading={isPending}>
            {page ? 'Enregistrer' : 'Publier la page'}
          </Button>
        </>
      }
    >
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">{error}</p>
      )}
      <div className="space-y-4">
        <FormField label="Titre de la page" htmlFor="static-page-title" required>
          <Input
            id="static-page-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex : Conditions générales de vente"
          />
        </FormField>
        <FormField label="Contenu" htmlFor="static-page-content" required>
          <div className="mb-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
            Écrivez simplement, une idée par ligne :
            commencez une ligne par <strong>##&nbsp;</strong> pour un titre de section,
            par <strong>-&nbsp;</strong> pour une puce. Le reste devient des paragraphes.
            Aucune connaissance technique nécessaire.
          </div>
          <Textarea
            id="static-page-content"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={16}
            placeholder={'## Objet\nLes présentes conditions régissent…\n\n## Vos droits\n- Droit de rétractation de 14 jours\n- Remboursement sous 30 jours'}
            className="leading-relaxed"
          />
        </FormField>
      </div>
    </Modal>
  )
}

export function StaticPagesTab() {
  const { data: pages, isLoading, isError } = useAdminStaticPages()
  const deletePage = useDeleteStaticPage()
  const [editingPage, setEditingPage] = useState<StaticPage | null>(null)
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<StaticPage | null>(null)

  if (isLoading) return <LoadingBlock label="Chargement des pages…" />
  if (isError) {
    return (
      <Card>
        <p className="text-sm text-red-600 dark:text-red-400">Erreur de chargement</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Pages d'information</CardTitle>
            <CardDescription>
              {pages?.length} pages d'information — visibles dans l'app (Paramètres)
            </CardDescription>
          </div>
          <Button size="sm" leftIcon={Plus} onClick={() => setCreating(true)}>
            Nouvelle page
          </Button>
        </CardHeader>
        <CardContent>
          {(pages ?? []).length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Aucune page d'information"
              description="Créez vos conditions générales, politique de confidentialité et mentions légales."
              action={
                <Button size="sm" leftIcon={Plus} onClick={() => setCreating(true)}>
                  Nouvelle page
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {(pages ?? []).map((page) => (
                <div key={page.id} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText className="h-4 w-4 flex-shrink-0 text-gray-400 dark:text-gray-500" />
                      <h3 className="truncate font-medium text-gray-900 dark:text-gray-100">{page.title}</h3>
                    </div>
                    <Badge variant={page.isActive ? 'success' : 'neutral'} size="sm" dot>
                      {page.isActive ? 'Publiée' : 'Brouillon'}
                    </Badge>
                  </div>
                  <p className="mb-3 text-xs text-gray-400 dark:text-gray-500">
                    Mise à jour : {new Date(page.updatedAt).toLocaleDateString('fr-FR')}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={Pencil}
                      className="flex-1"
                      onClick={() => setEditingPage(page)}
                    >
                      Modifier
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={Trash2}
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      onClick={() => setConfirmDelete(page)}
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {(editingPage || creating) && (
        <StaticPageEditor page={editingPage} onClose={() => { setEditingPage(null); setCreating(false) }} />
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(o) => { if (!o) setConfirmDelete(null) }}
        title={confirmDelete ? `Supprimer « ${confirmDelete.title} » ?` : 'Supprimer la page ?'}
        description="La page disparaîtra de l'application. Cette action est irréversible."
        confirmLabel="Supprimer"
        variant="danger"
        onConfirm={async () => {
          if (!confirmDelete) return
          try {
            await deletePage.mutateAsync(confirmDelete.id)
            toast.success('Page supprimée')
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression')
          }
        }}
      />
    </div>
  )
}
