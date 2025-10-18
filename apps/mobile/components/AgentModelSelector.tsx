import { getAgents, getModels, Agent, Model } from '@/api/chat-api';
import { useTheme } from '@/hooks/useThemeColor';
import { ChevronDown } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Body, H6 } from './Typography';

interface AgentModelSelectorProps {
  visible: boolean;
  onClose: () => void;
  selectedAgentId?: string;
  selectedModelName?: string;
  onAgentSelect: (agent: Agent) => void;
  onModelSelect: (model: Model) => void;
}

export const AgentModelSelector: React.FC<AgentModelSelectorProps> = ({
  visible,
  onClose,
  selectedAgentId,
  selectedModelName,
  onAgentSelect,
  onModelSelect,
}) => {
  const theme = useTheme();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      loadAgentsAndModels();
    }
  }, [visible]);

  const loadAgentsAndModels = async () => {
    try {
      setLoading(true);
      const [agentsData, modelsData] = await Promise.all([getAgents(), getModels()]);
      setAgents(agentsData);
      setModels(modelsData);
    } catch (error) {
      console.error('[AgentModelSelector] Error loading:', error);
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    modal: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      backgroundColor: theme.background,
      borderRadius: 16,
      width: '85%',
      maxHeight: '75%',
      borderColor: theme.border,
      borderWidth: 1,
      overflow: 'hidden',
    },
    header: {
      padding: 16,
      borderBottomColor: theme.border,
      borderBottomWidth: 1,
      flexDirection: 'row' as const,
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    section: {
      padding: 16,
      borderBottomColor: theme.border,
      borderBottomWidth: 1,
    },
    sectionTitle: {
      color: theme.mutedForeground,
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 12,
      textTransform: 'uppercase' as const,
    },
    item: {
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 8,
      marginBottom: 8,
      backgroundColor: theme.mutedWithOpacity(0.05),
      flexDirection: 'row' as const,
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    selectedItem: {
      backgroundColor: theme.primaryWithOpacity(0.1),
      borderColor: theme.primary,
      borderWidth: 1,
    },
    itemText: {
      flex: 1,
      color: theme.foreground,
      fontSize: 14,
    },
    itemSubtext: {
      color: theme.mutedForeground,
      fontSize: 12,
      marginTop: 4,
    },
    loadingContainer: {
      padding: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modal}>
        <View style={styles.content}>
          <View style={styles.header}>
            <H6 style={{ color: theme.foreground }}>Select Agent & Model</H6>
            <TouchableOpacity onPress={onClose}>
              <Body style={{ color: theme.mutedForeground, fontSize: 16 }}>✕</Body>
            </TouchableOpacity>
          </View>

          <ScrollView>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
              </View>
            ) : (
              <>
                {/* Agents Section */}
                <View style={styles.section}>
                  <Body style={styles.sectionTitle}>Agents</Body>
                  {agents.map((agent) => (
                    <TouchableOpacity
                      key={agent.agent_id}
                      style={[styles.item, selectedAgentId === agent.agent_id && styles.selectedItem]}
                      onPress={() => {
                        onAgentSelect(agent);
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Body style={styles.itemText}>{agent.name}</Body>
                        {agent.description && <Body style={styles.itemSubtext}>{agent.description}</Body>}
                      </View>
                      {selectedAgentId === agent.agent_id && (
                        <Body style={{ color: theme.primary, fontWeight: '600' }}>✓</Body>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Models Section */}
                <View style={styles.section}>
                  <Body style={styles.sectionTitle}>Models</Body>
                  {models.map((model) => (
                    <TouchableOpacity
                      key={model.name}
                      style={[styles.item, selectedModelName === model.name && styles.selectedItem]}
                      onPress={() => {
                        onModelSelect(model);
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Body style={styles.itemText}>{model.display_name}</Body>
                        <Body style={styles.itemSubtext}>{model.provider}</Body>
                      </View>
                      {selectedModelName === model.name && (
                        <Body style={{ color: theme.primary, fontWeight: '600' }}>✓</Body>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
