import AsyncStorage from "@react-native-async-storage/async-storage";
import { unregisterPushToken } from "@/features/notifications/pushNotifications";
import { logger } from "@/infrastructure/logging";
import {
  clearTokens as apiClearTokens,
  loadTokensFromStorage as apiLoadTokens,
  setTokens as apiSetTokens,
  registerSessionExpiredHandler,
  apiAdapter,
} from "@/infrastructure/api/apiAdapter";
import { isMock } from "@/infrastructure/mock";
import { clearPrivateQueries } from "@/infrastructure/query/queryClient";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  loadCartForUser,
  subscribeCartForUser,
  unsubscribeCart,
} from "@/store/cartStore";
import {
  loadAddressesForUser,
  subscribeAddressesForUser,
  unsubscribeAddresses,
} from "@/store/addressStore";
import { registerAuthGetter } from "@/features/address/addressSync";
import {
  loadWishlistForUser,
  subscribeWishlistForUser,
  unsubscribeWishlist,
} from "@/store/wishlistStore";

const apiGetAccessToken = () => apiAdapter.getAccessToken();

export type User = {
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  gender?: string;
  birthYear?: string;
  language?: string;
};

type AuthState = {
  hasOnboarded: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  user: User | null;
  /** Devient true une fois AsyncStorage rechargé. */
  hydrated: boolean;
  completeOnboarding: () => void;
  signIn: (
    user: User,
    tokens?: { access?: string | null; refresh?: string | null },
  ) => void;
  continueAsGuest: () => void;
  signOut: () => void;
  setHydrated: () => void;
  updateProfile: (patch: Partial<User>) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      hasOnboarded: false,
      isAuthenticated: false,
      isGuest: false,
      user: null,
      hydrated: false,

      completeOnboarding: () => set({ hasOnboarded: true }),
      signIn: (user, tokens) => {
        clearPrivateQueries();
        set({ isAuthenticated: true, isGuest: false, user });
        const userId = user.email ?? user.name;
        // Charger les données privées de l'utilisateur qui se connecte
        void Promise.all([
          loadCartForUser(userId),
          loadAddressesForUser(userId),
          loadWishlistForUser(userId),
        ]).then(() => {
          subscribeCartForUser(userId);
          subscribeAddressesForUser(userId);
          subscribeWishlistForUser(userId);
        });
        if (tokens) {
          apiSetTokens(tokens).catch((error) => {
            logger.warn("[authStore] Failed to persist tokens on signIn", { error });
          });
        } else if (isMock()) {
          apiSetTokens({ access: "mock-access-token", refresh: "mock-refresh-token" }).catch(
            (error) => {
              logger.warn("[authStore] Failed to persist mock tokens on signIn", { error });
            },
          );
        }
      },
      continueAsGuest: () => {
        clearPrivateQueries();
        const prevUser = useAuthStore.getState().user;
        unsubscribeCart();
        unsubscribeAddresses();
        unsubscribeWishlist();
        if (prevUser) {
          // Garder les données persistées — ne pas les effacer
        }
        // Vider les stores en mémoire (l'invité ne voit rien)
        import('@/store/cartStore').then(({ useCartStore }) => useCartStore.setState({ items: [] })).catch(() => {});
        import('@/store/wishlistStore').then(({ useWishlistStore }) => useWishlistStore.setState({ ids: [] })).catch(() => {});
        import('@/store/addressStore').then(({ useAddressStore }) => useAddressStore.setState({ addresses: [], defaultId: null })).catch(() => {});
        set({ isGuest: true, isAuthenticated: false, user: null });
        apiClearTokens().catch(() => {});
      },
      signOut: () => {
        clearPrivateQueries();
        unregisterPushToken().catch(() => {});
        const prevUser = useAuthStore.getState().user;
        if (prevUser) {
          const prevId = prevUser.email ?? prevUser.name;
          unsubscribeCart();
          unsubscribeAddresses();
          unsubscribeWishlist();
          // Ne pas effacer les données — elles doivent persister pour la prochaine connexion
        }
        set({ isAuthenticated: false, isGuest: false, user: null });
        apiClearTokens().catch((error) => {
          logger.warn("[authStore] Failed to clear tokens on signOut", { error });
        });
      },
      setHydrated: () => set({ hydrated: true }),
      updateProfile: (patch) =>
        set((s) => ({
          user: {
            name: "Utilisateur AfriExpress",
            ...(s.user ?? {}),
            ...patch,
          },
        })),
    }),
    {
      name: "afriexpress-auth",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        hasOnboarded: s.hasOnboarded,
        isAuthenticated: s.isAuthenticated,
        isGuest: s.isGuest,
        user: s.user,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          logger.warn("[authStore] Rehydration failed", { error });
        }
        // Charger les tokens dans l'apiAdapter AVANT de marquer l'app comme
        // hydratée : sinon les appels authentifiés du démarrage (refreshProfile,
        // préchargements) partent sans jeton → 401 → session/avatar perdus.
        apiLoadTokens()
          .catch(() => {})
          .then(async () => {
            const hasToken = !!apiGetAccessToken();
            const s = useAuthStore.getState();

            if (hasToken && s.isAuthenticated) {
              // Token présent et état persisté = connecté : vérifier que le
              // token est encore valide en tentant un refresh silencieux.
              // Si le refresh échoue (401/réseau), on laisse l'apiAdapter
              // gérer la déconnexion via onSessionExpired.
              try {
                const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? '';
                const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
                const storedRefresh = await AsyncStorage.getItem('auth.refresh');
                if (storedRefresh) {
                  const r = await fetch(`${API_BASE.replace(/\/$/, '')}/mobile/auth/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                    body: JSON.stringify({ refreshToken: storedRefresh }),
                  });
                  if (r.ok) {
                    const js = await r.json();
                    await apiSetTokens({ access: js.accessToken, refresh: js.refreshToken });
                    logger.info('[authStore] Token rafraîchi au démarrage');
                    // Recharger les données privées de l'utilisateur
                    const currentUser = useAuthStore.getState().user;
                    if (currentUser) {
                      const uid = currentUser.email ?? currentUser.name;
                      void Promise.all([
                        loadCartForUser(uid),
                        loadAddressesForUser(uid),
                        loadWishlistForUser(uid),
                      ]).then(() => {
                        subscribeCartForUser(uid);
                        subscribeAddressesForUser(uid);
                        subscribeWishlistForUser(uid);
                      });
                    }
                  } else if (r.status === 401 || r.status === 403) {
                    // Token définitivement expiré : déconnecter proprement
                    logger.info('[authStore] Token expiré au démarrage — déconnexion');
                    await apiClearTokens();
                    useAuthStore.setState({ isAuthenticated: false, isGuest: false, user: null });
                  }
                  // 5xx / réseau : on garde l'état actuel, l'apiAdapter retentera
                }
              } catch {
                // Erreur réseau au démarrage : on garde la session locale
              }
            } else if (hasToken && !s.isAuthenticated && !s.isGuest) {
              logger.info(
                '[authStore] Session restaurée depuis les jetons (état persisté incohérent)',
              );
              useAuthStore.setState({ isAuthenticated: true });
            }

            logger.info('[authStore] Hydrated', {
              isAuthenticated: useAuthStore.getState().isAuthenticated,
              hasToken,
            });
            state?.setHydrated();
          });
      },
    },
  ),
);

// Injecter le getter d'authentification dans addressSync pour éviter le cycle d'import
registerAuthGetter(() => useAuthStore.getState().isAuthenticated);

// Session définitivement expirée (le serveur a rejeté le refresh token) :
// basculer proprement en « déconnecté ». L'utilisateur garde l'app ouverte,
// le gardien de navigation l'enverra à l'écran de connexion.
registerSessionExpiredHandler(() => {
  logger.info("[authStore] Session expirée côté serveur — déconnexion locale");
  clearPrivateQueries();
  useAuthStore.setState({ isAuthenticated: false, isGuest: false, user: null });
});
