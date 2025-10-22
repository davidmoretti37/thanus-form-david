import { Appearance } from 'react-native';
import { create } from 'zustand';

export type ColorScheme = 'light' | 'dark';

interface ThemeState {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  colorScheme: (Appearance.getColorScheme() as ColorScheme) || 'light',
  setColorScheme: (scheme) => {
    console.log('Theme store: Setting colorScheme to:', scheme);
    set({ colorScheme: scheme });
  },
}));


