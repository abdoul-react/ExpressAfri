# Plan de migration — Barrel exports & frontières de modules

**Objectif :** Chaque feature a un `index.ts` qui sert d'API publique.
Les écrans et autres features n'importent **que** depuis `@/features/[feature]`.

---

## Étapes

| # | Feature | Créer barrel | Screens à mettre à jour | Imports cross-feature |
|---|---------|:---:|---|:---:|
| 1 | `address` | ✅ | `app/address/form.tsx` | — |
| 2 | `auth` | ✅ | 3 screens auth | — |
| 3 | `cart` | ✅ | `app/(tabs)/cart.tsx` | — |
| 4 | `catalog` | ✅ | `app/(tabs)/account.tsx`, `app/(tabs)/cart.tsx` | `useProduct.ts`, `useSearch.ts` |
| 5 | `checkout` | ✅ | `app/checkout/index.tsx` | `cartService.ts` |
| 6 | `feed` | ✅ | `app/(tabs)/feed.tsx` | — |
| 7 | `home` | ✅ | `app/(tabs)/index.tsx` | — |
| 8 | `messages` | ✅ | `app/messages/[id].tsx` | — |
| 9 | `mock` | ✅ | — | `useCheckout.ts` |
| 10 | `order` | ✅ | — | `paymentMachine.ts` |
| 11 | `orders` | ✅ | `app/orders/index.tsx`, `app/orders/tracking.tsx` | — |
| 12 | `payment` | ✅ | `app/checkout/index.tsx`, `app/checkout/payment.tsx`, `app/payment/index.tsx` | — |
| 13 | `product` | ✅ | `app/product/[id].tsx` | — |
| 14 | `store` | ✅ | `app/(tabs)/store.tsx` | — |
| 15 | Vérification | — | `grep` final | — |
