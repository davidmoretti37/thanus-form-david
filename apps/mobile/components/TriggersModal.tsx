import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Switch, Alert, ActivityIndicator, RefreshControl, TextInput } from 'react-native';
import { useTheme } from '@/hooks/useThemeColor';
import { X, Zap, Clock, Calendar, MessageSquare, Plus, Edit3, Trash2, Repeat, Github, Slack, Webhook, Hash, Sparkles, Globe, ChevronDown, ChevronRight } from 'lucide-react-native';
import { triggersService, TriggerConfiguration, TriggerProvider, CreateTriggerRequest } from '@/services/triggersService';
import { useSelectedProject } from '@/stores/ui-store';

interface TriggerItemProps {
  trigger: TriggerConfiguration;
  onToggle: (triggerId: string, isActive: boolean) => void;
  onEdit: (trigger: TriggerConfiguration) => void;
  onDelete: (trigger: TriggerConfiguration) => void;
}

const TriggerItem: React.FC<TriggerItemProps> = ({ trigger, onToggle, onEdit, onDelete }) => {
  const theme = useTheme();

  const getIcon = () => {
    const iconName = triggersService.getTriggerIcon(trigger.trigger_type);
    const iconSize = 20;
    const iconColor = triggersService.getTriggerTypeColor(trigger.trigger_type);

    switch (iconName) {
      case 'repeat':
        return <Repeat size={iconSize} color={iconColor} />;
      case 'message-square':
        return <MessageSquare size={iconSize} color={iconColor} />;
      case 'github':
        return <Github size={iconSize} color={iconColor} />;
      case 'slack':
        return <Slack size={iconSize} color={iconColor} />;
      case 'webhook':
        return <Webhook size={iconSize} color={iconColor} />;
      case 'hash':
        return <Hash size={iconSize} color={iconColor} />;
      case 'sparkles':
        return <Sparkles size={iconSize} color={iconColor} />;
      default:
        return <Globe size={iconSize} color={iconColor} />;
    }
  };

  const getTypeColor = () => {
    return triggersService.getTriggerTypeColor(trigger.trigger_type);
  };

  const getScheduleDescription = () => {
    return triggersService.formatScheduleDescription(trigger.config);
  };

  const styles = StyleSheet.create({
    itemContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderRadius: 10,
      padding: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: theme.border,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 8,
      backgroundColor: getTypeColor() + '20',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    textContainer: {
      flex: 1,
    },
    name: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.foreground,
    },
    description: {
      fontSize: 12,
      color: theme.mutedForeground,
      marginTop: 2,
    },
    scheduleInfo: {
      fontSize: 11,
      color: theme.mutedForeground,
      marginTop: 4,
    },
    typeBadge: {
      backgroundColor: getTypeColor() + '20',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      alignSelf: 'flex-start',
      marginTop: 4,
    },
    typeText: {
      fontSize: 10,
      color: getTypeColor(),
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    actionButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    actionButton: {
      padding: 8,
      borderRadius: 6,
      backgroundColor: theme.mutedWithOpacity(0.1),
    },
    toggleContainer: {
      marginLeft: 10,
    },
  });

  return (
    <View style={styles.itemContainer}>
      <View style={styles.iconContainer}>
        {getIcon()}
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.name}>{trigger.name}</Text>
        <Text style={styles.description}>{trigger.description || 'No description'}</Text>
        <Text style={styles.scheduleInfo}>
          {trigger.trigger_type === 'schedule' ? getScheduleDescription() : `Updated: ${triggersService.formatDate(trigger.updated_at)}`}
        </Text>
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{trigger.trigger_type}</Text>
        </View>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => onEdit(trigger)}
        >
          <Edit3 size={16} color={theme.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => onDelete(trigger)}
        >
          <Trash2 size={16} color={theme.destructive} />
        </TouchableOpacity>
      </View>
      <View style={styles.toggleContainer}>
        <Switch
          trackColor={{ false: theme.muted, true: getTypeColor() }}
          thumbColor={trigger.is_active ? theme.background : theme.foreground}
          value={trigger.is_active}
          onValueChange={(value) => onToggle(trigger.trigger_id, value)}
        />
      </View>
    </View>
  );
};

interface TriggersModalProps {
  visible: boolean;
  onClose: () => void;
}

export const TriggersModal: React.FC<TriggersModalProps> = ({ visible, onClose }) => {
  const theme = useTheme();
  const selectedProject = useSelectedProject();
  const [triggers, setTriggers] = useState<TriggerConfiguration[]>([]);
  const [providers, setProviders] = useState<TriggerProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateTrigger, setShowCreateTrigger] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<TriggerProvider | null>(null);
  const [editingTrigger, setEditingTrigger] = useState<TriggerConfiguration | null>(null);

  // Load triggers and providers on modal open
  useEffect(() => {
    if (visible && selectedProject?.id) {
      loadTriggers();
      loadProviders();
    }
  }, [visible, selectedProject?.id]);

  const loadTriggers = async () => {
    if (!selectedProject?.id) return;
    
    try {
      setLoading(true);
      const triggersData = await triggersService.getAgentTriggers(selectedProject.id);
      setTriggers(triggersData);
    } catch (error) {
      console.error('Error loading triggers:', error);
      Alert.alert('Error', 'Failed to load triggers');
    } finally {
      setLoading(false);
    }
  };

  const loadProviders = async () => {
    try {
      const providersData = await triggersService.getProviders();
      setProviders(providersData);
    } catch (error) {
      console.error('Error loading providers:', error);
      Alert.alert('Error', 'Failed to load trigger providers');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTriggers();
    setRefreshing(false);
  };

  const handleToggle = async (triggerId: string, isActive: boolean) => {
    try {
      setLoading(true);
      const updatedTrigger = await triggersService.toggleTrigger(triggerId, isActive);
      setTriggers(prev => prev.map(t => t.trigger_id === triggerId ? updatedTrigger : t));
    } catch (error) {
      console.error('Error toggling trigger:', error);
      Alert.alert('Error', 'Failed to toggle trigger');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (trigger: TriggerConfiguration) => {
    const provider = providers.find(p => p.provider_id === trigger.provider_id);
    if (provider) {
      setSelectedProvider(provider);
      setEditingTrigger(trigger);
      setShowCreateTrigger(true);
    } else {
      Alert.alert('Error', 'Provider not found for this trigger');
    }
  };

  const handleDelete = (trigger: TriggerConfiguration) => {
    Alert.alert(
      'Delete Trigger',
      `Are you sure you want to delete "${trigger.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await triggersService.deleteTrigger(trigger.trigger_id);
              setTriggers(prev => prev.filter(t => t.trigger_id !== trigger.trigger_id));
              Alert.alert('Success', 'Trigger deleted successfully');
            } catch (error) {
              console.error('Error deleting trigger:', error);
              Alert.alert('Error', 'Failed to delete trigger');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCreateTrigger = () => {
    if (providers.length === 0) {
      Alert.alert('No Providers', 'No trigger providers available');
      return;
    }
    
    setEditingTrigger(null);
    setSelectedProvider(null);
    setShowCreateTrigger(true);
  };

  const handleProviderSelect = (provider: TriggerProvider) => {
    setSelectedProvider(provider);
  };

  const handleSaveTrigger = async (triggerData: CreateTriggerRequest) => {
    if (!selectedProject?.id) return;

    try {
      setLoading(true);
      
      if (editingTrigger) {
        // Update existing trigger
        const updatedTrigger = await triggersService.updateTrigger(editingTrigger.trigger_id, triggerData);
        setTriggers(prev => prev.map(t => t.trigger_id === editingTrigger.trigger_id ? updatedTrigger : t));
        Alert.alert('Success', 'Trigger updated successfully');
      } else {
        // Create new trigger
        const newTrigger = await triggersService.createTrigger(selectedProject.id, triggerData);
        setTriggers(prev => [newTrigger, ...prev]);
        Alert.alert('Success', 'Trigger created successfully');
      }
      
      setShowCreateTrigger(false);
      setSelectedProvider(null);
      setEditingTrigger(null);
    } catch (error) {
      console.error('Error saving trigger:', error);
      Alert.alert('Error', 'Failed to save trigger');
    } finally {
      setLoading(false);
    }
  };

  const activeTriggersCount = triggers.filter(trigger => trigger.is_active).length;

  const styles = StyleSheet.create({
    centeredView: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalView: {
      width: '95%',
      height: '85%',
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
      paddingRight: 8,
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
    triggersEnabledText: {
      fontSize: 14,
      color: theme.mutedForeground,
      marginBottom: 15,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.primary,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 10,
      marginBottom: 15,
    },
    addButtonText: {
      color: theme.background,
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 8,
    },
    scrollViewContent: {
      paddingBottom: 20,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyStateText: {
      fontSize: 16,
      color: theme.mutedForeground,
      textAlign: 'center',
      marginTop: 16,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
    loadingText: {
      fontSize: 14,
      color: theme.mutedForeground,
      marginTop: 10,
    },
    createTriggerContainer: {
      backgroundColor: theme.card,
      borderRadius: 10,
      padding: 16,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: theme.border,
    },
    createTriggerTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.foreground,
      marginBottom: 15,
    },
    providerGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 15,
    },
    providerButton: {
      flex: 1,
      minWidth: '45%',
      backgroundColor: theme.background,
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
    },
    selectedProviderButton: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + '10',
    },
    providerIcon: {
      marginBottom: 8,
    },
    providerName: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.foreground,
      textAlign: 'center',
    },
    providerDescription: {
      fontSize: 10,
      color: theme.mutedForeground,
      textAlign: 'center',
      marginTop: 2,
    },
    createTriggerButtons: {
      flexDirection: 'row',
      gap: 10,
    },
    createButton: {
      flex: 1,
      backgroundColor: theme.primary,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
    },
    createButtonText: {
      color: theme.background,
      fontWeight: '600',
    },
    cancelButton: {
      flex: 1,
      backgroundColor: theme.muted,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
    },
    cancelButtonText: {
      color: theme.foreground,
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
                <Zap size={16} color={theme.primary} />
              </View>
              <Text style={styles.headerText}>Triggers</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color={theme.mutedForeground} />
            </TouchableOpacity>
          </View>

          <View style={styles.titleContainer}>
            <Text style={styles.title}>Automation Triggers</Text>
            <Text style={styles.subtitle}>Set up automated triggers for your agent</Text>
          </View>

          <Text style={styles.triggersEnabledText}>{activeTriggersCount} / {triggers.length} triggers active</Text>

          <TouchableOpacity style={styles.addButton} onPress={handleCreateTrigger}>
            <Plus size={16} color={theme.background} />
            <Text style={styles.addButtonText}>Create New Trigger</Text>
          </TouchableOpacity>

          {showCreateTrigger && (
            <View style={styles.createTriggerContainer}>
              <Text style={styles.createTriggerTitle}>
                {editingTrigger ? 'Edit Trigger' : 'Create New Trigger'}
              </Text>
              
              {!selectedProvider ? (
                <View>
                  <Text style={{ fontSize: 14, color: theme.foreground, marginBottom: 10 }}>
                    Select a trigger provider:
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.providerGrid}>
                      {providers.map(provider => (
                        <TouchableOpacity
                          key={provider.provider_id}
                          style={styles.providerButton}
                          onPress={() => handleProviderSelect(provider)}
                        >
                          <View style={styles.providerIcon}>
                            {(() => {
                              const iconName = triggersService.getTriggerIcon(provider.trigger_type);
                              const iconColor = triggersService.getTriggerTypeColor(provider.trigger_type);
                              const iconSize = 24;
                              
                              switch (iconName) {
                                case 'repeat':
                                  return <Repeat size={iconSize} color={iconColor} />;
                                case 'message-square':
                                  return <MessageSquare size={iconSize} color={iconColor} />;
                                case 'github':
                                  return <Github size={iconSize} color={iconColor} />;
                                case 'slack':
                                  return <Slack size={iconSize} color={iconColor} />;
                                case 'webhook':
                                  return <Webhook size={iconSize} color={iconColor} />;
                                case 'hash':
                                  return <Hash size={iconSize} color={iconColor} />;
                                case 'sparkles':
                                  return <Sparkles size={iconSize} color={iconColor} />;
                                default:
                                  return <Globe size={iconSize} color={iconColor} />;
                              }
                            })()}
                          </View>
                          <Text style={styles.providerName}>{provider.name}</Text>
                          <Text style={styles.providerDescription}>{provider.description}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              ) : (
                <View>
                  <Text style={{ fontSize: 14, color: theme.foreground, marginBottom: 10 }}>
                    Selected: {selectedProvider.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.mutedForeground, marginBottom: 15 }}>
                    {selectedProvider.description}
                  </Text>
                  
                  <View style={{ 
                    backgroundColor: theme.mutedWithOpacity(0.1), 
                    padding: 12, 
                    borderRadius: 8, 
                    marginBottom: 15 
                  }}>
                    <Text style={{ 
                      fontSize: 12, 
                      color: theme.mutedForeground, 
                      textAlign: 'center' 
                    }}>
                      Trigger configuration is not yet implemented in the mobile app. Please use the web interface to configure triggers.
                    </Text>
                  </View>
                  
                  <TouchableOpacity 
                    style={[styles.createButton, { marginBottom: 10 }]}
                    onPress={() => {
                      Alert.alert(
                        'Trigger Configuration',
                        'Trigger configuration is not yet implemented in the mobile app. Please use the web interface to configure triggers.',
                        [
                          { text: 'Cancel', onPress: () => setShowCreateTrigger(false) },
                          { text: 'Open Web', onPress: () => {
                            // Could open web interface here
                            setShowCreateTrigger(false);
                          }}
                        ]
                      );
                    }}
                  >
                    <Text style={styles.createButtonText}>Configure Trigger</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              <View style={styles.createTriggerButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowCreateTrigger(false);
                    setSelectedProvider(null);
                    setEditingTrigger(null);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <ScrollView 
            contentContainerStyle={styles.scrollViewContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={theme.primary}
              />
            }
          >
            {loading && triggers.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={styles.loadingText}>Loading triggers...</Text>
              </View>
            ) : triggers.length === 0 ? (
              <View style={styles.emptyState}>
                <Zap size={48} color={theme.mutedForeground} />
                <Text style={styles.emptyStateText}>No triggers configured yet</Text>
                <Text style={[styles.emptyStateText, { marginTop: 8, fontSize: 14 }]}>
                  Create triggers to automate your agent's actions
                </Text>
              </View>
            ) : (
              triggers.map(trigger => (
                <TriggerItem
                  key={trigger.trigger_id}
                  trigger={trigger}
                  onToggle={handleToggle}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};