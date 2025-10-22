import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { useTheme } from '@/hooks/useThemeColor';
import { useAgents } from '@/hooks/useAgents';
import { AgentMentionDropdown } from './AgentMentionDropdown';
import { Plus } from 'lucide-react-native';

interface Agent {
  agent_id: string;
  name: string;
  description?: string;
  icon_name?: string;
  icon_color?: string;
  icon_background?: string;
}

interface AgentMentionInputProps {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: (message: string, selectedAgent?: Agent) => void;
  disabled?: boolean;
}

export const AgentMentionInput: React.FC<AgentMentionInputProps> = ({
  placeholder = 'Use @ to call an agent...',
  value,
  onChangeText,
  onSubmit,
  disabled = false,
}) => {
  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);
  
  // Agent mention state
  const [mentionActive, setMentionActive] = useState(false);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [mentionQuery, setMentionQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  // Fetch agents
  const { data: agentsResponse, isLoading } = useAgents({ 
    limit: 100, 
    sort_by: 'name', 
    sort_order: 'asc' 
  });
  const agents = agentsResponse?.agents || [];

  // Filter agents based on mention query
  const filteredAgents = useMemo(() => {
    const q = mentionQuery.trim().toLowerCase();
    if (!mentionActive) return [];
    if (!q) return agents.slice(0, 8);
    return agents.filter((a: Agent) => 
      a.name?.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [agents, mentionActive, mentionQuery]);

  // Handle text change with mention detection
  const handleTextChange = (text: string) => {
    if (mentionActive && mentionStart !== null) {
      if (text.length <= mentionStart || text[mentionStart] !== '@') {
        // Mention was deleted or @ was removed
        setMentionActive(false);
        setMentionQuery('');
        setSelectedAgent(null);
      } else {
        const sub = text.slice(mentionStart + 1);
        if (/\s/.test(sub)) {
          // Space detected, end mention
          setMentionActive(false);
          setMentionQuery('');
          setSelectedAgent(null);
        } else {
          // Update mention query
          setMentionQuery(sub);
          setHighlightIndex(0);
        }
      }
    }
    onChangeText(text);
  };

  // Handle agent selection
  const handleSelectAgent = (agent: Agent) => {
    if (mentionStart !== null) {
      const beforeMention = value.slice(0, mentionStart);
      const afterMention = value.slice(mentionStart + mentionQuery.length + 1);
      const newText = `${beforeMention}@${agent.name} ${afterMention}`;
      
      setSelectedAgent(agent);
      setMentionActive(false);
      setMentionQuery('');
      onChangeText(newText);
      
      // Focus back to input
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  // Handle submit
  const handleSubmit = () => {
    if (value.trim() && !disabled) {
      onSubmit(value.trim(), selectedAgent || undefined);
      setSelectedAgent(null);
    }
  };

  // Handle keyboard events
  const handleKeyPress = (event: any) => {
    if (mentionActive) {
      if (event.nativeEvent.key === 'ArrowDown') {
        event.preventDefault();
        setHighlightIndex(prev => 
          prev < filteredAgents.length - 1 ? prev + 1 : 0
        );
      } else if (event.nativeEvent.key === 'ArrowUp') {
        event.preventDefault();
        setHighlightIndex(prev => 
          prev > 0 ? prev - 1 : filteredAgents.length - 1
        );
      } else if (event.nativeEvent.key === 'Enter' || event.nativeEvent.key === ' ') {
        if (filteredAgents.length > 0) {
          event.preventDefault();
          handleSelectAgent(filteredAgents[highlightIndex]);
        }
      } else if (event.nativeEvent.key === 'Escape') {
        setMentionActive(false);
        setMentionQuery('');
      }
    } else if (event.nativeEvent.key === '@' && !selectedAgent) {
      // Start mention
      setMentionActive(true);
      setMentionStart(value.length);
      setMentionQuery('');
      setHighlightIndex(0);
    } else if (event.nativeEvent.key === 'Backspace' && selectedAgent && value.trim().length === 0) {
      // Clear selected agent if input is empty and backspace is pressed
      setSelectedAgent(null);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.mutedWithOpacity(0.1),
      borderRadius: 25,
      paddingHorizontal: 15,
      paddingVertical: 10,
      marginHorizontal: 12,
      marginVertical: 10,
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: theme.foreground,
      paddingVertical: 0,
      paddingHorizontal: 0,
      maxHeight: 100,
    },
    submitButton: {
      marginLeft: 8,
      padding: 8,
      borderRadius: 20,
      backgroundColor: '#6b7280',
      alignItems: 'center',
      justifyContent: 'center',
    },
    selectedAgentChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.primary,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      marginRight: 8,
    },
    selectedAgentText: {
      color: theme.primaryForeground,
      fontSize: 12,
      fontWeight: '500',
    },
  });

  return (
    <View style={{ position: 'relative' }}>
      <View style={styles.container}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={value}
          onChangeText={handleTextChange}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          placeholderTextColor={theme.mutedForeground}
          multiline
          editable={!disabled}
          returnKeyType="send"
          onSubmitEditing={handleSubmit}
        />
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={disabled || !value.trim()}
        >
          <Plus size={16} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Agent Mention Dropdown */}
      <AgentMentionDropdown
        visible={mentionActive && filteredAgents.length > 0}
        agents={filteredAgents}
        highlightIndex={highlightIndex}
        onAgentSelect={handleSelectAgent}
        onClose={() => setMentionActive(false)}
      />
    </View>
  );
};
