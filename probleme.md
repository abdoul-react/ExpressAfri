Audit Technique ExpressAfri — Rapport Complet

Vue d'ensemble de l'architecture

Le projet est structuré en 3 couches :

- Backend : NestJS + Drizzle ORM (PostgreSQL) — apps/api
- Panel Admin : React + Vite + Tailwind — apps/admin
- App Mobile : React Native / Expo — racine du projet

L'architecture est globalement solide et bien organisée. La séparation des responsabilités est respectée (écran → hook → service →
datasource). Voici les problèmes identifiés et leur niveau de criticité.

───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

🔴 Problèmes critiques (bloquants)

1. Messagerie mobile — données mock non remplacées

Fichier : src/features/messages/useMessages.ts + messagingService.ts

Le hook useConversations appelle messagingService.getConversations() qui retourne 7 conversations hardcodées (GoGo Match, Merge
Boss, etc.). C'est ce que tu vois en cliquant sur la cloche.

La vraie infrastructure existe (ApiChatDataSource, endpoint /chat/conversations côté backend), mais elle n'est pas branchée au
hook. Le hook importe le mock au lieu de chatService.ts.

Correction :

// src/features/messages/useMessages.ts — remplacer messagingService par chatService
import { chatService } from "./chatService";

export function useConversations() {
const { data = [], isLoading } = useQuery({
queryKey: ["conversations"],
queryFn: () => chatService.getConversations(), // ← était messagingService
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

2. Messagerie mobile ↔ Admin — circuit incomplet

La messagerie mobile utilise /chat/conversations (table conversations). L'admin gère des tickets support via /messages (table
admin_tickets). Ce sont deux tables différentes. Un message envoyé depuis l'app mobile ne remonte pas dans la vue admin "Messages".
Il manque un pont : soit unifier les tables, soit faire en sorte que ChatService.sendMessage crée aussi un ticket dans
admin_tickets.

3. Paiement mobile — endpoint retourne des données hardcodées

GET /mobile/payment/methods retourne une liste statique dans mobile.service.ts. Ce n'est pas connecté à la table payment_methods du
CMS admin. Pourtant la table existe, est bien peuplée par le ContentService, et les méthodes de paiement que l'admin configure
devraient s'afficher dans l'app.

Correction dans mobile.service.ts :

async getPaymentMethods() {
// Lire depuis la table payment_methods (gérée par l'admin CMS)
const rows = await this.db.select().from(paymentMethods)
.where(eq(paymentMethods.isActive, true))
.orderBy(paymentMethods.position)
return rows.map(m => ({
id: m.code,
icon: m.type === 'mobile-money' ? 'cellphone' : m.type === 'card' ? 'creditCard' : m.type === 'cod' ? 'cash' : 'wallet',
labelKey: m.name,
hintKey: m.description ?? '',
}))
}

4. Recherche mobile — TRENDING et HISTORY hardcodés

Fichier : app/search/index.tsx lignes 14-17

const TRENDING = ["espadrille homme", "cagoules", ...]; // MOCK
const HISTORY = ["tondeuse", "micro cravate", ...]; // MOCK

L'historique de recherche devrait être sauvegardé localement (AsyncStorage), les tendances devraient venir du backend. Un endpoint
/mobile/search/trending et /mobile/search/history sont nécessaires, ou au minimum l'historique local via AsyncStorage.

───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

🟡 Problèmes importants (fonctionnalité partielle)

5. Sections du Feed — non consommées par l'app mobile

L'admin peut créer/supprimer/réordonner des sections via FeedSectionsTab (bien connecté à l'API). Mais l'app mobile (useHomeFeed)
ne lit pas la table feed_sections. Elle découpe les produits en bundle et deals de façon fixe. L'endpoint /mobile/feed existe mais
renvoie les content_blocks du groupe 'feed', pas les feed_sections.

Il faut :

1. Ajouter un endpoint /mobile/feed-sections dans MobileController
2. Consommer ces sections dans useHomeFeed pour construire dynamiquement les sections de l'accueil

3. Cloche notifications admin — non connectée au backend

La cloche dans la TopNavbar de l'admin doit afficher le nombre de tickets non lus. L'endpoint GET /messages/unread-count existe
côté backend. Il faut vérifier si la TopNavbar l'appelle ou si elle affiche un badge statique/absent.

7. Chargement des données au démarrage de l'app mobile

L'app charge les données via React Query mais l'URL de base (EXPO_PUBLIC_API_URL=http://localhost:3000/api) ne fonctionne pas sur
un vrai téléphone. Pour les tests sur device physique, l'IP doit être remplacée par l'IP LAN (ex: http://192.168.56.1:3000/api —
commentée dans le .env). C'est ce qui cause l'affichage lent ou l'absence de données.

8. OTP — stockage en mémoire (non persistant)

private otpStore = new Map<string, { code: string; expiresAt: Date }>()

Stocké en mémoire du processus NestJS. Si le serveur redémarre entre la demande OTP et la vérification, le code est perdu. À
remplacer par une table DB ou Redis.

───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

🟠 Incohérences de connectivité Admin ↔ Backend

9. Logos — endpoint backend manquant

AdminContentDataSource appelle POST /content/logos et PUT /content/logos/:id/upload pour l'upload, mais le contrôleur content ne
déclare que PUT /content/logos et GET /content/logos. La route upload avec FileInterceptor est présente mais le data source admin
envoie peut-être vers une mauvaise URL.

10. Messages admin — clé d'authentification

Le AdminMessagesController est protégé par JwtAuthGuard (token admin). Le ChatController est protégé par CustomerAuthGuard (token
client). La synchronisation admin ↔ client requiert que l'admin puisse lire les conversations côté chat. Il manque un endpoint
admin pour lister toutes les conversations (GET /chat/admin/conversations).

───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

🟢 Ce qui fonctionne correctement

- Architecture backend NestJS : tous les 28 modules sont enregistrés dans AppModule, aucun oubli
- Admin Panel : tous les datasources sont branchés sur les API (ApiAdmin\*DataSource), plus aucun mock actif côté admin
- Produits, catégories, commandes, boutiques : chaîne complète Mobile → API → DB fonctionnelle
- Authentification mobile : register/login/OTP/social/refresh — tous les endpoints existent et sont implémentés avec bcrypt + JWT
- CMS admin → app mobile pour les bannières : correctement bridgé (admin gère banners → mobile lit depuis la même table)
- Sections Feed admin : CRUD complet + drag & drop + réordonnancement
- Paiements admin, retours, litiges, livraison, affiliés, loyalty, analytics : tous connectés à l'API
- Sidebar admin : tous les liens sont présents et complets
- Architecture de séparation des données (datasource abstraction) : respectée partout

───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

Plan de corrections prioritaires

Correction 1 — Messagerie mobile (critique)

Modifier src/features/messages/useMessages.ts pour utiliser chatService au lieu de messagingService.

Correction 2 — Paiement mobile vers CMS

Modifier mobile.service.ts → getPaymentMethods() pour lire depuis la table payment_methods.

Correction 3 — Historique de recherche local

Persister les recherches récentes dans AsyncStorage et lire depuis useSearch.

Correction 4 — Sections feed dynamiques

Ajouter GET /mobile/feed-sections et consommer dans useHomeFeed.

Correction 5 — IP de développement

Documenter clairement que pour tester sur téléphone physique, il faut changer EXPO_PUBLIC_API_URL vers l'IP LAN du PC (les 3 IPs
sont déjà listées en commentaire dans le .env).

───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

Améliorations UX — Cartes produits

Les ProductCard existent dans src/components/ProductCard.tsx. Pour les améliorations dimensionnelles (taille, ratio image,
espacement), je peux appliquer les corrections directement si tu me le confirmes. Les points typiques à améliorer sur ce type d'app
:

- Image aspect ratio fixe (4:5 recommandé pour e-commerce)
- Badge réduction mieux visible
- Prix original barré plus lisible
- Tap area conforme aux guidelines (min 44px)

───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

Dis-moi par où commencer. Je recommande de faire les corrections 1 (messagerie) et 2 (paiement) en premier car ce sont les plus
visibles. Je peux les appliquer immédiatement.
