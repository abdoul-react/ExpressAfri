import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useColors, useThemedStyles, type Colors, spacing, radius, fontSize } from '@/design-system';
import { Icon } from '@/icons';
import { ScreenHeader, Badge, Button, KeyboardScreen } from '@/components';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore, COUNTRIES } from '@/store/settingsStore';
import { saveProfile, uploadAvatar } from '@/features/profile';
import { logger } from '@/infrastructure/logging';

const AVATARS = [
  'https://picsum.photos/seed/me1/120',
  'https://picsum.photos/seed/me2/120',
  'https://picsum.photos/seed/me3/120',
  'https://picsum.photos/seed/me4/120',
  'https://picsum.photos/seed/me5/120',
];

const GENDERS_KEYS = ['male', 'female', 'other'];
const YEARS = Array.from({ length: 60 }, (_, i) => `${2010 - i}`);

type Sheet = null | 'name' | 'gender' | 'year' | 'country';

export default function ProfileScreen() {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const user = useAuthStore((s) => s.user);
  const countryCode = useSettingsStore((s) => s.country);
  const setCountry = useSettingsStore((s) => s.setCountry);
  const country = COUNTRIES.find((c) => c.code === countryCode)!;

  const [sheet, setSheet] = useState<Sheet>(null);
  const { t } = useTranslation();
  const [nameDraft, setNameDraft] = useState('');
  const [uploading, setUploading] = useState(false);

  const masked = user?.email
    ? user.email.replace(/(.{2}).*(@.*)/, '$1***********$2')
    : 'invite***@afriexpress.com';

  // Sauvegarde serveur avec message si hors-ligne (le local est déjà mis à jour)
  const persist = (patch: Parameters<typeof saveProfile>[0]) => {
    saveProfile(patch).catch(() => {
      Alert.alert(
        t('common.error', 'Erreur'),
        t('profile.saveFailed', 'Modification enregistrée localement — elle sera perdue si vous vous reconnectez. Vérifiez votre connexion.'),
      );
    });
  };

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!res.canceled && res.assets[0]?.uri) {
      setUploading(true);
      try {
        // Upload vers le serveur → URL publique persistante (visible partout, survit au redémarrage)
        await uploadAvatar(res.assets[0].uri);
      } catch (e) {
        logger.warn('[profile] avatar upload failed', { error: String(e) });
        Alert.alert(
          t('common.error', 'Erreur'),
          t('profile.avatarUploadFailed', "Impossible d'envoyer la photo — vérifiez votre connexion."),
        );
      } finally {
        setUploading(false);
      }
    }
  };

  const openName = () => {
    setNameDraft(user?.name ?? '');
    setSheet('name');
  };

  // Le sexe est stocké comme clé stable (male/female/other) → affiché traduit
  const genderLabel = user?.gender ? t(`profile.${user.gender}`, user.gender) : '—';

  return (
    <View style={styles.container}>
      <ScreenHeader title={t("profile.title")} />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxxl }}>
        {/* Photo */}
        <Pressable style={styles.photoRow} onPress={pickPhoto} disabled={uploading}>
          <View>
            <Text style={styles.rowLabel}>{t("profile.photo")}</Text>
            <Text style={styles.photoHint}>{t("profile.tapToChange")}</Text>
          </View>
          <View>
            <Image
              source={{ uri: user?.avatar ?? AVATARS[0] }}
              style={styles.avatar}
            />
            {uploading && (
              <View style={styles.avatarLoading}>
                <ActivityIndicator color={colors.white} />
              </View>
            )}
          </View>
        </Pressable>

        <View style={styles.group}>
          <Row label={t("profile.pseudo")} value={user?.name ?? t("profile.guest")} onPress={openName} />
          <Row label={t("profile.accountInfo")} value={masked} />
          <Row label={t("profile.gender")} value={genderLabel} onPress={() => setSheet('gender')} />
          <Row label={t("profile.birthYear")} value={user?.birthYear ?? '—'} onPress={() => setSheet('year')} />
          <Row label={t("profile.country")} value={country.name} onPress={() => setSheet('country')} last />
        </View>

        {/* Clé d'accès */}
        <View style={styles.passkey}>
          <View style={styles.passkeyHeader}>
            <Text style={styles.passkeyTitle}>{t("profile.passkey")}</Text>
            <Badge label={t("profile.new")} tone="sale" />
          </View>
          <Text style={styles.passkeyText}>
            {t("profile.passkeyHint")}
          </Text>
        </View>
      </ScrollView>

      {/* Modale saisie pseudo */}
      <Modal visible={sheet === 'name'} transparent animationType="slide" onRequestClose={() => setSheet(null)}>
        <KeyboardScreen>
        <Pressable style={styles.backdrop} onPress={() => setSheet(null)}>
          <Pressable style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t("profile.pseudo")}</Text>
            <TextInput
              style={styles.input}
              value={nameDraft}
              onChangeText={setNameDraft}
              placeholder={t("profile.pseudo")}
              placeholderTextColor={colors.textMuted}
              autoFocus
              maxLength={30}
            />
            <Button
              label={t("profile.save")}
              fullWidth
              size="lg"
              onPress={() => {
                if (nameDraft.trim()) persist({ name: nameDraft.trim() });
                setSheet(null);
              }}
            />
          </Pressable>
        </Pressable>
        </KeyboardScreen>
      </Modal>

      {/* Sélecteurs */}
      <SelectSheet
        visible={sheet === 'gender'}
        title={t("profile.gender")}
        options={GENDERS_KEYS.map((k) => t(`profile.${k}`))}
        selected={user?.gender ? t(`profile.${user.gender}`, user.gender) : undefined}
        onSelect={(v) => {
          // Stocker la clé stable, pas le libellé traduit (sinon la valeur dépend de la langue)
          const key = GENDERS_KEYS.find((k) => t(`profile.${k}`) === v) ?? v;
          persist({ gender: key });
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
      />
      <SelectSheet
        visible={sheet === 'year'}
        title={t("profile.birthYear")}
        options={YEARS}
        selected={user?.birthYear}
        onSelect={(v) => { persist({ birthYear: v }); setSheet(null); }}
        onClose={() => setSheet(null)}
      />
      <SelectSheet
        visible={sheet === 'country'}
        title={t("profile.country")}
        options={COUNTRIES.map((c) => c.name)}
        selected={country.name}
        onSelect={(name) => {
          const c = COUNTRIES.find((x) => x.name === name);
          if (c) setCountry(c.code as any);
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
      />
    </View>
  );
}

function Row({ label, value, onPress, last }: { label: string; value: string; onPress?: () => void; last?: boolean }) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  return (
    <Pressable style={[styles.row, !last && styles.rowBorder]} onPress={onPress}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowRight}>
        <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
        {onPress && <Icon name="chevronRight" size={16} color={colors.textMuted} />}
      </View>
    </Pressable>
  );
}

function SelectSheet({ visible, title, options, selected, onSelect, onClose }: {
  visible: boolean;
  title: string;
  options: string[];
  selected?: string;
  onSelect: (v: string) => void;
  onClose: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { maxHeight: '70%' }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView>
            {options.map((o) => {
              const active = o === selected;
              return (
                <Pressable key={o} style={styles.option} onPress={() => onSelect(o)}>
                  <Text style={[styles.optionLabel, active && { color: colors.primary, fontWeight: '800' }]}>{o}</Text>
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
  photoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.md },
  photoHint: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.background },
  avatarLoading: { position: 'absolute', width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  group: { backgroundColor: colors.surface },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, minHeight: 56 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { fontSize: fontSize.md, color: colors.text, flexShrink: 0 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1, marginLeft: spacing.md, maxWidth: '60%' },
  rowValue: { fontSize: fontSize.md, color: colors.textMuted, flexShrink: 1 },
  passkey: { backgroundColor: colors.surface, marginTop: spacing.md, padding: spacing.lg },
  passkeyHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  passkeyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  passkeyText: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text },
  input: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 48, fontSize: fontSize.md, color: colors.text },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  optionLabel: { fontSize: fontSize.md, color: colors.text },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
});
