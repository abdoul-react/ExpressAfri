import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import { useAuthStore } from "@/store/authStore";
import { registerForPushNotifications } from "@/features/notifications/pushNotifications";

const isExpoGo =
  Constants.executionEnvironment === "storeClient" ||
  (Constants as any).appOwnership === "expo";

/**
 * Câble le cycle de vie des notifications push :
 *  - enregistre l'appareil dès que le client est authentifié ;
 *  - route l'utilisateur vers la bonne page quand il tape une notification.
 * Se dégrade proprement dans Expo Go (SDK 53+) et sans projectId EAS.
 */
export function usePushRegistration() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const registered = useRef(false);

  useEffect(() => {
    if (isAuthenticated && !registered.current) {
      registered.current = true;
      void registerForPushNotifications();
    }
    if (!isAuthenticated) registered.current = false;
  }, [isAuthenticated]);

  // Tap sur une notification → navigation selon data.type
  // Chargement dynamique uniquement hors Expo Go
  useEffect(() => {
    if (isExpoGo) return;
    let sub: { remove: () => void } | null = null;
    const pkg = "expo" + "-notifications";
    import(/* @vite-ignore */ pkg as any)
      .then((mod: any) => {
        sub = mod.addNotificationResponseReceivedListener(
          (response: any) => {
            const data = response?.notification?.request?.content?.data as
              | { type?: string; conversationId?: string; orderId?: string }
              | undefined;
            if (!data) return;
            if (data.type === "chat" && data.conversationId) {
              router.push(`/messages/${data.conversationId}`);
            } else if (data.type === "order" && data.orderId) {
              router.push(`/orders/${data.orderId}`);
            }
          },
        );
      })
      .catch(() => {});
    return () => { sub?.remove(); };
  }, [router]);
}
