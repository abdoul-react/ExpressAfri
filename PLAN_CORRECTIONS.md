# PLAN DE CORRECTIONS — ExpressAfri
> Rédigé le 18 juillet 2026 · Basé sur l'audit complet de l'architecture (backend, admin, mobile)

---

## Résumé de l'état actuel

| Couche | État global |
|--------|-------------|
| Backend NestJS | ✅ Solide — 28 modules, tous enregistrés, DB Drizzle bien schématisée |
| Panel Admin React | ✅ Bien avancé — tous les datasources branchés sur l'API réelle |
| App Mobile Expo | ⚠️ Partiellement connectée — plusieurs points encore sur des données mock |

---

## Table des matières

1. [Messagerie mobile — données mock](#1-messagerie-mobile--données-mock)
2. [Paiement mobile — méthodes hardcodées](#2-paiement-mobile--méthodes-hardcodées)
3. [Messagerie mobile ↔ Admin — pont manquant](#3-messagerie-mobile--admin--pont-manquant)
4. [Recherche — historique et tendances mockés](#4-recherche--historique-et-tendances-mockés)
5. [Accueil — sections feed non dynamiques](#5-accueil--sections-feed-non-dynamiques)
6. [Raccourcis accueil — données statiques](#6-raccourcis-accueil--données-statiques)
7. [TopNavbar admin — badge notifications absent](#7-topnavbar-admin--badge-notifications-absent)
8. [OTP — stockage en mémoire non persistant](#8-otp--stockage-en-mémoire-non-persistant)
9. [URL API — localhost inutilisable sur device physique](#9-url-api--localhost-inutilisable-sur-device-physique)
10. [ProductCard — ratio image et dimensions](#10-productcard--ratio-image-et-dimensions)
11. [Pont Chat mobile → Tickets admin](#11-pont-chat-mobile--tickets-admin)
12. [Suggestions de personnes — données statiques](#12-suggestions-de-personnes--données-statiques)

---

## 1. Messagerie mobile — données mock

### Problème
Le hook `useConversations` (et `useConversation`) dans `src/features/messages/useMessages.ts` appelle `messagingService.getConversations()`, lequel est défini dans `messagingService.ts` et retourne **7 conversations entièrement hardcodées** (GoGo Match, Merge Boss, TechStore SN, etc.). C'est ce que l'utilisateur voit quand il clique sur la messagerie.

L'infrastructure réelle existe déjà et est complète :
- `src/features/messages/chatService.ts` — service asynchrone prêt
- `src/infrastructure/data-source/api/ApiChatDataSource.ts` — appelle `/chat/conversations`
- `apps/api/src/modules/chat/chat.controller.ts` — endpoints GET/POST/PUT
- `apps/api/src/modules/chat/chat.service.ts` — logique DB complète

Il suffit de rebrancher le hook sur le bon service.

### Solution

**Fichier à modifier : `src/features/messages/useMessages.ts`**

```ts
// AVANT
import { messagingService } from "./messagingService";

export function useConversations() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => messagingService.getConversations(),
  });
  return { conversations: data, isLoading };
}

export function useConversation(id: string) {
  const { data, isLoading } = useQuery({
    queryKey: ["conversation", id],
    queryFn: () => messagingService.getConversationById(id),
    enabled: !!id,
  });
  return { conversation: data, isLoading };
}
```

```ts
// APRÈS
import { chatService } from "./chatService";

export function useConversations() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => chatService.getConversations(),
  });
  return { conversations: data, isLoading };
}

export function useConversation(id: string) {
  const { data, isLoading } = useQuery({
    queryKey: ["conversation", id],
    queryFn: () => chatService.getConversation(id),
    enabled: !!id,
  });
  return { conversation: data, isLoading };
}
```

**Fichier à modifier : `src/features/messages/index.ts`**

S'assurer que `chatService` est aussi exporté si nécessaire, et retirer l'export de `messagingService` des exports publics (ce fichier peut rester en archive).

### Résultat attendu
Les conversations affichées dans l'app mobile viennent de la table `conversations` en base de données. Un message envoyé par un client est stocké en DB et récupérable en temps réel.

---

## 2. Paiement mobile — méthodes hardcodées

### Problème
L'endpoint `GET /mobile/payment/methods` dans `apps/api/src/modules/mobile/mobile.service.ts` retourne une liste **statique codée en dur** :

```ts
async getPaymentMethods() {
  return [
    { id: 'mobileMoney', icon: 'cellphone', labelKey: 'payment.mobileMoney', ... },
    { id: 'card', icon: 'creditCard', labelKey: 'payment.card', ... },
    { id: 'cod', icon: 'cash', labelKey: 'payment.cod', ... },
    { id: 'wallet', icon: 'wallet', labelKey: 'payment.wallet', ... },
  ]
}
```

Pourtant la table `payment_methods` existe dans le schéma DB (`apps/api/src/database/schema/content-cms.ts`), est complètement définie (avec `isActive`, `position`, `type`, `name`, `description`, etc.) et est **entièrement gérée par l'admin CMS** via `ContentService.listPaymentMethods()`. Ce que l'admin configure n'a aucun impact sur ce que l'app mobile affiche. C'est la cause du message "impossible de charger les options" si la liste est vide et que la DB n'a pas été seedée.

### Solution

**Fichier à modifier : `apps/api/src/modules/mobile/mobile.service.ts`**

Ajouter l'import de la table et remplacer la méthode :

```ts
// Ajouter dans les imports existants (déjà présents en haut du fichier) :
import { paymentMethods } from '../../database/schema/content-cms'

// Remplacer getPaymentMethods() :
async getPaymentMethods() {
  const rows = await this.db
    .select()
    .from(paymentMethods)
    .where(eq(paymentMethods.isActive, true))
    .orderBy(paymentMethods.position)

  return rows.map((m) => ({
    id: m.code,
    icon: this.paymentIcon(m.type),
    labelKey: m.name,
    hintKey: m.description ?? '',
    logoUrl: m.logoUrl,
  }))
}

// Ajouter la méthode helper privée :
private paymentIcon(type: string): string {
  const map: Record<string, string> = {
    'mobile-money': 'cellphone',
    'card': 'creditCard',
    'cod': 'cash',
    'wallet': 'wallet',
  }
  return map[type] ?? 'creditCard'
}
```

**Fichier à modifier : `apps/api/src/modules/mobile/mobile.module.ts`**

Vérifier que `paymentMethods` est bien importable (il l'est via `content-cms` déjà importé dans le service).

**Action requise dans l'admin CMS :**
S'assurer qu'au moins une méthode de paiement est créée et active via le panel Admin → CMS → Méthodes de paiement. Sinon l'app affiche une liste vide. Ajouter un seed si nécessaire.

### Résultat attendu
Ce que l'administrateur configure dans le CMS (activer/désactiver Wave, Orange Money, carte, etc.) se reflète immédiatement dans l'app mobile sans redeploiement.

---


## 3. Messagerie mobile ↔ Admin — pont manquant

### Problème
La messagerie mobile et les messages admin sont deux systèmes **totalement séparés** qui ne se parlent pas :

| Côté | Controller | Table DB | Utilisé par |
|------|-----------|----------|-------------|
| Mobile | `ChatController` (`/chat/...`) | `conversations` + `messages` | Client mobile |
| Admin | `AdminMessagesController` (`/messages/...`) | `admin_tickets` + `ticket_messages` | Admin panel |

Conséquence : quand un client envoie un message depuis l'app, l'admin **ne le voit jamais** dans son panel Messages. Les deux systèmes coexistent mais ne communiquent pas.

### Solution

L'approche la plus propre sans tout refactoriser est d'**ajouter un endpoint admin pour consulter les conversations du chat mobile**, en lecture seule dans un premier temps.

**Étape 1 — Ajouter un endpoint admin dans `AdminMessagesController`**

```ts
// apps/api/src/modules/admin-messages/admin-messages.controller.ts
// Ajouter :

@Get('chat')
@ApiOperation({ summary: 'Toutes les conversations chat mobile (vue admin)' })
async listChatConversations(@Query() query: any) {
  return this.service.listChatConversations(query)
}

@Get('chat/:id')
@ApiOperation({ summary: 'Détail conversation chat mobile' })
async getChatConversation(@Param('id') id: string) {
  return this.service.getChatConversation(id)
}

@Post('chat/:id/reply')
@ApiOperation({ summary: 'Répondre depuis admin à une conversation chat' })
async replyChatConversation(
  @Param('id') id: string,
  @Body() body: { content: string },
) {
  return this.service.replyChatConversation(id, body.content)
}
```

**Étape 2 — Ajouter les méthodes dans `AdminMessagesService`**

```ts
// apps/api/src/modules/admin-messages/admin-messages.service.ts
// Ajouter l'injection du module Chat ou importer directement les tables

import { conversations, messages } from '../../database/schema/chat'

async listChatConversations(params: { page?: number; limit?: number }) {
  const page = params.page ?? 1
  const limit = params.limit ?? 20
  const offset = (page - 1) * limit
  const [data, [{ count }]] = await Promise.all([
    this.db.select().from(conversations)
      .limit(limit).offset(offset)
      .orderBy(desc(conversations.updatedAt)),
    this.db.select({ count: sql<number>`count(*)` }).from(conversations),
  ])
  return { data, total: Number(count) }
}

async getChatConversation(id: string) {
  const [conv] = await this.db.select().from(conversations)
    .where(eq(conversations.id, id)).limit(1)
  if (!conv) throw new NotFoundException('Conversation introuvable')
  const msgList = await this.db.select().from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(messages.createdAt)
  return { ...conv, messages: msgList }
}

async replyChatConversation(conversationId: string, content: string) {
  const [conv] = await this.db.select().from(conversations)
    .where(eq(conversations.id, conversationId)).limit(1)
  if (!conv) throw new NotFoundException('Conversation introuvable')
  const [msg] = await this.db.insert(messages).values({
    conversationId,
    senderId: 'admin',
    senderRole: 'admin',
    content,
  }).returning()
  await this.db.update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, conversationId))
  return msg
}
```

**Étape 3 — Brancher dans l'admin panel**

Ajouter un onglet "Chat clients" dans `apps/admin/src/features/messages/pages/AdminMessageListPage.tsx` qui appelle `GET /messages/chat`.

**Étape 4 (long terme) — Notification en temps réel**

Pour que l'admin soit notifié en temps réel des nouveaux messages, ajouter un WebSocket (NestJS Gateway) ou un polling court (5–10s) via `refetchInterval` dans le hook admin.

### Résultat attendu
L'administrateur voit toutes les conversations initiées depuis l'app mobile, peut y répondre, et le client reçoit la réponse dans sa messagerie.

---

## 4. Recherche — historique et tendances mockés

### Problème
Dans `app/search/index.tsx`, deux constantes hardcodées :

```ts
const TRENDING = ["espadrille homme", "cagoules", "maileg souris", ...];
const HISTORY  = ["tondeuse", "micro cravate", "coque macbook"];
```

L'historique de recherche de l'utilisateur n'est jamais sauvegardé. Les tendances ne reflètent pas les vraies recherches populaires de la plateforme.

### Solution — Deux sous-problèmes indépendants

#### 4a. Historique local (AsyncStorage)

**Nouveau fichier : `src/features/search/useSearchHistory.ts`**

```ts
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useState, useEffect } from 'react'

const KEY = 'search.history'
const MAX = 10

export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>([])

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (raw) setHistory(JSON.parse(raw))
    })
  }, [])

  async function addToHistory(query: string) {
    const trimmed = query.trim()
    if (!trimmed) return
    const next = [trimmed, ...history.filter((h) => h !== trimmed)].slice(0, MAX)
    setHistory(next)
    await AsyncStorage.setItem(KEY, JSON.stringify(next))
  }

  async function clearHistory() {
    setHistory([])
    await AsyncStorage.removeItem(KEY)
  }

  return { history, addToHistory, clearHistory }
}
```

**Modifier `app/search/index.tsx`** — remplacer `HISTORY` par `history` du hook et appeler `addToHistory(query)` lors de chaque soumission.

#### 4b. Tendances depuis le backend

**Nouveau endpoint dans `MobileController`** :

```ts
@Public()
@Get('search/trending')
@ApiOperation({ summary: 'Termes de recherche tendance' })
async searchTrending() { return this.service.getSearchTrending() }
```

**Méthode dans `MobileService`** (version simple basée sur les recherches les plus fréquentes ou une liste CMS) :

```ts
async getSearchTrending(): Promise<string[]> {
  // Option 1 : lire depuis un content block dédié géré par l'admin
  const [block] = await this.db.select().from(contentBlocks)
    .where(and(
      eq(contentBlocks.groupName, 'search'),
      eq(contentBlocks.key, 'trending'),
    )).limit(1)
  if (block?.value) {
    try { return JSON.parse(block.value) } catch {}
  }
  // Fallback si pas encore configuré
  return []
}
```

**Nouveau hook `src/features/search/useSearchTrending.ts`** :

```ts
import { useQuery } from '@tanstack/react-query'
import { apiAdapter } from '@/infrastructure/api/apiAdapter'

export function useSearchTrending() {
  return useQuery<string[]>({
    queryKey: ['search', 'trending'],
    queryFn: () => apiAdapter.get('/mobile/search/trending'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
```

**Dans l'admin CMS**, ajouter un bloc de contenu groupe=`search`, clé=`trending` avec une valeur JSON de type `["robe été", "smartphone", ...]` que l'admin peut modifier.

### Résultat attendu
- L'historique de recherche est propre à chaque utilisateur et persiste entre les sessions.
- Les tendances reflètent ce que l'admin configure ou, à terme, les vraies statistiques de recherche.

---

## 5. Accueil — sections feed non dynamiques

### Problème
L'admin peut créer, supprimer, réordonner des sections dans le CMS (onglet "Sections du feed", `FeedSectionsTab.tsx`), tout cela est sauvegardé en base dans la table `feed_sections`.

Mais `useHomeFeed` dans `src/features/home/useHomeFeed.ts` **ignore complètement cette table**. Il découpe les produits en groupes fixes (`bundle = products.slice(0,6)`, `deals = products.slice(6,12)`) sans tenir compte de ce que l'admin a configuré.

De plus, l'endpoint `/mobile/feed` existe mais lit les `content_blocks` du groupe `feed`, pas les `feed_sections`.

### Solution

**Étape 1 — Ajouter l'endpoint `/mobile/feed-sections` dans `MobileController`**

```ts
@Public()
@Get('feed-sections')
@ApiOperation({ summary: 'Sections de la page d\'accueil (configurées par l\'admin)' })
async feedSections() { return this.service.getFeedSections() }
```

**Méthode dans `MobileService`** :

```ts
async getFeedSections() {
  const rows = await this.db
    .select()
    .from(feedSections)
    .where(eq(feedSections.isActive, true))
    .orderBy(feedSections.position)
  return rows
}
```

**Étape 2 — Nouveau type dans `src/infrastructure/data-source/ContentDataSource.ts`**

```ts
export type FeedSection = {
  id: string
  title: string
  type: 'products' | 'stores' | 'banners' | 'categories' | 'inspiration' | 'custom'
  displayStyle: 'horizontal-scroll' | 'grid' | 'list' | 'card'
  position: number
  isActive: boolean
  data?: any
}
```

**Étape 3 — Ajouter la méthode dans `ApiContentDataSource`**

```ts
async getFeedSections(): Promise<FeedSection[]> {
  return apiAdapter.get('/mobile/feed-sections')
}
```

**Étape 4 — Modifier `useHomeFeed.ts`**

```ts
import { useQuery } from '@tanstack/react-query'
import { catalogService } from '@/features/catalog'
import { contentService } from '@/features/content'

export function useHomeFeed(activeCat: string | null) {
  const productsQ = useQuery({ queryKey: ['products'], queryFn: () => catalogService.getProducts() })
  const categoriesQ = useQuery({ queryKey: ['categories'], queryFn: () => catalogService.getCategories() })
  const bannersQ = useQuery({ queryKey: ['banners'], queryFn: () => contentService.getBanners() })
  const sectionsQ = useQuery({ queryKey: ['feed-sections'], queryFn: () => contentService.getFeedSections() })

  const products = productsQ.data ?? []
  const categories = categoriesQ.data ?? []
  const banners = bannersQ.data ?? []
  const sections = sectionsQ.data ?? []

  // Construction dynamique : chaque section configurée par l'admin
  // détermine quels produits/bannières/boutiques afficher
  const dynamicSections = sections.map((section) => {
    if (section.type === 'products') {
      return { ...section, items: products.slice(0, 6) }
    }
    if (section.type === 'banners') {
      return { ...section, items: banners }
    }
    return { ...section, items: [] }
  })

  // Fallback si aucune section configurée
  const bundle = products.slice(0, 6)
  const deals = products.slice(6, 12)
  const grid = activeCat
    ? [...products.filter((p) => p.categoryId === activeCat), ...products.filter((p) => p.categoryId !== activeCat)]
    : products

  const isLoading = productsQ.isLoading || categoriesQ.isLoading || bannersQ.isLoading || sectionsQ.isLoading

  return { bundle, deals, grid, categories, banners, sections: dynamicSections, isLoading }
}
```

**Étape 5 — Mettre à jour `app/(tabs)/index.tsx`** pour utiliser `sections` en priorité sur `bundle`/`deals` si des sections sont configurées.

### Résultat attendu
L'admin peut créer une section "Deals du jour", une section "Recommandé pour vous", les activer/désactiver, les réordonner — l'app mobile reflète immédiatement ces changements.

---


## 6. Raccourcis accueil — données statiques

### Problème
`ApiContentDataSource.getHomeShortcuts()` dans `src/infrastructure/data-source/api/ApiContentDataSource.ts` retourne un tableau statique `STATIC_SHORTCUTS` — il ne fait **aucun appel API**. La méthode est synchrone (`return STATIC_SHORTCUTS`) alors que toutes les autres sont `async`.

Le backend a pourtant un endpoint `GET /mobile/shortcuts` qui lit depuis `getHomeShortcuts()` dans `MobileService` — mais cette méthode aussi retourne des données hardcodées (8 raccourcis fixes). Les icônes et libellés ne sont pas configurables par l'admin.

### Solution

**Étape 1 — Créer une table ou utiliser les content_blocks** pour stocker les raccourcis

Option recommandée : utiliser la table `content_blocks` existante avec `groupName = 'shortcuts'`, ce qui permet à l'admin de gérer les raccourcis via le CMS sans nouvelle table.

**Modifier `MobileService.getHomeShortcuts()`** :

```ts
async getHomeShortcuts() {
  const rows = await this.db
    .select()
    .from(contentBlocks)
    .where(eq(contentBlocks.groupName, 'shortcuts'))
    .orderBy(contentBlocks.key)

  if (rows.length) {
    return rows.map((r) => {
      try { return JSON.parse(r.value) } catch { return null }
    }).filter(Boolean)
  }

  // Fallback si rien n'est configuré en base
  return [
    { id: '1', labelKey: 'home.electronics', icon: 'laptop' },
    { id: '2', labelKey: 'home.fashion', icon: 'tshirtCrew' },
    { id: '3', labelKey: 'home.beauty', icon: 'lipstick' },
    { id: '4', labelKey: 'home.home', icon: 'home' },
    { id: '5', labelKey: 'home.sports', icon: 'basketball' },
    { id: '6', labelKey: 'home.phones', icon: 'cellphone' },
    { id: '7', labelKey: 'home.automotive', icon: 'car' },
    { id: '8', labelKey: 'home.supermarket', icon: 'cart' },
  ]
}
```

**Étape 2 — Rendre `ApiContentDataSource.getHomeShortcuts()` asynchrone**

```ts
// Avant
getHomeShortcuts(): Shortcut[] {
  return STATIC_SHORTCUTS
}

// Après
async getHomeShortcuts(): Promise<Shortcut[]> {
  return apiAdapter.get('/mobile/shortcuts')
}
```

**Étape 3 — Mettre à jour l'interface `ContentDataSource`** pour que `getHomeShortcuts` soit `Promise<Shortcut[]>`.

**Étape 4 — Mettre à jour `useHomeShortcuts.ts`** pour appeler la méthode de façon asynchrone avec `useQuery`.

### Résultat attendu
L'admin peut ajouter/modifier/supprimer des raccourcis depuis le CMS. Les changements s'affichent dans l'app sans redéploiement.

---

## 7. TopNavbar admin — badge notifications absent

### Problème
La `TopNavbar` (`apps/admin/src/components/layout/TopNavbar.tsx`) n'affiche **aucune cloche de notifications**. Elle montre uniquement le bouton thème, le nom de l'admin et le bouton déconnexion.

Pourtant :
- Le hook `useUnreadMessageCount()` existe dans `apps/admin/src/features/messages/hooks/useAdminMessages.ts` et retourne le total des tickets non-lus (support + internes) avec un `refetchInterval: 30_000`.
- L'endpoint `GET /messages/unread-count` existe et fonctionne côté backend.
- La Sidebar importe déjà `useUnreadMessageCount` pour afficher un badge sur le lien "Messages".

Il manque juste l'icône cloche dans la TopNavbar qui pointerait vers `/messages`.

### Solution

**Modifier `apps/admin/src/components/layout/TopNavbar.tsx`**

```tsx
import { useUnreadMessageCount } from '@/features/messages/hooks/useAdminMessages'

export function TopNavbar({ onToggleSidebar }: TopNavbarProps) {
  const { admin, logout } = useAdminAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const unreadCount = useUnreadMessageCount()  // ← Ajouter

  // ...

  return (
    <header className="...">
      {/* ... boutons existants ... */}

      <div className="flex items-center gap-4">
        {/* Bouton thème existant */}

        {/* ← AJOUTER : Cloche notifications */}
        <button
          onClick={() => navigate('/messages')}
          className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          title="Messages non lus"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Profil et déconnexion existants */}
      </div>
    </header>
  )
}
```

### Résultat attendu
L'admin voit un badge rouge avec le nombre de messages non-lus dans la barre du haut, mis à jour toutes les 30 secondes automatiquement. Un clic redirige vers la page Messages.

---

## 8. OTP — stockage en mémoire non persistant

### Problème
Dans `apps/api/src/modules/mobile/mobile.service.ts` :

```ts
private otpStore = new Map<string, { code: string; expiresAt: Date }>()
```

Ce `Map` est stocké **en mémoire vive du processus NestJS**. Si le serveur redémarre (crash, déploiement, mise à jour), tous les codes OTP en attente sont perdus et les utilisateurs qui ont demandé un code obtiennent "Code invalide ou expiré" même avec le bon code.

En production avec plusieurs instances (scaling horizontal), chaque instance a son propre Map — une demande OTP sur l'instance A et une vérification sur l'instance B échoueront systématiquement.

### Solution

**Option recommandée : table DB avec TTL géré applicativement**

Pas besoin de Redis pour commencer. Une table simple suffit.

**Nouveau schéma `apps/api/src/database/schema/otp.ts`** :

```ts
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const otpCodes = pgTable('otp_codes', {
  contact: text('contact').primaryKey(),   // email ou téléphone
  code: text('code').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})
```

**Modifier `mobile.service.ts`** :

```ts
// Supprimer : private otpStore = new Map(...)

// Remplacer requestOtp() :
async requestOtp(contact: string, mode: 'phone' | 'email' = 'email') {
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

  await this.db
    .insert(otpCodes)
    .values({ contact, code, expiresAt })
    .onConflictDoUpdate({
      target: otpCodes.contact,
      set: { code, expiresAt, createdAt: new Date() },
    })

  // TODO production : envoyer SMS via Twilio ou email via SendGrid
  console.log(`[OTP] ${mode} ${contact}: code=${code}`)
  return { ok: true }
}

// Remplacer verifyOtp() :
async verifyOtp(contact: string, code: string) {
  const [stored] = await this.db
    .select()
    .from(otpCodes)
    .where(eq(otpCodes.contact, contact))
    .limit(1)

  if (!stored || stored.code !== code || stored.expiresAt < new Date()) {
    await this.db.delete(otpCodes).where(eq(otpCodes.contact, contact))
    throw new UnauthorizedException('Code invalide ou expiré')
  }

  await this.db.delete(otpCodes).where(eq(otpCodes.contact, contact))

  // ... reste identique (trouver/créer le customer)
}
```

**Créer la migration Drizzle** :
```bash
cd apps/api
npx drizzle-kit generate
npx drizzle-kit migrate
```

### Résultat attendu
Les codes OTP survivent aux redémarrages du serveur. Scalable horizontalement. Nettoyage automatique des codes expirés possible via une tâche CRON.

---


## 9. URL API — localhost inutilisable sur device physique

### Problème
Dans `.env` à la racine du projet :

```
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

`localhost` sur un téléphone physique pointe vers le téléphone lui-même, pas vers le PC de développement. Résultat : **toutes les requêtes échouent silencieusement** sur device réel, l'app affiche des écrans vides ou des erreurs de chargement.

Les 3 IPs sont déjà listées en commentaire dans le fichier `.env` mais jamais utilisées.

### Solution

**Étape 1 — Documenter clairement dans `.env`**

```bash
# ──────────────────────────────────────────────────────────────
# CONFIGURATION SELON L'ENVIRONNEMENT
# ──────────────────────────────────────────────────────────────

# Simulateur iOS / Émulateur Android (même machine) :
# EXPO_PUBLIC_API_URL=http://localhost:3000/api

# Téléphone physique sur le même réseau Wi-Fi :
# → Trouver l'IP LAN avec : ipconfig (Windows) ou ifconfig (Mac/Linux)
# → Remplacer par votre IP LAN
# EXPO_PUBLIC_API_URL=http://192.168.1.XXX:3000/api
#
# IPs connues de cette machine :
# EXPO_PUBLIC_API_URL=http://192.168.56.1:3000/api
# EXPO_PUBLIC_API_URL=http://172.28.160.1:3000/api
# EXPO_PUBLIC_API_URL=http://172.16.10.139:3000/api

# Actif actuellement :
EXPO_PUBLIC_API_URL=http://localhost:3000/api

# Désactiver les mocks (obligatoire pour utiliser le backend réel) :
EXPO_PUBLIC_USE_MOCK=false
```

**Étape 2 — Vérifier que le backend autorise les requêtes depuis l'IP mobile**

Dans `apps/api/src/main.ts`, la config CORS actuelle n'autorise que `localhost:5173` et `localhost:5174` (l'admin). Pour les requêtes mobile (sans origin navigateur), les appels `fetch` natifs ne sont pas bloqués par CORS. Aucune modification CORS nécessaire pour le mobile.

**Étape 3 — Script de démarrage rapide (optionnel)**

Créer `scripts/start-dev.sh` pour démarrer les 3 parties simultanément avec les bonnes variables.

### Résultat attendu
L'app fonctionne sur téléphone physique en changeant une seule ligne dans `.env`. Documenté clairement pour tout développeur qui rejoint le projet.

---

## 10. ProductCard — ratio image et dimensions

### Problème
Dans `src/components/ProductCard.tsx` :

```ts
imageWrap: {
  position: 'relative',
  width: '100%',
  aspectRatio: 1,  // ← Carré (1:1) — trop court pour un e-commerce
  backgroundColor: colors.background
},
```

Un ratio 1:1 coupe les produits mode/vêtements verticaux. Le standard e-commerce (AliExpress, Amazon, Shein) est **4:5** (légèrement portrait) qui montre mieux les produits tout en restant compact.

De plus, la taille `small` (100px) peut être trop petite selon les contextes.

### Solution

**Modifier `src/components/ProductCard.tsx`**

```ts
// Changer aspectRatio dans les styles :
imageWrap: {
  position: 'relative',
  width: '100%',
  aspectRatio: 4 / 5,  // 0.8 — ratio portrait standard e-commerce
  backgroundColor: colors.background,
},

// Ajuster la taille small :
const sizeMap: Record<'small' | 'medium' | 'large', number> = {
  small: 120,   // était 100, un peu trop petit
  medium: 150,  // était 140
  large: 190,   // était 180
}
```

**Améliorer le badge de réduction** (mieux visible) :

```ts
discountTag: {
  position: 'absolute',
  top: spacing.sm,
  left: spacing.sm,
  backgroundColor: colors.sale,
  borderRadius: radius.sm,
  paddingHorizontal: 6,
  paddingVertical: 3,      // était 2, légèrement plus grand
  minWidth: 36,            // largeur minimum pour "-10%"
  alignItems: 'center',
},
discountText: {
  color: colors.white,
  fontSize: fontSize.xs,
  fontWeight: '800',
  letterSpacing: 0.3,      // meilleure lisibilité
},
```

**Améliorer la zone de tap du bouton "+"** :

```ts
addBtn: {
  width: 34,      // était 30, minimum recommandé Apple/Google = 44px avec hitSlop
  height: 34,     // était 30
  borderRadius: 17,
  // ... reste identique
},
```

### Résultat attendu
Les cartes produits montrent les images dans un format plus adapté à la mode et aux produits e-commerce. Le badge de réduction est plus lisible. Le bouton d'ajout au panier répond mieux au toucher.

---

## 11. Pont Chat mobile → Tickets admin

### Problème (complémentaire au point 3)
Quand un client envoie un premier message depuis l'app via `POST /chat/conversations`, ce message crée une conversation dans la table `conversations` mais **ne génère pas de notification ni de ticket visible dans l'admin**. L'admin doit aller chercher proactivement dans un onglet "Chat clients" (à créer selon le point 3).

Pour une expérience complète, chaque nouvelle conversation initiée par un client devrait **aussi créer un ticket support** dans la table `admin_tickets` afin que le système de gestion admin (assignation, priorité, statut) s'applique.

### Solution

**Modifier `ChatService.createConversation()`** pour créer un ticket en parallèle :

```ts
// apps/api/src/modules/chat/chat.service.ts

async createConversation(data: {
  customerId: string
  storeId: string
  orderId?: string
  subject?: string
}) {
  // 1. Créer la conversation chat (comme avant)
  const [conv] = await this.db.insert(conversations).values(data).returning()

  // 2. Créer un ticket support correspondant (nouveau)
  await this.db.insert(adminTickets).values({
    subject: data.subject ?? 'Nouvelle conversation client',
    customerName: data.customerId,  // sera enrichi avec le vrai nom
    customerEmail: '',
    status: 'open',
    priority: 'medium',
    source: 'chat',                 // origine = app mobile
    lastMessage: '',
    unread: true,
    chatConversationId: conv.id,    // lien vers la conversation chat
    messageCount: 0,
  })

  return conv
}
```

**Ajouter le champ `chatConversationId` dans le schéma `admin_tickets`** :

```ts
// apps/api/src/database/schema/admin-messages.ts
chatConversationId: uuid('chat_conversation_id'),  // FK optionnelle vers conversations
```

### Résultat attendu
Chaque nouvelle conversation depuis l'app mobile crée automatiquement un ticket support dans le panel admin. L'admin peut assigner, prioriser et répondre depuis le même interface.

---

## 12. Suggestions de personnes — données statiques

### Problème
Dans `MobileService.getSuggestedPeople()` :

```ts
async getSuggestedPeople() {
  return [
    { id: '1', name: 'Aminata Diallo', followers: '12.5k', avatar: '' },
    { id: '2', name: 'Mamadou Traoré', followers: '8.3k', avatar: '' },
    { id: '3', name: 'Fatou Sow', followers: '5.1k', avatar: '' },
  ]
}
```

Trois personnes fictives, avatars vides, non configurables.

### Solution

**Option courte terme** : gérer via `content_blocks` (groupe = `suggested_people`, valeur JSON).

```ts
async getSuggestedPeople() {
  const rows = await this.db.select().from(contentBlocks)
    .where(and(
      eq(contentBlocks.groupName, 'suggested_people'),
    ))
    .orderBy(contentBlocks.key)

  if (rows.length) {
    return rows.map((r) => {
      try { return JSON.parse(r.value) } catch { return null }
    }).filter(Boolean)
  }

  return []  // Tableau vide si rien n'est configuré — pas de faux contenu
}
```

**Dans l'admin CMS**, ajouter des blocs dans le groupe `suggested_people` avec des valeurs JSON `{ id, name, followers, avatar }`.

### Résultat attendu
L'admin gère les suggestions depuis le CMS. Aucun faux contenu dans l'app.

---

## Récapitulatif — Priorités et effort estimé

| # | Problème | Priorité | Effort | Fichiers touchés |
|---|----------|----------|--------|-----------------|
| 1 | Messagerie mobile mock → API réelle | 🔴 Critique | 15 min | `useMessages.ts` |
| 2 | Paiement mobile hardcodé → DB | 🔴 Critique | 20 min | `mobile.service.ts` |
| 7 | Badge notifications admin absent | 🔴 Visible | 20 min | `TopNavbar.tsx` |
| 3 | Pont Chat mobile ↔ Admin | 🟠 Important | 2h | `admin-messages.*`, `AdminMessageListPage.tsx` |
| 4 | Recherche — historique local | 🟠 Important | 1h | `useSearchHistory.ts`, `search/index.tsx` |
| 5 | Sections feed dynamiques | 🟠 Important | 3h | `MobileController`, `useHomeFeed.ts`, `index.tsx` |
| 10 | ProductCard ratio 4:5 | 🟡 UX | 10 min | `ProductCard.tsx` |
| 9 | URL API localhost → IP LAN | 🟡 Dev | 5 min | `.env` |
| 8 | OTP mémoire → DB | 🟡 Prod | 1h | `mobile.service.ts`, nouveau schéma |
| 6 | Raccourcis accueil dynamiques | 🟡 Amélioration | 1h | `ApiContentDataSource.ts`, `MobileService` |
| 11 | Chat → Ticket auto | 🟢 Long terme | 2h | `chat.service.ts`, schéma |
| 12 | Suggestions personnes | 🟢 Long terme | 30 min | `mobile.service.ts` |

---

## Ordre d'exécution recommandé

```
Phase 1 — Rapide et visible (< 1h au total)
  ├── Correction 9  : .env URL API
  ├── Correction 10 : ProductCard ratio
  ├── Correction 1  : Messagerie mock → chatService
  ├── Correction 2  : Paiement mock → DB
  └── Correction 7  : Badge cloche admin

Phase 2 — Fonctionnalités importantes (1 journée)
  ├── Correction 4  : Historique recherche AsyncStorage
  ├── Correction 4b : Tendances recherche CMS
  └── Correction 5  : Sections feed dynamiques

Phase 3 — Robustesse et pont admin-mobile (1-2 jours)
  ├── Correction 8  : OTP en base de données
  ├── Correction 3  : Pont Chat ↔ Tickets admin
  └── Correction 11 : Création ticket auto au nouveau chat

Phase 4 — Finitions (quelques heures)
  ├── Correction 6  : Raccourcis dynamiques
  └── Correction 12 : Suggestions depuis CMS
```

---

*Ce plan couvre 100% des incohérences détectées entre le backend, l'admin panel et l'application mobile. Une fois toutes ces corrections appliquées, chaque action de l'administrateur se répercute instantanément dans l'app client, et toutes les données affichées sont réelles et vivantes.*
