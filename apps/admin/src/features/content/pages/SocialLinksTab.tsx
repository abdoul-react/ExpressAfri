import { useState } from 'react'
import {
  AtSign,
  Briefcase,
  Camera,
  Link2,
  MessageCircle,
  Music2,
  Pencil,
  Play,
  Send,
  ThumbsUp,
  type LucideIcon,
} from 'lucide-react'
import {
  Button,
  Card,
  FormField,
  Input,
  LoadingBlock,
  Modal,
  Switch,
} from '@/components/ui'
import { toast } from '@/lib/toast'
import { useAdminSocialLinks, useUpdateSocialLink } from '../hooks/useAdminSocialLinks'

const PLATFORM_ICONS: Record<string, LucideIcon> = {
  facebook: ThumbsUp,
  instagram: Camera,
  twitter: AtSign,
  tiktok: Music2,
  youtube: Play,
  whatsapp: MessageCircle,
  telegram: Send,
  linkedin: Briefcase,
}

interface EditingLink {
  platform: string
  url: string
  label: string
}

export function SocialLinksTab() {
  const { data: links, isLoading, isError } = useAdminSocialLinks()
  const updateLink = useUpdateSocialLink()
  const [editingLink, setEditingLink] = useState<EditingLink | null>(null)
  const [editUrl, setEditUrl] = useState('')
  const [editLabel, setEditLabel] = useState('')

  if (isLoading) return <LoadingBlock label="Chargement..." />
  if (isError) return <p className="text-sm text-red-600 dark:text-red-400">Erreur de chargement</p>

  async function handleSave() {
    if (!editingLink) return
    try {
      await updateLink.mutateAsync({ platform: editingLink.platform, data: { url: editUrl, label: editLabel } })
      setEditingLink(null)
      toast.success('Enregistré')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour')
    }
  }

  async function handleToggle(platform: string, isActive: boolean) {
    try {
      await updateLink.mutateAsync({ platform, data: { isActive } })
      toast.success('Enregistré')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour')
    }
  }

  function openEditor(link: EditingLink) {
    setEditingLink(link)
    setEditUrl(link.url)
    setEditLabel(link.label)
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        {(links ?? []).map((link) => {
          const Icon = PLATFORM_ICONS[link.platform] ?? Link2
          return (
            <Card key={link.platform} padding="sm" className={link.isActive ? '' : 'opacity-60'}>
              <div className="flex items-center justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{link.label}</h3>
                    <p className="max-w-[280px] truncate font-mono text-xs text-gray-500 dark:text-gray-400">{link.url}</p>
                  </div>
                </div>
                <div className="ml-4 flex flex-shrink-0 items-center gap-3">
                  <Switch
                    checked={link.isActive}
                    onCheckedChange={(checked) => handleToggle(link.platform, checked)}
                    disabled={updateLink.isPending}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={Pencil}
                    onClick={() => openEditor(link)}
                  >
                    Modifier
                  </Button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <Modal
        open={editingLink !== null}
        onOpenChange={(open) => { if (!open) setEditingLink(null) }}
        title="Modifier le lien"
        description={editingLink ? `Plateforme : ${editingLink.platform}` : undefined}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditingLink(null)}>
              Annuler
            </Button>
            <Button onClick={handleSave} loading={updateLink.isPending}>
              Enregistrer
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Label" htmlFor="social-label">
            <Input
              id="social-label"
              type="text"
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              autoFocus
            />
          </FormField>
          <FormField label="URL" htmlFor="social-url">
            <Input
              id="social-url"
              type="text"
              value={editUrl}
              onChange={(e) => setEditUrl(e.target.value)}
              className="font-mono"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
                if (e.key === 'Escape') setEditingLink(null)
              }}
            />
          </FormField>
        </div>
      </Modal>
    </div>
  )
}
