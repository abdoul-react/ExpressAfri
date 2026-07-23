import { isMock } from "@/infrastructure/mock";
import {
  clearTokens as apiClearTokens,
  loadTokensFromStorage as apiLoadTokens,
  setTokens as apiSetTokens,
  registerSessionExpiredHandler,
  apiAdapter,
} from "@/infrastructure/api/apiAdapter";

const apiGetAccessToken = () => apiAdapter.getAccessToken();
import { logger } from "@/infrastructure/logging";
import { clearPrivateQueries } from "@/infrastructure/query/queryClient";
import { unregisterPushToken } from "@/features/notifications/pushNotifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

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
        // Changement de compte : purger les données privées de l'ancien
        // (conversations, commandes…) avant d'installer la nouvelle session
        clearPrivateQueries();
        set({ isAuthenticated: true, isGuest: false, user });
        // set tokens if provided, or provide mock tokens in mock mode
        if (tokens) {
          apiSetTokens(tokens).catch((error) => {
            logger.warn("[authStore] Failed to persist tokens on signIn", {
              error,
            });
          });
        } else if (isMock()) {
          apiSetTokens({
            access: "mock-access-token",
            refresh: "mock-refresh-token",
          }).catch((error) => {
            logger.warn("[authStore] Failed to persist mock tokens on signIn", {
              error,
            });
          });
        }
      },
      continueAsGuest: () => {
        // L'invité ne doit voir AUCUNE donnée d'un compte précédent
        clearPrivateQueries();
        set({ isGuest: true, isAuthenticated: false, user: null });
        apiClearTokens().catch(() => {});
      },
      signOut: () => {
        clearPrivateQueries();
        // Retirer le jeton push AVANT de purger les jetons d'auth : l'appel
        // serveur a besoin d'une session valide. Best-effort.
        unregisterPushToken().catch(() => {});
        set({ isAuthenticated: false, isGuest: false, user: null });
        apiClearTokens().catch((error) => {
          logger.warn("[authStore] Failed to clear tokens on signOut", {
            error,
          });
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
          .finally(() => {
            // Filet de sécurité : les jetons (30/90 j) sont stockés sous des
            // clés séparées de l'état zustand. Si l'état persisté dit
            // « déconnecté » alors que des jetons valides existent, on restaure
            // la session à partir des jetons — refreshProfile() rechargera le
            // profil serveur juste après.
            const hasToken = !!apiGetAccessToken();
            const s = useAuthStore.getState();
            if (hasToken && !s.isAuthenticated && !s.isGuest) {
              logger.info(
                "[authStore] Session restaurée depuis les jetons (état persisté incohérent)",
              );
              useAuthStore.setState({ isAuthenticated: true });
            }
            logger.info("[authStore] Hydrated", {
              isAuthenticated: useAuthStore.getState().isAuthenticated,
              hasToken,
            });
            state?.setHydrated();
          });
      },
    },
  ),
);

// Session définitivement expirée (le serveur a rejeté le refresh token) :
// basculer proprement en « déconnecté ». L'utilisateur garde l'app ouverte,
// le gardien de navigation l'enverra à l'écran de connexion.
registerSessionExpiredHandler(() => {
  logger.info("[authStore] Session expirée côté serveur — déconnexion locale");
  clearPrivateQueries();
  useAuthStore.setState({ isAuthenticated: false, isGuest: false, user: null });
});
