import { ScreenHeader, Button, StatusState } from "@/components";
import {
  fontSize,
  radius,
  spacing,
  useColors,
  useThemedStyles,
  type Colors,
} from "@/design-system";
import { Icon } from "@/icons";
import { useOrderTracking, type TrackingEvent } from "@/features/orders";
import { useStartConversation } from "@/features/messages";
import { resolveMediaUrl } from "@/utils/resolveMediaUrl";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TRACKING_STEPS = [
  { key: "placed", icon: "check" },
  { key: "confirmed", icon: "box" },
  { key: "shipped", icon: "truck" },
  { key: "transit", icon: "location" },
  { key: "delivered", icon: "boxOpen" },
];

const VEHICLE_LABELS: Record<string, string> = {
  bike: "Moto",
  car: "Voiture",
  van: "Camionnette",
  truck: "Camion",
  bicycle: "Vélo",
  foot: "À pied",
};

/** Libellé lisible d'un événement de la chronologie serveur. */
type Translate = (key: string, defaultValue?: string) => string;
function eventLabel(e: TrackingEvent, t: Translate): string {
  if (e.key === "placed") return t("tracking.evPlaced", "Commande passée");
  if (e.key === "courier_assigned") return t("tracking.evAssigned", "Livreur affecté");
  if (e.key === "picked_up") return t("tracking.evPickedUp", "Colis récupéré par le livreur");
  if (e.key === "delivered") return t("tracking.evDelivered", "Colis livré");
  if (e.key.startsWith("status:")) {
    const s = e.key.slice(7);
    const map: Record<string, string> = {
      confirmed: t("tracking.evConfirmed", "Commande confirmée"),
      processing: t("tracking.evProcessing", "Commande en préparation"),
      shipped: t("tracking.evShipped", "Commande expédiée"),
      delivered: t("tracking.evDelivered", "Colis livré"),
      cancelled: t("tracking.evCancelled", "Commande annulée"),
      refunded: t("tracking.evRefunded", "Commande remboursée"),
    };
    return map[s] ?? s;
  }
  return e.key;
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) +
    " · " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Suivi de livraison en temps réel.
 * Chronologie = faits réels enregistrés par l'admin (statuts de commande)
 * et le circuit livreur (affectation, récupération, livraison) — resynchronisée
 * automatiquement toutes les 15 s tant que l'écran est ouvert.
 */
export default function TrackingScreen() {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const startConversation = useStartConversation();
  const { tracking, isLoading, isError, refetch } = useOrderTracking(id!);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t("order.tracking")} centerTitle />
        <StatusState status="loading" title={t("common.loading", "Chargement…")} hint="" />
      </View>
    );
  }

  if (isError || !tracking) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t("order.tracking")} centerTitle />
        <StatusState
          status="error"
          title={t("common.error")}
          hint={t("common.retryHint", "Vérifiez votre connexion puis réessayez.")}
          actionLabel={t("common.retry")}
          onAction={() => refetch()}
        />
      </View>
    );
  }

  const currentStep = tracking.currentStep;
  const courier = tracking.courier;
  // Événements du plus récent au plus ancien pour l'historique détaillé
  const history = [...tracking.events].reverse();

  return (
    <View style={styles.container}>
      <ScreenHeader title={t("order.tracking")} centerTitle />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}>
        {/* Référence commande */}
        <View style={styles.orderInfo}>
          <Text style={styles.orderId}>{t("order.numberPrefix")}{tracking.orderNumber}</Text>
          {tracking.trackingNumber && (
            <Text style={styles.trackingNumber}>
              {t("order.trackingNumber")} : {tracking.trackingNumber}
            </Text>
          )}
          <View style={styles.liveRow}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>
              {t("tracking.live", "Suivi en direct — mise à jour automatique")}
            </Text>
          </View>
        </View>

        {/* Fiche livreur : dès que l'admin a affecté la commande */}
        {courier && (
          <View style={styles.courierCard}>
            {courier.photo ? (
              <Image
                source={{ uri: resolveMediaUrl(courier.photo) ?? courier.photo }}
                style={styles.courierPhoto}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.courierPhoto, styles.courierPhotoFallback]}>
                <Icon name="truck" size={22} color={colors.primary} />
              </View>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.courierName} numberOfLines={1}>{courier.name}</Text>
              <Text style={styles.courierMeta} numberOfLines={1}>
                {VEHICLE_LABELS[courier.vehicleType] ?? courier.vehicleType}
                {courier.totalDeliveries ? ` · ${courier.totalDeliveries} ${t("tracking.deliveries", "livraisons")}` : ""}
                {courier.rating > 0 ? ` · ★ ${courier.rating.toFixed(1)}` : ""}
              </Text>
              <Text style={styles.courierStatus}>
                {courier.status === "picked_up"
                  ? t("tracking.courierOnWay", "Votre colis est avec le livreur")
                  : courier.status === "delivered"
                    ? t("tracking.courierDone", "Livraison effectuée")
                    : t("tracking.courierAssigned", "Prendra en charge votre colis")}
              </Text>
            </View>
            <Pressable
              style={styles.callBtn}
              onPress={() => Linking.openURL(`tel:${courier.phone}`)}
              accessibilityRole="button"
              accessibilityLabel={t("tracking.callCourier", "Appeler le livreur")}
            >
              <Icon name="phone" size={20} color={colors.white} />
            </Pressable>
          </View>
        )}

        {/* Jalons */}
        <View style={styles.timeline}>
          {TRACKING_STEPS.map((step, index) => {
            const completed = index <= currentStep;
            const isCurrent = index === currentStep;
            const isLast = index === TRACKING_STEPS.length - 1;
            return (
              <View key={step.key} style={styles.stepRow}>
                <View style={styles.stepIndicator}>
                  <View
                    style={[
                      styles.stepCircle,
                      completed && styles.stepCircleCompleted,
                      isCurrent && styles.stepCircleCurrent,
                    ]}
                  >
                    <Icon
                      name={step.icon as any}
                      size={14}
                      color={completed ? colors.white : colors.textMuted}
                      strokeWidth={2.5}
                    />
                  </View>
                  {!isLast && (
                    <View
                      style={[styles.stepLine, index < currentStep && styles.stepLineCompleted]}
                    />
                  )}
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepLabel, completed && styles.stepLabelCompleted]}>
                    {t(`tracking.${step.key}`, step.key)}
                  </Text>
                  <Text style={styles.stepHint}>
                    {completed ? t("tracking.completed") : t("tracking.pending")}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Historique détaillé — chaque événement réel, horodaté */}
        {history.length > 0 && (
          <View style={styles.history}>
            <Text style={styles.historyTitle}>{t("tracking.history", "Historique détaillé")}</Text>
            {history.map((e, i) => (
              <View key={`${e.key}-${e.at}`} style={styles.historyRow}>
                <View style={[styles.historyDot, i === 0 && styles.historyDotLatest]} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.historyLabel, i === 0 && styles.historyLabelLatest]}>
                    {eventLabel(e, t as unknown as Translate)}
                  </Text>
                  {e.detail && <Text style={styles.historyDetail} numberOfLines={1}>{e.detail}</Text>}
                </View>
                <Text style={styles.historyTime}>{fmtDateTime(e.at)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.actions}>
          <Button
            label={t("order.contactSeller")}
            variant="outline"
            loading={startConversation.isPending}
            onPress={async () => {
              try {
                const conv = await startConversation.mutateAsync({ orderId: id });
                router.push(`/messages/${conv.id}`);
              } catch {
                Alert.alert(t('common.error', 'Erreur'), t('messages.startFailed', 'Impossible de contacter le vendeur — réessayez.'));
              }
            }}
            fullWidth
          />
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    orderInfo: {
      backgroundColor: colors.surface,
      padding: spacing.lg,
      gap: 4,
    },
    orderId: {
      fontSize: fontSize.lg,
      fontWeight: "800",
      color: colors.text,
    },
    trackingNumber: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      marginTop: 2,
    },
    liveRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
    liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
    liveText: { fontSize: fontSize.xs, color: colors.success, fontWeight: "600" },
    courierCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      backgroundColor: colors.surface,
      marginTop: spacing.sm,
      padding: spacing.lg,
    },
    courierPhoto: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.background,
    },
    courierPhotoFallback: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primarySoft,
    },
    courierName: { fontSize: fontSize.md, fontWeight: "800", color: colors.text },
    courierMeta: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
    courierStatus: { fontSize: fontSize.sm, color: colors.primary, fontWeight: "600", marginTop: 2 },
    callBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    timeline: {
      backgroundColor: colors.surface,
      marginTop: spacing.sm,
      padding: spacing.lg,
    },
    stepRow: {
      flexDirection: "row",
      minHeight: 60,
    },
    stepIndicator: {
      alignItems: "center",
      width: 36,
    },
    stepCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: colors.borderStrong,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
    },
    stepCircleCompleted: {
      backgroundColor: colors.secondary,
      borderColor: colors.secondary,
    },
    stepCircleCurrent: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    stepLine: {
      width: 2,
      flex: 1,
      backgroundColor: colors.border,
      marginVertical: 2,
    },
    stepLineCompleted: {
      backgroundColor: colors.secondary,
    },
    stepContent: {
      flex: 1,
      paddingLeft: spacing.md,
      paddingBottom: spacing.lg,
    },
    stepLabel: {
      fontSize: fontSize.md,
      fontWeight: "700",
      color: colors.textMuted,
    },
    stepLabelCompleted: {
      color: colors.text,
    },
    stepHint: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
      marginTop: 2,
    },
    history: {
      backgroundColor: colors.surface,
      marginTop: spacing.sm,
      padding: spacing.lg,
    },
    historyTitle: {
      fontSize: fontSize.md,
      fontWeight: "800",
      color: colors.text,
      marginBottom: spacing.md,
    },
    historyRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    historyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.borderStrong },
    historyDotLatest: { backgroundColor: colors.primary },
    historyLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
    historyLabelLatest: { color: colors.text, fontWeight: "700" },
    historyDetail: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 1 },
    historyTime: { fontSize: fontSize.xs, color: colors.textMuted, flexShrink: 0 },
    actions: {
      padding: spacing.lg,
      gap: spacing.sm,
      marginTop: spacing.md,
    },
  });
