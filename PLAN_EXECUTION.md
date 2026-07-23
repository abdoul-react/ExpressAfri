# Plan d'exécution — Corrections Panel Admin ExpressAfri

> **Instructions :** À chaque étape terminée, cocher la case `[ ]` en remplaçant par `[x]`.
> Ce fichier sert de référence de progression. Le consulter au début de chaque session de travail.

---

## Contexte de l'audit

L'audit du panel admin (`apps/admin`) a identifié **4 catégories de problèmes** :

1. **Géographie des livreurs** — zones limitées à la Côte d'Ivoire, pas de sélection pays/région
2. **Formulaires incomplets** — manque de champs (adresse, pièce d'identité, plaque, pays)
3. **Gestion des rôles** — rôle logistique manquant, filtres hardcodés
4. **UX / Interface** — messagerie inter-admins absente, badge non-lus, Select réutilisable, export CSV, incohérences de thème

---

## Ordre d'exécution

Les étapes sont classées du plus critique (bloquant fonctionnellement) au plus optionnel (amélioration UX).

---

### 🔴 BLOC 1 — Géographie des livreurs (CRITIQUE)

---

#### [x] ÉTAPE 1 — Ajouter le champ `country` au type `DeliveryPerson` et mettre à jour les interfaces

**Fichiers à modifier :**
- `apps/admin/src/infrastructure/data-source/AdminDeliveryDataSource.ts`
- `apps/admin/src/infrastructure/data-source/mock/MockAdminDeliveryDataSource.ts`
- `apps/admin/src/infrastructure/data-source/mock/data/mockDelivery.ts`

**Ce qu'il faut faire :**
- Ajouter `country: { code: string; name: string }` dans l'interface `DeliveryPerson`
- Renommer ou compléter le champ `zone` en `region: string` (zone = région dans un pays)
- Mettre à jour `CreateDeliveryPersonInput` et `UpdateDeliveryPersonInput` en conséquence
- Mettre à jour les 12 entrées mock dans `mockDelivery.ts` avec leur pays réel (tous CI pour l'instant)
- Mettre à jour le filtre `DeliveryPersonQueryParams` avec `countryCode?: string`

**Critère de validation :** TypeScript compile sans erreur sur les types delivery.

---

#### [x] ÉTAPE 2 — Créer le référentiel géographique Pays/Régions (service + mock data)

**Fichiers à créer :**
- `apps/admin/src/infrastructure/data-source/mock/data/mockGeography.ts`
- `apps/admin/src/features/delivery/services/geographyService.ts`

**Ce qu'il faut faire :**
- Créer `mockGeography.ts` avec la structure :
  ```ts
  export const GEOGRAPHY: { code: string; name: string; regions: string[] }[] = [
    { code: 'CI', name: "Côte d'Ivoire", regions: ['Abidjan - Cocody', 'Abidjan - Plateau', ...] },
    { code: 'SN', name: 'Sénégal', regions: ['Dakar - Plateau', 'Dakar - Médina', 'Thiès', ...] },
    { code: 'ML', name: 'Mali', regions: ['Bamako - ACI', 'Bamako - Hippodrome', 'Sikasso', ...] },
    { code: 'BF', name: 'Burkina Faso', regions: ['Ouagadougou - Ouaga 2000', 'Bobo-Dioulasso', ...] },
    { code: 'SN', name: 'Sénégal', regions: [...] },
    { code: 'CM', name: 'Cameroun', regions: ['Douala', 'Yaoundé', ...] },
    { code: 'GN', name: 'Guinée', regions: ['Conakry', ...] },
    // ... couvrir tous les pays des zones shipping existantes
  ]
  ```
- Créer `geographyService.ts` avec les fonctions :
  - `getCountries()` → liste des pays
  - `getRegionsByCountry(countryCode: string)` → liste des régions

**Critère de validation :** Le service retourne les pays et régions correctement.

---

#### [x] ÉTAPE 3 — Mettre à jour le formulaire livreur avec sélection Pays → Région en cascade

**Fichiers à modifier :**
- `apps/admin/src/features/delivery/pages/AdminDeliveryListPage.tsx` (section `DeliveryPersonFormModal`)

**Ce qu'il faut faire :**
- Remplacer la liste `ZONES` hardcodée par un appel à `geographyService.getCountries()`
- Ajouter un `<select>` Pays dans le formulaire
- Rendre le `<select>` Zone/Région dynamique : ses options se mettent à jour selon le pays sélectionné
- Initialiser le pays sur `CI` par défaut (puisque les livreurs mock sont tous CI)
- Mettre à jour l'état du formulaire pour inclure `country`

**Critère de validation :** En changeant le pays dans le formulaire, les régions changent automatiquement.

---

#### [x] ÉTAPE 4 — Mettre à jour les filtres de la liste livreurs (filtre Pays + filtre Région)

**Fichiers à modifier :**
- `apps/admin/src/features/delivery/pages/AdminDeliveryListPage.tsx` (section filtres)
- `apps/admin/src/infrastructure/data-source/mock/MockAdminDeliveryDataSource.ts` (méthode `listPersons`)

**Ce qu'il faut faire :**
- Ajouter un `<select>` Pays avant le `<select>` Zone dans la barre de filtres
- Les options Zone se mettent à jour selon le pays sélectionné dans le filtre
- Ajouter le paramètre `countryCode` dans `DeliveryPersonQueryParams`
- Mettre à jour `listPersons` dans le mock pour filtrer aussi par `countryCode`

**Critère de validation :** Sélectionner "Sénégal" dans le filtre n'affiche que les livreurs sénégalais.

---

#### [x] ÉTAPE 5 — Étendre le formulaire livreur avec les champs manquants

**Fichiers à modifier :**
- `apps/admin/src/infrastructure/data-source/AdminDeliveryDataSource.ts`
- `apps/admin/src/features/delivery/pages/AdminDeliveryListPage.tsx`
- `apps/admin/src/infrastructure/data-source/mock/MockAdminDeliveryDataSource.ts`

**Champs à ajouter :**
```ts
// Dans DeliveryPerson :
address?: string          // Adresse domicile du livreur
idCardNumber?: string     // Numéro pièce d'identité
licensePlate?: string     // Plaque d'immatriculation (si car ou truck)
profilePhoto?: string     // URL photo de profil
```

**Ce qu'il faut faire :**
- Ajouter ces champs dans l'interface `DeliveryPerson` et `CreateDeliveryPersonInput`
- Ajouter les inputs correspondants dans le formulaire, organisés en sections :
  - Section "Identité" (nom, téléphone, email, photo, pièce d'identité)
  - Section "Zone d'opération" (pays, région)
  - Section "Véhicule" (type, plaque si applicable)
- Afficher conditionnellement le champ `licensePlate` seulement si véhicule = car ou truck

**Critère de validation :** Le formulaire affiche/masque la plaque selon le type de véhicule.

---

### 🟠 BLOC 2 — Rôles et permissions (IMPORTANT)

---

#### [x] ÉTAPE 6 — Ajouter le rôle `logistics_admin` dans `Role.ts` et les permissions `shipping.*`

**Fichiers à modifier :**
- `apps/admin/src/types/Role.ts`
- `apps/admin/src/types/Permission.ts`
- `apps/admin/src/infrastructure/data-source/mock/data/mockRoles.ts`

**Ce qu'il faut faire :**
- Ajouter `logistics_admin` dans le type `RoleId`
- Créer l'entrée dans `ROLES` :
  ```ts
  logistics_admin: {
    id: 'logistics_admin',
    label: 'Administrateur Logistique',
    description: 'Gère les livreurs, les zones de livraison et les assignations',
    permissions: [
      'shipping.read', 'shipping.create', 'shipping.update', 'shipping.delete',
      'orders.read',
    ],
  }
  ```
- S'assurer que `shipping.create`, `shipping.update`, `shipping.delete` sont bien dans `Permission.ts`
- Ajouter une entrée dans `mockRoles.ts`

**Critère de validation :** Un admin avec le rôle `logistics_admin` peut accéder à `/delivery` et `/shipping` mais pas à `/products`.

---

#### [x] ÉTAPE 7 — Corriger le filtre rôle hardcodé dans `AdminAdminListPage`

**Fichiers à modifier :**
- `apps/admin/src/features/admins/pages/AdminAdminListPage.tsx`

**Ce qu'il faut faire :**
- Remplacer les `<option>` hardcodées dans le `<select>` rôle par un `Object.values(ROLES).map(...)` :
  ```tsx
  import { ROLES } from '@/types/Role'
  // ...
  {Object.values(ROLES).map((role) => (
    <option key={role.id} value={role.id}>{role.label}</option>
  ))}
  ```
- Ainsi tout nouveau rôle ajouté (ex: `logistics_admin`) apparaît automatiquement dans le filtre

**Critère de validation :** Le filtre rôle affiche `logistics_admin` sans modification supplémentaire.

---

### 🟠 BLOC 3 — Pages et fonctionnalités manquantes (IMPORTANT)

---

#### [x] ÉTAPE 8 — Créer la page de détail livreur `/delivery/:id`

**Fichiers à créer :**
- `apps/admin/src/features/delivery/pages/AdminDeliveryDetailPage.tsx`

**Fichiers à modifier :**
- `apps/admin/src/features/delivery/index.ts`
- `apps/admin/src/App.tsx`

**Ce qu'il faut faire :**
- Créer une page affichant le profil complet du livreur :
  - En-tête : photo, nom, statut, note, badge vérifié
  - Section Infos : téléphone, email, pays, région, adresse, véhicule, plaque, pièce d'identité
  - Section Stats : total livraisons, note moyenne, taux de succès
  - Section Historique : liste paginée de ses assignations (reprendre `AssignmentCard`)
  - Actions : Modifier, Suspendre/Réactiver, Vérifier
- Ajouter une méthode `getPersonById` qui est déjà dans le DataSource mais non exposée en route
- Lier la route `/delivery/:id` dans `App.tsx`
- Ajouter un lien "Voir profil" depuis la ligne de la liste

**Critère de validation :** Cliquer sur un livreur dans la liste ouvre sa page de profil.

---

#### [x] ÉTAPE 9 — Remplacer le champ ID manuel dans `AssignForm` par une liste de commandes disponibles

**Fichiers à modifier :**
- `apps/admin/src/features/delivery/pages/AdminDeliveryListPage.tsx` (composant `AssignForm`)
- `apps/admin/src/infrastructure/data-source/AdminDeliveryDataSource.ts`
- `apps/admin/src/infrastructure/data-source/mock/MockAdminDeliveryDataSource.ts`

**Ce qu'il faut faire :**
- Ajouter une méthode `listAvailableOrders()` dans le DataSource qui retourne les commandes en statut `ready_for_shipping` et non encore assignées
- Dans le mock, ajouter des données de commandes disponibles simulées
- Remplacer le `<input>` libre par un `<select>` ou liste de commandes avec :
  - Numéro de commande
  - Nom du client
  - Adresse de livraison
  - Montant
- Garder la possibilité de saisir un ID manuel en mode avancé (cas exceptionnel)

**Critère de validation :** Le formulaire d'assignation affiche une liste de commandes à sélectionner.

---

### 🟡 BLOC 4 — Messagerie inter-admins (IMPORTANT)

---

#### [x] ÉTAPE 10 — Ajouter la messagerie inter-admins (onglet Messages internes)

**Fichiers à modifier/créer :**
- `apps/admin/src/features/messages/pages/AdminMessageListPage.tsx`
- `apps/admin/src/infrastructure/data-source/AdminMessageDataSource.ts`
- `apps/admin/src/infrastructure/data-source/mock/MockAdminMessageDataSource.ts`
- `apps/admin/src/infrastructure/data-source/mock/data/mockMessages.ts`

**Ce qu'il faut faire :**
- Ajouter un système d'onglets dans `AdminMessageListPage` :
  - **Onglet "Support client"** — messages entrants des clients (existant)
  - **Onglet "Messages internes"** — conversations entre admins
- Créer les interfaces pour les messages internes :
  ```ts
  interface InternalMessage {
    id: string
    fromAdminId: string
    fromAdminName: string
    toAdminId: string
    toAdminName: string
    subject: string
    content: string
    isRead: boolean
    createdAt: string
    thread: InternalMessageReply[]
  }
  ```
- Ajouter dans le DataSource : `listInternalMessages()`, `sendInternalMessage()`, `replyInternalMessage()`
- Créer l'UI : liste des conversations internes + modale de rédaction/réponse
- Ajouter un indicateur visuel différenciant les messages internes des messages clients dans la liste

**Critère de validation :** Un super_admin peut envoyer un message à un support_admin depuis le panel.

---

#### [x] ÉTAPE 11 — Ajouter le badge non-lus dans le Sidebar pour Messages

**Fichiers à modifier :**
- `apps/admin/src/components/layout/Sidebar.tsx`
- `apps/admin/src/features/messages/hooks/useAdminMessages.ts` (ou créer `useUnreadCount.ts`)

**Ce qu'il faut faire :**
- Créer un hook `useUnreadMessageCount()` qui retourne le nombre total de messages non lus (support + internes)
- Modifier `SidebarItem` pour accepter un prop `badge?: number`
- Ajouter `badge` sur l'item "Messages" dans `NAV_SECTIONS`
- Afficher le badge si > 0 : petit cercle rouge avec le chiffre sur l'icône

**Critère de validation :** Le badge dans le sidebar se met à jour quand un nouveau message arrive.

---

### 🟡 BLOC 5 — Qualité du code et UX (AMÉLIORATION)

---

#### [x] ÉTAPE 12 — Créer un composant `Select` réutilisable dans `components/shared/`

**Fichiers à créer :**
- `apps/admin/src/components/shared/Select.tsx`
- `apps/admin/src/components/shared/Input.tsx` (optionnel, pour homogénéiser)
- `apps/admin/src/components/shared/index.ts`

**Ce qu'il faut faire :**
- Créer un composant `<Select>` avec les props :
  ```tsx
  interface SelectProps {
    value: string
    onChange: (value: string) => void
    options: { value: string; label: string }[]
    placeholder?: string
    disabled?: boolean
    className?: string
  }
  ```
- Appliquer les classes CSS communes définies dans le projet (`SELECT_CLS`)
- Exporter depuis `components/shared/index.ts`
- Remplacer progressivement les `<select>` dans les pages les plus importantes (delivery, admins)

**Critère de validation :** Le composant s'affiche correctement en thème clair et sombre.

---

#### [x] ÉTAPE 13 — Ajouter l'export CSV sur les pages liste (livreurs, commandes, clients)

**Fichiers à créer :**
- `apps/admin/src/lib/exportCSV.ts`

**Fichiers à modifier :**
- `apps/admin/src/features/delivery/pages/AdminDeliveryListPage.tsx`
- `apps/admin/src/features/orders/pages/AdminOrderListPage.tsx`
- `apps/admin/src/features/customers/pages/AdminCustomerListPage.tsx`

**Ce qu'il faut faire :**
- Créer une fonction utilitaire `exportToCSV(data: object[], filename: string)` dans `lib/exportCSV.ts`
- Ajouter un bouton "Exporter CSV" dans le header de chaque page liste, visible uniquement si la permission `*.export` est accordée
- L'export doit porter sur **les données filtrées actuelles** (pas tout le dataset)
- Format CSV : encodage UTF-8 avec BOM pour compatibilité Excel/LibreOffice

**Critère de validation :** Cliquer sur "Exporter CSV" télécharge un fichier `.csv` avec les données de la liste courante.

---

#### [x] ÉTAPE 14 — Corriger les incohérences de thème

**Fichiers à modifier :**
- `apps/admin/src/components/layout/Sidebar.tsx`
- Tous les fichiers contenant des `<select>` ou `<option value="">` sans style adapté

**Ce qu'il faut faire :**

1. **Option "Tous" dans les selects :** Ajouter `className="text-gray-400"` sur les `<option value="">` pour éviter l'invisible en thème clair
2. **Sidebar thème clair :** Si le thème clair est souhaité homogène, remplacer :
   ```css
   /* Actuel (toujours sombre) */
   bg-gray-900
   /* Nouveau (adaptatif) */
   bg-white dark:bg-gray-900
   border-gray-200 dark:border-gray-800
   ```
   Et adapter les textes : `text-gray-700 dark:text-gray-400`
3. **Liens actifs du sidebar en thème clair :** Mettre à jour la classe active pour qu'elle soit visible sur fond blanc

**Critère de validation :** En mode thème clair, le sidebar est lisible sur fond blanc. En mode thème sombre, rien ne change.

---

## Récapitulatif de progression

| # | Étape | Priorité | Statut |
|---|-------|----------|--------|
| 1 | Champ `country` dans `DeliveryPerson` | 🔴 Critique | ✅ Terminé |
| 2 | Référentiel géographique Pays/Régions | 🔴 Critique | ✅ Terminé |
| 3 | Formulaire livreur : sélection Pays → Région | 🔴 Critique | ✅ Terminé |
| 4 | Filtres liste livreurs : Pays + Région | 🔴 Critique | ✅ Terminé |
| 5 | Formulaire livreur : champs manquants | 🔴 Critique | ✅ Terminé |
| 6 | Rôle `logistics_admin` + permissions | 🟠 Important | ✅ Terminé |
| 7 | Filtre rôle dynamique dans AdminAdminListPage | 🟠 Important | ✅ Terminé |
| 8 | Page détail livreur `/delivery/:id` | 🟠 Important | ✅ Terminé |
| 9 | AssignForm : liste de commandes disponibles | 🟠 Important | ✅ Terminé |
| 10 | Messagerie inter-admins | 🟡 Amélioration | ✅ Terminé |
| 11 | Badge non-lus dans Sidebar | 🟡 Amélioration | ✅ Terminé |
| 12 | Composant `Select` réutilisable | 🟡 Amélioration | ✅ Terminé |
| 13 | Export CSV pages liste | 🟡 Amélioration | ✅ Terminé |
| 14 | Incohérences de thème | 🟡 Amélioration | ✅ Terminé |

---

## Notes techniques

- **Architecture à respecter :** `écran → hook → service → données` (voir README.md)
- **Pas d'import direct de mocks** depuis les pages ou hooks
- **Vérification :** Après chaque étape, exécuter `npm run check:arch` depuis la racine
- **TypeScript :** Toujours compiler sans erreur avant de passer à l'étape suivante
- **Dark mode :** Toute nouvelle UI doit inclure les variants `dark:` Tailwind
- **Permissions :** Tout bouton d'action destructif doit être enveloppé dans `<PermissionGuard>`
