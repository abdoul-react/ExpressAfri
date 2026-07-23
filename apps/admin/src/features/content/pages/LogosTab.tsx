import { useState, useRef } from 'react'
import { Image, Link2, Upload } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  FormField,
  Input,
  LoadingBlock,
  Modal,
} from '@/components/ui'
import { toast } from '@/lib/toast'
import { useAdminLogos, useUpdateLogo, useUploadLogo } from '../hooks/useAdminLogos'
import { resolveAdminMediaUrl } from '@/lib/resolveAdminMediaUrl'

const CONTEXT_LABELS: Record<string, string> = {
  splash: 'Écran splash', 'tab-bar': 'Barre de navigation', login: 'Page connexion',
  header: 'Header (horizontal)', favicon: 'Favicon',
  email: 'Emails transactionnels', notification: 'Notifications push',
}

interface EditingLogo {
  id: string
  label: string
  url: string
}

export function LogosTab() {
  const { data: logos, isLoading, isError } = useAdminLogos()
  const updateLogo = useUpdateLogo()
  const uploadLogo = useUploadLogo()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [editingLogo, setEditingLogo] = useState<EditingLogo | null>(null)
  const [editUrl, setEditUrl] = useState('')

  if (isLoading) return <LoadingBlock label="Chargement..." />
  if (isError) return <p className="text-sm text-red-600 dark:text-red-400">Erreur de chargement</p>

  async function handleSave() {
    if (!editingLogo) return
    try {
      await updateLogo.mutateAsync({ id: editingLogo.id, url: editUrl })
      setEditingLogo(null)
      toast.success('Enregistré')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour')
    }
  }

  async function handleFileUpload(id: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await uploadLogo.mutateAsync({ id, file })
      toast.success('Logo uploadé avec succès')
    } catch (err) {
      const data = (err as any)?.response?.data
      const detail = data?.message || data?.error || (err as any)?.message || 'Erreur inconnue'
      console.error('Upload error:', err)
      toast.error(detail)
    }
    setUploadingId(null)
    e.target.value = ''
  }

  function openUrlEditor(logo: EditingLogo) {
    setEditingLogo(logo)
    setEditUrl(logo.url)
  }

  return (
    <div className="space-y-6">
      <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/x-icon"
        ref={fileInputRef} className="hidden"
        onChange={(e) => { const id = uploadingId; if (id) handleFileUpload(id, e) }} />

      <div className="grid gap-6 md:grid-cols-2">
        {(logos ?? []).map((logo) => (
          <Card key={logo.id} padding="sm">
            <CardHeader className="mb-3">
              <div>
                <CardTitle className="text-sm">{logo.label}</CardTitle>
                <p className="mt-0.5 font-mono text-xs text-gray-500 dark:text-gray-400">
                  {CONTEXT_LABELS[logo.context] ?? logo.context}
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex min-h-[100px] items-center justify-center rounded-lg bg-gray-50 p-4 dark:bg-gray-800/50">
                {logo.url
                  ? (
                    <img src={resolveAdminMediaUrl(logo.url)} alt={logo.label} className="max-h-24 max-w-full object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  )
                  : (
                    <span className="flex items-center gap-2 text-xs italic text-gray-400 dark:text-gray-500">
                      <Image className="h-4 w-4" />
                      Aucun logo — utilisez « Upload »
                    </span>
                  )
                }
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  leftIcon={Link2}
                  className="flex-1"
                  onClick={() => openUrlEditor(logo)}
                >
                  URL
                </Button>
                <Button
                  leftIcon={Upload}
                  className="flex-1"
                  loading={uploadLogo.isPending && uploadingId === logo.id}
                  disabled={uploadLogo.isPending}
                  onClick={() => { setUploadingId(logo.id); fileInputRef.current?.click() }}
                >
                  Upload
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Modal
        open={editingLogo !== null}
        onOpenChange={(open) => { if (!open) setEditingLogo(null) }}
        title="Modifier l'URL du logo"
        description={editingLogo ? `${editingLogo.label} — saisissez l'URL de l'image à utiliser.` : undefined}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditingLogo(null)}>
              Annuler
            </Button>
            <Button onClick={handleSave} loading={updateLogo.isPending}>
              Enregistrer
            </Button>
          </>
        }
      >
        <FormField label="URL de l'image" htmlFor="logo-url">
          <Input
            id="logo-url"
            type="text"
            value={editUrl}
            onChange={(e) => setEditUrl(e.target.value)}
            className="font-mono"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') setEditingLogo(null)
            }}
          />
        </FormField>
      </Modal>
    </div>
  )
}
