import { useState } from 'react'
import { Home, Palette, Pencil, Store, Tag, Type } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  LoadingBlock,
  Switch,
} from '@/components/ui'
import { toast } from '@/lib/toast'
import { useAdminAppSettings, useUpdateAppSetting } from '../hooks/useAdminAppSettings'

// Clés texte simples (identité de la marque)
const TEXT_KEYS = ['app.name', 'app.tagline', 'app.footer', 'app.version', 'app.supportEmail', 'app.supportPhone']
// Clés couleur (type = 'color')
const COLOR_KEYS = ['theme.primaryColor', 'theme.secondaryColor']
// En-tête de l'app : nom stylisé à côté du logo (dégradé façon AliExpress)
const BRAND_COLOR_KEYS = ['brand.nameColor1', 'brand.nameColor2']
const BRAND_TOGGLE_KEY = 'brand.showName'
// Écran Boutique : affichage de la section « Recommandé pour vous »
const SHOP_RECO_KEY = 'shop.showRecommended'
// Badges et étiquettes visibles dans l'app mobile
const PROMO_KEYS = [
  'promo.dealLabel',
  'promo.bundleLabel',
  'promo.freeShip',
]
// Contenus page d'accueil
const HOME_KEYS = ['home.heroTitle', 'home.heroSubtitle']

export function BrandingTab() {
  const { data: settings, isLoading, isError } = useAdminAppSettings()
  const updateSetting = useUpdateAppSetting()
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  if (isLoading) return <LoadingBlock label="Chargement..." />
  if (isError) return <p className="text-sm text-red-600 dark:text-red-400">Erreur de chargement</p>

  const allSettings = settings ?? []
  const textSettings = allSettings.filter((s) => TEXT_KEYS.includes(s.key))
  const colorSettings = allSettings.filter((s) => COLOR_KEYS.includes(s.key))
  const brandColorSettings = allSettings.filter((s) => BRAND_COLOR_KEYS.includes(s.key))
  const brandToggle = allSettings.find((s) => s.key === BRAND_TOGGLE_KEY)
  const shopRecoToggle = allSettings.find((s) => s.key === SHOP_RECO_KEY)
  const appName = allSettings.find((s) => s.key === 'app.name')?.value ?? 'ExpressAfri'
  const nameColor1 = allSettings.find((s) => s.key === 'brand.nameColor1')?.value ?? '#FF6B35'
  const nameColor2 = allSettings.find((s) => s.key === 'brand.nameColor2')?.value ?? '#E8590C'
  const promoSettings = allSettings.filter((s) => PROMO_KEYS.includes(s.key))
  const homeSettings = allSettings.filter((s) => HOME_KEYS.includes(s.key))

  async function handleSave(key: string) {
    try {
      await updateSetting.mutateAsync({ key, value: editValue })
      setEditingKey(null)
      toast.success('Enregistré')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour')
    }
  }

  async function handleToggle(key: string, checked: boolean) {
    try {
      await updateSetting.mutateAsync({ key, value: String(checked) })
      toast.success('Enregistré')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour')
    }
  }

  function startEdit(setting: { key: string; value: string }) {
    setEditingKey(setting.key)
    setEditValue(setting.value)
  }

  /** Ligne d'édition réutilisable pour les champs texte.
   * Appelée comme fonction (pas <Component/>) : évite le remontage à chaque frappe → l'input garde le focus. */
  function renderTextRow(s: { key: string; value: string; label: string }) {
    return (
      <div key={s.key}>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {s.label}
          <span className="ml-2 font-mono text-xs text-gray-400 dark:text-gray-500">{s.key}</span>
        </label>
        {editingKey === s.key ? (
          <div className="flex gap-2">
            <Input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave(s.key)
                if (e.key === 'Escape') setEditingKey(null)
              }}
            />
            <Button onClick={() => handleSave(s.key)} loading={updateSetting.isPending}>
              Enregistrer
            </Button>
            <Button variant="outline" onClick={() => setEditingKey(null)}>
              Annuler
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-800/50">
            <span className="max-w-sm truncate text-sm text-gray-900 dark:text-gray-100">{s.value}</span>
            <Button variant="ghost" size="sm" leftIcon={Pencil} className="ml-3 flex-shrink-0" onClick={() => startEdit(s)}>
              Modifier
            </Button>
          </div>
        )}
      </div>
    )
  }

  /** Carte d'édition d'une couleur (aperçu + color picker + hex) — réutilisée thème & en-tête.
   * Appelée comme fonction (pas <ColorCard/>) : évite le remontage à chaque frappe → l'input garde le focus. */
  function renderColorCard(s: { key: string; value: string; label: string }) {
    return (
      <div key={s.key} className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {s.label}
        </label>
        <div className="flex items-center gap-3">
          {/* Aperçu couleur actuelle (valeur configurée par l'utilisateur) */}
          <div
            className="h-10 w-10 flex-shrink-0 rounded-lg border border-gray-300 shadow-sm dark:border-gray-700"
            style={{ backgroundColor: editingKey === s.key ? editValue : s.value }}
          />
          {editingKey === s.key ? (
            <div className="flex flex-1 flex-col gap-2">
              <div className="flex items-center gap-2">
                {/* Color picker natif */}
                <input
                  type="color"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="h-10 w-10 cursor-pointer rounded border border-gray-300 bg-white p-0.5 dark:border-gray-700 dark:bg-gray-800"
                />
                {/* Hex text input */}
                <Input
                  type="text"
                  value={editValue}
                  onChange={(e) => {
                    const v = e.target.value
                    if (/^#?[0-9A-Fa-f]{0,6}$/.test(v)) {
                      setEditValue(v.startsWith('#') ? v : '#' + v)
                    }
                  }}
                  className="flex-1 font-mono"
                  placeholder="#E8590C"
                  maxLength={7}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave(s.key)
                    if (e.key === 'Escape') setEditingKey(null)
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleSave(s.key)} loading={updateSetting.isPending}>
                  Enregistrer
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingKey(null)}>
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-between">
              <span className="font-mono text-sm text-gray-700 dark:text-gray-300">{s.value}</span>
              <Button variant="ghost" size="sm" leftIcon={Pencil} onClick={() => startEdit(s)}>
                Modifier
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Couleurs du thème ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              Couleurs du thème
            </CardTitle>
            <CardDescription>
              Ces couleurs s'appliquent immédiatement dans l'application mobile dès la prochaine ouverture ou lors d'un retour en premier plan.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {colorSettings.map((s) => renderColorCard(s))}
          </div>
          {colorSettings.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Aucun paramètre de couleur trouvé. Assurez-vous que le seed a bien été exécuté.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Nom dans l'en-tête (façon AliExpress) ─────────────────────── */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <Type className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              Nom dans l'en-tête
            </CardTitle>
            <CardDescription>
              Le nom de l'application s'affiche à côté du logo dans l'en-tête de l'app mobile, avec un dégradé de couleurs.
              Le nom lui-même se modifie dans « Identité de la marque » (app.name), le logo dans l'onglet <strong>Logos</strong> (contexte Header).
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {/* Aperçu en direct */}
          <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/50">
            <p className="mb-1 text-xs text-gray-400 dark:text-gray-500">Aperçu</p>
            <span
              className="text-2xl font-extrabold"
              style={{
                background: `linear-gradient(90deg, ${editingKey === 'brand.nameColor1' ? editValue : nameColor1}, ${editingKey === 'brand.nameColor2' ? editValue : nameColor2})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {appName}
            </span>
          </div>

          {brandToggle && (
            <div className="mb-4">
              <Switch
                checked={brandToggle.value === 'true'}
                onCheckedChange={(checked) => handleToggle(BRAND_TOGGLE_KEY, checked)}
                label="Afficher le nom à côté du logo"
                disabled={updateSetting.isPending}
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {brandColorSettings.map((s) => renderColorCard(s))}
          </div>
          {brandColorSettings.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Paramètres brand.* introuvables. Exécutez la migration :{' '}
              <code className="font-mono">npx tsx src/migrate-brand-settings.ts</code> dans apps/api.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Écran Boutique ────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              Écran Boutique
            </CardTitle>
            <CardDescription>
              La section « Recommandé pour vous » affiche le reste du catalogue sous les produits
              de la catégorie sélectionnée. Désactivez pour la masquer dans l'application mobile.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {shopRecoToggle ? (
            <Switch
              checked={shopRecoToggle.value === 'true'}
              onCheckedChange={(checked) => handleToggle(SHOP_RECO_KEY, checked)}
              label="Afficher « Recommandé pour vous »"
              disabled={updateSetting.isPending}
            />
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Paramètre shop.showRecommended introuvable. Exécutez la migration :{' '}
              <code className="font-mono">npx tsx src/migrate-shop-settings.ts</code> dans apps/api.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Identité de la marque ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Identité de la marque</CardTitle>
            <CardDescription>
              Ces textes s'affichent dans l'application mobile et les communications.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {textSettings.map((s) => renderTextRow(s))}
            {textSettings.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Aucun paramètre trouvé. Assurez-vous que le seed a bien été exécuté.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Badges et étiquettes ──────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              Badges et étiquettes
            </CardTitle>
            <CardDescription>
              Ces textes apparaissent dans les badges et étiquettes de l'application mobile (Deal du jour, Offres groupées, Livraison gratuite).
              Pour les bandeaux visuels, utilisez l'onglet <strong>Bannières</strong>.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {promoSettings.map((s) => renderTextRow(s))}
            {promoSettings.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Aucun paramètre trouvé. Assurez-vous que le seed a bien été exécuté.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Contenus page d'accueil ──────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              Contenus page d'accueil
            </CardTitle>
            <CardDescription>
              Titre et sous-titre affichés sur la page d'accueil de l'application mobile.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {homeSettings.map((s) => renderTextRow(s))}
            {homeSettings.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Aucun paramètre home trouvé. Assurez-vous que le seed a bien été exécuté.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
