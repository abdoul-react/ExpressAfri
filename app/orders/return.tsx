import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useColors, useThemedStyles, type Colors, spacing, radius, fontSize } from '@/design-system';
import { Icon } from '@/icons';
import { ScreenHeader, Button, StatusState, SkeletonOrders, KeyboardScreen } from '@/components';
import { useOrderDetail } from '@/features/orders';
import { orderService } from '@/features/orders/orderService';

// Motifs de retour proposés (le dernier ouvre un champ libre)
const REASONS = [
  { key: 'damaged', labelKey: 'returns.reasonDamaged', fallback: 'Article endommagé' },
  { key: 'wrong', labelKey: 'returns.reasonWrong', fallback: 'Mauvais article reçu' },
  { key: 'notAsDescribed', labelKey: 'returns.reasonNotAsDescribed', fallback: 'Non conforme à la description' },
  { key: 'noLongerNeeded', labelKey: 'returns.reasonNoLongerNeeded', fallback: "Je n'en ai plus besoin" },
  { key: 'other', labelKey: 'returns.reasonOther', fallback: 'Autre motif' },
];

export default function ReturnRequestScreen() {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { order, isLoading } = useOrderDetail(orderId!);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [reasonKey, setReasonKey] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const items: any[] = (order as any)?.items ?? [];

  const toggleItem = (pid: string) => {
    setSelectedIds((prev) => prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]);
  };

  const reasonText = reasonKey === 'other'
    ? customReason.trim()
    : reasonKey
      ? t(REASONS.find((r) => r.key === reasonKey)!.labelKey, REASONS.find((r) => r.key === reasonKey)!.fallback)
      : '';

  const canSubmit = selectedIds.length > 0 && reasonText.length > 0 && !isSubmitting;

  const submit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await orderService.submitReturn({
        orderId: orderId!,
        reason: reasonText,
        items: items
          .filter((it) => selectedIds.includes(it.productId ?? it.id))
          .map((it) => ({ productId: it.productId ?? it.id, quantity: it.quantity ?? 1 })),
      });
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      setDone(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      setError(
        msg.includes('409')
          ? t('returns.alreadyPending', 'Une demande de retour est déjà en cours pour cette commande.')
          : t('returns.submitFailed', "Impossible d'envoyer la demande — réessayez."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <SkeletonOrders />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t('order.returnRequest')} />
        <StatusState
          status="empty"
          title={t('order.notFound')}
          hint={t('order.notFoundHint')}
          actionLabel={t('common.back')}
          onAction={() => router.back()}
        />
      </View>
    );
  }

  // Écran de confirmation après envoi
  if (done) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t('order.returnRequest')} />
        <View style={styles.doneWrap}>
          <View style={styles.doneCircle}>
            <Icon name="check" size={44} color={colors.white} strokeWidth={3} />
          </View>
          <Text style={styles.doneTitle}>{t('returns.sentTitle', 'Demande envoyée')}</Text>
          <Text style={styles.doneHint}>
            {t('returns.sentHint', "Votre demande de retour a été transmise. Vous serez informé de la suite dans vos messages.")}
          </Text>
          <Button
            label={t('common.back')}
            size="lg"
            fullWidth
            onPress={() => router.back()}
            style={{ marginTop: spacing.xl }}
          />
        </View>
      </View>
    );
  }

  return (
    <KeyboardScreen style={styles.container}>
      <ScreenHeader title={t('order.returnRequest')} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 120 }} keyboardShouldPersistTaps="handled">
        {/* Articles à retourner */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('returns.selectItems', 'Articles à retourner')}</Text>
          {items.map((item, idx) => {
            const pid = item.productId ?? item.id ?? String(idx);
            const selected = selectedIds.includes(pid);
            const image = item.image ?? item.images?.[0];
            return (
              <Pressable key={pid} style={styles.itemRow} onPress={() => toggleItem(pid)}>
                <View style={[styles.check, selected && styles.checkOn]}>
                  {selected && <Icon name="check" size={14} color={colors.white} />}
                </View>
                {image ? (
                  <Image source={{ uri: image }} style={styles.itemImg} contentFit="cover" />
                ) : (
                  <View style={[styles.itemImg, { alignItems: 'center', justifyContent: 'center' }]}>
                    <Icon name="box" size={20} color={colors.textMuted} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
                  <Text style={styles.itemQty}>x{item.quantity ?? 1}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Motif */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('returns.reasonTitle', 'Motif du retour')}</Text>
          {REASONS.map((r) => (
            <Pressable key={r.key} style={styles.reasonRow} onPress={() => setReasonKey(r.key)}>
              <View style={[styles.radio, reasonKey === r.key && styles.radioOn]}>
                {reasonKey === r.key && <View style={styles.radioDot} />}
              </View>
              <Text style={styles.reasonLabel}>{t(r.labelKey, r.fallback)}</Text>
            </Pressable>
          ))}
          {reasonKey === 'other' && (
            <TextInput
              style={styles.customInput}
              value={customReason}
              onChangeText={setCustomReason}
              placeholder={t('returns.customPlaceholder', 'Décrivez le problème...')}
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={500}
            />
          )}
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}
      </ScrollView>

      {/* Bouton d'envoi collant */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <Button
          label={t('returns.submit', 'Envoyer la demande')}
          size="lg"
          fullWidth
          loading={isSubmitting}
          disabled={!canSubmit}
          onPress={submit}
        />
      </View>
    </KeyboardScreen>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    section: {
      backgroundColor: colors.surface,
      padding: spacing.lg,
      marginTop: spacing.sm,
      gap: spacing.sm,
    },
    sectionTitle: {
      fontSize: fontSize.lg,
      fontWeight: '800',
      color: colors.text,
      marginBottom: spacing.xs,
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm,
    },
    check: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: colors.borderStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    itemImg: {
      width: 52,
      height: 52,
      borderRadius: radius.md,
      backgroundColor: colors.background,
    },
    itemTitle: { fontSize: fontSize.sm, color: colors.text, lineHeight: 18 },
    itemQty: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
    reasonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm,
    },
    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.borderStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioOn: { borderColor: colors.primary },
    radioDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.primary,
    },
    reasonLabel: { fontSize: fontSize.md, color: colors.text, flex: 1 },
    customInput: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: spacing.md,
      minHeight: 80,
      fontSize: fontSize.md,
      color: colors.text,
      textAlignVertical: 'top',
      marginTop: spacing.xs,
    },
    errorText: {
      color: colors.danger,
      fontSize: fontSize.sm,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
    },
    footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
    },
    doneWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xxl,
      gap: spacing.md,
    },
    doneCircle: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    doneTitle: { fontSize: fontSize['2xl'], fontWeight: '900', color: colors.text, textAlign: 'center' },
    doneHint: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  });
