import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from '@/locales/en.json';

const LANGUAGE_KEY = '@app_language';

const resources = {
  en: { translation: en },
};

export const initializeI18n = async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);

    await i18n
      .use(initReactI18next)
      .init({
        resources,
        lng: savedLanguage || 'en',
        fallbackLng: 'en',
        compatibilityJSON: 'v4',
        interpolation: { escapeValue: false },
        react: { useSuspense: false },
      });
  } catch (error) {
    console.error('i18n initialization error:', error);
  }
};

export const changeLanguage = async (languageCode: string) => {
  await i18n.changeLanguage(languageCode);
  await AsyncStorage.setItem(LANGUAGE_KEY, languageCode);
};

export const getCurrentLanguage = () => i18n.language;

export const getAvailableLanguages = () => [
  { code: 'en', name: 'English', nativeName: 'English' },
];

export default i18n;


