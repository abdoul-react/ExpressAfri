import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Switch, Modal } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { spacing, radius, fontSize, useColors, useThemedStyles, type Colors } from '@/design-system';
import { Icon } from '@/icons';
import { ScreenHeader, Button, KeyboardScreen } from '@/components';
import { useAddressForm } from '@/features/address';
import { COUNTRIES } from '@/store/settingsStore';
import { useQuery } from '@tanstack/react-query';
import { contentService } from '@/features/content';

export default function AddressFormScreen() {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();

  // Toute la logique (état des champs, validation, enregistrement) est dans le hook.
  const { t } = useTranslation();
  const { isEditing, country, setCountry, form, setField, makeDefault, setMakeDefault, valid, save } =
    useAddressForm(id);
  const [countrySheet, setCountrySheet] = useState(false);

  // Pays livrables en tete, reste par ordre alphabetique
  const { data: shippingCodes = [] } = useQuery<string[]>({
    queryKey: ['shipping-countries'],
    queryFn: () => contentService.getShippingCountries(),
    staleTime: 10 * 60 * 1000,
  });
  const sortedCountries = useMemo(() => {
    if (!shippingCodes.length) return COUNTRIES;
    const set = new Set(shippingCodes);
    return [
      ...COUNTRIES.filter((c) => set.has(c.code)),
      ...COUNTRIES.filter((c) => !set.has(c.code)),
    ];
  }, [shippingCodes]);

  return (
    <KeyboardScreen style={styles.container}>
      <ScreenHeader title={isEditing ? t("address.edit") : t("address.add")} />
      <View style={styles.encrypted}>
        <Icon name="shield" size={14} color={colors.secondaryDark} />
        <Text style={styles.encryptedText}>{t("address.encrypted")}</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* Pays / Région */}
        <Text style={styles.groupTitle}>{t("address.country")}</Text>
        <Pressable style={styles.countryRow} onPress={() => setCountrySheet(true)}>
          <Image source={{ uri: `https://flagcdn.com/w80/${country.code.toLowerCase()}.png` }} style={styles.flag} />
          <Text style={styles.countryName}>{country.name}</Text>
          <Icon name="chevronRight" size={18} color={colors.textMuted} />
        </Pressable>

        {/* Informations personnelles */}
        <Text style={styles.groupTitle}>{t("address.personalInfo")}</Text>
        <Field placeholder={t("address.contactName")} value={form.contactName} onChangeText={setField('contactName')} />
        <View style={styles.phoneRow}>
          <View style={styles.dialBox}>
            <Text style={styles.dialText}>{country.dial}</Text>
          </View>
          <TextInput
            style={[styles.input, { flex: 1, marginLeft: 0 }]}
            placeholder={t("address.phone")}
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            value={form.phone}
            onChangeText={setField('phone')}
          />
        </View>

        {/* Adresse */}
        <Text style={styles.groupTitle}>{t("address.address")}</Text>
        <Field placeholder={t("address.street")} value={form.street} onChangeText={setField('street')} />
        <Field placeholder={t("address.apartment")} value={form.apartment} onChangeText={setField('apartment')} />
        <Field placeholder={t("address.province")} value={form.province} onChangeText={setField('province')} />
        <Field placeholder={t("address.city")} value={form.city} onChangeText={setField('city')} />
        <Field placeholder={t("address.postalCode")} value={form.postalCode} onChangeText={setField('postalCode')} keyboardType="number-pad" />

        {/* Défaut */}
        <View style={styles.defaultRow}>
          <Text style={styles.defaultLabel}>{t("address.setDefault")}</Text>
          <Switch
            value={makeDefault}
            onValueChange={setMakeDefault}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: insets.bottom + spacing.sm }]}>
        <Button label={t("common.save")} fullWidth size="lg" disabled={!valid} onPress={save} />
      </View>

      {/* Sélecteur de pays */}
      <Modal visible={countrySheet} transparent animationType="slide" onRequestClose={() => setCountrySheet(false)}>
        <Pressable style={styles.backdrop} onPress={() => setCountrySheet(false)}>
          <Pressable style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t("address.country")}</Text>
            <ScrollView>
              {sortedCountries.map((c) => (
                <Pressable key={c.code} style={styles.option} onPress={() => { setCountry(c); setCountrySheet(false); }}>
                  <Image source={{ uri: `https://flagcdn.com/w80/${c.code.toLowerCase()}.png` }} style={styles.flag} />
                  <Text style={styles.optionLabel}>{c.name}</Text>
                  <Text style={styles.optionDial}>{c.dial}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardScreen>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { placeholder: string }) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  return (
    <TextInput
      {...props}
      style={styles.input}
      placeholderTextColor={colors.textMuted}
    />
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  encrypted: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, backgroundColor: colors.surface },
  encryptedText: { fontSize: fontSize.xs, color: colors.secondaryDark, fontWeight: '600' },
  groupTitle: { fontSize: fontSize.md, fontWeight: '800', color: colors.text, paddingHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.sm },
  countryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, marginHorizontal: spacing.lg, paddingHorizontal: spacing.md, height: 52, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  flag: { width: 26, height: 18, borderRadius: 3, backgroundColor: colors.background },
  countryName: { flex: 1, fontSize: fontSize.md, color: colors.text, fontWeight: '600' },
  input: { backgroundColor: colors.surface, marginHorizontal: spacing.lg, marginTop: spacing.sm, paddingHorizontal: spacing.md, height: 52, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, fontSize: fontSize.md, color: colors.text },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginRight: spacing.lg },
  dialBox: { marginLeft: spacing.lg, marginTop: spacing.sm, paddingHorizontal: spacing.md, height: 52, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  dialText: { fontSize: fontSize.md, color: colors.text, fontWeight: '700' },
  defaultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, backgroundColor: colors.surface, marginHorizontal: spacing.lg, marginTop: spacing.lg, padding: spacing.lg, borderRadius: radius.md },
  defaultLabel: { flex: 1, fontSize: fontSize.md, color: colors.text },
  bar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xxxl, maxHeight: '70%' },
  sheetTitle: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text, marginBottom: spacing.md },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  optionLabel: { flex: 1, fontSize: fontSize.md, color: colors.text },
  optionDial: { fontSize: fontSize.sm, color: colors.textMuted },
});
