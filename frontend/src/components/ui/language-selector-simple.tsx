'use client';

import { useState, useEffect } from 'react';
import { Languages, Check, ChevronDown } from 'lucide-react';
import { setLanguage, getCurrentLanguage, type LanguageCode } from '@/lib/i18n';

const languageMap: Record<LanguageCode, { nativeName: string }> = {
  en: { nativeName: 'English' },
  pt: { nativeName: 'Português' },
  es: { nativeName: 'Español' },
};
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface LanguageSelectorProps {
  variant?: 'default' | 'icon';
  className?: string;
}

export function LanguageSelectorSimple({ variant = 'default', className = '' }: LanguageSelectorProps) {
  const [mounted, setMounted] = useState(false);
  const [currentLang, setCurrentLang] = useState<LanguageCode>('en');

  // Set the initial language after component mounts to avoid hydration issues
  useEffect(() => {
    setMounted(true);
    setCurrentLang(getCurrentLanguage());
  }, []);

  const handleLanguageChange = (lang: LanguageCode) => {
    setCurrentLang(lang);
    setLanguage(lang);
    // Reload the page to apply language changes to all components
    window.location.reload();
  };

  // Don't render anything during server-side rendering
  if (!mounted) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <Languages className="h-4 w-4" />
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={variant === 'icon' ? 'icon' : 'default'}
          className={`flex items-center gap-2 ${className}`}
        >
          <Languages className="h-4 w-4" />
          {variant === 'default' && (
            <div className="flex items-center">
              <span className="mr-1">
                {languageMap[currentLang]?.nativeName || currentLang.toUpperCase()}
              </span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {Object.entries(languageMap).map(([code, { nativeName }]) => (
          <DropdownMenuItem
            key={code}
            onClick={() => handleLanguageChange(code as LanguageCode)}
            className="flex items-center justify-between"
          >
            <span>{nativeName}</span>
            {currentLang === code && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
