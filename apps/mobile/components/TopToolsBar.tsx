import { useTheme } from '@/hooks/useThemeColor';
import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Globe, Wrench, FileText, BookOpen, Zap } from 'lucide-react-native';
import { Body } from './Typography';

interface TopToolsBarProps {
  onAgentPress?: () => void;
  agentName?: string;
}

export const TopToolsBar: React.FC<TopToolsBarProps> = ({ onAgentPress, agentName = 'Tars' }) => {
  const theme = useTheme();

  const styles = StyleSheet.create({
    container: {
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.background,
      paddingVertical: 6,
    },
    content: {
      paddingHorizontal: 12,
      gap: 8,
      alignItems: 'center',
    },
    tab: {
      width: 64,
      height: 40,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.mutedWithOpacity(0.08),
      borderWidth: 1,
      borderColor: theme.border,
    },
    agentButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      height: 40,
      paddingHorizontal: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.mutedWithOpacity(0.08),
    },
    agentText: {
      color: theme.foreground,
      fontSize: 10,
      fontWeight: '500',
    },
  });

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <TouchableOpacity style={styles.tab} onPress={() => console.log('Integrations')} activeOpacity={0.7}>
          <Globe size={18} color={theme.foreground} strokeWidth={1.5} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => console.log('Tools')} activeOpacity={0.7}>
          <Wrench size={18} color={theme.foreground} strokeWidth={1.5} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => console.log('Instructions')} activeOpacity={0.7}>
          <FileText size={18} color={theme.foreground} strokeWidth={1.5} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => console.log('Knowledge')} activeOpacity={0.7}>
          <BookOpen size={18} color={theme.foreground} strokeWidth={1.5} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => console.log('Triggers')} activeOpacity={0.7}>
          <Zap size={18} color={theme.foreground} strokeWidth={1.5} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.agentButton} onPress={onAgentPress} activeOpacity={0.8}>
          <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: theme.primary, opacity: 0.8 }} />
          <Body style={styles.agentText}>{agentName}</Body>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};


