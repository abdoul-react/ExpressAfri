import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { registerForPushNotifications } from "@/features/notifications/pushNotifications";
import type * as ExpoNotifications from "expo-notifications";

let Notifications: typeof ExpoNotifications | null = null;
void import("expo-notifications")
  .then((mod) => { Notifications = mod; })
  .catch(() => { /* Expo Go SDK 53+ : notifications push non disponibles */ });

/**
 * Câble le cycle de vie des notifications push :
 *  - enregistre l'appareil dès que le client est authentifié (une seule fois
 *    par session de connexion) ;
 *  - route l'utilisateur vers la bonne page quand il tape une notification
 *    (chat → conversation, commande → détail commande).
 *
 * Se dégrade proprement sans projectId EAS (cf. registerForPushNotifications).
 */
export function usePushRegistration() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const registered = useRef(false);

  // Enregistrement à la connexion (réinitialisé à la déconnexion pour
  // réenregistrer si un autre compte se connecte ensuite).
  useEffect(() => {
    if (isAuthenticated && !registered.current) {
      registered.current = true;
      void registerForPushNotifications();
    }
    if (!isAuthenticated) registered.current = false;
  }, [isAuthenticated]);

  // Tap sur une notification → navigation selon data.type
  useEffect(() => {
    if (!Notifications) return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as
        | { type?: string; conversationId?: string; orderId?: string }
        | undefined;
      if (!data) return;
      if (data.type === "chat" && data.conversationId) {
        router.push(`/messages/${data.conversationId}`);
      } else if (data.type === "order" && data.orderId) {
        router.push(`/orders/${data.orderId}`);
      }
    });
    return () => sub.remove();
  }, [router]);
}
