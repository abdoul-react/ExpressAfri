import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { useCartBadge } from '@/hooks/useCartBadge';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColors, useThemedStyles, type Colors, spacing, radius, fontSize } from '@/design-system';
import { Icon } from '@/icons';
import { ScreenHeader, Button } from '@/components';
import { apiAdapter } from '@/infrastructure/api/apiAdapter';

export default function SuggestionsScreen() {
  const router = useRouter();
  const cartBadge = useCartBadge();
  const { t } = useTranslation();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await apiAdapter.post('/mobile/suggestions', { content: text.trim() });
      setText('');
      Alert.alert(t('common.confirm'), t('suggestions.sent'));
    } catch {
      Alert.alert(t('common.error', 'Erreur'), t('suggestions.sendFailed', 'Impossible d\'envoyer. Réessayez.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Vos suggestions" actions={[{ icon: 'cart', badge: cartBadge, onPress: () => router.push('/cart') }]} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl * 2 }}>
        <View style={styles.intro}>
          <Text style={styles.introText}>
            Nous recueillons vos suggestions pour améliorer votre expérience AfriExpress.
            Pour un problème de commande, contactez le{' '}
            <Text style={styles.link}>Service client</Text>.
          </Text>
        </View>

        <Text style={styles.title}>Des suggestions dont vous voudriez nous faire part ?</Text>
        <Text style={styles.subtitle}>
          Envoyez vos suggestions ou commentaires ici. Ils nous permettent d&apos;améliorer la qualité de nos services.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Votre suggestion…"
          placeholderTextColor={colors.textMuted}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={500}
        />
        <Button label={t("suggestions.send")} size="lg" fullWidth onPress={send} loading={sending} disabled={!text.trim() || sending} style={{ marginTop: spacing.lg }} />

        <Text style={styles.listTitle}>Liste de suggestions</Text>
        <View style={styles.divider} />
        <View style={styles.empty}>
          <Icon name="mail" size={48} color={colors.borderStrong} />
          <Text style={styles.emptyText}>
            Vous n&apos;avez pas encore envoyé de suggestions. Nous aimerions en savoir plus sur votre expérience !
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  intro: { backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.lg },
  introText: { fontSize: fontSize.md, color: colors.text, lineHeight: 22 },
  link: { color: colors.primary, fontWeight: '700' },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.sm, lineHeight: 20 },
  listTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text, marginTop: spacing.xxxl },
  divider: { height: 1, backgroundColor: colors.border, marginTop: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
    marginTop: spacing.md,
  },
  empty: { alignItems: 'center', paddingVertical: spacing.giant, gap: spacing.lg },
  emptyText: { fontSize: fontSize.md, color: colors.textMuted, textAlign: 'center', lineHeight: 22, paddingHorizontal: spacing.lg },
});
