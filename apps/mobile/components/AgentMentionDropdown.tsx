import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useTheme } from '@/hooks/useThemeColor';

interface Agent {
  agent_id: string;
  name: string;
  description?: string;
  icon_name?: string;
  icon_color?: string;
  icon_background?: string;
}

interface AgentMentionDropdownProps {
  visible: boolean;
  agents: Agent[];
  highlightIndex: number;
  onAgentSelect: (agent: Agent) => void;
  onClose: () => void;
}

export const AgentMentionDropdown: React.FC<AgentMentionDropdownProps> = ({
  visible,
  agents,
  highlightIndex,
  onAgentSelect,
  onClose,
}) => {
  const theme = useTheme();

  if (!visible || agents.length === 0) {
    return null;
  }

  const renderAgentIcon = (agent: Agent) => {
    const firstLetter = (agent.name || 'A').slice(0, 1).toUpperCase();
    return (
      <View style={[styles.agentIcon, { backgroundColor: agent.icon_background || '#3b82f6' }]}>
        <Text style={[styles.agentIconText, { color: agent.icon_color || '#ffffff' }]}>
          {firstLetter}
        </Text>
      </View>
    );
  };

  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      bottom: 60, // Position above the input
      left: 8,
      right: 8,
      zIndex: 50,
    },
    dropdown: {
      backgroundColor: theme.background,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8,
      padding: 8,
      maxHeight: 200,
    },
    agentItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: 12,
      marginVertical: 2,
    },
    agentItemHighlighted: {
      backgroundColor: theme.mutedWithOpacity(0.1),
    },
    agentIcon: {
      width: 28,
      height: 28,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    agentIconText: {
      fontSize: 11,
      fontWeight: '600',
    },
    agentInfo: {
      flex: 1,
      minWidth: 0,
    },
    agentName: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.foreground,
      marginBottom: 2,
    },
    agentDescription: {
      fontSize: 12,
      color: theme.mutedForeground,
    },
    emptyState: {
      padding: 16,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 14,
      color: theme.mutedForeground,
      textAlign: 'center',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.dropdown}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {agents.map((agent, index) => (
            <TouchableOpacity
              key={agent.agent_id || agent.name || index}
              style={[
                styles.agentItem,
                index === highlightIndex && styles.agentItemHighlighted,
              ]}
              onPress={() => onAgentSelect(agent)}
              activeOpacity={0.7}
            >
              {renderAgentIcon(agent)}
              <View style={styles.agentInfo}>
                <Text style={styles.agentName} numberOfLines={1}>
                  {agent.name}
                </Text>
                {agent.description && (
                  <Text style={styles.agentDescription} numberOfLines={1}>
                    {agent.description}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};
