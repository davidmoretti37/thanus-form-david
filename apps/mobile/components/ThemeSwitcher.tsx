import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Body } from '@/components/Typography';
import { useTheme } from '@/hooks/useThemeColor';
import { useColorSchemeControls } from '@/hooks/useColorScheme';
import { Moon, Sun } from 'lucide-react-native';

export const ThemeSwitcher: React.FC<{ variant?: 'button' | 'icon' }> = ({ variant = 'button' }) => {
  const theme = useTheme();
  const { colorScheme, setColorScheme } = useColorSchemeControls();

  const styles = StyleSheet.create({
    btn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.mutedWithOpacity(0.08),
    },
    text: {
      color: theme.foreground,
      fontSize: 12,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.mutedWithOpacity(0.08),
      borderWidth: 1,
      borderColor: theme.border,
    },
  });

  return (
    <TouchableOpacity onPress={() => setColorScheme?.(colorScheme === 'dark' ? 'light' : 'dark')} activeOpacity={0.8}>
      {variant === 'icon' ? (
        <View style={styles.iconWrap}>
          {colorScheme === 'dark' ? (
            <Sun size={18} color={theme.foreground} strokeWidth={2} />
          ) : (
            <Moon size={18} color={theme.foreground} strokeWidth={2} />
          )}
        </View>
      ) : (
        <View style={styles.btn}>
          <Body style={styles.text}>{colorScheme === 'dark' ? 'Light mode' : 'Dark mode'}</Body>
        </View>
      )}
    </TouchableOpacity>
  );
};


