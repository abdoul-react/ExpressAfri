import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n, { LanguageCode, isRTLLanguage } from '@/i18n';
import { I18nManager } from 'react-native';
import { CurrencyCode } from '@/utils/currency';
import { saveProfile } from '@/features/profile/profileService';

// Code ISO 3166-1 alpha-2 — sert aussi d'identifiant de drapeau
// (emoji + flagcdn.com). Chaîne libre : la liste des pays activés est
// pilotée par l'admin (zones de livraison), pas figée dans le code.
export type CountryCode = string;

export type Country = {
  code: CountryCode;
  name: string;
  currency: CurrencyCode;
  dial: string;
  /** Emoji drapeau — cohérent partout (listes, compte, en-têtes). */
  flag: string;
};

/** Emoji drapeau depuis le code ISO (🇳🇪 = 'NE'). */
export function flagEmoji(code: string): string {
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

const c = (code: string, name: string, currency: CurrencyCode, dial: string): Country =>
  ({ code, name, currency, dial, flag: flagEmoji(code) });

/**
 * Tous les pays d'Afrique (54) + grandes places mondiales.
 * L'admin restreint la liste effectivement proposée via ses zones de
 * livraison (les pays présents dans une zone active passent en premier).
 */
export const COUNTRIES: Country[] = [
  // Afrique de l'Ouest
  c('NE', 'Niger', 'XOF', '+227'),
  c('ML', 'Mali', 'XOF', '+223'),
  c('SN', 'Sénégal', 'XOF', '+221'),
  c('BF', 'Burkina Faso', 'XOF', '+226'),
  c('CI', "Côte d'Ivoire", 'XOF', '+225'),
  c('BJ', 'Bénin', 'XOF', '+229'),
  c('TG', 'Togo', 'XOF', '+228'),
  c('GW', 'Guinée-Bissau', 'XOF', '+245'),
  c('NG', 'Nigeria', 'NGN', '+234'),
  c('GH', 'Ghana', 'GHS', '+233'),
  c('GN', 'Guinée', 'GNF', '+224'),
  c('SL', 'Sierra Leone', 'USD', '+232'),
  c('LR', 'Liberia', 'USD', '+231'),
  c('GM', 'Gambie', 'USD', '+220'),
  c('MR', 'Mauritanie', 'MAD', '+222'),
  c('CV', 'Cap-Vert', 'EUR', '+238'),
  // Afrique centrale
  c('CM', 'Cameroun', 'XAF', '+237'),
  c('TD', 'Tchad', 'XAF', '+235'),
  c('CF', 'Centrafrique', 'XAF', '+236'),
  c('GA', 'Gabon', 'XAF', '+241'),
  c('CG', 'Congo', 'XAF', '+242'),
  c('CD', 'RD Congo', 'CDF', '+243'),
  c('GQ', 'Guinée équatoriale', 'XAF', '+240'),
  c('ST', 'Sao Tomé-et-Principe', 'USD', '+239'),
  // Afrique du Nord
  c('MA', 'Maroc', 'MAD', '+212'),
  c('DZ', 'Algérie', 'DZD', '+213'),
  c('TN', 'Tunisie', 'TND', '+216'),
  c('LY', 'Libye', 'USD', '+218'),
  c('EG', 'Égypte', 'EGP', '+20'),
  c('SD', 'Soudan', 'USD', '+249'),
  // Afrique de l'Est
  c('ET', 'Éthiopie', 'ETB', '+251'),
  c('KE', 'Kenya', 'KES', '+254'),
  c('TZ', 'Tanzanie', 'TZS', '+255'),
  c('UG', 'Ouganda', 'UGX', '+256'),
  c('RW', 'Rwanda', 'RWF', '+250'),
  c('BI', 'Burundi', 'USD', '+257'),
  c('SS', 'Soudan du Sud', 'USD', '+211'),
  c('ER', 'Érythrée', 'USD', '+291'),
  c('DJ', 'Djibouti', 'USD', '+253'),
  c('SO', 'Somalie', 'USD', '+252'),
  c('MG', 'Madagascar', 'MGA', '+261'),
  c('MU', 'Maurice', 'MUR', '+230'),
  c('SC', 'Seychelles', 'USD', '+248'),
  c('KM', 'Comores', 'USD', '+269'),
  // Afrique australe
  c('ZA', 'Afrique du Sud', 'ZAR', '+27'),
  c('ZM', 'Zambie', 'ZMW', '+260'),
  c('ZW', 'Zimbabwe', 'USD', '+263'),
  c('MZ', 'Mozambique', 'MZN', '+258'),
  c('AO', 'Angola', 'AOA', '+244'),
  c('NA', 'Namibie', 'ZAR', '+264'),
  c('BW', 'Botswana', 'BWP', '+267'),
  c('LS', 'Lesotho', 'ZAR', '+266'),
  c('SZ', 'Eswatini', 'ZAR', '+268'),
  c('MW', 'Malawi', 'USD', '+265'),
  // Grandes places mondiales
  c('FR', 'France', 'EUR', '+33'),
  c('US', 'États-Unis', 'USD', '+1'),
  c('GB', 'Royaume-Uni', 'GBP', '+44'),
  c('DE', 'Allemagne', 'EUR', '+49'),
  c('CN', 'Chine', 'CNY', '+86'),
  c('AE', 'Émirats arabes unis', 'AED', '+971'),
  c('TR', 'Turquie', 'TRY', '+90'),
  c('IN', 'Inde', 'INR', '+91'),
  c('CA', 'Canada', 'CAD', '+1'),
  c('BR', 'Brésil', 'USD', '+55'),
];

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
        // Persiste la langue côté serveur (best-effort — n'annule pas le changement local)
        saveProfile({ language }).catch(() => {});
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
