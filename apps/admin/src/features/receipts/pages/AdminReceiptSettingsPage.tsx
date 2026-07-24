import { useState, useEffect, useMemo } from 'react'
import { Info, Save, Upload } from 'lucide-react'
import { useAdminReceiptSettings, useUpdateReceiptSettings } from '../hooks/useAdminReceipts'
import { generateReceiptHTML } from '../lib/receipt-html'
import { PermissionGuard } from '@/components/guards/PermissionGuard'
import {
  PageHeader, Card, CardHeader, CardTitle, CardContent, Button, FormField, Input, Textarea, Select, Switch, LoadingBlock,
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

  const previewHtml = useMemo(() => generateReceiptHTML({
    orderNumber: `${prefix || 'REC-'}2026-0042`,
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
  }), [accentColor, brandName, logoUrl, footerText, showBarcode, prefix])

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

  const nextReceiptNumber = `${prefix || 'REC-'}${new Date().getFullYear()}-${String(settings?.nextNumber ?? 1).padStart(4, '0')}`

  return (
    <div>
      <PageHeader
        backHref="/receipts"
        breadcrumbs={[{ label: 'Reçus', href: '/receipts' }, { label: 'Paramètres' }]}
        title="Paramètres des reçus"
        description="Personnalisez l'apparence et le comportement des reçus envoyés aux clients"
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_420px] xl:grid-cols-[1fr_480px]">
        {/* ── Colonne gauche : formulaire ── */}
        <form onSubmit={handleSave} className="space-y-6">

          {/* Identité visuelle */}
          <Card>
            <CardHeader>
              <CardTitle>Identité visuelle</CardTitle>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Ces informations apparaissent en haut de chaque reçu.</p>
            </CardHeader>
            <CardContent className="space-y-5">
              <FormField
                label="Nom affiché sur le reçu"
                htmlFor="receipt-brand-name"
                hint="Remplace « ExpressAfri » dans l'en-tête du reçu"
              >
                <Input
                  id="receipt-brand-name"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="ExpressAfri"
                  className="w-full"
                />
              </FormField>

              <FormField
                label="Logo (URL publique)"
                htmlFor="receipt-logo-url"
                hint="Copiez l'adresse d'une image PNG ou SVG déjà hébergée (ex. sur votre site)"
              >
                <div className="flex gap-2">
                  <Input
                    id="receipt-logo-url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://votresite.com/logo.png"
                    className="flex-1"
                  />
                  {logoUrl && (
                    <button
                      type="button"
                      title="Effacer le logo"
                      onClick={() => setLogoUrl('')}
                      className="flex-shrink-0 rounded border border-gray-200 px-2 text-gray-400 hover:text-red-500 dark:border-gray-700"
                    >
                      ×
                    </button>
                  )}
                </div>
                {logoUrl && (
                  <div className="mt-2 flex items-center gap-3 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                    <img src={logoUrl} alt="Aperçu logo" className="h-10 max-w-[160px] object-contain" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                    <span className="text-xs text-gray-500 dark:text-gray-400">Aperçu du logo</span>
                  </div>
                )}
              </FormField>

              <FormField
                label="Couleur principale"
                htmlFor="receipt-accent-color"
                hint="Utilisée pour l'en-tête, les totaux et les séparateurs du reçu"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    id="receipt-accent-color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="h-9 w-14 cursor-pointer rounded border border-gray-300 p-0.5 dark:border-gray-600"
                  />
                  <Input
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    placeholder="#f97316"
                    className="w-32 font-mono text-sm"
                  />
                  <div className="h-9 w-9 flex-shrink-0 rounded-lg border border-gray-200 dark:border-gray-700" style={{ backgroundColor: accentColor }} />
                </div>
              </FormField>

              <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Afficher un code-barres</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Ajoute un code-barres du numéro de commande en bas du reçu</p>
                </div>
                <Switch checked={showBarcode} onCheckedChange={setShowBarcode} />
              </div>
            </CardContent>
          </Card>

          {/* Numérotation */}
          <Card>
            <CardHeader>
              <CardTitle>Numérotation des reçus</CardTitle>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Chaque reçu reçoit un numéro unique et incrémental.</p>
            </CardHeader>
            <CardContent className="space-y-5">
              <FormField
                label="Préfixe"
                htmlFor="receipt-prefix"
                hint={`Le prochain reçu sera numéroté : ${nextReceiptNumber}`}
              >
                <Input
                  id="receipt-prefix"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  placeholder="REC-"
                  className="w-48 font-mono"
                />
              </FormField>
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 dark:border-blue-800/40 dark:bg-blue-900/20">
                <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Prochain numéro de reçu</p>
                <p className="mt-1 font-mono text-lg font-bold text-blue-900 dark:text-blue-100">{nextReceiptNumber}</p>
                <p className="mt-0.5 text-xs text-blue-600 dark:text-blue-400">Le compteur s'incrémente automatiquement à chaque reçu émis.</p>
              </div>
            </CardContent>
          </Card>

          {/* Envoi */}
          <Card>
            <CardHeader>
              <CardTitle>Envoi automatique</CardTitle>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Configurez quand et comment les reçus sont transmis aux clients.</p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Envoi automatique à la livraison</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Le reçu est envoyé dès qu'une commande passe au statut « Livré »</p>
                </div>
                <Switch checked={autoSend} onCheckedChange={setAutoSend} />
              </div>

              <FormField label="Canal d'envoi par défaut" htmlFor="receipt-default-type">
                <Select
                  id="receipt-default-type"
                  value={defaultType}
                  onChange={(v) => setDefaultType(v as 'email' | 'sms')}
                  options={[
                    { value: 'email', label: 'Email — Message interne dans l\'application' },
                    { value: 'sms', label: 'SMS — Lien vers le reçu PDF (si configuré)' },
                  ]}
                  className="w-full"
                />
              </FormField>
            </CardContent>
          </Card>

          {/* Pied de page */}
          <Card>
            <CardHeader>
              <CardTitle>Pied de page</CardTitle>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Texte affiché en bas de chaque reçu (message de remerciement, mentions légales…).</p>
            </CardHeader>
            <CardContent>
              <Textarea
                id="receipt-footer"
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                rows={3}
                placeholder="Merci pour votre confiance ! Pour toute question : support@expressafri.com"
                className="w-full"
              />
            </CardContent>
          </Card>

          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>Ces paramètres s'appliquent à tous les reçus de votre plateforme. Vous pouvez également envoyer un reçu manuellement depuis la liste des reçus.</p>
          </div>

          <PermissionGuard permission="payments.update">
            <Button type="submit" leftIcon={Save} loading={updateSettings.isPending}>
              Enregistrer les modifications
            </Button>
          </PermissionGuard>
        </form>

        {/* ── Colonne droite : aperçu live ── */}
        <div className="hidden lg:block">
          <div className="sticky top-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Aperçu en temps réel</p>
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                Live
              </span>
            </div>
            <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm dark:border-gray-700">
              <div className="flex items-center gap-1.5 border-b border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                <span className="ml-2 flex-1 rounded bg-gray-200 px-2 py-0.5 text-center text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                  Aperçu reçu client
                </span>
              </div>
              <iframe
                key={previewHtml.length}
                srcDoc={previewHtml}
                title="Aperçu reçu"
                className="h-[640px] w-full border-0 bg-white"
                sandbox="allow-same-origin"
              />
            </div>
            <p className="mt-2 text-center text-xs text-gray-400 dark:text-gray-500">
              Mis à jour à chaque modification
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
