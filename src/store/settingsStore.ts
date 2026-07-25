import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n, { LanguageCode, isRTLLanguage } from '@/i18n';
import { I18nManager } from 'react-native';
import { CurrencyCode } from '@/utils/currency';
import { COUNTRIES, Country, CountryCode, flagEmoji } from '@/data/countries';

// Ré-exports pour rétrocompatibilité — les consommateurs existants n'ont pas besoin de changer
export type { CountryCode, Country };
export { COUNTRIES, flagEmoji };

export type ThemeMode = 'light' | 'dark';

type SettingsState = {
  language: LanguageCode;
  currency: CurrencyCode;
  country: CountryCode;
  isRTL: boolean;
  hasSeenPromo: boolean;
  theme: ThemeMode;
  // Couleurs CMS mémorisées localement : appliquées dès le démarrage
  // (splash/chargement) sans attendre la réponse du serveur
  cmsPrimary: string | null;
  cmsSecondary: string | null;
  hydrated: boolean;
  setLanguage: (lang: LanguageCode) => void;
  setCurrency: (currency: CurrencyCode) => void;
  setCountry: (country: CountryCode) => void;
  markPromoSeen: () => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setCmsColors: (primary: string | null, secondary: string | null) => void;
  setHydrated: () => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'fr',
      currency: 'XOF',
      country: 'NE',
      isRTL: false,
      hasSeenPromo: false,
      theme: 'light',
      cmsPrimary: null,
      cmsSecondary: null,
      hydrated: false,

      setLanguage: (language) => {
        i18n.changeLanguage(language);
        const rtl = isRTLLanguage(language);
        I18nManager.forceRTL(rtl);
        set({ language, isRTL: rtl });
        // Import dynamique pour éviter le cycle settingsStore → profileService → authStore
        import('@/features/profile/profileService').then(({ saveProfile }) =>
          saveProfile({ language }).catch(() => {})
        ).catch(() => {});
      },
      setCurrency: (currency) => set({ currency }),
      setCountry: (country) => set({ country }),
      markPromoSeen: () => set({ hasSeenPromo: true }),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setCmsColors: (cmsPrimary, cmsSecondary) => set({ cmsPrimary, cmsSecondary }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'afriexpress-settings',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state?.language) {
          i18n.changeLanguage(state.language);
        }
        state?.setHydrated();
      },
    }
  )
);
