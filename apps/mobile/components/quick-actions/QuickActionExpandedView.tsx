import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Body } from '@/components/Typography';
import { useTheme } from '@/hooks/useThemeColor';
import { getQuickActionOptions } from './quickActionViews';
import type { QuickActionOption } from './types';

export function QuickActionExpandedView({ actionId, actionLabel, onBack, onSelectOption, selectedOptionId }: {
  actionId: string;
  actionLabel: string;
  onBack: () => void;
  onSelectOption: (optionId: string) => void;
  selectedOptionId?: string | null;
}) {
  const theme = useTheme();
  const options: QuickActionOption[] = getQuickActionOptions(actionId);

  const styles = StyleSheet.create({
    container: {
      marginBottom: 0,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      paddingHorizontal: 16,
    },
    headerText: {
      color: theme.foreground,
      fontSize: 13,
    },
    optionsRow: {
      paddingHorizontal: 16,
      flexDirection: 'row',
    },
    option: {
      height: 36,
      borderRadius: 10,
      paddingHorizontal: 12,
      marginRight: 10,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.mutedWithOpacity(0.06),
      justifyContent: 'center',
      alignItems: 'center',
    },
    optionSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.mutedWithOpacity(0.12),
    },
    optionText: {
      color: theme.foreground,
      fontSize: 12,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Body style={styles.headerText}>Choose {actionLabel} style</Body>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionsRow}>
        {options.map((opt) => (
          <View
            key={opt.id}
            style={[styles.option, selectedOptionId === opt.id && styles.optionSelected]}
            onTouchEnd={() => onSelectOption(opt.id)}
          >
            <Body style={styles.optionText}>{opt.label}</Body>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}


