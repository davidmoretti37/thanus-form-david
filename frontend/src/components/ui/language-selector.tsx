'use client';

import { supportedLanguages, type LanguageCode } from '@/lib/i18n';
import { Check, Languages } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useEffect } from 'react';

interface LanguageSelectorProps {
  variant?: 'default' | 'icon' | 'menu-item';
  className?: string;
  onLanguageChange?: (lang: LanguageCode) => void;
}

export function LanguageSelector({ variant = 'default', className, onLanguageChange }: LanguageSelectorProps) {
  const { language: currentLang, setLanguage } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLanguageChange = (langCode: LanguageCode) => {
    setLanguage(langCode);
    
    // Call optional callback
    onLanguageChange?.(langCode);
    
    // Reload the page to apply the new language
    window.location.reload();
  };

  if (!mounted) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Languages className="h-4 w-4" />
        <span>Language</span>
      </div>
    );
  }

  if (variant === 'menu-item') {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 px-2 py-1.5 text-sm font-medium">
          <Languages className="h-4 w-4" />
          Language
        </div>
        <div className="space-y-1 pl-6">
          {Object.entries(supportedLanguages).map(([code, language]) => (
            <button
              key={code}
              onClick={() => handleLanguageChange(code as LanguageCode)}
              className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
            >
              <span>{language.nativeName}</span>
              {currentLang === code && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // For dropdown variants, return a simple trigger that can be used in existing dropdowns
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Languages className="h-4 w-4" />
      <span>{variant === 'icon' ? '' : supportedLanguages[currentLang].nativeName}</span>
    </div>
  );
}

// Individual language option component for use in existing dropdowns
export function LanguageOption({ 
  langCode, 
  currentLang, 
  onSelect 
}: { 
  langCode: LanguageCode; 
  currentLang: LanguageCode; 
  onSelect: (lang: LanguageCode) => void;
}) {
  return (
    <button
      onClick={() => onSelect(langCode)}
      className="flex w-full items-center justify-between px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm"
    >
      <span>{supportedLanguages[langCode].nativeName}</span>
      {currentLang === langCode && <Check className="h-4 w-4" />}
    </button>
  );
}
