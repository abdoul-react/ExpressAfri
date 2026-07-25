import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { apiAdapter } from "@/infrastructure/api/apiAdapter";
import { logger } from "@/infrastructure/logging";

// SDK 53+ : expo-notifications push distants retirés d'Expo Go.
// On détecte Expo Go via l'appName de l'exécutable pour ne jamais tenter
// le require dans cet environnement.
const isExpoGo =
  Constants.executionEnvironment === 'storeClient' ||
  (Constants as any).appOwnership === 'expo';

let Notifications: typeof import("expo-notifications") | null = null;
let notificationsReady = false;

function initNotifications() {
  if (notificationsReady) return;
  notificationsReady = true;
  if (isExpoGo) {
    logger.info("[push] Expo Go détecté — notifications push désactivées (SDK 53+)");
    return;
  }
  try {
    Notifications = require("expo-notifications");
    Notifications!.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch {
    logger.info("[push] expo-notifications indisponible");
  }
}

/** Jeton enregistré durant cette session (pour la désinscription au signOut). */
let currentToken: string | null = null;

/**
 * Enregistre l'appareil pour les notifications push et envoie le jeton Expo au
 * serveur. Se dégrade proprement : simulateur, permission refusée ou
 * `projectId` EAS absent → no-op loggué, jamais d'erreur visible.
 *
 * Activation ops (hors code) : `eas init` (renseigne expo.extra.eas.projectId)
 * puis build de développement/production — Expo Go ne reçoit plus les push.
 */
export async function registerForPushNotifications(): Promise<void> {
  initNotifications();
  if (!Notifications) {
    logger.info("[push] expo-notifications indisponible (Expo Go SDK 53+)");
    return;
  }
  try {
    if (!Device.isDevice) {
      logger.info("[push] Simulateur/émulateur : pas de jeton push");
      return;
    }

    // Android : canal requis pour afficher les notifications
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

    // projectId EAS requis pour un jeton Expo Push. Absent (pas encore de
    // `eas init`) → dégradation propre : les notifs in-app restent seules.
    const projectId =
      (Constants.expoConfig?.extra as any)?.eas?.projectId ??
      (Constants as any).easConfig?.projectId;
    if (!projectId) {
      logger.info(
        "[push] projectId EAS absent (app.json extra.eas.projectId) — push distant désactivé",
      );
      return;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token) return;

    await apiAdapter.post("/mobile/push-token", {
      token,
      platform: Platform.OS,
    });
    currentToken = token;
    logger.info("[push] Jeton push enregistré");
  } catch (error) {
    // Best-effort : l'app fonctionne sans push
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
