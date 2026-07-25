import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { apiAdapter } from "@/infrastructure/api/apiAdapter";
import { logger } from "@/infrastructure/logging";

// SDK 53+ : expo-notifications push distants retirés d'Expo Go.
// isExpoGo détecté via executionEnvironment (SDK 45+) ou appOwnership (legacy).
const isExpoGo =
  Constants.executionEnvironment === "storeClient" ||
  (Constants as any).appOwnership === "expo";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let N: any = null;

/** Charge expo-notifications uniquement hors Expo Go. */
async function loadNotifications(): Promise<any> {
  if (N) return N;
  if (isExpoGo) return null;
  try {
    // Concaténation intentionnelle pour que Metro ne bundle pas statiquement
    const pkg = "expo" + "-notifications";
    N = await import(/* @vite-ignore */ pkg as any);
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    return N;
  } catch {
    logger.info("[push] expo-notifications indisponible");
    return null;
  }
}

/** Jeton enregistré durant cette session (pour la désinscription au signOut). */
let currentToken: string | null = null;

/**
 * Enregistre l'appareil pour les notifications push et envoie le jeton Expo au
 * serveur. Se dégrade proprement : Expo Go, simulateur, permission refusée ou
 * projectId EAS absent → no-op loggué, jamais d'erreur visible.
 */
export async function registerForPushNotifications(): Promise<void> {
  if (isExpoGo) {
    logger.info("[push] Expo Go — notifications push désactivées (SDK 53+)");
    return;
  }
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  try {
    if (!Device.isDevice) {
      logger.info("[push] Simulateur/émulateur : pas de jeton push");
      return;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Notifications",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== "granted") {
      logger.info("[push] Permission notifications refusée");
      return;
    }

    const projectId =
      (Constants.expoConfig?.extra as any)?.eas?.projectId ??
      (Constants as any).easConfig?.projectId;
    if (!projectId) {
      logger.info("[push] projectId EAS absent — push distant désactivé");
      return;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token) return;

    await apiAdapter.post("/mobile/push-token", { token, platform: Platform.OS });
    currentToken = token;
    logger.info("[push] Jeton push enregistré");
  } catch (error) {
    logger.warn("[push] Échec d'enregistrement du jeton push", { error });
  }
}

/** Retire le jeton de l'appareil côté serveur (déconnexion). Best-effort. */
export async function unregisterPushToken(): Promise<void> {
  const token = currentToken;
  currentToken = null;
  if (!token) return;
  try {
    await apiAdapter.del(`/mobile/push-token?token=${encodeURIComponent(token)}`);
    logger.info("[push] Jeton push retiré");
  } catch (error) {
    logger.warn("[push] Échec du retrait du jeton push", { error });
  }
}
