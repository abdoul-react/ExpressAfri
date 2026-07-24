import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { spacing, radius, fontSize, useColors, useThemedStyles, type Colors } from '@/design-system';
import { Icon } from '@/icons';
import { ScreenHeader, StatusState } from '@/components';
import { contentService } from '@/features/content';

type PageEntry = { slug: string; title: string; updatedAt: string };

/**
 * Informations légales : liste dynamique de TOUTES les pages publiées par
 * l'admin (CMS → Pages). Il peut en ajouter/supprimer librement — l'écran
 * s'adapte sans mise à jour de l'app.
 */
export default function LegalScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);

  const { data: pages = [], isLoading, isError, refetch } = useQuery<PageEntry[]>({
    queryKey: ['static-pages-list'],
    queryFn: () => contentService.listStaticPages(),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('settings.legal', 'Informations légales')} centerTitle />
      {isLoading ? (
        <StatusState status="loading" title={t('common.loading', 'Chargement…')} hint="" />
      ) : isError ? (
        <StatusState
          status="error"
          title={t('common.error')}
          hint={t('common.retryHint', 'Vérifiez votre connexion puis réessayez.')}
          actionLabel={t('common.retry')}
          onAction={() => refetch()}
        />
      ) : pages.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="fileText" size={40} color={colors.textMuted} />
          <Text style={styles.emptyText}>
            {t('settings.noLegalPages', 'Aucune page disponible pour le moment.')}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {pages.map((p, i) => (
            <Pressable
              key={p.slug}
              style={[styles.row, i === pages.length - 1 && styles.rowLast]}
              onPress={() => router.push(`/static-page/${p.slug}`)}
            >
              <View style={styles.rowIcon}>
                <Icon name="fileText" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.rowTitle} numberOfLines={2}>{p.title}</Text>
                <Text style={styles.rowMeta}>
                  {t('settings.updatedOn', 'Mise à jour le')}{' '}
                  {new Date(p.updatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </Text>
              </View>
              <Icon name="chevronRight" size={18} color={colors.textMuted} />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLast: { borderBottomWidth: 0, borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  rowMeta: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xxl },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center' },
});
