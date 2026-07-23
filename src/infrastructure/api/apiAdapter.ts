import { isMock } from "@/infrastructure/mock";
import { logger } from "@/infrastructure/logging";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE =
  process.env.EXPO_PUBLIC_API_URL || process.env.API_BASE_URL || "";

let accessToken: string | null = null;
let refreshToken: string | null = null;
let refreshPromise: Promise<void> | null = null;

// Appelé quand le serveur rejette DÉFINITIVEMENT la session (refresh 401/403) :
// le store d'auth s'enregistre ici pour se marquer déconnecté au même moment.
// (Callback plutôt qu'import direct : évite le cycle apiAdapter ↔ authStore.)
let onSessionExpired: (() => void) | null = null;
export function registerSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

export async function setTokens(tokens: {
  access?: string | null;
  refresh?: string | null;
}) {
  accessToken = tokens.access ?? null;
  refreshToken = tokens.refresh ?? null;
  try {
    await AsyncStorage.setItem("auth.access", accessToken ?? "");
    await AsyncStorage.setItem("auth.refresh", refreshToken ?? "");
  } catch (error) {
    logger.warn("[apiAdapter] Failed to persist auth tokens", { error });
  }
}

export async function loadTokensFromStorage() {
  try {
    const a = await AsyncStorage.getItem("auth.access");
    const r = await AsyncStorage.getItem("auth.refresh");
    accessToken = a || null;
    refreshToken = r || null;
    logger.info("[apiAdapter] Tokens loaded from storage", {
      hasAccess: !!accessToken,
      hasRefresh: !!refreshToken,
    });
  } catch (error) {
    logger.warn("[apiAdapter] Failed to load auth tokens from storage", {
      error,
    });
  }
}

export async function clearTokens() {
  accessToken = null;
  refreshToken = null;
  try {
    await AsyncStorage.removeItem("auth.access");
    await AsyncStorage.removeItem("auth.refresh");
  } catch (error) {
    logger.warn("[apiAdapter] Failed to clear auth tokens", { error });
  }
}

async function safeFetch(path: string, opts: RequestInit = {}) {
  const url = API_BASE
    ? `${API_BASE.replace(/\/$/, "")}/${path.replace(/^\//, "")}`
    : path;

  const headers: Record<string, string> = {
    ...(opts.headers as Record<string, string> | undefined),
  };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
  if (!headers["Accept"]) headers["Accept"] = "application/json";

  const finalOpts: RequestInit = { ...opts, headers };

  const res = await fetch(url, finalOpts);

  if (res.status === 401 && refreshToken) {
    if (!refreshPromise) {
      refreshPromise = (async () => {
        try {
          const body = JSON.stringify({ refreshToken });
          const r = await fetch(`${API_BASE.replace(/\/$/, "")}/mobile/auth/refresh`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body,
          });
          if (r.ok) {
            const js = await r.json();
            accessToken = js.accessToken ?? accessToken;
            refreshToken = js.refreshToken ?? refreshToken;
            try {
              await AsyncStorage.setItem("auth.access", accessToken ?? "");
              await AsyncStorage.setItem("auth.refresh", refreshToken ?? "");
            } catch (storageError) {
              logger.warn(
                "[apiAdapter] Failed to persist refreshed auth tokens",
                { error: storageError },
              );
            }
          } else if (r.status === 401 || r.status === 403) {
            // Le serveur a explicitement rejeté le refresh token : il est
            // réellement invalide/expiré — seule situation où on efface.
            // Prévenir aussi le store d'auth : sinon l'état persisté reste
            // « connecté » sans jeton → écrans à moitié connectés + 401 en boucle.
            await clearTokens();
            onSessionExpired?.();
            throw new Error(`Refresh rejected with status ${r.status}`);
          } else {
            // 5xx / réponse inattendue : le jeton est peut-être encore bon,
            // on le GARDE pour réessayer plus tard.
            throw new Error(`Refresh failed with status ${r.status}`);
          }
        } catch (refreshError) {
          // Erreur réseau (API injoignable, timeout) : ne JAMAIS effacer les
          // jetons ici — sinon une simple coupure déconnecte l'utilisateur
          // définitivement et force une re-connexion au prochain démarrage.
          logger.warn("[apiAdapter] Token refresh failed", {
            error: refreshError,
          });
          throw refreshError;
        } finally {
          refreshPromise = null;
        }
      })();
    }

    try {
      await refreshPromise;
    } catch (refreshError) {
      throw new Error("Authentication refresh failed");
    }

    const retryHeaders: Record<string, string> = {
      ...((finalOpts.headers as Record<string, string>) || {}),
    };
    if (accessToken) retryHeaders["Authorization"] = `Bearer ${accessToken}`;
    const retry = await fetch(url, { ...finalOpts, headers: retryHeaders });
    if (!retry.ok) {
      const text = await retry.text();
      logger.warn("[apiAdapter] Retry after refresh failed", {
        status: retry.status,
        response: text,
      });
      throw new Error(`API error ${retry.status}`);
    }
    const text = await retry.text();
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  if (!res.ok) throw new Error(`API error ${res.status}`);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const apiAdapter = {
  async get(path: string, fallback?: () => any) {
    if (isMock() && fallback) return fallback();
    return safeFetch(path, { method: "GET" });
  },

  async post(path: string, body: Record<string, unknown>, fallback?: () => unknown) {
    if (isMock() && fallback) return fallback();
    return safeFetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  },

  async put(path: string, body: Record<string, unknown>, fallback?: () => unknown) {
    if (isMock() && fallback) return fallback();
    return safeFetch(path, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  },

  async del(path: string, fallback?: () => unknown) {
    if (isMock() && fallback) return fallback();
    return safeFetch(path, { method: "DELETE" });
  },

  // helpers for auth integration
  setTokens,
  loadTokensFromStorage,
  clearTokens,
  getAccessToken: () => accessToken,
};

export default apiAdapter;
