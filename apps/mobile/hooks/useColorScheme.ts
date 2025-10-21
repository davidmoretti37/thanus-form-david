import { useThemeStore } from '@/stores/theme-store';

export const useColorScheme = (): 'light' | 'dark' => {
  return useThemeStore((s) => s.colorScheme);
};

export const useColorSchemeControls = () => {
  const colorScheme = useThemeStore((s) => s.colorScheme);
  const setColorScheme = useThemeStore((s) => s.setColorScheme);
  return { colorScheme, setColorScheme };
};
