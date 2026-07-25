import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CartItem, Product, VariantAttribute } from '@/types';

type CartState = {
  items: CartItem[];
  add: (
    product: Product,
    quantity?: number,
    variantLabel?: string,
    variantAttributes?: VariantAttribute[],
  ) => void;
  remove: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  toggleSelected: (productId: string) => void;
  setAllSelected: (selected: boolean) => void;
  clear: () => void;
  /** Retire uniquement les articles sélectionnés (après un achat). */
  clearSelected: () => void;
  // Sélecteurs dérivés
  count: () => number;
  selectedItems: () => CartItem[];
  subtotalUsd: () => number;
};

/**
 * Retourne la clé de persistence du panier pour l'utilisateur courant.
 * Invité / non connecté → clé générique (panier anonyme).
 * Connecté → clé isolée par userId pour éviter toute fuite entre comptes.
 */
function cartStorageKey(): string {
  try {
    // Import synchrone du store auth (déjà initialisé avant le panier)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useAuthStore } = require('@/store/authStore');
    const userId = useAuthStore.getState().user?.email ?? null;
    if (userId) return `afriexpress-cart:${userId}`;
  } catch {}
  return 'afriexpress-cart:guest';
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      add: (product, quantity = 1, variantLabel, variantAttributes) =>
        set((state) => {
          const existing = state.items.find(
            (i) => i.productId === product.id && i.variantLabel === variantLabel
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i === existing ? { ...i, quantity: i.quantity + quantity } : i
              ),
            };
          }
          return {
            items: [
              ...state.items,
              {
                productId: product.id,
                title: product.title,
                image: product.images[0],
                priceUsd: product.priceUsd,
                quantity,
                variantLabel,
                variantAttributes,
                selected: true,
              },
            ],
          };
        }),

      remove: (productId) =>
        set((state) => ({ items: state.items.filter((i) => i.productId !== productId) })),

      setQuantity: (productId, quantity) =>
        set((state) => ({
          items: state.items
            .map((i) => (i.productId === productId ? { ...i, quantity: Math.max(0, quantity) } : i))
            .filter((i) => i.quantity > 0),
        })),

      toggleSelected: (productId) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, selected: !i.selected } : i
          ),
        })),

      setAllSelected: (selected) =>
        set((state) => ({ items: state.items.map((i) => ({ ...i, selected })) })),

      clear: () => set({ items: [] }),

      clearSelected: () =>
        set((state) => ({ items: state.items.filter((i) => !i.selected) })),

      count: () => get().items.reduce((n, i) => n + i.quantity, 0),
      selectedItems: () => get().items.filter((i) => i.selected),
      subtotalUsd: () =>
        get()
          .items.filter((i) => i.selected)
          .reduce((sum, i) => sum + i.priceUsd * i.quantity, 0),
    }),
    {
      name: cartStorageKey(),
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ items: state.items }),
    }
  )
);
