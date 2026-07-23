import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { spacing, radius, fontSize, useColors, useThemedStyles, type Colors } from '@/design-system';
import { Icon } from '@/icons';
import { ScreenHeader, Button, EmptyState } from '@/components';
import { useAddressStore } from '@/store/addressStore';

export default function AddressListScreen() {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const addresses = useAddressStore((s) => s.addresses);
  const defaultId = useAddressStore((s) => s.defaultId);
  const setDefault = useAddressStore((s) => s.setDefault);

  const select = (id: string) => {
    setDefault(id);
    router.back();
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title={t("address.title")} />

      {addresses.length === 0 ? (
        <EmptyState
          icon="location"
          title={t("address.empty")}
          hint={t("address.emptyHint")}
          actionLabel={t("address.add")}
          onAction={() => router.push('/address/form')}
        />
      ) : (
        <>
          <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
            {addresses.map((a) => {
              const isDefault = a.id === (defaultId ?? addresses[0].id);
              return (
                <Pressable key={a.id} style={styles.card} onPress={() => select(a.id)}>
                  <View style={[styles.radio, isDefault && styles.radioOn]}>
                    {isDefault && <View style={styles.radioDot} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.cardHead}>
                      <Text style={styles.name}>{a.contactName}</Text>
                      <Text style={styles.phone}>{a.dialCode} {a.phone}</Text>
                      {isDefault && <View style={styles.defaultTag}><Text style={styles.defaultTagText}>{t("address.default")}</Text></View>}
                    </View>
                    <Text style={styles.addr}>
                      {a.street}{a.apartment ? `, ${a.apartment}` : ''}, {a.city}, {a.province}, {a.postalCode}
                    </Text>
                  </View>
                  <Pressable hitSlop={8} onPress={() => router.push(`/address/form?id=${a.id}`)} style={styles.edit}>
                    <Icon name="edit" size={18} color={colors.textMuted} />
                  </Pressable>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={[styles.bar, { paddingBottom: insets.bottom + spacing.sm }]}>
            <Button label={t("address.addNew")} icon="plus" fullWidth size="lg" onPress={() => router.push('/address/form')} />
          </View>
        </>
      )}
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, marginBottom: spacing.md },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
  cardHead: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  name: { fontSize: fontSize.md, fontWeight: '800', color: colors.text },
  phone: { fontSize: fontSize.sm, color: colors.textSecondary },
  defaultTag: { backgroundColor: colors.primarySoft, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  defaultTagText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: '700' },
  addr: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 4, lineHeight: 19 },
  edit: { padding: 2 },
  bar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
});
