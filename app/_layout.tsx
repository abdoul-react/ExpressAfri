import { useEffect, useMemo } from 'react';
import { View, AppState, type AppStateStatus } from 'react-native';
import { Stack, useRouter, useSegments, ErrorBoundary } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { focusManager, useQuery } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import '@/i18n';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuthStore } from '@/store/authStore';
import { syncAddressesFromServer } from '@/store/addressStore';
import { ThemeProvider, lightColors, darkColors, type Colors } from '@/design-system';
import { catalogService } from '@/features/catalog';
import { contentService } from '@/features/content';
import { refreshProfile } from '@/features/profile';
import { apiAdapter } from '@/infrastructure/api/apiAdapter';
import { usePushRegistration } from '@/hooks/usePushRegistration';

// Garder le splash NATIF affiché tant que la session n'est pas restaurée :
// aucun écran intermédiaire (login/onboarding/spinner) n'est jamais visible —
// le splash se retire d'un coup, directement sur le bon écran.
SplashScreen.preventAutoHideAsync().catch(() => {});

// Brancher focusManager sur AppState : toutes les requêtes périmées se
// rafraîchissent automatiquement quand l'app revient au premier plan.
function onAppStateChange(status: AppStateStatus) {
  focusManager.setFocused(status === 'active');
}

// Client partagé (module dédié) : le store d'auth purge les requêtes privées
// à la connexion/déconnexion pour qu'aucune donnée d'un compte ne fuie vers un autre.
import { queryClient, shouldPersistQuery, QUERY_CACHE_STORAGE_KEY } from '@/infrastructure/query/queryClient';

// Cache de requêtes persisté sur disque : au démarrage, produits, catégories,
// bannières, sections… sont restaurés INSTANTANÉMENT depuis AsyncStorage,
// puis rafraîchis en arrière-plan (stale-while-revalidate). L'utilisateur ne
// voit jamais d'écran de chargement pour des données qu'il a déjà vues.
const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: QUERY_CACHE_STORAGE_KEY,
  throttleTime: 2000,
});

/** Redirige selon l'état onboarding / authentification. */
function useAuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const { hydrated, hasOnboarded, isAuthenticated, isGuest } = useAuthStore();

  useEffect(() => {
    if (!hydrated) return;
    const root = segments[0];
    const inOnboarding = root === 'onboarding';
    const inAuth = root === 'auth';

    // Une fois la destination tranchée (redirection émise ou position déjà
    // correcte), retirer le splash natif : l'utilisateur découvre directement
    // le BON écran — jamais l'écran d'entrée en transit.
    const settle = () => {
      requestAnimationFrame(() => SplashScreen.hideAsync().catch(() => {}));
    };

    if (!hasOnboarded) {
      if (!inOnboarding) router.replace('/onboarding');
      settle();
      return;
    }
    // Onboardé mais ni connecté ni invité → écran de connexion
    if (!isAuthenticated && !isGuest && !inAuth && !inOnboarding) {
      router.replace('/auth/login');
      settle();
      return;
    }
    // Branche symétrique — CONNECTÉ (pas invité) mais l'app a démarré sur
    // l'onboarding ou l'écran de connexion : aller directement à l'accueil.
    // IMPORTANT : ne jamais inclure isGuest ici — un invité qui appuie sur
    // « Se connecter » DOIT pouvoir rester sur l'écran de connexion, sinon
    // il est renvoyé à l'accueil en boucle et ne peut plus jamais se connecter.
    if (isAuthenticated && (inAuth || inOnboarding)) {
      router.replace('/');
    }
    settle();
  }, [hydrated, hasOnboarded, isAuthenticated, isGuest, segments, router]);
}

/**
 * Composant interne — placé à l'intérieur de QueryClientProvider.
 * Il peut utiliser useQuery en toute sécurité pour charger les couleurs CMS.
 * Séparation nécessaire : useQuery ne peut pas être appelé dans le même
 * composant que celui qui rend <QueryClientProvider>.
 */
function AppShell() {
  const settingsHydrated = useSettingsStore((s) => s.hydrated);
  const themeMode = useSettingsStore((s) => s.theme);
  const cmsPrimary = useSettingsStore((s) => s.cmsPrimary);
  const cmsSecondary = useSettingsStore((s) => s.cmsSecondary);
  const setCmsColors = useSettingsStore((s) => s.setCmsColors);
  const hydrated = useAuthStore((s) => s.hydrated);

  // Charger les couleurs dynamiques depuis le CMS (theme.primaryColor / theme.secondaryColor)
  // staleTime: 0 → toujours refetch au montage pour que les changements admin soient immédiats
  const { data: appSettings = [] } = useQuery<{ key: string; value: string }[]>({
    queryKey: ['app-settings'],
    queryFn: () => apiAdapter.get('/mobile/settings'),
    staleTime: 0,
  });

  // Mémoriser les couleurs CMS localement : au prochain démarrage, l'écran de
  // chargement les applique sans attendre la réponse du serveur
  useEffect(() => {
    if (!appSettings.length) return;
    const p = appSettings.find((s) => s.key === 'theme.primaryColor')?.value ?? null;
    const sec = appSettings.find((s) => s.key === 'theme.secondaryColor')?.value ?? null;
    if (p !== cmsPrimary || sec !== cmsSecondary) setCmsColors(p, sec);
  }, [appSettings, cmsPrimary, cmsSecondary, setCmsColors]);

  const colors: Colors = useMemo(() => {
    const base = themeMode === 'dark' ? darkColors : lightColors;
    // Priorité au serveur ; sinon couleurs mémorisées du dernier démarrage
    const primary = appSettings.find((s) => s.key === 'theme.primaryColor')?.value ?? cmsPrimary ?? undefined;
    const secondary = appSettings.find((s) => s.key === 'theme.secondaryColor')?.value ?? cmsSecondary ?? undefined;
    if (!primary && !secondary) return base;
    // Appliquer les couleurs CMS si elles sont définies et valides (format #RRGGBB)
    const isHex = (v?: string) => v && /^#[0-9A-Fa-f]{6}$/.test(v);
    return {
      ...base,
      ...(isHex(primary) ? {
        primary: primary!,
        primaryDark: primary!,
        primarySun: primary!,
        price: primary!,
        tabActive: primary!,
        badgeNew: primary!,
        // NOTE: `sale` garde sa couleur rouge (danger) — elle ne doit PAS prendre
        // la couleur primaire, sinon les badges promo deviennent orange au lieu de rouge.
      } : {}),
      ...(isHex(secondary) ? {
        secondary: secondary!,
        secondaryDark: secondary!,
        freeShipping: secondary!,
        success: secondary!,
      } : {}),
    };
  }, [themeMode, appSettings, cmsPrimary, cmsSecondary]);

  useAuthGate();

  // Notifications push : enregistrement à la connexion + navigation au tap.
  usePushRegistration();

  // Brancher focusManager sur AppState pour le refetch automatique au retour
  // au premier plan.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, []);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Préchargement au démarrage une fois que le store d'auth est hydraté
  useEffect(() => {
    if (hydrated) {
      // Resynchroniser le profil serveur (photo, sexe, année) — uniquement si
      // une session existe : sans jeton l'appel retourne forcément 401 et
      // polluait la console d'un avertissement à chaque démarrage invité.
      if (isAuthenticated) {
        refreshProfile();
        // Aligner les adresses avec le serveur : rend ville/pays/téléphone
        // visibles dans l'admin, et migre les adresses créées en invité.
        syncAddressesFromServer();
      }
      queryClient.prefetchQuery({
        queryKey: ['products'],
        queryFn: () => catalogService.getProducts(),
        staleTime: 30_000,
      });
      queryClient.prefetchQuery({
        queryKey: ['categories'],
        queryFn: () => catalogService.getCategories(),
        staleTime: 30_000,
      });
      queryClient.prefetchQuery({
        queryKey: ['banners'],
        queryFn: () => contentService.getBanners(),
        staleTime: 30_000,
      });
      queryClient.prefetchQuery({
        queryKey: ['feed-sections'],
        queryFn: () => contentService.getFeedSections(),
        staleTime: 30_000,
      });
      queryClient.prefetchQuery({
        queryKey: ['payment-methods'],
        queryFn: () => apiAdapter.get('/mobile/payment/methods'),
        staleTime: 30_000,
      });
      queryClient.prefetchQuery({
        queryKey: ['app-settings'],
        queryFn: () => apiAdapter.get('/mobile/settings'),
        staleTime: 30_000,
      });
      queryClient.prefetchQuery({
        queryKey: ['app-logos'],
        queryFn: () => apiAdapter.get('/mobile/logos'),
        staleTime: 30_000,
      });
      queryClient.prefetchQuery({
        queryKey: ['feature-flags'],
        queryFn: () => apiAdapter.get('/mobile/feature-flags'),
        staleTime: 30_000,
      });
    }
  }, [hydrated, isAuthenticated]);

  return (
    <ThemeProvider colors={colors}>
      <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
      {!hydrated || !settingsHydrated ? (
        // Le splash NATIF couvre encore l'écran (preventAutoHideAsync) :
        // rien à dessiner ici — surtout pas un 2e splash JS avec spinner.
        <View style={{ flex: 1, backgroundColor: colors.surface }} />
      ) : (
        <BottomSheetModalProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
            <Stack.Screen name="auth/login" options={{ animation: 'fade' }} />
            <Stack.Screen name="auth/register" />
            <Stack.Screen name="auth/otp" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="product/[id]" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="search/index" options={{ animation: 'fade' }} />
            <Stack.Screen name="camera/index" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="checkout/index" />
            <Stack.Screen name="checkout/payment" />
            <Stack.Screen name="address/index" />
            <Stack.Screen name="address/form" />
            <Stack.Screen name="checkout/success" options={{ animation: 'fade' }} />
            <Stack.Screen name="messages/index" />
            <Stack.Screen name="settings/index" />
            <Stack.Screen name="orders/index" />
            <Stack.Screen name="orders/[id]" />
            <Stack.Screen name="orders/tracking" />
            <Stack.Screen name="orders/return" />
            <Stack.Screen name="wishlist/index" />
            <Stack.Screen name="profile/index" />
            <Stack.Screen name="coupons/index" />
            <Stack.Screen name="stores/index" />
            <Stack.Screen name="suggestions/index" />
            <Stack.Screen name="payment/index" />
            <Stack.Screen name="wallet/bonus" />
            <Stack.Screen name="wallet/savings" />
            <Stack.Screen name="static-page/[slug]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="placeholder" />
          </Stack>
        </BottomSheetModalProvider>
      )}
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister: queryPersister,
            maxAge: 24 * 60 * 60 * 1000, // le cache disque reste valable 24 h
            dehydrateOptions: {
              // Ne jamais écrire les données privées (messages, commandes…) sur disque
              shouldDehydrateQuery: (q) => shouldPersistQuery(q.queryKey),
            },
          }}
        >
          {/* AppShell est dans le tree du provider → useQuery fonctionne */}
          <AppShell />
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
