'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { LanguageCode, TranslationKey, supportedLanguages, defaultLanguage, t as translate } from '@/lib/i18n';
import { useUserLocation } from '@/hooks/use-user-location';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: TranslationKey) => string;
  supportedLanguages: typeof supportedLanguages;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(defaultLanguage);
  const [isMounted, setIsMounted] = useState(false);
  const { language: locationLanguage, isLoading: isLocationLoading } = useUserLocation();

  useEffect(() => {
    const loadLanguage = () => {
      if (typeof window === 'undefined') {
        setIsMounted(true);
        return;
      }

      try {
        const cookieLang = document.cookie
          .split('; ')
          .find(row => row.startsWith('thanus-lang='))
          ?.split('=')[1] as LanguageCode;

        if (cookieLang && supportedLanguages[cookieLang]) {
          setLanguageState(cookieLang);
        } else if (!isLocationLoading && locationLanguage && supportedLanguages[locationLanguage as LanguageCode]) {
          setLanguageState(locationLanguage as LanguageCode);
        } else {
          const browserLang = navigator.language.split('-')[0] as LanguageCode;
          if (supportedLanguages[browserLang]) {
            setLanguageState(browserLang);
          }
        }
      } catch (error) {
        console.error('Error loading language:', error);
      } finally {
        setIsMounted(true);
      }
    };

    loadLanguage();
  }, [isLocationLoading, locationLanguage]);

  const setLanguage = (lang: LanguageCode) => {
    if (lang in supportedLanguages) {
      setLanguageState(lang);
      
      // Save to cookie
      document.cookie = `thanus-lang=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; sameSite=lax${process.env.NODE_ENV === 'production' ? '; secure' : ''}`;
      
      // Update html lang attribute
      document.documentElement.lang = lang;
    }
  };

  const t = (key: TranslationKey): string => {
    return translate(key, language);
  };

  // Update html lang attribute when language changes
  useEffect(() => {
    if (isMounted) {
      document.documentElement.lang = language;
    }
  }, [language, isMounted]);

  if (!isMounted) {
    // Return default language while loading
    return (
      <LanguageContext.Provider
        value={{
          language: defaultLanguage,
          setLanguage,
          t: (key: TranslationKey) => translate(key, defaultLanguage),
          supportedLanguages,
        }}
      >
        {children}
      </LanguageContext.Provider>
    );
  }

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        supportedLanguages,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Hook for server components to get initial language
export function useServerLanguage(): LanguageCode {
  // This is a placeholder - in server components, we'll use the async detection
  return defaultLanguage;
}
