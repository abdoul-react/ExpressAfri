import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

import fr from './locales/fr.json';
import en from './locales/en.json';
import ar from './locales/ar.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'fr', label: 'Français', native: 'Français', rtl: false },
  { code: 'en', label: 'English', native: 'English', rtl: false },
  { code: 'ar', label: 'Arabic', native: 'العربية', rtl: true },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

export const RTL_LANGUAGES: LanguageCode[] = ['ar'];

export function isRTLLanguage(code: string): boolean {
  return RTL_LANGUAGES.includes(code as LanguageCode);
}

/** Langue par défaut : FR ; sinon on tente celle de l'appareil si supportée. */
function detectInitialLanguage(): LanguageCode {
  try {
    const device = getLocales()[0]?.languageCode;
    if (device && SUPPORTED_LANGUAGES.some((l) => l.code === device)) {
      return device as LanguageCode;
    }
  } catch {
    // ignore
  }
  return 'fr';
}

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: detectInitialLanguage(),
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
  returnNull: false,
  compatibilityJSON: 'v4',
});

export default i18n;
