# ExpressAfri - Plan de refonte Navigation, Boutiques et Catalogue

# ExpressAfri - Plan de refonte Navigation, Boutiques et Catalogue
## 1\. Compréhension du paradigme cible
L’application doit passer d’un modèle centré sur un feed social d’inspiration à un modèle **marketplace multi-boutiques** :
*   **Accueil** : flux global de produits actifs provenant de toutes les boutiques.
*   **Catégories** : navigation taxonomique globale, avec catégories et sous-catégories.
*   **Boutique** : découverte sociale des vendeurs, cartes visuelles, logo, photos, likes/suivis.
*   **Détail boutique** : identité de la boutique, catégories/sous-catégories et catalogue de ses produits.
*   **Panier, commande, paiement** : restent transversaux et ne doivent pas casser le `storeId` des produits.
*   **Admin** : devient la source de vérité pour les boutiques, leur identité visuelle, leurs produits, leur statut et leur contenu.

Le feed `feed_posts` ne doit pas être supprimé immédiatement. Il faut d’abord retirer son accès de la tabbar, conserver ses routes pour compatibilité, puis migrer ou archiver proprement les données après validation.

* * *
## 2\. État réel observé avant modification
### Navigation mobile actuelle
Dans `app/(tabs)/_layout.tsx` :
*   `store` utilise l’icône `store` et le libellé `tabs.store`.
*   `feed` utilise le bouton central `+` et le libellé `tabs.feed`.
*   Le bouton central ouvre actuellement l’espace Inspiration/feed.

Dans `app/(tabs)/store.tsx` :
*   l’écran affiche déjà des catégories, sous-catégories et produits par catégorie;
*   il possède un drawer de catégories;
*   les sous-catégories utilisent maintenant leur `id` pour ouvrir `/category/:id`;
*   ce fichier doit donc devenir clairement l’écran **Catégories**, pas l’écran Boutique.
### Backend mobile actuel
`MobileController` expose déjà :
*   `GET /mobile/stores`
*   `GET /mobile/stores/followed`
*   `POST /mobile/stores/:id/follow`
*   `POST /mobile/stores/:id/unfollow`

Mais il n’expose pas encore clairement :
*   le détail complet d’une boutique;
*   le catalogue d’une boutique par identifiant;
*   les catégories d’une boutique;
*   le logo et les photos administrables d’une boutique.
### Base de données actuelle
`stores` contient actuellement principalement : nom, email, téléphone, pays, ville, description, statut et commission.

`store_follows` existe déjà avec une contrainte unique `(customerId, storeId)`. Cette relation doit être réutilisée pour le bouton « J’aime » ou « Suivre », plutôt que de créer une seconde relation concurrente.

Le schéma ne contient pas encore de table dédiée aux médias de boutique. La DataSource Admin renvoie actuellement `logoUrl: null`, `productCount: 0`, `totalOrders: 0` et `revenue: 0` dans `toStore()`. Ce sont des valeurs de façade, pas des données synchronisées.
### Admin actuel
`AdminStoreListPage.tsx` permet déjà :
*   création, modification et suppression de boutiques;
*   approbation, rejet et suspension;
*   navigation vers le détail;
*   gestion KYC et managers via les routes backend existantes.

Mais le formulaire Admin ne gère pas encore réellement :
*   le logo de boutique;
*   plusieurs photos de boutique;
*   l’ordre des photos;
*   la prévisualisation publique exacte;
*   les statistiques réelles calculées depuis les produits, commandes et paiements.

* * *
## 3\. Architecture cible recommandée

```plain
flowchart LR
  A[Admin Boutique] --> AS[Store DataSource Admin]
  AS --> API[/api/stores/*]
  API --> SC[StoresController]
  SC --> SS[StoresService]
  SS --> DB[(stores + store_media + store_follows)]

  M[Mobile Accueil] --> MP[Product DataSource]
  MP --> MAPI[/api/mobile/products]
  MAPI --> DBP[(products + variants + images)]

  B[Mobile Boutique] --> BS[Store DataSource Mobile]
  BS --> SAPI[/api/mobile/stores/:id/*]
  SAPI --> SS
  SS --> DB
  SS --> DBP

  C[Mobile Catégories] --> CAT[/api/mobile/categories/:id/*]
  CAT --> DBP
```

### Règle d’ownership
*   `stores` possède l’identité de la boutique.
*   `store_media` possède les images/logo de présentation.
*   `products.storeId` rattache chaque produit à une boutique.
*   `categories.storeId` reste compatible avec les catégories globales et boutique.
*   `store_follows` représente l’action sociale du client.
*   L’Admin ne doit jamais écrire directement en base, uniquement via API.
*   Le Mobile ne doit jamais recevoir des données d’une boutique inactive, rejetée ou suspendue.

* * *
## 4\. Modèle de données proposé
### Option recommandée: table `store_media`
Ne pas mettre un tableau d’URLs dans `stores`. Utiliser une table dédiée pour gérer plusieurs photos et leur ordre :

```sql
CREATE TABLE store_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- logo | cover | gallery
  url TEXT NOT NULL,
  alt TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

Ajouter une contrainte ou un index pour garantir un seul logo actif par boutique.
### Réutiliser `store_follows`
Le bouton mobile peut être présenté comme « J’aime » dans l’interface, mais le backend conserve la sémantique `follow/unfollow`. Cela évite de créer `store_likes` et de dupliquer les compteurs.

Si la différence métier entre like et follow devient importante plus tard, créer alors une table séparée avec une migration explicite.

* * *
## 5\. Contrats API à ajouter
### Mobile

```plain
GET  /api/mobile/stores
GET  /api/mobile/stores/:id
GET  /api/mobile/stores/:id/products
GET  /api/mobile/stores/:id/categories
GET  /api/mobile/stores/:id/follow-status
POST /api/mobile/stores/:id/follow
POST /api/mobile/stores/:id/unfollow
```

Réponse minimale d’une boutique :

```plain
{
  id: string;
  name: string;
  description: string | null;
  country: string;
  city: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  photos: string[];
  followersCount: number;
  likedByMe: boolean;
  productCount: number;
}
```

`GET /mobile/stores/:id/products` doit accepter au minimum :

```plain
categoryId, search, minPrice, maxPrice, sort, limit, offset
```

### Admin

```plain
POST /api/stores/:id/logo
POST /api/stores/:id/media
PUT  /api/stores/:id/media/:mediaId
DELETE /api/stores/:id/media/:mediaId
PUT  /api/stores/:id/media/reorder
```

La réponse Admin doit renvoyer les mêmes champs de boutique que le Mobile, plus les métadonnées privées nécessaires au panneau.

* * *
## 6\. Plan d’implémentation par phases
### Phase A, navigation sans risque
1. Modifier `TAB_CONFIG` :
    *   `store` devient `categories` visuellement, en conservant éventuellement le nom de route interne pour éviter une migration Expo Router immédiate;
    *   icône `store` remplacée par l’icône catégories existante, ou ajout d’une icône `category` dans `src/icons`;
    *   label `tabs.categories`.
2. Le bouton central `+` navigue vers l’espace boutiques.
3. Retirer le feed Inspiration de la tabbar sans supprimer immédiatement `app/(tabs)/feed.tsx` ni les routes backend `feed`.
4. Ajouter un écran boutiques dédié, idéalement `app/stores/index.tsx`, avec le design masonry inspiré de l’ancien feed.
5. Garder les deep links du feed jusqu’à la fin de la migration.
### Phase B, contrats et données boutique
1. Ajouter `store_media` et la migration Drizzle.
2. Ajouter les routes détail/catalogue/catégories boutique.
3. Ajouter `StoreDataSource` Mobile et supprimer l’appel direct `apiAdapter` de `useHomeStores`.
4. Ajouter les méthodes Admin logo/media/reorder.
5. Ajouter les DTO et validations multipart.
6. Ajouter les compteurs calculés depuis la base, jamais `0` en fallback silencieux sauf état explicitement indisponible.
### Phase C, expérience boutiques Mobile
1. Cartes masonry ou grille asymétrique : logo, cover/photo, nom, pays, nombre de produits, compteur de likes.
2. Like/follow optimiste avec rollback en cas d’erreur.
3. Clic boutique vers `/stores/:id`.
4. Détail boutique : header visuel, logo, description, catégories, sous-catégories et produits.
5. Filtre par sous-catégorie avec son ID, pas avec son libellé.
6. Recherche et tri dans le catalogue boutique via le backend.
7. États loading, empty, error, retry et offline.
### Phase D, accueil catalogue global
1. Garder `GET /api/mobile/products` sans `storeId` pour l’accueil global.
2. Ajouter un filtre optionnel `storeId` seulement pour les pages boutique.
3. Afficher le nom/logo de la boutique dans les cartes produit si nécessaire.
4. Vérifier que les produits inactifs, non approuvés ou appartenant à une boutique non active ne remontent jamais.
5. Ajouter pagination/infinite query pour éviter de charger tout le catalogue.
### Phase E, Admin source de vérité
1. Ajouter une section « Identité boutique » : logo, cover, galerie.
2. Ajouter une section « Catégories boutique » et filtrer les catégories par `storeId`.
3. Ajouter la prévisualisation exacte de la carte publique.
4. Invalider après mutation : boutiques, détail boutique, catalogue mobile, catégories boutique, compteurs.
5. Remplacer les champs façade `logoUrl: null`, `productCount: 0`, `revenue: 0` par des données API réellement calculées.
6. Tester les permissions super-admin versus gérant de boutique.
### Phase F, migration du feed Inspiration
1. Ne pas supprimer `feed_posts` maintenant.
2. Désactiver l’entrée de navigation et les CTA qui ouvrent l’Inspiration.
3. Marquer le module comme legacy dans la documentation.
4. Décider ensuite si les anciens posts sont archivés, convertis en contenu boutique ou supprimés dans une migration dédiée.

* * *
## 7\. Cache et synchronisation
Clés React Query recommandées :

```plain
['stores', params]
['store', storeId]
['store', storeId, 'products', params]
['store', storeId, 'categories']
['store', storeId, 'follow-status']
['products', params]
['categories', params]
```

Après modification Admin d’une boutique :
*   invalider `stores`;
*   invalider `store/:id`;
*   invalider `store/:id/products`;
*   invalider `store/:id/categories`;
*   invalider les queries d’accueil si le statut ou le branding change.

Pour les changements de statut boutique, logo et catalogue, utiliser `staleTime: 0` ou une invalidation ciblée. Ne pas promettre du temps réel tant qu’aucun WebSocket/SSE n’est en place.

* * *
## 8\. Risques à éviter
*   Renommer physiquement la route `store` en `categories` trop tôt et casser les deep links.
*   Supprimer le feed avant migration des liens et données.
*   Ajouter des likes boutique en parallèle de `store_follows`.
*   Afficher des logos/photos mockés lorsque l’Admin n’a pas encore de source réelle.
*   Calculer `productCount` côté frontend.
*   Charger toutes les boutiques et tous leurs produits dans une seule réponse.
*   Mélanger catégories globales et catégories boutique sans règle de priorité.
*   Réutiliser les anciens composants Inspiration sans vérifier leurs props, images, ratio, loading et accessibilité.

* * *
## 9\. Tests à écrire avant le build preview
### Backend
*   Boutique inactive absente de `GET /mobile/stores`.
*   Boutique active visible avec logo et photos.
*   Boutique inexistante: 404.
*   Produits filtrés par `storeId` et sous-catégorie.
*   Client A ne voit pas le statut privé de la boutique d’un autre client.
*   Follow/unfollow idempotent.
*   Suppression media et réordonnancement.
*   Permission gérant versus super-admin.
### Mobile
*   Tab Categories ouvre réellement les catégories.
*   Bouton central ouvre les boutiques.
*   Carte boutique ouvre le détail.
*   Like ajoute/retire sans doublon.
*   Sous-catégorie ouvre les bons produits.
*   Accueil affiche des produits de plusieurs boutiques.
*   Erreur et état vide correctement rendus.
### Admin
*   Création boutique → visible dans Admin et Mobile après refetch.
*   Upload logo/cover/photo → URLs accessibles.
*   Changement statut → boutique absente du Mobile si rejetée/suspendue.
*   Ajout produit à une boutique → compteur et catalogue boutique mis à jour.
*   Ajout sous-catégorie → visible dans Admin et Mobile.
*   Deux comptes Admin avec permissions différentes voient des actions différentes.

* * *
## 10\. Décision de conception recommandée
La meilleure trajectoire est :
*   **Tab 2 = Catégories**, route interne conservée au début;
*   **Bouton central = Boutiques**, nouvel écran dédié inspiré visuellement du masonry actuel;
*   **Accueil = catalogue global**, sans filtre boutique par défaut;
*   **Boutique = relation sociale + catalogue**, réutilisant `store_follows`;
*   **Feed Inspiration = legacy masqué**, conservé temporairement pour ne pas casser les données;
*   **Admin = gestion complète de l’identité boutique et de ses médias**;
*   **API = nouveaux contrats boutique explicites**, avec pagination et `storeId` contrôlé côté serveur.

Ne pas lancer le build preview avant d’avoir verrouillé la Phase A et les contrats de la Phase B. Le premier build doit valider la navigation et les réponses API de boutiques, pas seulement l’apparence de la tabbar.

* * *
## 11\. Clarification fonctionnelle définitive
La refonte ne consiste pas à renommer l’ancien écran Boutique. Elle introduit deux espaces distincts:

| Zone | Rôle | Contenu principal | Action dominante |
| ---| ---| ---| --- |
| Accueil | Découverte globale | Produits actifs de toutes les boutiques | Ouvrir une fiche produit |
| Catégories | Navigation catalogue | Catégories globales fusionnées, sous-catégories et filtres | Ouvrir une liste de produits |
| Boutiques | Découverte des vendeurs | Cartes de boutiques avec logo, cover/photos, likes, note et avis | Ouvrir le catalogue d’une boutique |
| Détail boutique | Espace vendeur | Identité, sections, catégories, sous-catégories, produits | Parcourir ou suivre la boutique |

Le bouton central ne doit donc plus représenter `feed_posts` ou l’Inspiration. Il ouvre directement la liste des boutiques. L’ancien feed Inspiration est conservé en legacy, mais retiré de la navigation principale.
## 12\. Navigation mobile cible

```plain
flowchart LR
  HOME[Accueil] --> PRODUCTS[Flux global de produits]
  CATEGORIES[Catégories] --> CATEGORY_DRAWER[Modal latérale catégories globales]
  CATEGORY_DRAWER --> CATEGORY_LIST[Catégorie ou sous-catégorie]
  CATEGORY_LIST --> PRODUCT_LIST[Produits filtrés]
  SHOPS[Bouton central: Boutiques] --> SHOP_CARDS[Cartes de boutiques]
  SHOP_CARDS --> SHOP_DETAIL[Détail boutique]
  SHOP_DETAIL --> SHOP_SECTIONS[Sections et catégories boutique]
  SHOP_SECTIONS --> SHOP_PRODUCTS[Produits de la boutique]
  SHOP_DETAIL --> FOLLOW[Like / Suivre]
  FOLLOW --> STORE_FOLLOWS[(store_follows)]
```

### Tabbar

| Position | Route interne recommandée | Libellé visible | Icône |
| ---| ---| ---| --- |
| 1 | `index` | Accueil | `home` |
| 2 | `store` conservée temporairement | Catégories | Icône `category` ou `grid` |
| 3 | route `stores` ou écran dédié | Boutiques | `store` |
| 4 | `cart` | Panier | `cart` |
| 5 | `account` | Compte | `account` |

Si Expo Router impose de conserver cinq routes sous `(tabs)`, le bouton central peut naviguer vers `/stores` sans exposer `feed` dans la tabbar. Ne pas renommer physiquement `store.tsx` avant d’avoir traité les deep links.
## 13\. Cartes de boutiques, pas cartes de produits
Une carte de boutique doit utiliser un contrat dédié:

```plain
type StoreCard = {
  id: string;
  name: string;
  logoUrl: string | null;
  coverUrl: string | null;
  previewPhotos: string[];
  country: string;
  city?: string | null;
  followersCount: number;
  rating: number | null;
  reviewCount: number;
  productCount: number;
  likedByMe: boolean;
  status: 'approved';
};
```

La carte ne doit pas afficher un `ProductCard` déguisé. Elle doit montrer:
*   logo ou avatar de boutique;
*   cover ou mosaïque de photos;
*   nom et localisation;
*   note et nombre d’avis;
*   compteur de likes/suivis;
*   nombre de produits;
*   bouton like avec mise à jour optimiste et rollback;
*   clic sur toute la carte vers `/stores/:id`.

Le clic sur le bouton like ne doit pas ouvrir la boutique. Le clic sur le reste de la carte l’ouvre.
## 14\. Détail boutique et contenu administrable
Le détail boutique doit être un mini-espace de vente, pas seulement une liste de produits:

```plain
Header boutique
  logo + cover + nom + note + avis + likes
  bouton suivre/liker
  description + localisation

Sections de boutique
  sections configurées par le boutiquier
  catégories et sous-catégories de la boutique
  produits de chaque section
  recherche et filtres dans la boutique
```

### Droits de gestion

| Action | Boutiquier de sa boutique | Admin central |
| ---| ---| --- |
| Modifier nom, description, localisation | Oui | Oui |
| Modifier logo, cover et galerie | Oui | Oui |
| Créer une section boutique | Oui | Oui |
| Créer une catégorie boutique | Oui | Oui |
| Créer une sous-catégorie boutique | Oui | Oui |
| Ajouter/modifier ses produits | Oui | Oui |
| Activer/désactiver une section | Oui | Oui |
| Activer/désactiver une catégorie | Oui | Oui |
| Approuver ou suspendre une boutique | Non | Oui |
| Modifier commission/KYC | Non | Oui |
| Voir les données d’une autre boutique | Non | Oui selon permission |

Le `storeId` ne doit jamais venir d’un champ libre soumis par le boutiquier. Le backend doit le prendre depuis le JWT du manager et refuser toute écriture sur une autre boutique.
## 15\. Catégories globales: modal latérale et règles de fusion
Le deuxième bouton ouvre une modal latérale de gauche vers la droite. Cette modal ne doit pas afficher une liste plate ambiguë.
### Structure recommandée

```plain
Modal Catégories
  Recherche de catégorie
  Toutes les catégories
    Catégorie globale
      Sous-catégories globales
    Catégorie boutique
      Nom de la boutique
      Sous-catégories boutique
  Boutiques
    Boutique A
      Catégories de Boutique A
    Boutique B
      Catégories de Boutique B
```

### Règle de fusion
*   Une catégorie globale identique doit être dédupliquée par identifiant, pas seulement par nom.
*   Une catégorie boutique doit conserver son `storeId` et son `id`.
*   Le libellé peut afficher le nom de la boutique pour éviter les collisions.
*   Une sélection doit naviguer par identifiant:

```plain
/category/:categoryId
/stores/:storeId/categories/:categoryId
```

*   Le backend reste la source de vérité pour les produits disponibles.
*   Les catégories inactives, liées à une boutique rejetée ou suspendue, ne remontent pas dans la modal publique.
## 16\. API finale à implémenter
### Boutiques publiques Mobile

```plain
GET  /api/mobile/stores
GET  /api/mobile/stores/:storeId
GET  /api/mobile/stores/:storeId/products
GET  /api/mobile/stores/:storeId/categories
GET  /api/mobile/stores/:storeId/sections
GET  /api/mobile/stores/:storeId/reviews
GET  /api/mobile/stores/:storeId/follow-status
POST /api/mobile/stores/:storeId/follow
POST /api/mobile/stores/:storeId/unfollow
```

Paramètres communs:

```plain
search, categoryId, minPrice, maxPrice, minRating, sort, limit, offset
```

### Admin boutique

```plain
GET    /api/stores
GET    /api/stores/:storeId
PUT    /api/stores/:storeId
PATCH  /api/stores/:storeId/status
GET    /api/stores/:storeId/sections
POST   /api/stores/:storeId/sections
PUT    /api/stores/:storeId/sections/:sectionId
DELETE /api/stores/:storeId/sections/:sectionId
PUT    /api/stores/:storeId/sections/reorder
GET    /api/stores/:storeId/categories
POST   /api/stores/:storeId/categories
PUT    /api/stores/:storeId/categories/:categoryId
DELETE /api/stores/:storeId/categories/:categoryId
POST   /api/stores/:storeId/media
PUT    /api/stores/:storeId/media/reorder
DELETE /api/stores/:storeId/media/:mediaId
```

Les méthodes Admin doivent être présentes dans `ApiAdminStoreDataSource`; les appels Mobile doivent passer par une `StoreDataSource` dédiée, pas par des `apiAdapter` directs dans les écrans.
## 17\. Base de données cible
Tables à conserver:

```plain
stores
store_follows
categories
products
product_variants
product_images
```

Tables à ajouter ou confirmer:

```plain
store_media
store_sections
store_section_items
store_reviews
```

`store_reviews` peut être remplacée par une vue agrégée des avis boutiques si les avis sont déjà rattachés aux commandes ou aux clients. La décision doit être explicite avant migration.

Contraintes obligatoires:
*   `store_media.storeId` avec cascade contrôlée;
*   un seul logo principal actif par boutique;
*   unicité de `(customerId, storeId)` pour les likes/suivis;
*   impossibilité d’un cycle dans `categories.parentId`;
*   index sur `products.storeId`, `products.categoryId`, `categories.storeId`;
*   aucun produit public si `stores.status != approved`;
*   aucun produit public si `products.status != active`.
## 18\. Cache et synchronisation
Clés React Query:

```plain
['stores', filters]
['store', storeId]
['store', storeId, 'products', filters]
['store', storeId, 'categories']
['store', storeId, 'sections']
['store', storeId, 'reviews']
['store', storeId, 'follow-status']
['categories', filters]
['products', filters]
```

Mutation Admin boutique:

1. sauvegarder via API;
2. invalider le détail boutique;
3. invalider la liste boutiques;
4. invalider les catégories/sections/produits boutique;
5. invalider l’accueil si le statut, le logo ou une section visible change;
6. afficher le résultat serveur, pas seulement un état optimiste permanent.
## 19\. Ordre de réalisation sans casser l’existant
### Étape 1: contrats et migrations
*   ajouter les schémas et migrations;
*   ajouter les DTO et permissions;
*   ajouter les routes backend sans modifier la tabbar;
*   tester les réponses avec données de seed.
### Étape 2: Admin
*   identité boutique;
*   logo, cover, galerie;
*   sections;
*   catégories et sous-catégories;
*   produits et compteurs;
*   prévisualisation carte publique.
### Étape 3: Mobile boutiques
*   `StoreDataSource`;
*   liste de cartes boutiques;
*   détail boutique;
*   likes/suivis;
*   sections et catalogue boutique;
*   filtres et pagination.
### Étape 4: Navigation
*   renommer visuellement `store` en Catégories;
*   ajouter l’icône catégories;
*   faire pointer le bouton central vers Boutiques;
*   retirer Inspiration de la tabbar;
*   conserver les routes legacy.
### Étape 5: Accueil global
*   vérifier le flux multi-boutiques;
*   afficher l’origine boutique sur les produits si nécessaire;
*   filtrer les boutiques et produits non publiables;
*   tester le refetch après mutation Admin.
### Étape 6: suppression différée du legacy
*   mesurer l’usage du feed Inspiration;
*   migrer les liens;
*   archiver les données;
*   supprimer seulement après validation et migration.
## 20\. Critères d’acceptation
La refonte est acceptée seulement si:
*   le bouton central ouvre des cartes de boutiques, jamais des produits;
*   chaque carte affiche logo/photos, likes, note, avis et nombre de produits;
*   le clic carte ouvre le catalogue de la bonne boutique;
*   le like est propre à l’utilisateur, idempotent et reflété par le compteur;
*   un boutiquier ne peut modifier que sa boutique;
*   l’Admin central peut administrer les sections, catégories, médias et produits;
*   la modal Catégories fusionne les catégories de toutes les boutiques sans collisions;
*   une sous-catégorie ouvre les produits par ID;
*   l’Accueil affiche les produits de plusieurs boutiques;
*   aucune boutique suspendue ou produit inactif n’est visible publiquement;
*   les listes sont paginées;
*   les erreurs, états vides, loading, retry et offline sont gérés;
*   aucune route legacy ne casse les deep links existants;
*   les tests backend, mobile typecheck, Admin build et E2E staging passent.

* * *
## 21\. Multi-vendeur: autonomie complète de chaque boutique
Le modèle cible est celui d’une marketplace multi-vendeurs. L’Admin central conserve la supervision globale, la modération, le KYC, les statuts, les commissions, les permissions et la conformité. Chaque boutiquier gère uniquement l’activité de sa boutique: identité, médias, moyens de paiement autorisés, zones de livraison, livreurs, produits, sections, catégories et présentation du catalogue.
### Règle d’ownership non négociable
*   Le `storeId` d’un boutiquier est résolu depuis son JWT, son rôle et son rattachement manager, jamais depuis une valeur librement fiable envoyée par le frontend.
*   Toute lecture, création, modification, suppression, upload, affectation et réordonnancement doit appliquer un filtre serveur sur ce `storeId`.
*   Un boutiquier ne peut ni changer de `storeId`, ni lire les secrets, commandes, livreurs, zones, produits ou statistiques d’une autre boutique.
*   L’Admin central peut filtrer et administrer toutes les boutiques selon ses permissions, mais doit utiliser les mêmes services métier et les mêmes contrôles d’intégrité.
*   Une boutique suspendue, rejetée ou désactivée ne doit plus être publiable sur Mobile, même si ses produits sont encore marqués actifs.
### Matrice des responsabilités

| Domaine | Boutiquier de sa boutique | Admin central |
| ---| ---| --- |
| Nom, description, téléphone, adresse, horaires | Gérer | Gérer et contrôler |
| Logo, cover, galerie et visuels | Gérer | Gérer, modérer et supprimer |
| Moyens de paiement et visuels | Configurer les options autorisées | Définir les providers autorisés, contrôler et auditer |
| Secrets techniques PSP/Mobile Money | Utiliser un formulaire masqué, jamais relire le secret brut | Configurer ou valider selon politique |
| Zones de livraison et tarifs | Gérer ses zones | Voir, modifier et imposer des règles globales |
| Livreurs et assignations | Gérer ses livreurs | Voir tous les livreurs, suspendre, réassigner et auditer |
| Produits, variantes, stock et images | CRUD sur ses produits | CRUD global, modération et publication |
| Sections, catégories, sous-catégories | Gérer sa vitrine | Gérer globalement et modérer |
| Style des cartes produit | Choisir le style global de sa boutique et celui de chaque section | Définir les quatre layouts disponibles et les règles de marque |
| Statut, KYC, commission, permissions | Non | Oui |
| Données d’autres boutiques | Non | Oui selon permission |

Le frontend peut masquer une action non autorisée pour l’UX, mais la sécurité réelle doit être garantie par les guards, policies et filtres du backend.
## 22\. Paiements cloisonnés par boutique
### Principe
Les moyens de paiement ne sont pas une configuration globale appliquée indistinctement à toutes les boutiques. Chaque boutique possède sa propre configuration, ses propres visuels et ses propres règles d’activation. L’Admin central définit le catalogue de providers et les contraintes de conformité; le boutiquier active et configure seulement les options autorisées pour sa boutique.

Une boutique peut accepter par exemple Mobile Money uniquement, une autre carte bancaire uniquement, une autre les deux, et une autre le paiement à la livraison si cette option est autorisée dans son pays et sa zone.
### Modèle de données cible
Conserver les tables de paiement existantes pour les transactions et ajouter une configuration par boutique, sans réutiliser une ligne globale ambiguë:

```plain
store_payment_methods
  id
  storeId
  type                 mobile_money | card | wallet | cash_on_delivery
  provider             code du provider réellement utilisé
  displayName
  description
  logoUrl
  iconUrl
  instructions
  countries            pays autorisés si nécessaire
  isEnabled
  isPublic
  sortOrder
  metadataPublic       JSON sans secret
  secretRef            référence vers le secret chiffré/vault
  createdAt
  updatedAt

store_payment_method_configs
  id
  storePaymentMethodId
  key
  valueEncrypted       uniquement pour les champs sensibles
  valuePublic
  createdAt
  updatedAt
```

Si le repository possède déjà une table équivalente, la réutiliser après vérification du `storeId`; ne pas créer un doublon concurrent. Les tables de transactions existantes doivent rester la source de vérité pour les paiements déjà effectués.
### Séparation des données visibles et sensibles
*   Le boutiquier peut voir le type, le provider, le libellé, le logo, l’état d’activation et les champs publics.
*   Les clés API, secrets, tokens, mots de passe PSP et informations équivalentes ne sont jamais renvoyés par l’API après sauvegarde.
*   Les secrets doivent être chiffrés au repos ou stockés via le mécanisme de secrets déjà utilisé par l’application; `secretRef` ne doit pas contenir la valeur brute.
*   Les réponses Admin et Mobile doivent masquer les champs techniques sensibles.
*   Les changements sensibles doivent produire un audit log avec acteur, boutique, provider, action et résultat, sans écrire le secret dans les logs.
*   Un boutiquier ne peut configurer que les providers déclarés disponibles par l’Admin central.
### Visuels et expérience de paiement
Pour chaque moyen de paiement, le boutiquier doit pouvoir configurer, selon les droits accordés:
*   le nom visible;
*   le logo ou pictogramme;
*   la description;
*   les instructions client;
*   l’ordre d’affichage;
*   l’activation ou désactivation;
*   les pays ou devises compatibles;
*   le provider effectivement utilisé.

Les visuels suivent le même pipeline que les autres médias: upload validé, URL absolue, type MIME contrôlé, taille limitée, suppression et audit. Le Mobile ne reçoit que les méthodes `isEnabled = true`, `isPublic = true`, compatibles avec le pays, la devise, la commande et la zone de livraison.
### Contrats API cible
Ces routes sont des contrats à implémenter ou à aligner sur les routes existantes après vérification du dépôt. Elles ne doivent pas être considérées comme déjà présentes tant que le contrôleur, le DataSource et le test d’intégration ne les confirment pas.

```plain
GET    /api/stores/:storeId/payment-methods
POST   /api/stores/:storeId/payment-methods
PUT    /api/stores/:storeId/payment-methods/:methodId
DELETE /api/stores/:storeId/payment-methods/:methodId
PUT    /api/stores/:storeId/payment-methods/reorder
POST   /api/stores/:storeId/payment-methods/:methodId/validate

GET    /api/mobile/stores/:storeId/payment-methods
POST   /api/mobile/orders/:orderId/payment/initialize
GET    /api/mobile/orders/:orderId/payment-options
```

Le endpoint public ne doit jamais accepter un `methodId` d’une autre boutique. Le backend doit recalculer l’éligibilité à partir des lignes de commande, de leur `storeId`, du pays de livraison, de la devise et du statut de la boutique.
## 23\. Commande multi-boutiques et résolution du paiement
Le panier global peut contenir des produits de plusieurs boutiques, mais le checkout doit conserver le rattachement boutique de chaque ligne. Le contrat historique de création de commande ne doit pas être cassé sans migration.
### Flux cible

```plain
sequenceDiagram
  participant M as Mobile
  participant O as Orders API
  participant S as Store services
  participant P as Payment service
  participant D as Delivery service
  participant DB as PostgreSQL

  M->>O: créer checkout avec lignes et idempotency key
  O->>DB: vérifier produits, stock, statut et storeId
  O->>S: regrouper les lignes par boutique
  S->>DB: résoudre payment methods et shipping zones de chaque boutique
  S-->>O: options éligibles par boutique
  O-->>M: récapitulatif, sous-totaux, livraison, options de paiement
  M->>O: confirmer méthode(s) choisie(s)
  O->>P: initialiser chaque transaction selon la boutique/provider
  O->>D: créer ou préparer les expéditions par boutique
  P-->>O: pending/processing/paid/failed
  O->>DB: persister statut, boutique, méthode, livraison et audit
  O-->>M: résultat serveur, jamais succès optimiste définitif
```

### Décision de compatibilité
*   Conserver `orders` et les routes de commande existantes si elles sont déjà utilisées.
*   Ajouter au minimum `storeId` sur les lignes de commande ou une table de regroupement équivalente.
*   Si une commande parent existe déjà, introduire `order_store_groups` ou un champ équivalent pour les sous-totaux, paiements, livraisons et statuts par boutique.
*   Ne pas supposer qu’un paiement unique peut régler plusieurs providers ou plusieurs boutiques: le service doit produire une transaction par unité de paiement réellement nécessaire.
*   Le panier ne doit être vidé qu’après le résultat accepté par le serveur et, pour un paiement PSP, après l’état attendu défini par le provider.
*   Toute création doit être idempotente: double clic, retry réseau et webhook répété ne doivent pas créer de doublon.
### Tables ou modèles concernés

```plain
orders
order_items
order_store_groups          nouvelle table si nécessaire
payments
store_payment_methods
payment_transactions        si le repository possède déjà ce modèle
shipping_zones
delivery_assignments
products
stores
```

## 24\. Zones de livraison propres à chaque boutique
Chaque boutique définit ses territoires desservis, ses règles de prix et ses délais sans modifier les zones d’une autre boutique.
### Modèle de données cible

```plain
shipping_zones
  id
  storeId
  name
  countryCode
  regionCode
  city
  postalCodePattern
  deliveryFee
  freeShippingThreshold
  estimatedMinDays
  estimatedMaxDays
  isEnabled
  sortOrder
  createdAt
  updatedAt
```

Une zone peut être géographique, par pays/région/ville ou par motif postal selon ce que le code réel supporte déjà. La priorité et les collisions doivent être déterministes: zone la plus spécifique, puis ordre explicite, puis fallback interdit si aucune zone ne correspond.
### Contrats API cible

```plain
GET    /api/stores/:storeId/shipping-zones
POST   /api/stores/:storeId/shipping-zones
PUT    /api/stores/:storeId/shipping-zones/:zoneId
DELETE /api/stores/:storeId/shipping-zones/:zoneId
PUT    /api/stores/:storeId/shipping-zones/reorder

GET    /api/mobile/stores/:storeId/shipping-zones
POST   /api/mobile/checkout/shipping-quotes
```

Le devis de livraison doit être calculé côté serveur à partir de l’adresse, des groupes boutique, du poids ou montant si ces données existent et de la zone active de chaque boutique. Une adresse peut être livrable pour une boutique et refusée pour une autre; le Mobile doit l’afficher clairement.
## 25\. Livreurs et opérations de livraison par boutique
Les livreurs peuvent être internes à une boutique ou rattachés à un partenaire global, mais l’assignation opérationnelle doit toujours être contrôlée par boutique.
### Modèle de données cible

```plain
store_couriers
  id
  storeId
  userId | externalName
  phone
  vehicleType
  serviceAreas
  status                  active | suspended | archived
  createdAt
  updatedAt

delivery_assignments
  id
  storeId
  orderId | orderStoreGroupId
  courierId
  status
  assignedAt
  pickedUpAt
  deliveredAt
  notes
```

### Règles
*   Un boutiquier ne peut créer, modifier, suspendre ou assigner qu’un livreur de sa boutique.
*   Un livreur ne peut recevoir une course que dans une zone et une boutique compatibles.
*   L’Admin central peut voir toutes les assignations, réassigner en cas d’escalade et auditer les changements.
*   Le statut d’une livraison ne doit pas modifier directement le statut de paiement sans passer par le service de commande.
*   Les écrans Admin et boutique doivent afficher les mêmes transitions de statut, avec une normalisation unique entre `snake_case` et `kebab-case` si le code actuel en utilise plusieurs.
## 26\. Profil, produits et catalogue gérés par le boutiquier
### Profil boutique
Le boutiquier doit pouvoir modifier:
*   nom commercial;
*   description;
*   téléphone et email public;
*   pays, ville, adresse et horaires;
*   logo;
*   cover;
*   galerie et ordre des photos;
*   liens publics ou réseaux si le modèle les supporte;
*   textes d’information client.

Les champs KYC, commission, statut d’approbation, propriétaire légal et secrets restent contrôlés par l’Admin central. Toute modification de profil doit être visible dans l’Admin et sur Mobile après refetch, sans exposer les champs privés.
### Produits
Le boutiquier peut créer, lire, modifier, archiver et demander la publication de ses produits, variantes, images, prix et stocks. Le backend doit imposer:

```plain
product.storeId = authenticatedManager.storeId
```

Pour un produit existant, toute mutation doit vérifier que le produit appartient à la boutique du token. Un `storeId` envoyé dans le body ne peut jamais remplacer cette vérification.

Contrats cible, à aligner sur les routes réelles:

```plain
GET    /api/stores/:storeId/products
POST   /api/stores/:storeId/products
GET    /api/stores/:storeId/products/:productId
PUT    /api/stores/:storeId/products/:productId
DELETE /api/stores/:storeId/products/:productId
POST   /api/stores/:storeId/products/:productId/submit
POST   /api/stores/:storeId/products/:productId/media
```

L’Admin central garde la modération et la capacité de publier, suspendre ou corriger un produit. Le Mobile ne montre que les produits publiables rattachés à une boutique approuvée.
## 27\. Sections, affectation de produits et layouts de cartes
### Objectif
Le catalogue doit supporter un style de cartes produit choisi:

1. globalement par l’Admin central comme valeur par défaut;
2. globalement par chaque boutique pour son catalogue;
3. localement par section pour une présentation spécifique;
4. avec une règle de priorité explicite et non ambiguë.
### Modèle de données cible

```plain
store_catalog_settings
  storeId
  defaultCardLayout       layout_1 | layout_2 | layout_3 | layout_4
  isProductCountVisible
  isPriceVisible
  isRatingVisible
  isDiscountVisible
  isStoreBadgeVisible
  updatedAt

store_sections
  id
  storeId
  name
  slug
  description
  imageUrl
  cardLayout              nullable, hérite du réglage boutique si null
  isProductCountVisible   nullable
  isPriceVisible          nullable
  isRatingVisible         nullable
  isDiscountVisible       nullable
  isActive
  sortOrder
  createdAt
  updatedAt

store_section_items
  id
  storeId
  sectionId
  productId
  sortOrder
  isActive
  createdAt
  updatedAt
```

Contraintes:
*   `store_sections.storeId` doit correspondre à `store_section_items.storeId`;
*   `store_section_items.productId` doit appartenir à la même boutique;
*   unicité de `(sectionId, productId)`;
*   suppression ou archivage d’un produit doit retirer ou désactiver ses affectations;
*   une section inactive n’est pas visible sur Mobile;
*   le layout demandé doit faire partie d’une liste blanche de quatre types définie par le code partagé;
*   les options de visibilité ne doivent pas permettre de masquer une information légalement obligatoire.
### Priorité d’affichage

```plain
layout effectif d’un produit dans une section
  = section.cardLayout
  sinon store_catalog_settings.defaultCardLayout
  sinon réglage global Admin
  sinon layout par défaut codé et versionné
```

Le Mobile ne doit pas recevoir un layout arbitraire non reconnu. L’API renvoie un contrat normalisé, et le composant de carte choisit uniquement parmi les quatre variantes implémentées.
### Contrats API cible

```plain
GET    /api/stores/:storeId/catalog-settings
PUT    /api/stores/:storeId/catalog-settings

GET    /api/stores/:storeId/sections
POST   /api/stores/:storeId/sections
PUT    /api/stores/:storeId/sections/:sectionId
DELETE /api/stores/:storeId/sections/:sectionId
PUT    /api/stores/:storeId/sections/reorder
PUT    /api/stores/:storeId/sections/:sectionId/items
POST   /api/stores/:storeId/sections/:sectionId/items
DELETE /api/stores/:storeId/sections/:sectionId/items/:productId

GET    /api/mobile/stores/:storeId/sections
GET    /api/mobile/stores/:storeId/sections/:sectionId/products
```

L’Admin central peut imposer ou désactiver un layout global, mais ne doit pas écraser silencieusement les choix d’une boutique sans action explicite et journalisée. Le boutiquier doit voir une prévisualisation fidèle à celle du Mobile avant sauvegarde.
## 28\. Admin, espaces boutiquier et synchronisation
### Navigation Admin recommandée
L’espace boutiquier peut réutiliser les composants et DataSources Admin existants, mais dans un périmètre filtré:

```plain
Tableau de bord de ma boutique
  Profil et identité
  Paiements
  Zones de livraison
  Livreurs
  Produits
  Sections et catégories
  Apparence des cartes
  Commandes de ma boutique
  Statistiques de ma boutique
```

Les pages ne doivent pas seulement filtrer visuellement une liste globale. Les endpoints doivent également appliquer le `storeId` côté serveur. Le boutiquier ne doit pas pouvoir contourner le filtre en modifiant l’URL ou le payload.
### Synchronisation Admin central → boutique → Mobile

```plain
flowchart LR
  CENTRAL[Admin central<br/>providers, règles, modération] --> API[API NestJS<br/>guards + ownership]
  MANAGER[Admin boutiquier<br/>sa boutique uniquement] --> API
  API --> STORE[(stores)]
  API --> PAY[(store_payment_methods)]
  API --> SHIP[(shipping_zones)]
  API --> COURIER[(store_couriers)]
  API --> CATALOG[(products + sections + layouts)]
  API --> ORDERS[(orders + payments + delivery_assignments)]
  STORE --> MOBILE[Mobile public]
  PAY --> MOBILE
  SHIP --> MOBILE
  CATALOG --> MOBILE
  ORDERS --> MOBILE
```

Après chaque mutation:
*   l’API renvoie l’état serveur normalisé;
*   l’Admin invalide la liste, le détail, les compteurs et les sous-ressources concernées;
*   le Mobile invalide le catalogue ou les options de checkout concernées;
*   les statuts de commande, paiement et livraison utilisent un cache frais, pas un `staleTime` long par défaut;
*   aucun écran ne présente une réussite définitive sur la seule base d’un état optimiste;
*   les changements sensibles sont auditables avec `actorId`, `storeId`, ressource, action et timestamp.
### Stratégie de migration sans casser l’existant
1. **Inventorier avant migration**: vérifier les tables Drizzle et migrations réellement présentes pour les paiements, livraisons, produits, sections, catégories et managers.
2. **Ajouter les colonnes et tables de façon additive**: `storeId`, configurations, médias et relations avec valeurs par défaut compatibles, sans supprimer les routes historiques.
3. **Backfill contrôlé**: rattacher les données existantes à la boutique déterminée par le produit, la commande, le manager ou la configuration actuelle; journaliser les lignes ambiguës au lieu de deviner.
4. **Introduire les nouveaux endpoints** derrière les services existants, puis faire consommer les DataSources Admin et Mobile.
5. **Maintenir les anciens endpoints** avec un adaptateur temporaire qui traduit vers le nouveau modèle et émet un avertissement de dépréciation.
6. **Activer progressivement**: feature flag par espace ou par boutique, d’abord lecture, puis mutations, puis paiement et livraison.
7. **Comparer les résultats**: anciens et nouveaux totaux, méthodes visibles, frais de livraison, compteurs et statuts doivent être comparés en staging.
8. **Migrer les données de présentation**: créer une section par défaut et appliquer le layout global existant aux boutiques qui n’ont pas encore choisi.
9. **Supprimer uniquement après preuve**: aucune table ou route legacy ne doit être supprimée avant la recette E2E, l’export de sauvegarde et la vérification des deep links.
### Tests d’acceptation supplémentaires avant build preview
#### Paiement
*   deux boutiques avec des providers différents affichent uniquement leurs méthodes respectives;
*   un boutiquier ne voit ni ne modifie les méthodes d’une autre boutique;
*   un secret PSP n’est jamais renvoyé en clair;
*   un provider désactivé par l’Admin disparaît du Mobile;
*   une commande multi-boutiques produit les groupes, transactions et statuts attendus;
*   un échec PSP conserve le panier et n’affiche pas un faux succès;
*   les webhooks et retries sont idempotents.
#### Livraison
*   une adresse peut être acceptée par une boutique et refusée par une autre;
*   les frais et délais sont calculés par zone de la boutique;
*   un boutiquier ne peut assigner qu’un livreur de sa boutique;
*   l’Admin central peut réassigner et auditer sans contourner les contraintes.
#### Catalogue et présentation
*   un boutiquier ne peut lire ou modifier un produit d’un autre `storeId`;
*   un produit ne peut être ajouté à une section d’une autre boutique;
*   les quatre layouts sont rendus par le même contrat Mobile;
*   un layout de section surcharge le layout boutique, qui surcharge le layout global;
*   la prévisualisation Admin correspond au rendu Mobile;
*   les compteurs activés/désactivés sont respectés sans fuite de données privées.
#### Profil et permissions
*   le boutiquier modifie son nom, logo, cover, galerie et horaires;
*   l’Admin central voit la modification après refetch et peut la modérer;
*   le boutiquier ne peut pas modifier KYC, commission, statut d’approbation ou `storeId`;
*   les logs d’audit identifient correctement la boutique et l’acteur;
*   les tests API avec token sans permission renvoient 401/403 attendus, même si l’interface masque déjà le bouton.

**Décision finale:** cette autonomie multi-vendeur doit être conçue comme une extension cloisonnée du plan existant, pas comme une seconde administration parallèle. Les services, tables, caches et contrats doivent conserver les routes historiques pendant la migration, tout en faisant de `storeId` la clé d’ownership vérifiée partout.