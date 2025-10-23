import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useTheme } from '@/hooks/useThemeColor';
import { X, Brain, Save } from 'lucide-react-native';
import { agentService } from '@/services/agentService';

interface InstructionsModalProps {
  visible: boolean;
  onClose: () => void;
  selectedAgent?: {
    id: string;
    name: string;
  } | null;
}

export const InstructionsModal: React.FC<InstructionsModalProps> = ({ visible, onClose, selectedAgent }) => {
  const theme = useTheme();
  const [instructions, setInstructions] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load agent instructions when modal opens
  useEffect(() => {
    if (visible && selectedAgent) {
      loadAgentInstructions();
    }
  }, [visible, selectedAgent]);

  const loadAgentInstructions = async () => {
    if (!selectedAgent) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const agent = await agentService.getAgent(selectedAgent.id);
      setInstructions(agent.system_prompt || agent.instructions || 'No instructions available for this agent.');
    } catch (err) {
      console.error('Error loading agent instructions:', err);
      setError('Failed to load agent instructions');
      setInstructions('Error loading instructions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedAgent) return;
    
    try {
      setIsLoading(true);
      await agentService.updateAgent(selectedAgent.id, {
        system_prompt: instructions
      });
      Alert.alert('Success', 'Instructions updated successfully!');
    } catch (err) {
      console.error('Error saving instructions:', err);
      Alert.alert('Error', 'Failed to save instructions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const styles = StyleSheet.create({
    centeredView: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalView: {
      width: '90%',
      height: '80%',
      backgroundColor: theme.background,
      borderRadius: 20,
      padding: 20,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
      paddingRight: 8, // Add padding to match IntegrationsModal close button spacing
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerIcon: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: theme.primary + '20',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    headerText: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.foreground,
    },
    closeButton: {
      padding: 8,
      borderRadius: 16,
      backgroundColor: theme.mutedWithOpacity(0.1),
    },
    titleContainer: {
      marginBottom: 20,
    },
    title: {
      fontSize: 22,
      fontWeight: 'bold',
      color: theme.foreground,
    },
    subtitle: {
      fontSize: 14,
      color: theme.mutedForeground,
      marginTop: 5,
    },
    textAreaContainer: {
      flex: 1,
      marginBottom: 20,
    },
    textArea: {
      flex: 1,
      backgroundColor: theme.card,
      borderRadius: 10,
      padding: 15,
      borderWidth: 1,
      borderColor: theme.border,
      color: theme.foreground,
      fontSize: 14,
      textAlignVertical: 'top',
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      borderTopWidth: 1,
      borderTopColor: theme.border,
      paddingTop: 15,
    },
    cancelButton: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 10,
      marginRight: 10,
    },
    cancelButtonText: {
      color: theme.foreground,
      fontSize: 16,
      fontWeight: '600',
    },
    saveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 10,
      backgroundColor: theme.primary,
    },
    saveButtonText: {
      color: theme.background,
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
    },
    loadingText: {
      marginTop: 10,
      fontSize: 14,
      color: theme.mutedForeground,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 20,
    },
    errorText: {
      fontSize: 14,
      color: theme.destructive,
      textAlign: 'center',
      marginBottom: 15,
    },
    retryButton: {
      backgroundColor: theme.primary,
      paddingHorizontal: 15,
      paddingVertical: 8,
      borderRadius: 6,
    },
    retryButtonText: {
      color: theme.background,
      fontSize: 14,
      fontWeight: '600',
    },
  });

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <Brain size={16} color={theme.primary} />
              </View>
              <Text style={styles.headerText}>Instructions</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color={theme.mutedForeground} />
            </TouchableOpacity>
          </View>

          <View style={styles.titleContainer}>
            <Text style={styles.title}>System Prompt</Text>
            <Text style={styles.subtitle}>
              {selectedAgent ? `Instructions for ${selectedAgent.name}` : 'Define how your agent should behave and respond'}
            </Text>
          </View>

          <View style={styles.textAreaContainer}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={styles.loadingText}>Loading instructions...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={loadAgentInstructions} style={styles.retryButton}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TextInput
                style={styles.textArea}
                placeholder="Enter your agent's instructions..."
                placeholderTextColor={theme.mutedForeground}
                value={instructions}
                onChangeText={setInstructions}
                multiline
                textAlignVertical="top"
              />
            )}
          </View>

          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.saveButton, isLoading && styles.saveButtonDisabled]} 
              onPress={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={theme.background} />
              ) : (
                <Save size={16} color={theme.background} />
              )}
              <Text style={styles.saveButtonText}>
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
