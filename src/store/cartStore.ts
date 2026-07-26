import { create } from 'zustand';
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
  clearSelected: () => void;
  count: () => number;
  selectedItems: () => CartItem[];
  subtotalUsd: () => number;
};

const storageKey = (userId: string) => `afriexpress-cart:${userId}`;

/** Charge le panier depuis AsyncStorage pour l'utilisateur donné. */
export async function loadCartForUser(userId: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    const items: CartItem[] = raw ? JSON.parse(raw).items ?? [] : [];
    useCartStore.setState({ items });
  } catch {
    useCartStore.setState({ items: [] });
  }
}

/** Persiste le panier courant pour l'utilisateur donné. */
export async function saveCartForUser(userId: string): Promise<void> {
  try {
    const { items } = useCartStore.getState();
    await AsyncStorage.setItem(storageKey(userId), JSON.stringify({ items }));
  } catch {}
}

/** Efface le panier persisté pour l'utilisateur donné et vide le store. */
export async function clearCartForUser(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(storageKey(userId));
  } catch {}
  useCartStore.setState({ items: [] });
}

let _unsubscribe: (() => void) | null = null;

/** Abonne le store à l'auto-sauvegarde pour l'utilisateur donné. */
export function subscribeCartForUser(userId: string): void {
  _unsubscribe?.();
  _unsubscribe = useCartStore.subscribe((state) => {
    AsyncStorage.setItem(storageKey(userId), JSON.stringify({ items: state.items })).catch(() => {});
  });
}

/** Désabonne l'auto-sauvegarde (à la déconnexion). */
export function unsubscribeCart(): void {
  _unsubscribe?.();
  _unsubscribe = null;
}

export const useCartStore = create<CartState>()((set, get) => ({
  items: [],

  add: (product, quantity = 1, variantLabel, variantAttributes) =>
    set((state) => {
      const existing = state.items.find(
        (i) => i.productId === product.id && i.variantLabel === variantLabel,
      );
      if (existing) {
        return {
          items: state.items.map((i) =>
            i === existing ? { ...i, quantity: i.quantity + quantity } : i,
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
            storeId: product.storeId ?? null,
            storeName: product.storeName ?? null,
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
        i.productId === productId ? { ...i, selected: !i.selected } : i,
      ),
    })),

  setAllSelected: (selected) =>
    set((state) => ({ items: state.items.map((i) => ({ ...i, selected })) })),

  clear: () => set({ items: [] }),

  clearSelected: () => set((state) => ({ items: state.items.filter((i) => !i.selected) })),

  count: () => get().items.reduce((n, i) => n + i.quantity, 0),
  selectedItems: () => get().items.filter((i) => i.selected),
  subtotalUsd: () =>
    get()
      .items.filter((i) => i.selected)
      .reduce((sum, i) => sum + i.priceUsd * i.quantity, 0),
}));
