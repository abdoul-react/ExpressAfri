# AUDIT MOBILE — ExpressAfri
> Rédigé le 18 juillet 2026 · Audit ingénieur UI/UX + fonctionnel + contrôle admin

---

## Méthodologie

Chaque écran a été lu ligne par ligne. Les problèmes sont classés :
- 🔴 Critique — bloque ou trompe l'utilisateur
- 🟠 Important — fonctionnalité incomplète ou incohérente
- 🟡 UX — dégradation d'expérience visible
- 🟢 Amélioration — polish, production-readiness

---

## ÉCRAN 1 — Accueil (`app/(tabs)/index.tsx`)

### 🔴 Problème 1.1 — Countdown du Deal du jour : durée hardcodée
```ts
<Countdown seconds={6 * 3600 + 42 * 60} tone="primary" />
```
Le compteur est figé à 6h42 à chaque lancement. Il repart de zéro à chaque re-render.
L'admin n'a aucun moyen de définir la date de fin d'un deal depuis le CMS.

**Correction :** Ajouter un champ `endDate` dans `feed_sections` (déjà présent dans le
schéma `content-cms.ts` dans la table `feedSections` via le champ `data: jsonb`).
L'admin définit `{ endDate: "2026-07-19T23:59:00Z" }` dans le champ `data` de la section
"Deal du jour". Le `Countdown` reçoit les secondes restantes calculées depuis `Date.now()`.

### 🔴 Problème 1.2 — BannerCarousel : type `Banner` incompatible avec la DB
Le type `Banner` dans `src/types/index.ts` attend :
```ts
{ id, title, discount?, gradient: 'promo'|'sun'|'sunset', image? }
```
Mais `ApiContentDataSource.getBanners()` retourne les bannières de la DB qui ont :
```ts
{ id, title, subtitle, imageUrl, linkUrl, backgroundColor, ... }
```
Il n'y a **pas de champ `gradient`** en base. `BannerCarousel` appelle
`gradients[b.gradient]` qui renvoie `undefined` → crash potentiel LinearGradient.
Les bannières de la DB ne s'affichent jamais correctement.

**Correction :**
1. Mettre à jour le type `Banner` dans `src/types/index.ts` pour correspondre à la DB.
2. Refactoriser `BannerCarousel` pour utiliser `imageUrl` (Image expo) au lieu de
   `LinearGradient` + gradient inexistant. Utiliser `backgroundColor` comme fallback.
3. Mapper `linkUrl` pour naviguer vers le bon écran au clic.

### 🔴 Problème 1.3 — Badge notifications cloche : hardcodé à 13
Dans `HomeHeader.tsx` :
```ts
<Icon name="bell" size={26} color={colors.text} />
```
Pas de badge du tout sur la cloche de l'accueil. Mais dans `account.tsx` et `feed.tsx` :
```ts
<View style={styles.badge}><Text style={styles.badgeText}>13</Text></View>
```
Le badge **13** est hardcodé. Il ne reflète rien de réel.

**Correction :** Brancher `useUnreadMessageCount()` (déjà disponible côté mobile via
`useConversations`) ou un hook dédié qui compte les conversations non lues depuis l'API.
Appliquer le badge dynamique sur toutes les cloches (Accueil, Account, Feed, Store).

### 🟠 Problème 1.4 — Sections dynamiques : seul le type `products` est rendu
```ts
{section.type === 'products' && section.items?.length > 0 && ( ... )}
```
Les sections de type `banners`, `stores`, `categories`, `inspiration`, `custom`
ne sont jamais rendues. L'admin peut créer ces sections dans le CMS mais elles
n'apparaissent jamais dans l'app.

**Correction :** Ajouter le rendu pour chaque type dans `index.tsx` :
- `banners` → `BannerCarousel`
- `categories` → rangée de chips/vignettes catégories
- `stores` → rail horizontal de cartes boutiques
- `inspiration` → mini grid masonry (comme Feed)
- `custom` → render du champ `data.content` en texte/HTML

### 🟠 Problème 1.5 — Sections dynamiques : `items` toujours les 6 premiers produits
```ts
if (section.type === 'products') {
  return { ...section, items: products.slice(0, 6) }
}
```
Toutes les sections `products` affichent exactement les mêmes 6 produits.
"Offres groupées", "Deal du jour" et "Recommandé pour vous" montrent les mêmes articles.

**Correction :** Utiliser le champ `data` de `feed_sections` pour stocker des filtres
`{ categoryId, tags, limit, sortBy }`. La section "Deal du jour" filtre par
`discountPercent > 0`, "Recommandé" filtre autrement. Minimum : alterner les tranches
(`section.position * 6` → `(position + 1) * 6`).

### 🟡 Problème 1.6 — PromoModal : hero produit peut être null
```ts
hero={bundle[1] ?? bundle[0] ?? null}
```
Si aucun produit n'est chargé (DB vide ou erreur réseau), `hero` est `null`.
`PromoModal` doit gérer `hero === null` sans crasher.

### 🟡 Problème 1.7 — staleTime global trop court (60s)
```ts
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
});
```
60 secondes de staleTime signifie que chaque retour sur l'accueil refetch tout.
Pour une app e-commerce, les produits et bannières changent rarement en 1 minute.

**Correction :** Augmenter à 5 minutes (`300_000`) pour products/categories/banners.
Garder 60s pour cart/orders/notifications.

---

## ÉCRAN 2 — BannerCarousel (`src/features/home/BannerCarousel.tsx`)

### 🔴 Problème 2.1 — Bannières DB ignorées, données mock utilisées
`BannerCarousel` utilise le champ `b.gradient` pour `LinearGradient`. Or les bannières
venant de la DB (via `ApiContentDataSource.getBanners()`) ont `imageUrl` et
`backgroundColor`, pas de champ `gradient`. Résultat : `gradients[undefined]` → crash
ou bannière transparente.

**Correction :** Voir correction 1.2 ci-dessus. Refactoriser pour utiliser `Image`
Expo quand `imageUrl` est présente, et `backgroundColor` sinon.

### 🟠 Problème 2.2 — Lien bannière toujours `/placeholder`
```ts
const openPromo = () => router.push("/placeholder?title=Été&icon=tag");
```
Toutes les bannières ouvrent le même écran placeholder. Le champ `linkUrl` de la DB
est ignoré.

**Correction :** `onPress={() => b.linkUrl ? router.push(b.linkUrl) : null}`

### 🟡 Problème 2.3 — Texte "Jusqu'à" et date de fin hardcodés
```ts
<Text style={styles.endsIn}>{t("common.endsIn")} · 8 juil. 07:59</Text>
```
La date de fin est hardcodée dans le composant. Utiliser `b.endDate` si présent.

---

## ÉCRAN 3 — Compte (`app/(tabs)/account.tsx`)

### 🔴 Problème 3.1 — Badge notifications hardcodé à 13
```ts
<View style={styles.badge}><Text style={styles.badgeText}>13</Text></View>
```
Identique au problème 1.3. Badge faux, non connecté.

### 🟠 Problème 3.2 — Bannière promo "Soldes d'été" hardcodée
```tsx
<LinearGradient ...>
  <Text>{t("home.summerSale")} · -60%</Text>
```
Le `-60%` et le texte "Soldes d'été" sont hardcodés. L'admin ne peut pas changer
ce message depuis le CMS.

**Correction :** Lire depuis `app_settings` clé `promo.bannerText` et
`promo.bannerDiscount`, ou depuis un `content_block` groupe=`account` clé=`promo_banner`.

### 🟠 Problème 3.3 — Cards promo "Bonus +20" hardcodées
```tsx
<Text>Bonus +20</Text>
<Text>{t("account.receiveMore")}</Text>
```
Valeurs figées. L'admin ne contrôle pas ce qui s'affiche ici.

**Correction :** Lire la valeur bonus depuis `app_settings` clé `loyalty.bonusValue`.

### 🟡 Problème 3.4 — Avatar utilisateur : image vide si non connecté
```ts
<Image source={{ uri: user?.avatar }} style={styles.avatar} />
```
`user?.avatar` est `''` (chaîne vide) après login. `expo-image` avec `uri: ''`
peut afficher une zone grise ou une erreur silencieuse.

**Correction :** Ajouter un fallback initiales : si `uri` vide → afficher les initiales
du nom dans un cercle coloré.

---

## ÉCRAN 4 — Fiche Produit (`app/product/[id].tsx`)

### 🔴 Problème 4.1 — Avis clients hardcodés (2 avis fictifs)
```tsx
{[0, 1].map((i) => (
  <View key={i} style={styles.review}>
    <Image source={{ uri: `https://picsum.photos/seed/rev${i}/60` }} />
    <Text>Client {i + 1}</Text>
    <Text>Excellent produit...</Text>
```
Les avis sont toujours 2 faux avis identiques peu importe le produit.
Un endpoint `GET /mobile/products/:id/reviews` doit exister.

**Correction :** Créer un hook `useProductReviews(productId)` qui appelle l'API
reviews. Afficher un `EmptyState` si aucun avis.

### 🟠 Problème 4.2 — Localisation hardcodée "Niger · Niamey"
```tsx
<Guarantee icon="location" title={t("product.shipsTo")} value="Niger · Niamey" />
```
La valeur est figée. Doit utiliser `useSettingsStore` pour le pays actif.

**Correction :**
```ts
const countryCode = useSettingsStore((s) => s.country)
const country = COUNTRIES.find((c) => c.code === countryCode)
value={country?.name ?? 'Niger'}
```

### 🟠 Problème 4.3 — Nom de l'app hardcodé dans le partage
```ts
Share.share({ message: `${product.title} — ${t("common.shareFrom")} AfriExpress` })
```
"AfriExpress" au lieu de "ExpressAfri". Incohérence de marque.

**Correction :** Utiliser `app_settings` clé `app.name` ou simplement corriger la clé
i18n `common.shareFrom`.

### 🟡 Problème 4.4 — Galerie images : une seule image en DB
Les produits seedés ont 1 image. La galerie scrollable ne montre qu'une image et
le compteur affiche "1/1". Pas de problème bloquant mais l'UX paraît vide.

---

## ÉCRAN 5 — Panier (`app/(tabs)/cart.tsx`)

### 🟠 Problème 5.1 — Seuil livraison gratuite hardcodé en USD
```ts
const FREE_SHIP_THRESHOLD = 20; // USD
```
Hardcodé à 20$. Or `app_settings` a la clé `commerce.freeShippingThreshold`
avec la valeur `10000` (FCFA). Incohérence devise + non piloté par l'admin.

**Correction :** Lire depuis `app_settings` via un hook `useAppSettings()`.

### 🟡 Problème 5.2 — Suggestions "Vous aimerez aussi" dans panier : index non utilisé
```tsx
{suggestions.map((p, i) => (  // ← i déclaré mais jamais utilisé
```
Warning ESLint mineur, pas bloquant.

---

## ÉCRAN 6 — Checkout (`app/checkout/index.tsx`)

### 🟠 Problème 6.1 — Délai de livraison hardcodé
```tsx
<Text style={styles.deliveryText}>{t("checkout.deliveryDays")}</Text>
```
La clé i18n contient probablement "5-7 jours". L'admin ne contrôle pas ce délai.

**Correction :** Lire depuis `app_settings` clé `commerce.deliveryDays`.

### 🟡 Problème 6.2 — CGV pointent vers `/placeholder`
```tsx
router.push("/placeholder?title=Conditions+générales")
```
Les CGV sont des pages légales réelles en DB (`static_pages` slug=`cgv`).
Doit naviguer vers un vrai écran qui lit `GET /content/pages/cgv`.

---

## ÉCRAN 7 — Paiement (`app/checkout/payment.tsx`)

### 🔴 Problème 7.1 — Opérateurs Mobile Money hardcodés par pays
```ts
const COUNTRY_OPERATORS: Record<string, string[]> = {
  NE: ['Orange Money', 'Moov Money'],
  SN: ['Orange Money', 'Wave', 'Free Money'],
  ...
}
```
Cette liste est figée dans le code. Si l'admin active/désactive Wave depuis le CMS
(feature flag `payment.mobileMoney`), cela n'a aucun effet sur cette liste.

**Correction :** Utiliser les méthodes de paiement venant de la DB
(`methods` déjà disponibles via `usePaymentMethods()`). Filtrer par
`supportedCountries.includes(countryCode)` pour n'afficher que les opérateurs
disponibles dans le pays actif.

### 🔴 Problème 7.2 — Paiement simulé avec `setTimeout`
```ts
await new Promise((resolve) => setTimeout(resolve, 1200));
clear();
router.replace("/checkout/success");
```
Aucun vrai paiement n'est initié. La commande n'est jamais créée en base.
Le panier est vidé sans que rien ne soit enregistré.

**Correction :** Appeler `POST /mobile/orders` pour créer la commande, puis initier
le flux de paiement réel (redirect Mobile Money ou validation carte).

### 🟡 Problème 7.3 — `labelKey` et `hintKey` affichés bruts sans traduction
```ts
<Text style={styles.methodLabel}>{t(m.labelKey)}</Text>
```
`m.labelKey` vient maintenant de la DB et contient le **nom réel** ("Orange Money"),
pas une clé i18n. `t("Orange Money")` retourne `"Orange Money"` (clé introuvable,
i18next retourne la clé telle quelle) — ça fonctionne visuellement mais c'est une
incohérence architecturale.

**Correction :** Ne plus appeler `t()` sur les champs venant de la DB.
Afficher `m.labelKey` directement (c'est déjà le nom localisé).

---


## ÉCRAN 8 — Recherche (`app/search/index.tsx`)

### 🟡 Problème 8.1 — Section "Récent" visible même vide
Si l'historique est vide (premier lancement), la section "Récent" s'affiche avec
un titre mais aucun chip. Doit être masquée si `history.length === 0`.

**Correction :**
```tsx
{history.length > 0 && (
  <Section title={t("search.recent")} icon="history" action={...}>
    {history.map(...)}
  </Section>
)}
```

### 🟡 Problème 8.2 — Section "Tendances" vide au premier lancement
Si le backend ne renvoie rien (DB non seedée ou erreur), la section tendances
s'affiche avec un titre et aucun chip. Même correction : masquer si vide.

---

## ÉCRAN 9 — Feed (`app/(tabs)/feed.tsx`)

### 🔴 Problème 9.1 — Posts Feed : données mock hardcodées
`useFeed()` appelle `contentService.getFeedPosts()` → `GET /mobile/feed` →
`getFeedPosts()` lit `content_blocks` groupe=`feed`. Mais le seed n'a pas inséré
de blocs `feed`. Résultat : `posts = []`, le Feed est vide.

`BannerCarousel` dans le mock (`src/infrastructure/data-source/mock/banners.ts`)
a `FEED_POSTS` hardcodés, mais `ApiContentDataSource` ne les utilise pas.

**Correction :** Ajouter dans `seed.ts` des blocs `content_blocks` groupe=`feed`
avec des posts JSON, OU créer un endpoint `GET /mobile/feed-posts` qui retourne
de vrais posts depuis une nouvelle table `feed_posts`.

### 🔴 Problème 9.2 — Badge messages hardcodé à 13
```tsx
<View style={styles.msgBadge}><Text style={styles.msgBadgeText}>13</Text></View>
```
Même problème que 1.3 et 3.1.

### 🟠 Problème 9.3 — Bouton "Follow" non fonctionnel
```tsx
<Pressable style={styles.followBtn}>
  <Text style={styles.followText}>{t("feed.follow")}</Text>
</Pressable>
```
Aucun `onPress`. Le bouton est muet. Pas de système d'abonnement connecté.

---

## ÉCRAN 10 — Store (`app/(tabs)/store.tsx`)

### 🟠 Problème 10.1 — Bandeau promo "Soldes d'été" hardcodé
```tsx
<Text style={styles.promoBandText}>{t("home.summerSale")}</Text>
<Text style={styles.promoBandSub}>{t("account.summerSaleEnds")}</Text>
```
Hardcodé comme sur Account. Même correction : lire depuis `app_settings` ou CMS.

### 🟠 Problème 10.2 — Images sous-catégories : picsum aléatoires
```ts
uri: `https://picsum.photos/seed/${activeId}${i}/240`
```
Les images de sous-catégories sont des photos aléatoires sans rapport avec la catégorie.
Utiliser `category.image` si disponible.

### 🟡 Problème 10.3 — `t(c.name)` sur un nom venant de la DB
```tsx
<Text>{t(c.name)}</Text>
```
`c.name` est "Téléphones & Tablettes" (vrai texte DB), pas une clé i18n.
`t("Téléphones & Tablettes")` retourne le texte tel quel car la clé n'existe pas.
Visuellement correct mais architecturalement faux. Retirer le `t()`.

---

## ÉCRAN 11 — Messagerie (`app/messages/index.tsx`)

### 🟠 Problème 11.1 — Conversations ne montrent pas les infos DB
Le type `Conversation` mobile (`src/types/index.ts`) attend :
```ts
{ id, name, avatar, online, lastMessage, lastTime, unread, messages }
```
Mais `ChatService.listConversations()` retourne les champs DB :
```ts
{ id, customerId, storeId, subject, status, createdAt, updatedAt }
```
Il n'y a pas de champ `name`, `avatar`, `lastMessage`, `lastTime`, `unread`.
Le mapping entre le schéma DB et le type mobile n'est pas fait.

**Correction :** Enrichir `MobileService` ou `ChatService` pour retourner
les conversations avec le nom du store, le dernier message, le count non lu.

### 🟡 Problème 11.2 — Channels "Commandes" et "Promos" pointent vers mauvais écrans
```ts
{ id: 'orders', ..., onPress: () => router.push("/orders") }
{ id: 'promos', ..., onPress: () => router.push("/coupons") }
```
"Promos" ouvre la liste des coupons. Ce devrait être les messages promotionnels.
Pas bloquant mais UX confuse.

---

## ÉCRAN 12 — Commandes (`app/orders/index.tsx`)

### 🔴 Problème 12.1 — `useCartStore.getState()` dans le render
```ts
onPress={() => {
  const store = useCartStore.getState();
  store.setAllSelected(false);
  order.items.forEach((item) => {
    const { items } = useCartStore.getState();
    ...
  });
}}
```
Appel à `useCartStore.getState()` dans un handler inline. Risque de comportement
imprévisible. Doit utiliser les actions du store via hooks au niveau composant.

### 🟠 Problème 12.2 — Commandes ne viennent pas de la DB
`useOrders()` appelle un service qui lit depuis le store local ou des données mock.
Les commandes créées après un vrai paiement (quand le paiement sera branché)
ne s'afficheront pas ici si le hook ne lit pas depuis `GET /mobile/orders`.

---

## ÉCRAN 13 — Paramètres (`app/settings/index.tsx`)

### 🟡 Problème 13.1 — "Vider le cache" ne vide rien
```ts
<Row label={t("settings.clearCache")} value="12,4 Mo"
  onPress={() => Alert.alert(t("common.confirm"), t("settings.clearCacheConfirm"))} />
```
La taille "12,4 Mo" est hardcodée. L'action ne vide rien (pas de
`queryClient.clear()` ni `AsyncStorage.clear()`).

**Correction :** Implémenter `queryClient.clear()` + vider l'historique de recherche.
Calculer la taille réelle de l'AsyncStorage ou simplement retirer la valeur hardcodée.

### 🟡 Problème 13.2 — Liens "Confidentialité" et "Légal" → placeholder
Doivent pointer vers les pages statiques DB (`/static-page/privacy`, `/static-page/cgv`).

---

## ÉCRAN 14 — Onboarding (`app/onboarding.tsx`)

### 🟢 Problème 14.1 — Contenu onboarding non configurable par l'admin
Les 3 slides (texte + icône) sont hardcodés dans le composant.
L'admin ne peut pas les modifier.

**Correction (optionnelle) :** Lire depuis `app_settings` ou `content_blocks`
groupe=`onboarding`. Priorité basse — les textes changent rarement.

---

## SECTION — Contrôle Admin sur l'Application

### 🔴 Manque A1 — Aucun écran "Page statique" dans l'app mobile
La table `static_pages` existe en DB et est gérée par l'admin. Mais l'app mobile
n'a aucun écran pour afficher une page statique. Tout pointe vers `/placeholder`.

**Correction :** Créer `app/static-page/[slug].tsx` qui appelle
`GET /content/pages/:slug` (endpoint déjà existant) et affiche le HTML via
`react-native-render-html` ou un simple `WebView`.

### 🔴 Manque A2 — Feature flags non consommés par l'app mobile
L'endpoint `GET /mobile/feature-flags` existe et retourne les 15 flags.
Mais aucun écran ne les lit. Les fonctionnalités comme `mobile.cameraSearch`,
`mobile.wallet`, `mobile.affiliates` ne sont jamais activées/désactivées
dynamiquement. L'admin peut les toggler mais ça n'a aucun effet.

**Correction :** Créer un hook `useFeatureFlags()` + un `FeatureFlagContext`
qui charge les flags au démarrage et expose `isEnabled(key: string): boolean`.
Wrapper chaque fonctionnalité conditionnelle.

### 🔴 Manque A3 — App settings non consommés par l'app mobile
`GET /mobile/settings` retourne les 16 paramètres. Mais l'app utilise des valeurs
hardcodées (FREE_SHIP_THRESHOLD = 20, "Niger · Niamey", "Bonus +20", etc.).

**Correction :** Créer `useAppSettings()` hook qui charge les settings au démarrage
avec un staleTime de 10 minutes. Remplacer toutes les valeurs hardcodées.

### 🟠 Manque A4 — Logos CMS non utilisés dans l'app mobile
`GET /mobile/logos` retourne les 7 logos. Mais le logo affiché dans `HomeHeader`
et `ShortcutRail` est le composant `Logo` (SVG hardcodé) et `SunMark` (SVG hardcodé).
L'admin change les logos dans le CMS mais rien ne change dans l'app.

**Correction :** Créer `useAppLogos()` hook. Dans `HomeHeader`, si un logo
`header` est disponible en DB → `<Image uri={logo.url} />` au lieu de `<Logo />`.

### 🟠 Manque A5 — Réseaux sociaux non affichés dans l'app
Les 5 réseaux sociaux seedés ne sont affichés nulle part dans l'app mobile
(ni dans Account, ni dans Settings, ni en footer).

**Correction :** Ajouter une section "Suivez-nous" dans `account.tsx` ou
`settings/index.tsx` qui lit depuis `useQuery(['social-links'], ...)`.

---

## SECTION — Performance et Production-Readiness

### 🔴 Perf P1 — Pas de prefetch au démarrage
L'app charge toutes les données à la demande (lazy). Quand l'utilisateur arrive
sur l'Accueil, 4 requêtes se lancent en parallèle (products, categories, banners,
feed-sections). Pendant ce temps : skeleton affiché.

**Correction :** Dans `_layout.tsx`, après `hydrated`, déclencher un prefetch :
```ts
useEffect(() => {
  if (hydrated) {
    queryClient.prefetchQuery({ queryKey: ['products'], queryFn: ... })
    queryClient.prefetchQuery({ queryKey: ['banners'], queryFn: ... })
    queryClient.prefetchQuery({ queryKey: ['categories'], queryFn: ... })
  }
}, [hydrated])
```

### 🟠 Perf P2 — Pas de gestion d'erreur réseau globale
Si le backend est inaccessible (EXPO_PUBLIC_API_URL = localhost sur device),
chaque screen affiche son propre skeleton indéfiniment ou son erreur.
Pas de message global "Vérifiez votre connexion".

**Correction :** Ajouter dans `_layout.tsx` un listener `NetInfo` qui affiche
une bannière non-intrusive "Hors ligne" quand la connexion est perdue.

### 🟡 Perf P3 — `staleTime: 60_000` trop court (déjà noté en 1.7)

### 🟡 Perf P4 — Pas de `ListEmptyComponent` sur le FlashList de l'accueil
Si `grid` est vide (DB vide avant seed), le FlashList ne montre rien.
Ajouter `ListEmptyComponent={<EmptyState ... />}`.

---

## SECTION — Cohérence UI/UX Globale

### 🟡 UI 1 — Couleur `freeShipping` manquante dans certains contextes
`colors.freeShipping` est utilisée dans ProductCard et Cart mais pas partout
de façon consistante. Vérifier que la couleur est bien définie dans le thème.

### 🟡 UI 2 — Termes "AfriExpress" vs "ExpressAfri" dans le code
```ts
Share.share({ message: `... AfriExpress` })
```
Le nom "AfriExpress" apparaît dans le code de partage. Le projet s'appelle
"ExpressAfri". Corriger toutes les occurrences.

### 🟡 UI 3 — Tab "+" (Feed) ne crée rien
Le bouton central de la tab bar ouvre l'onglet Feed. Le `+` suggère une action
de création (post, produit). Si l'intention est d'ouvrir le Feed, l'icône
devrait être `compass` ou `inspiration`, pas `plus`.

### 🟢 UI 4 — Skeleton absent sur Feed et Store au premier chargement
`FeedScreen` n'a pas de skeleton. Si `posts` est vide et `isLoading` true,
l'écran est blanc. Ajouter `SkeletonFeed`.

---


---

## RÉCAPITULATIF — Problèmes par priorité

### 🔴 Critiques (bloquants production) — 11 problèmes
| ID | Problème | Fichier principal |
|----|----------|------------------|
| 1.1 | Countdown Deal du jour hardcodé | `index.tsx`, `feed_sections` schema |
| 1.2 | BannerCarousel : type Banner incompatible DB → crash | `BannerCarousel.tsx`, `types/index.ts` |
| 1.3 | Badge notifications hardcodé 13 (accueil + feed + account + store) | 4 fichiers |
| 7.1 | Opérateurs Mobile Money hardcodés, ignorent le CMS | `checkout/payment.tsx` |
| 7.2 | Paiement simulé setTimeout, commande jamais créée en DB | `checkout/payment.tsx` |
| 9.1 | Feed vide : aucun post en DB | `seed.ts` |
| 11.1 | Conversations DB : mapping champs manquant | `MobileService`, `ChatService` |
| 12.1 | `useCartStore.getState()` dans render | `orders/index.tsx` |
| A1 | Aucun écran page statique dans l'app mobile | Nouveau `app/static-page/[slug].tsx` |
| A2 | Feature flags non consommés | Nouveau `useFeatureFlags()` hook |
| A3 | App settings non consommés (valeurs hardcodées partout) | Nouveau `useAppSettings()` hook |

### 🟠 Importants (fonctionnalité incomplète) — 10 problèmes
| ID | Problème | Fichier principal |
|----|----------|------------------|
| 1.4 | Sections dynamiques : types banners/stores/categories non rendus | `index.tsx` |
| 1.5 | Sections dynamiques : items identiques pour toutes sections | `useHomeFeed.ts` |
| 2.2 | Bannière lien toujours `/placeholder` | `BannerCarousel.tsx` |
| 3.2 | Bannière promo account hardcodée | `account.tsx` |
| 3.3 | Bonus "+20" hardcodé | `account.tsx` |
| 4.2 | Localisation "Niger · Niamey" hardcodée | `product/[id].tsx` |
| 5.1 | Seuil livraison gratuite hardcodé (20 USD) | `cart.tsx` |
| 9.3 | Bouton Follow sans `onPress` | `feed.tsx` |
| 12.2 | Commandes ne lisent pas la DB | `useOrders.ts` |
| A4 | Logos CMS ignorés dans l'app | `HomeHeader.tsx`, `_layout.tsx` |

### 🟡 UX (dégradation visible) — 9 problèmes
| ID | Problème |
|----|----------|
| 1.6 | PromoModal hero null |
| 1.7 | staleTime 60s trop court |
| 2.3 | Date fin bannière hardcodée |
| 3.4 | Avatar utilisateur vide |
| 4.1 | Avis clients hardcodés (2 faux avis) |
| 4.3 | Nom "AfriExpress" dans partage |
| 6.2 | CGV → placeholder |
| 7.3 | `t()` appliqué sur champs DB |
| 8.1/8.2 | Sections Récent/Tendances visibles même vides |
| 13.1 | "Vider le cache" ne vide rien |
| UI 3 | Icône "+" tab incohérente |

---

## PLAN DE CORRECTION N°3 — Phases d'exécution

```
Phase 1 — Corrections critiques visuelles (< 2h)
  ├── C1 : Refactoriser BannerCarousel pour utiliser imageUrl/backgroundColor DB
  ├── C2 : Corriger le type Banner dans types/index.ts
  ├── C3 : Brancher badge notifications dynamique (4 endroits)
  └── C4 : Masquer sections Récent/Tendances si vides

Phase 2 — Admin control (1 journée)
  ├── C5 : Créer hook useAppSettings() + remplacer toutes les valeurs hardcodées
  ├── C6 : Créer hook useFeatureFlags() + FeatureFlagContext
  ├── C7 : Countdown Deal du jour : lire endDate depuis feed_sections.data
  ├── C8 : Bannière lien : utiliser b.linkUrl au lieu de /placeholder
  └── C9 : Créer écran app/static-page/[slug].tsx

Phase 3 — Fonctionnalités manquantes (1-2 jours)
  ├── C10 : Opérateurs Mobile Money : filtrer depuis payment_methods DB
  ├── C11 : Paiement réel : créer commande POST /mobile/orders
  ├── C12 : Seed posts Feed dans content_blocks
  ├── C13 : Mapping conversations DB → type Conversation mobile
  └── C14 : Sections dynamiques : rendre tous les types (banners, stores, categories)

Phase 4 — Performance et polish (quelques heures)
  ├── C15 : Prefetch au démarrage dans _layout.tsx
  ├── C16 : staleTime 5min pour produits/bannières
  ├── C17 : Avatar utilisateur avec fallback initiales
  ├── C18 : Corriger "AfriExpress" → "ExpressAfri"
  └── C19 : Logos CMS dans HomeHeader
```

---

*Ce document est la base du PLAN_CORRECTIONS_3.md à générer pour l'agent exécutant.*
