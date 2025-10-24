import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { useTheme } from '@/hooks/useThemeColor';
import { X, Search, Bot, Zap, Brain, Code, MessageSquare, FileText, Globe, Settings } from 'lucide-react-native';
import { agentService, Agent } from '@/services/agentService';


interface AgentSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onAgentSelect: (agent: Agent) => void;
  selectedAgentId?: string;
}

// Fallback mock agent data - used only if API fails
const mockAgents: Agent[] = [
  {
    agent_id: '1',
    name: 'Tars',
    description: 'Your AI assistant for general tasks and conversations',
    icon_name: 'bot',
    icon_color: '#3B82F6',
    icon_background: '#EFF6FF',
    is_default: true,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    agent_id: '2',
    name: 'Code Assistant',
    description: 'Specialized in programming, debugging, and code review',
    icon_name: 'code',
    icon_color: '#10B981',
    icon_background: '#ECFDF5',
    created_at: '2024-01-02T00:00:00Z',
  },
  {
    agent_id: '3',
    name: 'Content Writer',
    description: 'Expert in creating engaging content, articles, and copy',
    icon_name: 'file-text',
    icon_color: '#F59E0B',
    icon_background: '#FFFBEB',
    created_at: '2024-01-03T00:00:00Z',
  },
  {
    agent_id: '4',
    name: 'Data Analyst',
    description: 'Analyzes data, creates reports, and provides insights',
    icon_name: 'bar-chart',
    icon_color: '#8B5CF6',
    icon_background: '#F3F4F6',
    created_at: '2024-01-04T00:00:00Z',
  },
  {
    agent_id: '5',
    name: 'Web Researcher',
    description: 'Searches the web, gathers information, and summarizes findings',
    icon_name: 'globe',
    icon_color: '#EF4444',
    icon_background: '#FEF2F2',
    created_at: '2024-01-05T00:00:00Z',
  },
  {
    agent_id: '6',
    name: 'Creative Designer',
    description: 'Helps with design ideas, visual concepts, and creative projects',
    icon_name: 'palette',
    icon_color: '#EC4899',
    icon_background: '#FDF2F8',
    created_at: '2024-01-06T00:00:00Z',
  },
];

const getAgentIcon = (iconName?: string) => {
  switch (iconName) {
    case 'bot': return Bot;
    case 'code': return Code;
    case 'file-text': return FileText;
    case 'globe': return Globe;
    case 'settings': return Settings;
    case 'zap': return Zap;
    case 'brain': return Brain;
    case 'message-square': return MessageSquare;
    default: return Bot;
  }
};

export const AgentSelectionModal: React.FC<AgentSelectionModalProps> = ({
  visible,
  onClose,
  onAgentSelect,
  selectedAgentId
}) => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);

  // Filter agents based on search query
  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Load agents from API
  useEffect(() => {
    if (visible) {
      loadAgents();
    }
  }, [visible]);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const response = await agentService.getAgents(1, 50); // Load more agents
      setAgents(response.agents);
    } catch (error) {
      console.error('Error loading agents:', error);
      // Fallback to mock data if API fails
      setAgents(mockAgents);
    } finally {
      setLoading(false);
    }
  };


  const handleAgentSelect = (agent: Agent) => {
    console.log('Agent selected:', agent.name);
    onAgentSelect(agent);
    onClose();
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    container: {
      backgroundColor: theme.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '80%',
      minHeight: '60%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.foreground,
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.mutedWithOpacity(0.1),
      alignItems: 'center',
      justifyContent: 'center',
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.mutedWithOpacity(0.1),
      borderRadius: 12,
      marginHorizontal: 20,
      marginVertical: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: theme.foreground,
      marginLeft: 12,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
    },
    agentCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.border,
      minHeight: 60,
      justifyContent: 'center',
    },
    selectedAgentCard: {
      borderColor: theme.primary,
      borderWidth: 2,
      backgroundColor: theme.primaryWithOpacity(0.05),
    },
    agentName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.foreground,
    },
    agentDescription: {
      fontSize: 14,
      color: theme.mutedForeground,
      lineHeight: 20,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyText: {
      fontSize: 16,
      color: theme.mutedForeground,
      textAlign: 'center',
      marginTop: 16,
    },
  });


  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Select Agent</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={20} color={theme.foreground} />
            </TouchableOpacity>
          </View>


          {/* Search */}
          <View style={styles.searchContainer}>
            <Search size={20} color={theme.mutedForeground} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search agents..."
              placeholderTextColor={theme.mutedForeground}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Content */}
          <ScrollView 
            style={styles.content} 
            showsVerticalScrollIndicator={false}
            pointerEvents="box-none"
          >
            {loading && agents.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.emptyText, { marginTop: 16 }]}>Loading agents...</Text>
              </View>
            ) : loading && agents.length > 0 ? (
              // Show skeleton loading while updating
              <View>
                {filteredAgents.map((agent) => {
                  const IconComponent = getAgentIcon(agent.icon_name);
                  const isSelected = agent.agent_id === selectedAgentId;
                  
                  return (
                    <View
                      key={agent.agent_id}
                      style={[
                        styles.agentCard,
                        isSelected && styles.selectedAgentCard,
                        { opacity: 0.7 }
                      ]}
                    >
                      <View style={[
                        styles.agentIcon,
                        {
                          backgroundColor: agent.icon_background || theme.mutedWithOpacity(0.1),
                        }
                      ]}>
                        <IconComponent 
                          size={24} 
                          color={agent.icon_color || theme.primary} 
                        />
                      </View>
                      
                      <View style={styles.agentInfo}>
                        <Text style={styles.agentName}>{agent.name}</Text>
                        {agent.description && (
                          <Text style={styles.agentDescription}>{agent.description}</Text>
                        )}
                        {agent.is_default && (
                          <View style={styles.defaultBadge}>
                            <Text style={styles.defaultBadgeText}>Default</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={theme.primary} />
                  <Text style={[styles.emptyText, { marginTop: 8, fontSize: 14 }]}>Updating...</Text>
                </View>
              </View>
            ) : filteredAgents.length === 0 ? (
              <View style={styles.emptyState}>
                <Bot size={48} color={theme.mutedForeground} />
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No agents found matching your search' : 'No agents available'}
                </Text>
              </View>
            ) : (
              filteredAgents.map((agent) => {
                const IconComponent = getAgentIcon(agent.icon_name);
                const isSelected = agent.agent_id === selectedAgentId;
                
                return (
                  <TouchableOpacity
                    key={agent.agent_id}
                    style={[
                      styles.agentCard,
                      isSelected && styles.selectedAgentCard
                    ]}
                    onPress={() => {
                      console.log('Agent tapped:', agent.name);
                      handleAgentSelect(agent);
                    }}
                    activeOpacity={0.5}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={[styles.agentName, { fontSize: 18, fontWeight: 'bold' }]}>
                      {agent.name}
                    </Text>
                    <Text style={[styles.agentDescription, { marginTop: 4 }]}>
                      {agent.description || 'No description'}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
