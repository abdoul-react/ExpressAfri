import { useState, useEffect, useMemo } from 'react'
import { Eye, Info, Save } from 'lucide-react'
import { useAdminReceiptSettings, useUpdateReceiptSettings } from '../hooks/useAdminReceipts'
import { generateReceiptHTML } from '../lib/receipt-html'
import { PermissionGuard } from '@/components/guards/PermissionGuard'
import {
  PageHeader, Card, CardHeader, CardTitle, CardContent, Button, FormField, Input, Textarea, Select, Switch, LoadingBlock, Modal,
} from '@/components/ui'
import { toast } from '@/lib/toast'

export function AdminReceiptSettingsPage() {
  const { data: settings, isLoading } = useAdminReceiptSettings()
  const updateSettings = useUpdateReceiptSettings()

  const [autoSend, setAutoSend] = useState(true)
  const [defaultType, setDefaultType] = useState<'email' | 'sms'>('email')
  const [prefix, setPrefix] = useState('REC-')
  const [footerText, setFooterText] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailTemplate, setEmailTemplate] = useState('')
  const [brandName, setBrandName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [showBarcode, setShowBarcode] = useState(false)
  const [accentColor, setAccentColor] = useState('#f97316')
  const [previewOpen, setPreviewOpen] = useState(false)

  const previewHtml = useMemo(() => generateReceiptHTML({
    orderNumber: 'EXP-20260723-ABCD',
    customerName: 'Jean Dupont',
    customerEmail: 'client@example.com',
    customerPhone: '+237 6 00 00 00 00',
    amount: 25000,
    currency: 'XAF',
    accentColor,
    brandName,
    logoUrl,
    footerText,
    showBarcode,
  }), [accentColor, brandName, logoUrl, footerText, showBarcode])

  useEffect(() => {
    if (settings) {
      setAutoSend(settings.autoSend)
      setDefaultType(settings.defaultType)
      setPrefix(settings.prefix)
      setFooterText(settings.footerText)
      setEmailSubject(settings.emailSubject)
      setEmailTemplate(settings.emailTemplate)
      setBrandName(settings.brandName ?? '')
      setLogoUrl(settings.logoUrl ?? '')
      setShowBarcode(settings.showBarcode ?? false)
      setAccentColor(settings.accentColor ?? '#f97316')
    }
  }, [settings])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    try {
      await updateSettings.mutateAsync({
        autoSend, defaultType, prefix, footerText, emailSubject, emailTemplate,
        brandName, logoUrl, showBarcode, accentColor,
      })
      toast.success('Paramètres enregistrés')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement")
    }
  }

  if (isLoading) return <LoadingBlock label="Chargement des paramètres…" />

  return (
    <div>
      <PageHeader
        backHref="/receipts"
        breadcrumbs={[{ label: 'Reçus', href: '/receipts' }, { label: 'Paramètres' }]}
        title="Paramètres des reçus"
        description="Configurez les reçus envoyés aux clients"
        actions={
          <Button variant="outline" leftIcon={Eye} onClick={() => setPreviewOpen(true)}>
            Aperçu en direct
          </Button>
        }
      />

      <form onSubmit={handleSave} className="max-w-3xl space-y-6">
        <Card>
          <CardHeader><CardTitle>Identité visuelle</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <FormField label="Nom de la boutique" htmlFor="receipt-brand-name" hint="Affiché en en-tête du reçu à la place de « ExpressAfri »">
              <Input id="receipt-brand-name" value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="ExpressAfri" className="w-full" />
            </FormField>
            <FormField label="URL du logo" htmlFor="receipt-logo-url" hint="URL publique d'une image PNG/SVG (recommandé : 200×60 px)">
              <Input id="receipt-logo-url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://example.com/logo.png" className="w-full" />
            </FormField>
            {logoUrl && (
              <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                <img src={logoUrl} alt="Aperçu logo" className="h-10 max-w-[160px] object-contain" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                <span className="text-xs text-gray-500 dark:text-gray-400">Aperçu du logo</span>
              </div>
            )}
            <FormField label="Couleur principale" htmlFor="receipt-accent-color" hint="Couleur de l'en-tête et des montants sur le reçu">
              <div className="flex items-center gap-3">
                <input type="color" id="receipt-accent-color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="h-9 w-14 cursor-pointer rounded border border-gray-300 p-0.5 dark:border-gray-600" />
                <Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} placeholder="#f97316" className="w-32 font-mono text-sm" />
              </div>
            </FormField>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Afficher un code-barres</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Ajoute un code-barres du numéro de commande en bas du reçu</p>
              </div>
              <Switch checked={showBarcode} onCheckedChange={setShowBarcode} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Général</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Envoi automatique</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Envoyer automatiquement un reçu après chaque commande</p>
              </div>
              <Switch checked={autoSend} onCheckedChange={setAutoSend} />
            </div>
            <FormField label="Type par défaut" htmlFor="receipt-default-type">
              <Select id="receipt-default-type" value={defaultType} onChange={(v) => setDefaultType(v as 'email' | 'sms')}
                options={[{ value: 'email', label: 'Email' }, { value: 'sms', label: 'SMS' }]} className="w-full" />
            </FormField>
            <FormField label="Préfixe du reçu" htmlFor="receipt-prefix">
              <Input id="receipt-prefix" value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="REC-" className="w-full" />
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Pied de page</CardTitle></CardHeader>
          <CardContent>
            <FormField label="Texte du pied de page" htmlFor="receipt-footer">
              <Textarea id="receipt-footer" value={footerText} onChange={(e) => setFooterText(e.target.value)} rows={3}
                placeholder="Merci pour votre confiance !" className="w-full" />
            </FormField>
          </CardContent>
        </Card>

        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-medium">Livraison des reçus</p>
            <p className="mt-1">Les reçus sont envoyés automatiquement dans la boîte de réception du client (messagerie
              interne) lorsque la commande est marquée comme livrée et que l'envoi automatique est activé ci-dessus.
              Le client reçoit le reçu au format PDF directement dans sa conversation.</p>
          </div>
        </div>

        <PermissionGuard permission="payments.update">
          <Button type="submit" leftIcon={Save} loading={updateSettings.isPending}>Enregistrer</Button>
        </PermissionGuard>
      </form>

      <Modal
        open={previewOpen}
        onOpenChange={(open) => { if (!open) setPreviewOpen(false) }}
        title="Aperçu du reçu"
        size="lg"
        footer={
          <Button variant="outline" onClick={() => setPreviewOpen(false)}>Fermer</Button>
        }
      >
        <div className="-mx-6 -my-5 overflow-hidden bg-gray-100 dark:bg-gray-800">
          <iframe
            srcDoc={previewHtml}
            title="Aperçu reçu"
            className="h-full w-full border-0"
            style={{ minHeight: '500px' }}
            sandbox="allow-same-origin"
          />
        </div>
      </Modal>
    </div>
  )
}
