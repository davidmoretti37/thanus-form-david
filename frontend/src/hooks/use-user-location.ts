'use client';

import { useState, useEffect } from 'react';

interface UserLocation {
  country: string | null;
  language: string | null;
  isLoading: boolean;
  error: string | null;
}

const detectLanguageFromCountry = (country: string): string => {
  const portugueseSpeakingCountries = [
    'BR', 'PT', 'AO', 'MZ', 'CV', 'GW', 'ST', 'GQ', 'TL'
  ];
  const spanishSpeakingCountries = [
    'AR', 'BO', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'SV', 'GT', 'HN',
    'MX', 'NI', 'PA', 'PY', 'PE', 'PR', 'ES', 'UY', 'VE'
  ];

  if (portugueseSpeakingCountries.includes(country)) {
    return 'pt';
  }
  if (spanishSpeakingCountries.includes(country)) {
    return 'es';
  }
  return 'en';
};

export function useUserLocation(): UserLocation {
  const [location, setLocation] = useState<UserLocation>({
    country: null,
    language: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const detectLocation = async () => {
      try {
        // First try to get from localStorage (cached)
        const cachedCountry = localStorage.getItem('user_country');
        if (cachedCountry) {
          setLocation({
            country: cachedCountry,
            language: detectLanguageFromCountry(cachedCountry),
            isLoading: false,
            error: null,
          });
          return;
        }

        // Try to detect from timezone first (faster)
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (timezone.includes('America/Sao_Paulo') || 
            timezone.includes('America/Fortaleza') || 
            timezone.includes('America/Recife') ||
            timezone.includes('America/Manaus') ||
            timezone.includes('America/Cuiaba') ||
            timezone.includes('America/Campo_Grande') ||
            timezone.includes('America/Belem') ||
            timezone.includes('America/Araguaina') ||
            timezone.includes('America/Maceio') ||
            timezone.includes('America/Bahia') ||
            timezone.includes('America/Santarem') ||
            timezone.includes('America/Porto_Velho') ||
            timezone.includes('America/Boa_Vista') ||
            timezone.includes('America/Rio_Branco') ||
            timezone.includes('America/Eirunepe') ||
            timezone.includes('America/Noronha')) {
          const country = 'BR';
          localStorage.setItem('user_country', country);
          setLocation({
            country,
            language: 'pt',
            isLoading: false,
            error: null,
          });
          return;
        }

        // Fallback to IP-based detection
        const response = await fetch('https://ipapi.co/json/', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch location');
        }

        const data = await response.json();
        const country = data.country_code || 'US'; // Default to US if not detected
        
        // Cache the result
        localStorage.setItem('user_country', country);
        
        setLocation({
          country,
          language: detectLanguageFromCountry(country),
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.warn('Failed to detect user location:', error);
        // Default to US if detection fails
        const defaultCountry = 'US';
        localStorage.setItem('user_country', defaultCountry);
        setLocation({
          country: defaultCountry,
          language: 'en',
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to detect location',
        });
      }
    };

    detectLocation();
  }, []);

  return location;
}

export function isBrazilianUser(country: string | null): boolean {
  return country === 'BR';
}
