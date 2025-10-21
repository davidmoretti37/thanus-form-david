import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import type { QuickAction } from './types';
import { Body } from '@/components/Typography';
import { useTheme } from '@/hooks/useThemeColor';

export function QuickActionCard({ action, onPress, isSelected }: { action: QuickAction; onPress?: () => void; isSelected?: boolean; }) {
  const theme = useTheme();
  const Icon = action.icon;

  const styles = StyleSheet.create({
    container: {
      width: 86,
      height: 40,
      borderRadius: 12,
      paddingHorizontal: 8,
      marginRight: 10,
      borderWidth: 1,
      borderColor: isSelected ? theme.primary : theme.border,
      backgroundColor: isSelected ? theme.mutedWithOpacity(0.12) : theme.mutedWithOpacity(0.06),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    label: {
      color: theme.foreground,
      fontSize: 12,
    },
  });

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <View style={styles.container}>
        <Icon size={16} color={theme.foreground} strokeWidth={1.75} />
        <Body style={styles.label}>{action.label}</Body>
      </View>
    </TouchableOpacity>
  );
}


