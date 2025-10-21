import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { changeLanguage, getAvailableLanguages, getCurrentLanguage } from '@/lib/i18n';

interface Language {
  code: string;
  name: string;
  nativeName: string;
}

interface LanguageContextValue {
  currentLanguage: string;
  availableLanguages: Language[];
  setLanguage: (languageCode: string) => Promise<void>;
  t: (key: string, options?: any) => string;
}

const LanguageContext = React.createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = React.useState(getCurrentLanguage());

  const handleSetLanguage = React.useCallback(async (languageCode: string) => {
    await changeLanguage(languageCode);
    setCurrentLanguage(languageCode);
  }, []);

  const value = React.useMemo(
    () => ({
      currentLanguage,
      availableLanguages: getAvailableLanguages(),
      setLanguage: handleSetLanguage,
      t,
    }),
    [currentLanguage, handleSetLanguage, t]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = React.useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}


