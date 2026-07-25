import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

type WishlistState = {
  ids: string[];
  toggle: (id: string) => void;
  has: (id: string) => boolean;
};

const wishlistStorageKey = (userId: string) => `afriexpress-wishlist:${userId}`;

export async function loadWishlistForUser(userId: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(wishlistStorageKey(userId));
    const ids: string[] = raw ? JSON.parse(raw).ids ?? [] : [];
    useWishlistStore.setState({ ids });
  } catch {
    useWishlistStore.setState({ ids: [] });
  }
}

export async function clearWishlistForUser(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(wishlistStorageKey(userId));
  } catch {}
  useWishlistStore.setState({ ids: [] });
}

let _unsubscribeWish: (() => void) | null = null;

export function subscribeWishlistForUser(userId: string): void {
  _unsubscribeWish?.();
  _unsubscribeWish = useWishlistStore.subscribe((state) => {
    AsyncStorage.setItem(wishlistStorageKey(userId), JSON.stringify({ ids: state.ids })).catch(() => {});
  });
}

export function unsubscribeWishlist(): void {
  _unsubscribeWish?.();
  _unsubscribeWish = null;
}

export const useWishlistStore = create<WishlistState>()((set, get) => ({
  ids: [],
  toggle: (id) =>
    set((state) => ({
      ids: state.ids.includes(id)
        ? state.ids.filter((x) => x !== id)
        : [...state.ids, id],
    })),
  has: (id) => get().ids.includes(id),
}));
