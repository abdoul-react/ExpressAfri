import { useState } from 'react'
import { Globe, Pencil } from 'lucide-react'
import { useAdminSEOMetadata, useUpdateSEOMetadata } from '../hooks/useAdminSEOMetadata'
import {
  Button, Card, CardContent, CardHeader, CardTitle,
  FormField, Input, LoadingBlock, Modal, Textarea,
} from '@/components/ui'
import { toast } from '@/lib/toast'

const PAGE_LABELS: Record<string, string> = {
  home: 'Accueil', store: 'Boutique', feed: 'Feed',
  cart: 'Panier', account: 'Compte', search: 'Recherche',
}

interface SEOPage {
  page: string
  title: string
  description: string
  keywords: string
  ogImage?: string
}

export function SEOTab() {
  const { data: pages, isLoading, isError } = useAdminSEOMetadata()
  const [editingPage, setEditingPage] = useState<string | null>(null)

  if (isLoading) return <LoadingBlock label="Chargement du SEO…" />
  if (isError) {
    return (
      <Card>
        <p className="text-sm text-red-600 dark:text-red-400">Erreur de chargement</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {(pages ?? []).map((page) => (
        <SEOEditor
          key={page.page}
          page={page}
          isEditing={editingPage === page.page}
          onStartEdit={() => setEditingPage(page.page)}
          onClose={() => setEditingPage(null)}
        />
      ))}
    </div>
  )
}

function SEOEditor({
  page, isEditing, onStartEdit, onClose,
}: {
  page: SEOPage
  isEditing: boolean
  onStartEdit: () => void
  onClose: () => void
}) {
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            <CardTitle>{PAGE_LABELS[page.page] ?? page.page}</CardTitle>
          </div>
          <Button variant="ghost" size="sm" leftIcon={Pencil} onClick={onStartEdit}>
            Modifier
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-400 dark:text-gray-500">Titre : </span>
              <span className="text-gray-700 dark:text-gray-300">{page.title}</span>
            </div>
            <div>
              <span className="text-gray-400 dark:text-gray-500">Description : </span>
              <span className="line-clamp-2 text-gray-700 dark:text-gray-300">{page.description}</span>
            </div>
            <div>
              <span className="text-gray-400 dark:text-gray-500">Mots-clés : </span>
              <span className="text-gray-700 dark:text-gray-300">{page.keywords}</span>
            </div>
            {page.ogImage && (
              <div>
                <span className="text-gray-400 dark:text-gray-500">OG Image : </span>
                <span className="font-mono text-xs text-gray-700 dark:text-gray-300">{page.ogImage}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {isEditing && <SEOEditModal page={page} onClose={onClose} />}
    </>
  )
}

function SEOEditModal({ page, onClose }: { page: SEOPage; onClose: () => void }) {
  const updateSEO = useUpdateSEOMetadata(page.page)
  const [title, setTitle] = useState(page.title)
  const [description, setDescription] = useState(page.description)
  const [keywords, setKeywords] = useState(page.keywords)
  const [ogImage, setOgImage] = useState(page.ogImage ?? '')

  async function handleSave() {
    try {
      await updateSEO.mutateAsync({
        title: title.trim(), description: description.trim(),
        keywords: keywords.trim(), ogImage: ogImage.trim() || undefined,
      })
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
      title={`SEO — ${PAGE_LABELS[page.page] ?? page.page}`}
      description="Métadonnées utilisées par les moteurs de recherche et les réseaux sociaux."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={updateSEO.isPending}>Annuler</Button>
          <Button onClick={handleSave} loading={updateSEO.isPending}>Enregistrer</Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Titre SEO" htmlFor="seo-title">
          <Input id="seo-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </FormField>
        <FormField label="Description" htmlFor="seo-description">
          <Textarea
            id="seo-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </FormField>
        <FormField label="Mots-clés" htmlFor="seo-keywords" hint="Séparez les mots-clés par des virgules.">
          <Input id="seo-keywords" value={keywords} onChange={(e) => setKeywords(e.target.value)} />
        </FormField>
        <FormField label="Image OG (URL)" htmlFor="seo-og-image">
          <Input
            id="seo-og-image"
            value={ogImage}
            onChange={(e) => setOgImage(e.target.value)}
            className="font-mono"
          />
        </FormField>
      </div>
    </Modal>
  )
}
