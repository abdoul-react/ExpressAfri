# PLAN DE CORRECTIONS N°3 — ExpressAfri Mobile
> Rédigé le 18 juillet 2026 · Basé sur l'audit AUDIT_MOBILE.md

---

## Document de référence
Audit complet : `AUDIT_MOBILE.md` (racine du projet)

## Fichier de seed (si besoin d'ajouter des données) : `apps/api/src/seed.ts`
## Commande seed : `cd apps/api && npm run seed`

---

## Table des matières

- [Phase 1 — Corrections critiques visuelles](#phase-1--corrections-critiques-visuelles)
  - [C1 — Refactoriser BannerCarousel](#c1--refactoriser-bannercarousel)
  - [C2 — Corriger le type Banner](#c2--corriger-le-type-banner)
  - [C3 — Badge notifications dynamique](#c3--badge-notifications-dynamique)
  - [C4 — Masquer sections vides dans Recherche](#c4--masquer-sections-vides-dans-recherche)
- [Phase 2 — Contrôle Admin](#phase-2--contrôle-admin)
  - [C5 — Hook useAppSettings()](#c5--hook-useappsettings)
  - [C6 — Hook useFeatureFlags()](#c6--hook-usefeatureflags)
  - [C7 — Countdown Deal du jour piloté par l'admin](#c7--countdown-deal-du-jour-piloté-par-ladmin)
  - [C8 — Liens bannières depuis la DB](#c8--liens-bannières-depuis-la-db)
  - [C9 — Écran pages statiques](#c9--écran-pages-statiques)
- [Phase 3 — Fonctionnalités manquantes](#phase-3--fonctionnalités-manquantes)
  - [C10 — Opérateurs Mobile Money depuis la DB](#c10--opérateurs-mobile-money-depuis-la-db)
  - [C11 — Paiement réel + création commande](#c11--paiement-réel--création-commande)
  - [C12 — Seed posts Feed](#c12--seed-posts-feed)
  - [C13 — Mapping conversations DB](#c13--mapping-conversations-db)
  - [C14 — Sections dynamiques tous types](#c14--sections-dynamiques-tous-types)
- [Phase 4 — Performance et Polish](#phase-4--performance-et-polish)
  - [C15 — Prefetch au démarrage](#c15--prefetch-au-démarrage)
  - [C16 — staleTime optimisé](#c16--staletime-optimisé)
  - [C17 — Avatar utilisateur avec initiales](#c17--avatar-utilisateur-avec-initiales)
  - [C18 — Corriger "AfriExpress"](#c18--corriger-afriexpress)
  - [C19 — Logos CMS dans HomeHeader](#c19--logos-cms-dans-homeheader)

---

# PHASE 1 — Corrections critiques visuelles

## C1 — Refactoriser BannerCarousel

### Problème
`BannerCarousel` utilise `gradients[b.gradient]` mais les bannières DB n'ont pas
de champ `gradient`. Résultat : `LinearGradient` reçoit `undefined` → crash visuel.
Les bannières admin ne s'affichent jamais correctement.

### Fichier à modifier : `src/features/home/BannerCarousel.tsx`

Remplacer le contenu entier par :

```tsx
import type { Banner } from "@/types";
import {
  fontSize,
  radius,
  spacing,
  useColors,
  useThemedStyles,
  type Colors,
} from "@/design-system";
import { Icon } from "@/icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

type Props = { banners: Banner[] };

export function BannerCarousel({ banners }: Props) {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const scrollRef = useRef<ScrollView>(null);
  const cardWidth = width - spacing.lg * 2;

  if (!banners || banners.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + spacing.sm}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}
        onMomentumScrollEnd={(e) =>
          setIndex(Math.round(e.nativeEvent.contentOffset.x / (cardWidth + spacing.sm)))
        }
      >
        {banners.map((b) => (
          <Pressable
            key={b.id}
            onPress={() => b.linkUrl ? router.push(b.linkUrl as any) : null}
          >
            <View
              style={[
                styles.card,
                { width: cardWidth, backgroundColor: b.backgroundColor ?? colors.primary },
              ]}
            >
              {b.imageUrl ? (
                <Image
                  source={{ uri: b.imageUrl }}
                  style={styles.image}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.textContent}>
                  <Text style={styles.title} numberOfLines={2}>{b.title}</Text>
                  {b.subtitle && (
                    <Text style={styles.subtitle} numberOfLines={1}>{b.subtitle}</Text>
                  )}
                  {b.discountLabel && (
                    <View style={styles.discountRow}>
                      <Text style={styles.discount}>{b.discountLabel}</Text>
                    </View>
                  )}
                  {b.ctaText && (
                    <View style={styles.ctaBtn}>
                      <Text style={styles.ctaText}>{b.ctaText}</Text>
                      <Icon name="chevronRight" size={14} color={colors.primary} />
                    </View>
                  )}
                </View>
              )}
              {b.discountLabel && b.imageUrl && (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountBadgeText}>{b.discountLabel}</Text>
                </View>
              )}
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {banners.length > 1 && (
        <View style={styles.dots}>
          {banners.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    wrap: { paddingVertical: spacing.sm },
    card: {
      height: 130,
      borderRadius: radius.lg,
      overflow: "hidden",
      position: "relative",
    },
    image: { width: "100%", height: "100%" },
    textContent: {
      flex: 1,
      padding: spacing.lg,
      justifyContent: "center",
      gap: spacing.xs,
    },
    title: { color: colors.white, fontSize: fontSize.xl, fontWeight: "800" },
    subtitle: { color: "rgba(255,255,255,0.9)", fontSize: fontSize.sm },
    discountRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
    discount: { color: "#DFFF3E", fontSize: 36, fontWeight: "900", letterSpacing: -1 },
    ctaBtn: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: colors.white,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: 4,
      marginTop: spacing.sm,
      gap: 4,
    },
    ctaText: { fontSize: fontSize.xs, fontWeight: "800", color: colors.primary },
    discountBadge: {
      position: "absolute",
      top: spacing.sm,
      right: spacing.sm,
      backgroundColor: colors.sale,
      borderRadius: radius.sm,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    discountBadgeText: { color: colors.white, fontSize: fontSize.xs, fontWeight: "800" },
    dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: spacing.sm },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.borderStrong },
    dotActive: { backgroundColor: colors.primary, width: 16 },
  });
```

---

## C2 — Corriger le type Banner

### Problème
Le type `Banner` dans `src/types/index.ts` a des champs `discount` et `gradient`
qui n'existent pas en DB. Les champs réels DB (`imageUrl`, `backgroundColor`,
`linkUrl`, `ctaText`, `subtitle`, `discountLabel`) ne sont pas typés.

### Fichier à modifier : `src/types/index.ts`

Remplacer le type `Banner` :

```ts
// AVANT
export type Banner = {
  id: string;
  title: string;
  subtitle?: string;
  discount?: string;
  gradient: 'promo' | 'sun' | 'sunset';
  image?: string;
};

// APRÈS
export type Banner = {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  linkUrl?: string;
  ctaText?: string;
  discountLabel?: string;
  backgroundColor?: string;
  isActive?: boolean;
  position?: number;
};
```

### Fichier à modifier : `src/infrastructure/data-source/mock/banners.ts`

Mettre à jour les mocks pour correspondre au nouveau type :

```ts
export const BANNERS: Banner[] = [
  {
    id: 'b1',
    title: 'Soldes d\'été',
    subtitle: 'Jusqu\'à -60% sur tout',
    discountLabel: '-60%',
    backgroundColor: '#FF6B35',
    linkUrl: '/search',
    ctaText: 'Découvrir',
  },
  {
    id: 'b2',
    title: 'Offres groupées',
    subtitle: '-3$ sur votre panier',
    discountLabel: '-3$',
    backgroundColor: '#FF8C00',
    linkUrl: '/search',
    ctaText: 'En profiter',
  },
  {
    id: 'b3',
    title: 'Vente flash',
    subtitle: 'Jusqu\'à -80%',
    discountLabel: '-80%',
    backgroundColor: '#E74C3C',
    linkUrl: '/search',
    ctaText: 'Voir les offres',
  },
];
```

---

## C3 — Badge notifications dynamique

### Problème
Le badge "13" est hardcodé dans 4 fichiers. Il doit refléter le nombre de
conversations non lues depuis l'API.

### Nouveau fichier à créer : `src/features/messages/useUnreadCount.ts`

```ts
import { useQuery } from "@tanstack/react-query";
import { chatService } from "./chatService";

export function useUnreadCount(): number {
  const { data = [] } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => chatService.getConversations(),
    staleTime: 60_000,
  });
  // Compter les conversations avec messages non lus
  // Le schéma DB n'a pas encore de champ unread sur conversations
  // → retourner le nombre de conversations non fermées comme proxy
  return (data as any[]).filter((c) => c.status === 'open').length;
}
```

### Fichier à modifier : `src/features/messages/index.ts`
Ajouter l'export :
```ts
export { useUnreadCount } from './useUnreadCount';
```

### Fichiers à modifier — remplacer le badge "13" hardcodé :

**`src/features/home/HomeHeader.tsx`** :
```tsx
// Ajouter import
import { useUnreadCount } from "@/features/messages";

// Dans le composant HomeHeader, ajouter :
const unreadCount = useUnreadCount();

// Remplacer
<Pressable hitSlop={8} onPress={() => router.push("/messages")}>
  <Icon name="bell" size={26} color={colors.text} />
</Pressable>

// Par :
<Pressable hitSlop={8} onPress={() => router.push("/messages")} style={{ position: 'relative' }}>
  <Icon name="bell" size={26} color={colors.text} />
  {unreadCount > 0 && (
    <View style={styles.bellBadge}>
      <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
    </View>
  )}
</Pressable>

// Ajouter dans makeStyles :
bellBadge: {
  position: 'absolute', top: -4, right: -4,
  backgroundColor: colors.sale, borderRadius: 8,
  minWidth: 16, height: 16, paddingHorizontal: 3,
  alignItems: 'center', justifyContent: 'center',
},
bellBadgeText: { color: colors.white, fontSize: 9, fontWeight: '800' },
```

**`app/(tabs)/account.tsx`** — remplacer le badge hardcodé :
```tsx
import { useUnreadCount } from "@/features/messages";
// Dans le composant :
const unreadCount = useUnreadCount();
// Remplacer <Text style={styles.badgeText}>13</Text>
// Par : <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
// Et conditionner l'affichage :
// {unreadCount > 0 && <View style={styles.badge}>...</View>}
```

**`app/(tabs)/feed.tsx`** — même correction :
```tsx
import { useUnreadCount } from "@/features/messages";
const unreadCount = useUnreadCount();
// {unreadCount > 0 && <View style={styles.msgBadge}>...{unreadCount}...</View>}
```

**`app/(tabs)/store.tsx`** — la cloche n'a pas de badge actuellement, en ajouter un :
```tsx
import { useUnreadCount } from "@/features/messages";
const unreadCount = useUnreadCount();
// Wraper la cloche dans une View relative et ajouter badge conditionnel
```

---

## C4 — Masquer sections vides dans Recherche

### Problème
Les sections "Récent" et "Tendances" s'affichent même vides.

### Fichier à modifier : `app/search/index.tsx`

```tsx
// Section Récent — conditionner l'affichage
{history.length > 0 && (
  <Section
    title={t("search.recent")}
    icon="history"
    action={
      <Pressable onPress={clearHistory}>
        <Text style={styles.clearBtn}>Effacer</Text>
      </Pressable>
    }
  >
    {history.map((h) => (
      <Chip key={h} label={h} onPress={() => { setQuery(h); setSubmitted(true); }} />
    ))}
  </Section>
)}

// Section Tendances — conditionner l'affichage
{trending.length > 0 && (
  <Section title={t("search.trends")} icon="fire">
    {trending.map((h) => (
      <Chip key={h} label={h} onPress={() => { setQuery(h); setSubmitted(true); }} />
    ))}
  </Section>
)}

// Si les deux sont vides, afficher un message
{history.length === 0 && trending.length === 0 && (
  <View style={styles.emptySearch}>
    <Icon name="search" size={40} color={colors.border} />
    <Text style={styles.emptySearchText}>{t("search.startTyping")}</Text>
  </View>
)}
```

Ajouter dans `makeStyles` :
```ts
emptySearch: { alignItems: 'center', justifyContent: 'center', paddingTop: spacing.xxxl, gap: spacing.md },
emptySearchText: { fontSize: fontSize.md, color: colors.textMuted, textAlign: 'center' },
```

---


---

# PHASE 2 — Contrôle Admin

## C5 — Hook useAppSettings()

### Problème
`FREE_SHIP_THRESHOLD = 20`, `"Niger · Niamey"`, `"Bonus +20"`, couleurs promo etc.
sont hardcodés. L'admin les configure via `app_settings` mais rien ne se répercute.

### Nouveau fichier : `src/features/content/useAppSettings.ts`

```ts
import { useQuery } from "@tanstack/react-query";
import { apiAdapter } from "@/infrastructure/api/apiAdapter";

type AppSetting = { key: string; value: string; type: string; label: string; group: string };

let cachedSettings: Record<string, string> = {};

export function useAppSettings() {
  const { data = [] } = useQuery<AppSetting[]>({
    queryKey: ["app-settings"],
    queryFn: () => apiAdapter.get("/mobile/settings"),
    staleTime: 10 * 60 * 1000,
    onSuccess: (data) => {
      cachedSettings = Object.fromEntries(data.map((s) => [s.key, s.value]));
    },
  });

  function get(key: string, fallback = ""): string {
    const setting = data.find((s) => s.key === key);
    return setting?.value ?? fallback;
  }

  function getNumber(key: string, fallback = 0): number {
    const val = get(key, String(fallback));
    return parseFloat(val) || fallback;
  }

  function getBool(key: string, fallback = true): boolean {
    const val = get(key, String(fallback));
    return val === "true" || val === "1";
  }

  return { settings: data, get, getNumber, getBool };
}
```

### Fichier à modifier : `src/features/content/index.ts`
```ts
// Ajouter :
export { useAppSettings } from './useAppSettings';
```

### Usages — remplacer les hardcoded values :

**`app/(tabs)/cart.tsx`** :
```tsx
// Avant : const FREE_SHIP_THRESHOLD = 20;
// Après :
import { useAppSettings } from "@/features/content";
const { getNumber } = useAppSettings();
const FREE_SHIP_THRESHOLD_XOF = getNumber('commerce.freeShippingThreshold', 10000);
// Ajuster la logique de progress bar avec XOF
```

**`app/(tabs)/account.tsx`** — bannière promo + bonus :
```tsx
import { useAppSettings } from "@/features/content";
const { get } = useAppSettings();
// Remplacer "Soldes d'été · -60%" par get('promo.bannerText', t("home.summerSale"))
// Remplacer "Bonus +20" par `Bonus +${get('loyalty.bonusValue', '20')}`
```

**`app/product/[id].tsx`** — pays de livraison :
```tsx
// Remplacer : value="Niger · Niamey"
// Par :
const countryCode = useSettingsStore((s) => s.country);
const country = COUNTRIES.find((c) => c.code === countryCode);
// value={country?.name ?? 'Niger'}
```

**`app/(tabs)/store.tsx`** — bandeau promo :
```tsx
import { useAppSettings } from "@/features/content";
const { get } = useAppSettings();
// Remplacer texte hardcodé par get('promo.bannerText', t("home.summerSale"))
```

---

## C6 — Hook useFeatureFlags()

### Problème
15 feature flags existent en DB mais aucun écran ne les consomme.
L'admin peut les toggler mais ça n'a aucun effet dans l'app.

### Nouveau fichier : `src/features/content/useFeatureFlags.ts`

```ts
import { useQuery } from "@tanstack/react-query";
import { apiAdapter } from "@/infrastructure/api/apiAdapter";

type FeatureFlag = { key: string; label: string; enabled: boolean; group: string };

export function useFeatureFlags() {
  const { data = [] } = useQuery<FeatureFlag[]>({
    queryKey: ["feature-flags"],
    queryFn: () => apiAdapter.get("/mobile/feature-flags"),
    staleTime: 10 * 60 * 1000,
  });

  function isEnabled(key: string, defaultValue = true): boolean {
    const flag = data.find((f) => f.key === key);
    if (!flag) return defaultValue;
    return flag.enabled;
  }

  return { flags: data, isEnabled };
}
```

### Fichier à modifier : `src/features/content/index.ts`
```ts
export { useFeatureFlags } from './useFeatureFlags';
```

### Usages — wrapper les fonctionnalités conditionnelles :

**`app/(tabs)/_layout.tsx`** — onglet Feed conditionnel :
```tsx
import { useFeatureFlags } from "@/features/content";
// Dans CustomTabBar, avant le render :
// const { isEnabled } = useFeatureFlags();
// Dans TAB_CONFIG, filtrer : .filter(cfg => cfg.name !== 'feed' || isEnabled('mobile.chat'))
```

**`app/camera/index.tsx`** — recherche par image :
```tsx
import { useFeatureFlags } from "@/features/content";
const { isEnabled } = useFeatureFlags();
if (!isEnabled('mobile.cameraSearch')) {
  return <StatusState status="empty" title="Fonctionnalité non disponible" />;
}
```

**`app/wishlist/index.tsx`** :
```tsx
// Conditionner si !isEnabled('mobile.wishlist') → redirect /
```

---

## C7 — Countdown Deal du jour piloté par l'admin

### Problème
```ts
<Countdown seconds={6 * 3600 + 42 * 60} tone="primary" />
```
Durée hardcodée. L'admin ne contrôle pas quand le deal se termine.

### Solution en 2 étapes

**Étape 1 — L'admin définit la date de fin dans feed_sections.data**

Dans le CMS admin, section "Deal du jour" → champ `data` (JSON) :
```json
{ "endDate": "2026-07-20T23:59:00Z" }
```

**Étape 2 — `app/(tabs)/index.tsx`** : calculer les secondes restantes dynamiquement

```tsx
// Trouver la section "Deal du jour" dans les sections dynamiques
const dealSection = sections.find((s) => s.type === 'products' && s.position === 1);
const dealEndDate = dealSection?.data?.endDate ? new Date(dealSection.data.endDate) : null;
const dealSeconds = dealEndDate
  ? Math.max(0, Math.floor((dealEndDate.getTime() - Date.now()) / 1000))
  : 6 * 3600 + 42 * 60; // fallback si non configuré

// Remplacer dans le JSX :
// <Countdown seconds={6 * 3600 + 42 * 60} tone="primary" />
// Par :
// <Countdown seconds={dealSeconds} tone="primary" />
```

**Étape 3 — Admin panel** : vérifier que `FeedSectionsTab` permet d'éditer le champ `data`.
Dans `apps/admin/src/features/content/pages/FeedSectionsTab.tsx`, ajouter un champ
`endDate` dans le formulaire `SectionForm` pour les sections de type `products` :

```tsx
// Dans SectionForm, après le champ position, ajouter :
{type === 'products' && (
  <div>
    <label className={LABEL_CLS}>Date de fin (optionnel)</label>
    <input
      type="datetime-local"
      value={endDate}
      onChange={(e) => setEndDate(e.target.value)}
      className={INPUT_CLS}
    />
    <p className="text-xs text-gray-400 mt-1">Utilisé pour le compteur deal du jour</p>
  </div>
)}
```

Et adapter le `handleSubmit` pour inclure `data: endDate ? { endDate: new Date(endDate).toISOString() } : undefined`.

---

## C8 — Liens bannières depuis la DB

### Problème
Toutes les bannières ouvrent `/placeholder`. Le champ `linkUrl` de la DB est ignoré.

### Correction déjà incluse dans C1 (BannerCarousel refactorisé)
`onPress={() => b.linkUrl ? router.push(b.linkUrl as any) : null}`

Vérifier que le champ `linkUrl` est bien dans le type `Banner` (corrigé en C2).

**Aucun fichier supplémentaire à modifier** — C1 + C2 couvrent cette correction.

---

## C9 — Écran pages statiques

### Problème
Les liens CGV, Confidentialité, À propos pointent vers `/placeholder`.
Les vraies pages sont en DB (`static_pages`). Aucun écran ne les affiche.

### Nouveau fichier : `app/static-page/[slug].tsx`

```tsx
import { ScreenHeader, StatusState } from "@/components";
import { spacing, useThemedStyles, type Colors } from "@/design-system";
import { apiAdapter } from "@/infrastructure/api/apiAdapter";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { WebView } from "react-native-webview";

export default function StaticPageScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t } = useTranslation();

  const { data: page, isLoading, isError } = useQuery({
    queryKey: ["static-page", slug],
    queryFn: () => apiAdapter.get(`/content/pages/${slug}`),
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <View style={{ flex: 1 }}>
        <ScreenHeader title="..." />
        <StatusState status="loading" title="Chargement..." hint="" />
      </View>
    );
  }

  if (isError || !page) {
    return (
      <View style={{ flex: 1 }}>
        <ScreenHeader title={t("common.error")} />
        <StatusState status="error" title="Page introuvable" hint="" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader title={page.title} />
      <WebView
        source={{ html: `<html><body style="font-family:sans-serif;padding:16px;font-size:16px;line-height:1.6;">${page.content}</body></html>` }}
        style={{ flex: 1 }}
      />
    </View>
  );
}
```

### Fichier à modifier : `app/_layout.tsx`
Ajouter la route :
```tsx
<Stack.Screen name="static-page/[slug]" options={{ animation: 'slide_from_right' }} />
```

### Remplacer les liens placeholder :

**`app/settings/index.tsx`** :
```tsx
// Remplacer :
// router.push("/placeholder?title=Confidentialité&icon=shield")
// Par :
router.push("/static-page/privacy")

// Remplacer :
// router.push("/placeholder?title=Informations%20légales&icon=shield")
// Par :
router.push("/static-page/cgv")
```

**`app/checkout/index.tsx`** :
```tsx
// Remplacer :
// router.push("/placeholder?title=Conditions+générales")
// Par :
router.push("/static-page/cgv")
```

**Note** : `react-native-webview` doit être installé si absent :
```bash
cd apps && npx expo install react-native-webview
```

---


---

# PHASE 3 — Fonctionnalités manquantes

## C10 — Opérateurs Mobile Money depuis la DB

### Problème
```ts
const COUNTRY_OPERATORS: Record<string, string[]> = { NE: ['Orange Money', 'Moov Money'], ... }
```
Liste hardcodée dans `checkout/payment.tsx`. Ignorée complètement par ce que
l'admin configure dans le CMS.

### Solution
Les méthodes de paiement (`methods`) sont déjà chargées depuis la DB via
`usePaymentMethods()`. Chaque méthode a `supportedCountries: string[]`.

**Fichier à modifier : `app/checkout/payment.tsx`**

```tsx
// Supprimer entièrement la constante COUNTRY_OPERATORS

// Remplacer :
const availableOperators = COUNTRY_OPERATORS[countryCode] ?? COUNTRY_OPERATORS.NE;

// Par — filtrer les méthodes mobile-money supportées dans le pays actif :
const mobileMoneyMethods = methods.filter(
  (m) =>
    m.type === 'mobile-money' &&
    (m.supportedCountries?.length === 0 || m.supportedCountries?.includes(countryCode))
);

// Dans le rendu, remplacer la section opérateurs :
{active && method === "mobileMoney" && (
  <View style={styles.operatorsWrap}>
    <Text style={styles.operatorsCountry}>
      Opérateurs disponibles dans votre pays
    </Text>
    <View style={styles.operators}>
      {mobileMoneyMethods.map((op) => (
        <Pressable
          key={op.id}
          style={[styles.operator, operator === op.id && styles.operatorActive]}
          onPress={() => setOperator(op.id)}
        >
          <Text style={[styles.operatorText, operator === op.id && styles.operatorTextActive]}>
            {op.labelKey}
          </Text>
        </Pressable>
      ))}
    </View>
  </View>
)}
```

Changer `operator` state de `string` (nom) à `string` (id de méthode) :
```ts
const [operator, setOperator] = useState<string>('');
// Initialiser au premier rendu :
useEffect(() => {
  if (mobileMoneyMethods.length > 0 && !operator) {
    setOperator(mobileMoneyMethods[0].id);
  }
}, [mobileMoneyMethods]);
```

---

## C11 — Paiement réel + création commande

### Problème
```ts
await new Promise((resolve) => setTimeout(resolve, 1200));
clear();
router.replace("/checkout/success");
```
Simulation. Aucune commande créée. Cart vidé dans le vide.

### Solution
L'endpoint `POST /orders` existe déjà dans `OrdersController` avec `createFromCheckout()`.
Il faut l'appeler depuis l'app mobile.

**Nouveau fichier : `src/features/checkout/checkoutApiService.ts`**

```ts
import { apiAdapter } from "@/infrastructure/api/apiAdapter";
import type { CartItem } from "@/types";

export type CheckoutPayload = {
  items: {
    productId: string;
    title: string;
    image: string;
    quantity: number;
    unitPrice: string;
    variantLabel?: string;
  }[];
  subtotal: string;
  shippingCost: string;
  discountAmount: string;
  total: string;
  currency: string;
  couponCode?: string;
  shippingAddress?: Record<string, unknown>;
  paymentMethod: string;
};

export async function createOrder(payload: CheckoutPayload) {
  return apiAdapter.post("/orders", payload as any);
}
```

**Fichier à modifier : `app/checkout/payment.tsx`**

```tsx
// Ajouter import :
import { createOrder } from "@/features/checkout/checkoutApiService";
import { useAddressStore, getDefaultAddress } from "@/store/addressStore";

// Récupérer l'adresse :
const address = useAddressStore(getDefaultAddress);

// Remplacer handlePay() :
const handlePay = async () => {
  setIsProcessing(true);
  setPayError(null);
  try {
    const cartItems = useCartStore.getState().items.filter((i) => i.selected);

    await createOrder({
      items: cartItems.map((item) => ({
        productId: item.productId,
        title: item.title,
        image: item.image,
        quantity: item.quantity,
        unitPrice: String(item.priceUsd),
        variantLabel: item.variantLabel,
      })),
      subtotal: String(total),
      shippingCost: '0',
      discountAmount: '0',
      total: String(total),
      currency: 'XOF',
      paymentMethod: method,
      shippingAddress: address ? {
        name: address.contactName,
        street: address.street,
        city: address.city,
        country: address.countryCode,
        phone: address.phone,
      } : undefined,
    });

    clear();
    router.replace("/checkout/success");
  } catch (e) {
    setPayError(e instanceof Error ? e.message : 'Erreur lors du paiement');
  } finally {
    setIsProcessing(false);
  }
};
```

---

## C12 — Seed posts Feed

### Problème
Le Feed est vide car `content_blocks` groupe=`feed` n'a aucune donnée.

### Fichier à modifier : `apps/api/src/seed.ts`

Ajouter après les raccourcis (et avant les bannières) :

```ts
// ── Posts Feed ──
const feedPosts = [
  { title: 'Samsung Galaxy A54 — Meilleur rapport qualité/prix 2026', image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400', author: 'TechAfri', likes: 342, height: 280 },
  { title: 'Les tendances mode africaine à adopter cet été', image: 'https://images.unsplash.com/photo-1580657018950-c7f7d6a6d990?w=400', author: 'Aminata Fashion', likes: 521, height: 340 },
  { title: 'Top 5 smartphones < 100 000 FCFA en 2026', image: 'https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=400', author: 'GeekSahel', likes: 189, height: 260 },
  { title: 'Karité pur : bienfaits et comment l\'utiliser', image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400', author: 'Beauté Africaine', likes: 276, height: 310 },
  { title: 'Casque JBL Tune : test complet en conditions réelles', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400', author: 'SoundCheck NE', likes: 143, height: 290 },
  { title: 'Guide : bien choisir son ventilateur pour la chaleur', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', author: 'HomeAfri', likes: 98, height: 270 },
  { title: 'Montre connectée : laquelle choisir sous 30 000 FCFA ?', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400', author: 'TechAfri', likes: 415, height: 300 },
  { title: 'Les meilleures sneakers tendance du moment', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', author: 'StyleSahel', likes: 633, height: 320 },
]

await db.insert(schema.contentBlocks).values(
  feedPosts.map((post, i) => ({
    storeId: SYSTEM_STORE_ID,
    key: `feed_post_${String(i + 1).padStart(2, '0')}`,
    value: JSON.stringify({
      id: `fp${i + 1}`,
      image: post.image,
      title: post.title,
      author: post.author,
      authorAvatar: `https://picsum.photos/seed/av${i}/80`,
      likes: post.likes,
      height: post.height,
      duration: i % 2 === 0 ? `00:${(15 + i * 3).toString().padStart(2, '0')}` : undefined,
    }),
    type: 'json',
    groupName: 'feed',
    label: `Post Feed — ${post.title.slice(0, 30)}`,
    isActive: true,
  }))
)
console.log('  ✓ 8 posts feed créés')
```

---

## C13 — Mapping conversations DB → type Conversation mobile

### Problème
`ChatService.listConversations()` retourne :
```ts
{ id, customerId, storeId, subject, status, createdAt, updatedAt }
```
Mais le type `Conversation` mobile attend :
```ts
{ id, name, avatar, online, lastMessage, lastTime, unread, messages }
```
Le mapping est absent → l'écran Messagerie affiche des données vides ou crashe.

### Fichier à modifier : `apps/api/src/modules/mobile/mobile.service.ts`

Ajouter une méthode dédiée pour enrichir les conversations :

```ts
// Ajouter dans MobileService :
async getCustomerConversations(customerId: string) {
  const convs = await this.db
    .select()
    .from(conversations)
    .where(eq(conversations.customerId, customerId))
    .orderBy(desc(conversations.updatedAt))

  return Promise.all(convs.map(async (conv) => {
    // Dernier message
    const [lastMsg] = await this.db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conv.id))
      .orderBy(desc(messages.createdAt))
      .limit(1)

    // Count non lus (messages non lus du client)
    const [{ count: unreadCount }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(and(
        eq(messages.conversationId, conv.id),
        sql`${messages.readAt} IS NULL`,
        eq(messages.senderRole, 'admin'),
      ))

    return {
      id: conv.id,
      name: conv.subject ?? 'Conversation',
      avatar: '',
      online: false,
      lastMessage: lastMsg?.content ?? '',
      lastTime: lastMsg?.createdAt
        ? new Date(lastMsg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        : '',
      unread: Number(unreadCount),
      messages: [],
    }
  }))
}
```

**Fichier à modifier : `apps/api/src/modules/mobile/mobile.controller.ts`**

Ajouter l'endpoint :
```ts
@Get('conversations')
@ApiBearerAuth()
@ApiOperation({ summary: 'Conversations du client connecté' })
async getConversations(@CurrentUser() user: any) {
  return this.service.getCustomerConversations(user.id)
}
```

**Fichier à modifier : `src/infrastructure/data-source/api/ApiChatDataSource.ts`**

```ts
// Modifier listConversations pour appeler /mobile/conversations :
async listConversations(): Promise<Conversation[]> {
  return apiAdapter.get("/mobile/conversations");
}
```

---

## C14 — Sections dynamiques tous types

### Problème
Seul `section.type === 'products'` est rendu. Les sections `banners`, `categories`,
`stores`, `inspiration` sont ignorées.

### Fichier à modifier : `app/(tabs)/index.tsx`

Remplacer le bloc `sections.map(...)` dans `ListHeaderComponent` :

```tsx
{sections.length > 0 ? (
  sections.map((section) => (
    <View key={section.id}>
      <SectionHeader
        title={section.title}
        actionLabel={t("common.seeAll")}
        onAction={() => router.push("/search")}
      />

      {/* Type : products */}
      {section.type === 'products' && section.items?.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hRail}>
          {section.items.map((p: any) => (
            <ProductCard key={p.id} product={p} width={150} quickAdd={false}
              isWished={wishedIds.includes(p.id)} onToggleWish={toggleWish} onAddToCart={addToCart} />
          ))}
        </ScrollView>
      )}

      {/* Type : banners */}
      {section.type === 'banners' && (
        <BannerCarousel banners={banners} />
      )}

      {/* Type : categories */}
      {section.type === 'categories' && categories.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hRail}>
          {categories.map((cat) => (
            <Pressable key={cat.id} style={styles.catChip}
              onPress={() => setActiveCat(cat.id)}>
              <Text style={styles.catChipText} numberOfLines={1}>{cat.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Type : stores — placeholder en attendant le hook stores */}
      {section.type === 'stores' && (
        <Text style={styles.comingSoon}>Boutiques à venir</Text>
      )}
    </View>
  ))
) : ( /* fallback existant */ )}
```

Ajouter dans `makeStyles` :
```ts
catChip: {
  paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  backgroundColor: colors.surface, borderRadius: radius.pill,
  borderWidth: 1, borderColor: colors.border, marginHorizontal: spacing.xs,
},
catChipText: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600' },
comingSoon: { fontSize: fontSize.sm, color: colors.textMuted, padding: spacing.lg },
```

---


---

# PHASE 4 — Performance et Polish

## C15 — Prefetch au démarrage

### Problème
4 requêtes se lancent en parallèle quand l'utilisateur arrive sur l'accueil.
Skeleton visible pendant le chargement. Peut être évité avec un prefetch.

### Fichier à modifier : `app/_layout.tsx`

```tsx
// Ajouter import :
import { catalogService } from "@/features/catalog";
import { contentService } from "@/features/content";

// Dans RootLayout, après useAuthGate() :
useEffect(() => {
  if (hydrated) {
    // Prefetch silencieux des données critiques
    queryClient.prefetchQuery({
      queryKey: ['products'],
      queryFn: () => catalogService.getProducts(),
      staleTime: 5 * 60 * 1000,
    });
    queryClient.prefetchQuery({
      queryKey: ['categories'],
      queryFn: () => catalogService.getCategories(),
      staleTime: 5 * 60 * 1000,
    });
    queryClient.prefetchQuery({
      queryKey: ['banners'],
      queryFn: () => contentService.getBanners(),
      staleTime: 5 * 60 * 1000,
    });
    queryClient.prefetchQuery({
      queryKey: ['feed-sections'],
      queryFn: () => contentService.getFeedSections(),
      staleTime: 5 * 60 * 1000,
    });
    queryClient.prefetchQuery({
      queryKey: ['app-settings'],
      queryFn: () => apiAdapter.get('/mobile/settings'),
      staleTime: 10 * 60 * 1000,
    });
    queryClient.prefetchQuery({
      queryKey: ['feature-flags'],
      queryFn: () => apiAdapter.get('/mobile/feature-flags'),
      staleTime: 10 * 60 * 1000,
    });
  }
}, [hydrated]);
```

---

## C16 — staleTime optimisé

### Problème
`staleTime: 60_000` global cause des refetch inutiles à chaque retour sur l'accueil.

### Fichier à modifier : `app/_layout.tsx`

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,  // 5 minutes par défaut (était 60s)
      retry: 1,
      gcTime: 10 * 60 * 1000,    // Garder en cache 10 minutes
    },
  },
});
```

Les queries sensibles (panier, commandes, conversations) peuvent override
avec un `staleTime` plus court directement dans leur `useQuery`.

---

## C17 — Avatar utilisateur avec initiales

### Problème
`user?.avatar` est une chaîne vide après login. `expo-image` avec `uri: ''`
affiche une zone grise sans fallback.

### Nouveau composant : `src/components/Avatar.tsx`

```tsx
import { Image } from "expo-image";
import { View, Text, StyleSheet } from "react-native";
import { useColors, useThemedStyles, type Colors } from "@/design-system";

type Props = {
  uri?: string;
  name?: string;
  size?: number;
};

function getInitials(name?: string): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function Avatar({ uri, name, size = 48 }: Props) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const hasImage = !!uri && uri.startsWith("http");

  return hasImage ? (
    <Image source={{ uri }} style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]} contentFit="cover" />
  ) : (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primary }]}>
      <Text style={[styles.initials, { fontSize: size * 0.33 }]}>{getInitials(name)}</Text>
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  avatar: { backgroundColor: colors.background },
  fallback: { alignItems: "center", justifyContent: "center" },
  initials: { color: colors.white, fontWeight: "800" },
});
```

### Fichier à modifier : `src/components/index.ts`
```ts
export { Avatar } from './Avatar';
```

### Fichiers à modifier — remplacer les Image avatar :

**`app/(tabs)/account.tsx`** :
```tsx
import { Avatar } from "@/components";
// Remplacer le bloc if/else avatar :
<Avatar uri={user?.avatar} name={user?.name} size={48} />
```

**`app/messages/[id].tsx`** — avatars des messages.
**`app/messages/index.tsx`** — avatars des conversations.

---

## C18 — Corriger "AfriExpress"

### Problème
```ts
Share.share({ message: `${product.title} — ${t("common.shareFrom")} AfriExpress` })
```
Le nom "AfriExpress" est incorrect. Le projet s'appelle "ExpressAfri".

### Fichier à modifier : `app/product/[id].tsx`
```ts
// Remplacer :
Share.share({ message: `${product.title} — ${t("common.shareFrom")} AfriExpress` })
// Par :
Share.share({ message: `${product.title} — ${t("common.shareFrom")} ExpressAfri` })
```

### Vérifier aussi dans les fichiers i18n :
```
src/i18n/locales/fr.json → clé "common.shareFrom"
src/i18n/locales/en.json → idem
```
S'assurer que la valeur est "ExpressAfri" partout.

---

## C19 — Logos CMS dans HomeHeader

### Problème
`HomeHeader` affiche le composant `<Logo />` (SVG hardcodé).
L'admin change le logo dans le CMS mais rien ne bouge dans l'app.

### Nouveau hook : `src/features/content/useAppLogos.ts`

```ts
import { useQuery } from "@tanstack/react-query";
import { apiAdapter } from "@/infrastructure/api/apiAdapter";

type AppLogo = { id: string; context: string; url: string; label: string };

export function useAppLogos() {
  const { data = [] } = useQuery<AppLogo[]>({
    queryKey: ["app-logos"],
    queryFn: () => apiAdapter.get("/mobile/logos"),
    staleTime: 10 * 60 * 1000,
  });

  function getLogo(context: string): string | null {
    return data.find((l) => l.context === context)?.url ?? null;
  }

  return { logos: data, getLogo };
}
```

### Fichier à modifier : `src/features/content/index.ts`
```ts
export { useAppLogos } from './useAppLogos';
```

### Fichier à modifier : `src/features/home/HomeHeader.tsx`

```tsx
import { useAppLogos } from "@/features/content";
import { Image } from "expo-image";
import { Logo } from "@/icons"; // fallback SVG

// Dans HomeHeader :
const { getLogo } = useAppLogos();
const headerLogoUrl = getLogo('header');

// Remplacer <Logo size={22} /> par :
{headerLogoUrl
  ? <Image source={{ uri: headerLogoUrl }} style={{ width: 120, height: 28 }} contentFit="contain" />
  : <Logo size={22} />
}
```

---

# RÉCAPITULATIF — Toutes les corrections

| Phase | Correction | Fichiers principaux | Priorité |
|-------|-----------|---------------------|----------|
| 1 | C1 — BannerCarousel refactorisé | `BannerCarousel.tsx` | 🔴 |
| 1 | C2 — Type Banner corrigé | `types/index.ts`, `mock/banners.ts` | 🔴 |
| 1 | C3 — Badge notifications dynamique | 4 fichiers + `useUnreadCount.ts` (new) | 🔴 |
| 1 | C4 — Sections vides masquées | `app/search/index.tsx` | 🟡 |
| 2 | C5 — useAppSettings() | `useAppSettings.ts` (new) + 4 usages | 🔴 |
| 2 | C6 — useFeatureFlags() | `useFeatureFlags.ts` (new) + usages | 🔴 |
| 2 | C7 — Countdown piloté admin | `index.tsx` + `FeedSectionsTab.tsx` | 🟠 |
| 2 | C8 — Liens bannières DB | Couvert par C1 | 🟠 |
| 2 | C9 — Écran pages statiques | `app/static-page/[slug].tsx` (new) | 🔴 |
| 3 | C10 — Opérateurs Mobile Money DB | `checkout/payment.tsx` | 🔴 |
| 3 | C11 — Paiement réel + commande | `checkoutApiService.ts` (new) + payment.tsx | 🔴 |
| 3 | C12 — Seed posts Feed | `seed.ts` | 🔴 |
| 3 | C13 — Mapping conversations DB | `mobile.service.ts`, `mobile.controller.ts`, `ApiChatDataSource.ts` | 🔴 |
| 3 | C14 — Sections tous types | `app/(tabs)/index.tsx` | 🟠 |
| 4 | C15 — Prefetch démarrage | `app/_layout.tsx` | 🟡 |
| 4 | C16 — staleTime 5min | `app/_layout.tsx` | 🟡 |
| 4 | C17 — Avatar initiales | `Avatar.tsx` (new) + usages | 🟡 |
| 4 | C18 — "AfriExpress" → "ExpressAfri" | `product/[id].tsx`, i18n | 🟡 |
| 4 | C19 — Logos CMS HomeHeader | `useAppLogos.ts` (new) + `HomeHeader.tsx` | 🟡 |

---

# Prompt pour l'agent exécutant

```
Tu es un agent de développement. Ta mission est d'appliquer toutes les corrections
de l'audit UI/UX mobile ExpressAfri.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DOCUMENTS DE RÉFÉRENCE — LIRE EN PREMIER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. C:\Users\abdou\Desktop\ExpressAfri\PLAN_CORRECTIONS_3.md
   → Code exact de chaque correction, fichiers à modifier

2. C:\Users\abdou\Desktop\ExpressAfri\AUDIT_MOBILE.md
   → Description complète de chaque problème

Lire les deux fichiers EN ENTIER avant de commencer.
Ne jamais improviser de solution différente de celle du plan.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RÈGLE ANTI-COMPACTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

À chaque compaction ou reprise :
1. Relire PLAN_CORRECTIONS_3.md
2. Lire le contenu ACTUEL des fichiers modifiés
3. Identifier la prochaine tâche non cochée
4. Ne jamais recommencer depuis le début

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHECKLIST PHASE 1 — Critiques visuelles
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ ] P1.1 — Lire BannerCarousel.tsx et types/index.ts avant de modifier
[ ] P1.2 — Remplacer BannerCarousel.tsx entier (C1)
[ ] P1.3 — Corriger type Banner dans types/index.ts (C2)
[ ] P1.4 — Mettre à jour mock/banners.ts pour le nouveau type (C2)
[ ] P1.5 — Créer src/features/messages/useUnreadCount.ts (C3)
[ ] P1.6 — Exporter useUnreadCount dans messages/index.ts (C3)
[ ] P1.7 — Ajouter badge dynamique dans HomeHeader.tsx (C3)
[ ] P1.8 — Ajouter badge dynamique dans app/(tabs)/account.tsx (C3)
[ ] P1.9 — Ajouter badge dynamique dans app/(tabs)/feed.tsx (C3)
[ ] P1.10 — Ajouter badge dynamique dans app/(tabs)/store.tsx (C3)
[ ] P1.11 — Conditionner sections Récent/Tendances si vides (C4)
[ ] P1.12 — Vérifier TypeScript : npx tsc --noEmit (racine)

Écrire "✅ PHASE 1 TERMINÉE" + fichiers modifiés avant de continuer.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHECKLIST PHASE 2 — Contrôle Admin
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ ] P2.1 — Créer src/features/content/useAppSettings.ts (C5)
[ ] P2.2 — Exporter useAppSettings dans content/index.ts (C5)
[ ] P2.3 — Remplacer FREE_SHIP_THRESHOLD hardcodé dans cart.tsx (C5)
[ ] P2.4 — Remplacer texte promo hardcodé dans account.tsx (C5)
[ ] P2.5 — Remplacer "Niger · Niamey" hardcodé dans product/[id].tsx (C5)
[ ] P2.6 — Remplacer texte promo hardcodé dans store.tsx (C5)
[ ] P2.7 — Créer src/features/content/useFeatureFlags.ts (C6)
[ ] P2.8 — Exporter useFeatureFlags dans content/index.ts (C6)
[ ] P2.9 — Appliquer flag mobile.cameraSearch dans camera/index.tsx (C6)
[ ] P2.10 — Lire feed_sections.data.endDate pour Countdown dans index.tsx (C7)
[ ] P2.11 — Ajouter champ endDate dans FeedSectionsTab.tsx admin (C7)
[ ] P2.12 — Créer app/static-page/[slug].tsx (C9)
[ ] P2.13 — Ajouter la route dans app/_layout.tsx (C9)
[ ] P2.14 — Corriger liens settings/index.tsx → /static-page/privacy et /cgv (C9)
[ ] P2.15 — Corriger lien checkout/index.tsx → /static-page/cgv (C9)
[ ] P2.16 — Vérifier TypeScript : npx tsc --noEmit (racine)

Écrire "✅ PHASE 2 TERMINÉE" + fichiers modifiés avant de continuer.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHECKLIST PHASE 3 — Fonctionnalités
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ ] P3.1 — Supprimer COUNTRY_OPERATORS et filtrer depuis payment_methods DB (C10)
[ ] P3.2 — Créer src/features/checkout/checkoutApiService.ts (C11)
[ ] P3.3 — Remplacer setTimeout dans handlePay() par createOrder() (C11)
[ ] P3.4 — Ajouter 8 posts feed dans seed.ts (C12)
[ ] P3.5 — Relancer npm run seed dans apps/api (C12)
[ ] P3.6 — Ajouter getCustomerConversations() dans mobile.service.ts (C13)
[ ] P3.7 — Ajouter GET /mobile/conversations dans mobile.controller.ts (C13)
[ ] P3.8 — Modifier ApiChatDataSource.ts → /mobile/conversations (C13)
[ ] P3.9 — Ajouter rendu types banners/categories/stores dans index.tsx (C14)
[ ] P3.10 — Vérifier TypeScript backend : cd apps/api && npx tsc --noEmit
[ ] P3.11 — Vérifier TypeScript mobile : npx tsc --noEmit (racine)

Écrire "✅ PHASE 3 TERMINÉE" + fichiers modifiés avant de continuer.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHECKLIST PHASE 4 — Performance et Polish
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ ] P4.1 — Ajouter prefetch au démarrage dans _layout.tsx (C15)
[ ] P4.2 — Changer staleTime à 5min dans QueryClient (C16)
[ ] P4.3 — Créer src/components/Avatar.tsx (C17)
[ ] P4.4 — Exporter Avatar dans src/components/index.ts (C17)
[ ] P4.5 — Utiliser Avatar dans account.tsx, messages/ (C17)
[ ] P4.6 — Corriger "AfriExpress" → "ExpressAfri" dans product/[id].tsx (C18)
[ ] P4.7 — Vérifier les fichiers i18n fr.json et en.json (C18)
[ ] P4.8 — Créer src/features/content/useAppLogos.ts (C19)
[ ] P4.9 — Exporter useAppLogos dans content/index.ts (C19)
[ ] P4.10 — Utiliser logo CMS dans HomeHeader.tsx si disponible (C19)
[ ] P4.11 — Vérification TypeScript finale : npx tsc --noEmit (racine)

Écrire "✅ PHASE 4 TERMINÉE — TOUTES LES CORRECTIONS APPLIQUÉES"
avec le tableau complet de tous les fichiers modifiés et créés.
```
