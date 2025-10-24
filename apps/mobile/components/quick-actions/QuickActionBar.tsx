import React, { useMemo, useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useThemeColor';
import { QUICK_ACTIONS } from './quickActions';
import type { QuickAction } from './types';
import { QuickActionCard } from './QuickActionCard';
import { QuickActionExpandedView } from './QuickActionExpandedView';
import { useUIStore } from '@/stores/ui-store';
import { getQuickActionOptions } from './quickActionViews';

export function QuickActionBar() {
  const theme = useTheme();
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const addSelectedQuickAction = useUIStore((s) => s.addSelectedQuickAction);

  const actions: QuickAction[] = QUICK_ACTIONS;

  const enhancedActions = useMemo(() => actions.map((a) => ({
    ...a,
    onPress: () => {
      setSelectedOptionId(null);
      setSelectedActionId(prev => prev === a.id ? null : a.id);
    },
    isSelected: selectedActionId === a.id,
  })), [actions, selectedActionId]);

  const styles = StyleSheet.create({
    container: {
      marginBottom: 2,
    },
    row: {
      paddingHorizontal: 16,
      flexDirection: 'row',
    },
    fixedArea: {
      minHeight: 72,
      justifyContent: 'flex-end',
      backgroundColor: 'transparent',
    },
  });

  if (selectedActionId) {
    const label = actions.find(a => a.id === selectedActionId)?.label || '';
    return (
      <View style={styles.container}>
        <View style={styles.fixedArea}>
          <QuickActionExpandedView
            actionId={selectedActionId}
            actionLabel={label}
            onBack={() => setSelectedActionId(null)}
            onSelectOption={(optId) => {
              setSelectedOptionId(optId);
              const opt = getQuickActionOptions(selectedActionId).find(o => o.id === optId);
              if (opt) {
                addSelectedQuickAction({ actionId: selectedActionId, optionId: optId, actionLabel: label, optionLabel: opt.label });
              }
              setSelectedActionId(null); // collapse back to bar
            }}
            selectedOptionId={selectedOptionId}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.fixedArea}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
        >
          {enhancedActions.map((a) => (
            <QuickActionCard key={a.id} action={a} onPress={(a as any).onPress} isSelected={(a as any).isSelected} />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}


