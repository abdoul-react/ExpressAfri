import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Modal, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { spacing, radius, fontSize, useColors, useThemedStyles, type Colors } from '@/design-system';
import { Icon } from '@/icons';
import { ScreenHeader, Button } from '@/components';
import { useSettingsStore, COUNTRIES } from '@/store/settingsStore';
import { useAuthStore } from '@/store/authStore';
import { SUPPORTED_LANGUAGES } from '@/i18n';
import { CURRENCY_LIST } from '@/utils/currency';
import { useCacheManager } from '@/features/settings/useCacheManager';
import { useShippingCountries } from '@/features/settings/useShippingCountries';
import Constants from 'expo-constants';

type Sheet = null | 'language' | 'currency' | 'country' | 'version';

export default function SettingsScreen() {
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { t } = useTranslation();
  const { language, currency, country, setLanguage, setCurrency, setCountry } = useSettingsStore();
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const signOut = useAuthStore((s) => s.signOut);
  const user = useAuthStore((s) => s.user);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [notif, setNotif] = useState(true);
  const { sizeLabel, clearCache, isClearing } = useCacheManager();
  const { countries: shipCountries, hasZones } = useShippingCountries();
  const colors = useColors();

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === language)!;
  const currentCurrency = CURRENCY_LIST.find((c) => c.code === currency)!;
  const currentCountry = COUNTRIES.find((c) => c.code === country)!;

  const logout = () => {
    signOut();
    router.replace('/auth/login');
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('settings.title')} />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxxl }}>
        {/* Compte */}
        <Group>
          <Row label={t("profile.title")} onPress={() => router.push('/profile')} value={user?.name ?? t('account.guest')} />
          <Row label={t("checkout.shippingAddress")} onPress={() => router.push('/address')} last />
        </Group>

        {/* Région */}
        <Group>
          <Row label={t("settings.shipTo")} value={currentCountry.name} onPress={() => setSheet('country')} />
          <Row label={t('settings.currency')} value={currentCurrency.code} onPress={() => setSheet('currency')} />
          <Row label={t('settings.language')} value={currentLang.native} onPress={() => setSheet('language')} last />
        </Group>

        {/* Préférences */}
        <Group>
          <ToggleRow label={t('settings.notifications')} value={notif} onValueChange={setNotif} />
          <ToggleRow label={t('settings.theme') + ' — ' + t('settings.darkMode')} value={theme === 'dark'} onValueChange={(v) => setTheme(v ? 'dark' : 'light')} last />
        </Group>

        {/* Divers */}
        <Group>
          <Row
            label={t("settings.clearCache")}
            value={isClearing ? '…' : sizeLabel}
            onPress={() =>
              Alert.alert(
                t("settings.clearCache"),
                t("settings.clearCacheConfirm"),
                [
                  { text: t('common.cancel', 'Annuler'), style: 'cancel' },
                  {
                    text: t('common.confirm', 'Confirmer'),
                    style: 'destructive',
                    onPress: async () => {
                      const ok = await clearCache();
                      Alert.alert(
                        ok ? t('settings.cacheCleared', 'Cache vidé') : t('common.error'),
                        ok
                          ? t('settings.cacheClearedHint', 'Les données temporaires ont été supprimées. Vos préférences, votre panier et votre session sont conservés.')
                          : t('settings.cacheClearError', 'Impossible de vider le cache, réessayez.'),
                      );
                    },
                  },
                ],
              )
            }
          />
          <Row label={t('settings.privacy')} onPress={() => router.push("/static-page/privacy")} />
          <Row label={t("settings.legal")} onPress={() => router.push("/legal")} />
          <Row label={t("settings.version")} value={Constants.expoConfig?.version ?? '1.0.0'} onPress={() => setSheet('version')} last />
        </Group>

        <View style={styles.logoutWrap}>
          <Button label={t("settings.logout")} variant="outline" fullWidth size="lg" onPress={logout} />
        </View>
        <Text style={styles.copyright}>{t("settings.footer")}</Text>
      </ScrollView>

      {/* Modales de sélection */}
      <SelectSheet
        visible={sheet === 'language'}
        title={t('settings.language')}
        onClose={() => setSheet(null)}
        options={SUPPORTED_LANGUAGES.map((l) => ({ id: l.code, label: l.native, sub: l.rtl ? 'RTL' : l.label }))}
        selected={language}
        onSelect={(id) => { setLanguage(id as any); setSheet(null); }}
      />
      <SelectSheet
        visible={sheet === 'currency'}
        title={t('settings.currency')}
        onClose={() => setSheet(null)}
        options={CURRENCY_LIST.map((c) => ({ id: c.code, label: `${c.name} (${c.symbol})`, sub: c.code }))}
        selected={currency}
        onSelect={(id) => { setCurrency(id as any); setSheet(null); }}
      />
      <SelectSheet
        visible={sheet === 'country'}
        title={t("settings.shipTo")}
        onClose={() => setSheet(null)}
        options={shipCountries.map((c) => ({
          id: c.code,
          label: `${c.flag}  ${c.name}`,
          sub: hasZones
            ? c.deliverable
              ? `${t('settings.deliverable', 'Livraison disponible')} · ${c.currency}`
              : `${c.dial} · ${c.currency}`
            : `${c.dial} · ${c.currency}`,
        }))}
        selected={country}
        onSelect={(id) => { setCountry(id as any); setSheet(null); }}
      />

      {/* Fiche version : infos techniques utiles au support */}
      <Modal visible={sheet === 'version'} transparent animationType="slide" onRequestClose={() => setSheet(null)}>
        <Pressable style={styles.backdrop} onPress={() => setSheet(null)}>
          <Pressable style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{t('settings.version')}</Text>
              <Pressable onPress={() => setSheet(null)} hitSlop={8}>
                <Icon name="close" size={24} color={colors.text} />
              </Pressable>
            </View>
            <VersionRow label={t('settings.appVersion', "Version de l'application")} value={Constants.expoConfig?.version ?? '1.0.0'} />
            <VersionRow label={t('settings.buildRuntime', "Environnement d'exécution")} value={Constants.expoConfig?.sdkVersion ? `Expo SDK ${Constants.expoConfig.sdkVersion}` : 'Expo'} />
            <VersionRow label={t('settings.appName', 'Application')} value={Constants.expoConfig?.name ?? 'AfriExpress'} />
            <Text style={styles.versionHint}>
              {t('settings.versionHint', 'Communiquez ces informations au support en cas de problème.')}
            </Text>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function VersionRow({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.option}>
      <Text style={styles.optionLabel}>{label}</Text>
      <Text style={styles.optionSub}>{value}</Text>
    </View>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  return <View style={styles.group}>{children}</View>;
}

function Row({ label, value, onPress, showChevron = true, last }: { label: string; value?: string; onPress?: () => void; showChevron?: boolean; last?: boolean }) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  return (
    <Pressable style={[styles.row, !last && styles.rowBorder]} onPress={onPress}>
      <Text style={styles.rowLabel} numberOfLines={1}>{label}</Text>
      <View style={styles.rowRight}>
        {value && <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>}
        {showChevron && <Icon name="chevronRight" size={18} color={colors.textMuted} />}
      </View>
    </Pressable>
  );
}

function ToggleRow({ label, value, onValueChange, last }: { label: string; value: boolean; onValueChange: (v: boolean) => void; last?: boolean }) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.white}
      />
    </View>
  );
}

function SelectSheet({ visible, title, options, selected, onSelect, onClose }: {
  visible: boolean;
  title: string;
  options: { id: string; label: string; sub?: string }[];
  selected: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          {/* maxHeight + défilement : les listes longues (64 pays) restent utilisables */}
          <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
            {options.map((o) => {
              const active = o.id === selected;
              return (
                <Pressable key={o.id} style={styles.option} onPress={() => onSelect(o.id)}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionLabel, active && { color: colors.primary, fontWeight: '800' }]}>{o.label}</Text>
                    {o.sub && <Text style={styles.optionSub}>{o.sub}</Text>}
                  </View>
                  <View style={[styles.radio, active && styles.radioOn]}>
                    {active && <View style={styles.radioDot} />}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  group: { backgroundColor: colors.surface, marginTop: spacing.md, borderRadius: 0 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, minHeight: 56 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { fontSize: fontSize.md, color: colors.text, flexShrink: 0 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1, marginLeft: spacing.md },
  rowValue: { fontSize: fontSize.md, color: colors.textMuted, flexShrink: 1 },
  logoutWrap: { padding: spacing.lg, marginTop: spacing.md },
  copyright: { textAlign: 'center', fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.sm },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingBottom: spacing.xxxl },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetTitle: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  versionHint: { padding: spacing.lg, fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center' },
  optionLabel: { fontSize: fontSize.md, color: colors.text },
  optionSub: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
});
