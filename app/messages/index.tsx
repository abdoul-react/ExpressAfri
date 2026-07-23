import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { spacing, radius, fontSize, useColors, useThemedStyles, type Colors } from '@/design-system';
import { Icon, IconName } from '@/icons';
import { ScreenHeader, Button } from '@/components';
import { useConversations } from '@/features/messages';
import { useAuthStore } from '@/store/authStore';

const CHANNELS: { id: string; icon: IconName; colorKey: keyof Colors; titleKey: string; hintKey: string }[] = [
  { id: 'orders', icon: 'box', colorKey: 'secondary', titleKey: 'messages.orders', hintKey: 'messages.ordersHint' },
  { id: 'promos', icon: 'tag', colorKey: 'primary', titleKey: 'messages.promos', hintKey: 'messages.promosHint' },
];

/** Date ISO → heure lisible (HH:MM aujourd'hui, sinon date courte). */
function formatConvTime(time: string): string {
  if (!time || !time.includes('T')) return time;
  const d = new Date(time);
  if (isNaN(d.getTime())) return time;
  const sameDay = d.toDateString() === new Date().toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { day: '2-digit', month: 'short' });
}

export default function MessagesScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { conversations } = useConversations();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Invité : la messagerie est personnelle — aucune conversation à montrer,
  // on invite à se connecter.
  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t('messages.title')} />
        <View style={styles.guestGate}>
          <View style={[styles.channelIcon, { backgroundColor: colors.primarySoft }]}>
            <Icon name="message" size={24} color={colors.primary} />
          </View>
          <Text style={styles.guestGateText}>
            {t('messages.guestGate', 'Connectez-vous pour voir vos messages et contacter les vendeurs.')}
          </Text>
          {/* alignSelf: le bouton s'aligne à gauche par défaut — le centrer ici */}
          <Button label={t('auth.login', 'Se connecter')} onPress={() => router.push('/auth/login')} style={{ alignSelf: 'center' }} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('messages.title')}
        actions={[{ icon: 'settings', onPress: () => router.push("/settings") }]}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {CHANNELS.map((c) => (
          <Pressable
            key={c.id}
            style={styles.channel}
            onPress={() => router.push(c.id === "orders" ? "/orders" : "/coupons")}
          >
            <View style={[styles.channelIcon, { backgroundColor: colors[c.colorKey] }]}>
              <Icon name={c.icon} size={24} color={colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.channelTitle}>{t(c.titleKey)}</Text>
              <Text style={styles.channelHint} numberOfLines={1}>
                {t(c.hintKey)}
              </Text>
            </View>
            <Icon name="chevronRight" size={20} color={colors.textMuted} />
          </Pressable>
        ))}

        <Text style={styles.older}>{t('messages.older')}</Text>
        {conversations.length === 0 && (
          <Text style={styles.emptyHint}>{t('messages.emptyHint', 'Aucune conversation — contactez un vendeur depuis une commande.')}</Text>
        )}
        {conversations.map((c) => (
          <Pressable
            key={c.id}
            style={styles.msgRow}
            onPress={() => router.push(`/messages/${c.id}`)}
          >
            <View>
              {c.avatar ? (
                <Image source={{ uri: c.avatar }} style={styles.msgAvatar} />
              ) : (
                <View style={[styles.msgAvatar, styles.msgAvatarFallback]}>
                  <Icon name="store" size={20} color={colors.textMuted} />
                </View>
              )}
              {c.unread > 0 && (
                <View style={styles.msgBadge}>
                  <Text style={styles.msgBadgeText}>{c.unread}</Text>
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.msgName}>{c.name}</Text>
              <Text style={styles.msgPreview} numberOfLines={1}>{c.lastMessage || t('messages.noMessages', 'Démarrez la conversation')}</Text>
            </View>
            <Text style={styles.msgDate}>{formatConvTime(c.lastTime)}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  scrollContent: { paddingBottom: spacing.xxl * 2 },
  channel: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  channelIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  guestGate: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.xxl },
  guestGateText: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center' },
  channelTitle: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text },
  channelHint: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  older: { fontSize: fontSize.lg, color: colors.textSecondary, padding: spacing.lg, backgroundColor: colors.background },
  msgRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  msgAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.background },
  msgAvatarFallback: { alignItems: 'center', justifyContent: 'center' },
  emptyHint: { fontSize: fontSize.sm, color: colors.textMuted, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  msgBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: colors.slate500, borderRadius: 9, minWidth: 18, height: 18, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  msgBadgeText: { color: colors.white, fontSize: 10, fontWeight: '700' },
  msgName: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text },
  msgPreview: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  msgDate: { fontSize: fontSize.xs, color: colors.textMuted },
});
