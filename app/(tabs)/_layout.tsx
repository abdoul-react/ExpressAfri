import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { spacing, fontSize, shadows, useColors, useThemedStyles, type Colors } from '@/design-system';
import { Icon, IconName } from '@/icons';
import { TabBarCarouselButton } from '@/features/content/TabBarCarouselButton';
import { useCartStore } from '@/store/cartStore';

// La route physique 'store' garde son nom (deep links historiques) mais présente
// désormais les catégories. Le bouton central n'ouvre plus l'onglet 'feed' :
// il pousse /stores. 'feed' reste déclaré pour ne pas casser ses deep links.
const TAB_CONFIG: { name: string; icon: IconName; labelKey: string; center?: boolean }[] = [
  { name: 'index', icon: 'home', labelKey: 'tabs.home' },
  { name: 'store', icon: 'grid', labelKey: 'tabs.categories' },
  { name: 'feed', icon: 'plus', labelKey: 'tabs.stores', center: true },
  { name: 'cart', icon: 'cart', labelKey: 'tabs.cart' },
  { name: 'account', icon: 'account', labelKey: 'tabs.account' },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTabBar({ state, navigation }: { state: any; navigation: any }) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const cartCount = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom || spacing.sm }]}>
      {state.routes.map((route: { key: string; name: string }, index: number) => {
        const cfg = TAB_CONFIG.find((c) => c.name === route.name);
        if (!cfg) return null;
        const focused = state.index === index;
        const color = focused ? colors.tabActive : colors.tabInactive;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        if (cfg.center) {
          return (
            // Carrousel des couvertures de boutiques — sans libellé, centré
            // sur la hauteur de la barre comme les autres onglets.
            <TabBarCarouselButton key={route.key} />
          );
        }

        return (
          <Pressable key={route.key} style={styles.tab} onPress={onPress}>
            <View>
              <Icon name={cfg.icon} size={24} color={color} fill={focused} />
              {focused && (
                <View style={styles.check}>
                  <Icon name="check" size={9} color={colors.white} strokeWidth={3.5} />
                </View>
              )}
              {cfg.name === 'cart' && cartCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.label, { color }]} numberOfLines={1}>
              {t(cfg.labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="store" />
      <Tabs.Screen name="feed" />
      <Tabs.Screen name="cart" />
      <Tabs.Screen name="account" />
    </Tabs>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    ...shadows.md,
  },
  tab: { flex: 1, alignItems: 'center', gap: 3 },
  label: { fontSize: fontSize.xs, fontWeight: '600' },
  check: {
    position: 'absolute',
    top: -5,
    right: -8,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: colors.secondary,
    borderWidth: 1.5,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: colors.sale,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: '800' },
});
