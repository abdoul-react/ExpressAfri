# Plan de correction — Conformité architecture

**Règle :** Écran → Hook → Service → Données
**Objectif :** Aucun écran ni composant n'importe directement `@/services` ou `@tanstack/react-query`.

---

## Task 1 — Hook auth : `src/features/auth/useAuth.ts`

Encapsuler tous les appels à `authService` dans un hook.

```ts
export function useAuth() {
  return {
    loginWithEmail(email, password),
    requestOtp(contact, mode),
    verifyOtp(contact, code),
    requestPasswordReset(email),
  };
}
```

**Fichiers impactés :** `src/features/auth/useAuth.ts` (Nouveau)

---

## Task 2 — `app/auth/login.tsx`

- Remplacer `import * as authService from "@/services/authService"` → `import { useAuth } from "@/features/auth/useAuth"`
- Remplacer `authService.loginWithEmail(...)` → `loginWithEmail(...)`
- Remplacer `authService.requestOtp(...)` → `requestOtp(...)`

**Fichiers impactés :** `app/auth/login.tsx`

---

## Task 3 — `app/auth/otp.tsx`

- Remplacer `import * as authService from "@/services/authService"` → `import { useAuth } from "@/features/auth/useAuth"`
- Remplacer `authService.verifyOtp(...)` → `verifyOtp(...)`

**Fichiers impactés :** `app/auth/otp.tsx`

---

## Task 4 — `app/auth/forgot-password.tsx`

- Remplacer `import * as authService from "@/services/authService"` → `import { useAuth } from "@/features/auth/useAuth"`
- Remplacer `authService.requestPasswordReset(...)` → `requestPasswordReset(...)`

**Fichiers impactés :** `app/auth/forgot-password.tsx`

---

## Task 5 — `BannerCarousel` reçoit `banners` en props

- `BannerCarousel` : accepter `banners: Banner[]` en prop, supprimer `useQuery` + `contentService`
- `useHomeFeed` : ajouter `contentService.getBanners()` et `catalogService.getCategories()` ; retourner `banners`, `categories`, `isLoading` combiné
- `app/(tabs)/index.tsx` : déduire les imports `catalogService`, `useQuery` ; passer `banners` et `categories` depuis `useHomeFeed`

**Fichiers impactés :**
- `src/features/home/BannerCarousel.tsx`
- `src/features/home/useHomeFeed.ts`
- `app/(tabs)/index.tsx`

---

## Task 6 — `app/(tabs)/index.tsx` (suite)

- Supprimer les imports : `catalogService`, `useQuery`, `Image`, `Price`, `Pressable` (devenus inutiles)
- Supprimer `categoriesQ` / `categories` du screen

---

## Task 7 — Hook `useCardBrands`

- Créer `src/features/payment/useCardBrands.ts` avec `useQuery(["card-brands"], ...)`
- `app/checkout/index.tsx` : remplacer `paymentService` + `useQuery` par `useCardBrands()`

**Fichiers impactés :**
- `src/features/payment/useCardBrands.ts` (Nouveau)
- `app/checkout/index.tsx`

---

## Task 8 — Vérification finale

```bash
grep -r "from \"@/services\"" app/     # → 0 résultats
grep -r "from \"@tanstack/react-query\"" app/   # → 0 résultats
```

---

## Résumé des changements

| Fichier | Avant | Après |
|---------|-------|-------|
| `src/features/auth/useAuth.ts` | *inexistant* | Hook auth |
| `app/auth/login.tsx` | `authService.*` direct | `useAuth()` hook |
| `app/auth/otp.tsx` | `authService.verifyOtp` | `useAuth().verifyOtp` |
| `app/auth/forgot-password.tsx` | `authService.requestPasswordReset` | `useAuth().requestPasswordReset` |
| `src/features/home/BannerCarousel.tsx` | `contentService` + `useQuery` | `banners` prop |
| `src/features/home/useHomeFeed.ts` | produits seulement | produits + bannières + catégories |
| `app/(tabs)/index.tsx` | `catalogService` + `useQuery` | tout depuis `useHomeFeed` |
| `src/features/payment/useCardBrands.ts` | *inexistant* | Hook card brands |
| `app/checkout/index.tsx` | `paymentService` + `useQuery` | `useCardBrands()` |
