import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { useTheme } from '../hooks/useThemeColor';
import { X, Search, Wrench, MessageCircle, Settings, Star, Globe, Download, User, ArrowRight, Plus } from 'lucide-react-native';
import { WorkerCreationModal } from './WorkerCreationModal';
import { AgentEditModal } from './AgentEditModal';
import { agentService, Agent } from '../services/agentService';
import { useSetSelectedAgent } from '../stores/ui-store';

interface WorkersModalProps {
  visible: boolean;
  onClose: () => void;
  onNavigateToChat?: () => void;
}

// Use the Agent interface from agentService
type Worker = Agent;

export const WorkersModal: React.FC<WorkersModalProps> = ({ visible, onClose, onNavigateToChat }) => {
  const theme = useTheme();
  const setSelectedAgent = useSetSelectedAgent();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'public' | 'my'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [filteredWorkers, setFilteredWorkers] = useState<Worker[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  useEffect(() => {
    if (visible) {
      loadWorkers();
    }
  }, [visible]);

  const loadWorkers = async () => {
    setIsLoading(true);
    try {
      const response = await agentService.getAgents(1, 50); // Load more workers
      setWorkers(response.agents);
      setFilteredWorkers(response.agents);
    } catch (error) {
      console.error('Error loading workers:', error);
      Alert.alert('Error', 'Failed to load workers. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let filtered = workers;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(worker =>
        worker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (worker.description && worker.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply category filter
    switch (selectedFilter) {
      case 'active':
        // All agents are considered active by default
        break;
      case 'public':
        filtered = filtered.filter(worker => worker.is_public);
        break;
      case 'my':
        filtered = filtered.filter(worker => !worker.is_public);
        break;
      default:
        // 'all' - no additional filtering
        break;
    }

    setFilteredWorkers(filtered);
  }, [searchQuery, selectedFilter, workers]);

  const handleChatWithWorker = (worker: Worker) => {
    // Convert Worker (Agent) to the format expected by the chat system
    const agentForChat = {
      agent_id: worker.agent_id,
      name: worker.name,
      description: worker.description,
      system_prompt: worker.system_prompt,
      icon_name: worker.icon_name,
      icon_color: worker.icon_color,
      icon_background: worker.icon_background,
      is_default: worker.is_default,
      is_public: worker.is_public,
      created_at: worker.created_at,
      updated_at: worker.updated_at,
      version_count: worker.version_count,
      current_version_name: worker.current_version_name,
    };

    // Set the selected agent in the global state
    setSelectedAgent(agentForChat);
    
    // Close the workers modal
    onClose();
    
    // Navigate to chat view
    if (onNavigateToChat) {
      onNavigateToChat();
    }
    
    console.log('Selected agent for chat:', worker.name);
  };

  const handleCustomizeWorker = (worker: Worker) => {
    setEditingAgent(worker);
    setShowEditModal(true);
  };

  const handleCreateWorker = () => {
    setShowCreateModal(true);
  };

  const handleWorkerCreated = (newWorker: Agent) => {
    // Add the new worker to the list
    setWorkers(prev => [newWorker, ...prev]);
    setFilteredWorkers(prev => [newWorker, ...prev]);
    setShowCreateModal(false);
  };

  const handleAgentUpdated = (updatedAgent: Agent) => {
    // Update the worker in the list
    setWorkers(prev => prev.map(worker => 
      worker.agent_id === updatedAgent.agent_id ? updatedAgent : worker
    ));
    setFilteredWorkers(prev => prev.map(worker => 
      worker.agent_id === updatedAgent.agent_id ? updatedAgent : worker
    ));
    setShowEditModal(false);
    setSelectedAgent(null);
  };

  const handleAgentDeleted = (agentId: string) => {
    // Remove the worker from the list
    setWorkers(prev => prev.filter(worker => worker.agent_id !== agentId));
    setFilteredWorkers(prev => prev.filter(worker => worker.agent_id !== agentId));
    setShowEditModal(false);
    setSelectedAgent(null);
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return theme.primary;
      case 'building': return '#F59E0B';
      case 'inactive': return theme.mutedForeground;
      default: return theme.mutedForeground;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'building': return 'Building';
      case 'inactive': return 'Inactive';
      default: return 'Unknown';
    }
  };

  const renderWorkerCard = (worker: Worker) => (
    <TouchableOpacity
      key={worker.agent_id}
      style={styles.workerCard}
      onPress={() => handleChatWithWorker(worker)}
      activeOpacity={0.7}
    >
      <View style={styles.workerCardHeader}>
        <View style={[styles.workerIcon, { backgroundColor: worker.icon_background || theme.mutedWithOpacity(0.1) }]}>
          <Wrench size={20} color={worker.icon_color || theme.primary} />
        </View>
        <View style={styles.workerInfo}>
          <View style={styles.workerTitleRow}>
            <Text style={styles.workerName}>{worker.name}</Text>
            {worker.is_default && (
              <View style={styles.defaultBadge}>
                <Star size={12} color={theme.primary} />
                <Text style={styles.defaultText}>Default</Text>
              </View>
            )}
            {worker.is_public && (
              <View style={styles.publicBadge}>
                <Globe size={12} color={theme.foreground} />
                <Text style={styles.publicText}>Public</Text>
              </View>
            )}
          </View>
          <Text style={styles.workerRole}>AI Assistant</Text>
          <Text style={styles.workerDescription} numberOfLines={2}>
            {worker.description || 'AI assistant for various tasks'}
          </Text>
        </View>
        <View style={styles.workerActions}>
          <View style={[styles.statusIndicator, { backgroundColor: theme.primary }]} />
        </View>
      </View>

      <View style={styles.workerCardFooter}>
        <View style={styles.workerStats}>
          <Text style={styles.statText}>Active</Text>
          <Text style={styles.statText}>Created {new Date(worker.created_at).toLocaleDateString()}</Text>
        </View>
        <View style={styles.workerButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleCustomizeWorker(worker)}
          >
            <Settings size={16} color={theme.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={() => handleChatWithWorker(worker)}
          >
            <MessageCircle size={16} color={theme.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: theme.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      width: '100%',
      height: '90%',
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingLeft: 20,
      paddingRight: 40, // Match IntegrationsModal close button spacing
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    headerIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: theme.primary + '20',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerText: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.foreground,
    },
    headerSubtitle: {
      fontSize: 14,
      color: theme.mutedForeground,
      marginTop: 2,
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.mutedWithOpacity(0.1),
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'flex-start',
      marginTop: 8,
    },
    searchContainer: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    searchInput: {
      backgroundColor: theme.mutedWithOpacity(0.1),
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: theme.foreground,
      borderWidth: 1,
      borderColor: theme.border,
    },
    searchIcon: {
      position: 'absolute',
      left: 16,
      top: 16,
    },
    filterContainer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingBottom: 16,
      gap: 8,
    },
    filterButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
    },
    activeFilterButton: {
      backgroundColor: theme.primary + '20',
      borderColor: theme.primary,
    },
    filterButtonText: {
      fontSize: 14,
      color: theme.mutedForeground,
    },
    activeFilterButtonText: {
      color: theme.primary,
      fontWeight: '500',
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
    },
    createButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.foreground,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 10,
      marginBottom: 16,
    },
    createButtonText: {
      color: theme.background,
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    workersList: {
      gap: 12,
    },
    workerCard: {
      backgroundColor: theme.mutedWithOpacity(0.05),
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },
    workerCardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    workerIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    workerInfo: {
      flex: 1,
    },
    workerTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      marginBottom: 4,
    },
    workerName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.foreground,
      marginRight: 8,
    },
    defaultBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.primary + '20',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      marginRight: 6,
    },
    defaultText: {
      fontSize: 10,
      color: theme.primary,
      fontWeight: '500',
      marginLeft: 2,
    },
    publicBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.mutedWithOpacity(0.2),
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    publicText: {
      fontSize: 10,
      color: theme.foreground,
      fontWeight: '500',
      marginLeft: 2,
    },
    workerRole: {
      fontSize: 14,
      color: theme.primary,
      fontWeight: '500',
      marginBottom: 4,
    },
    workerDescription: {
      fontSize: 14,
      color: theme.mutedForeground,
      lineHeight: 18,
    },
    workerActions: {
      alignItems: 'center',
    },
    statusIndicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    workerCardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    workerStats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    statText: {
      fontSize: 12,
      color: theme.mutedForeground,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '500',
    },
    workerButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    actionButton: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: theme.mutedWithOpacity(0.1),
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButton: {
      backgroundColor: theme.primary + '20',
    },
    workerTags: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    tag: {
      backgroundColor: theme.mutedWithOpacity(0.1),
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    tagText: {
      fontSize: 12,
      color: theme.mutedForeground,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
    },
    emptyStateIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.mutedWithOpacity(0.1),
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    emptyStateTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.foreground,
      marginBottom: 8,
    },
    emptyStateText: {
      fontSize: 14,
      color: theme.mutedForeground,
      textAlign: 'center',
    },
  });

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <Wrench size={20} color={theme.primary} />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>Workers</Text>
                <Text style={styles.headerSubtitle}>Your specialized virtual employees</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={20} color={theme.foreground} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <View style={{ position: 'relative' }}>
              <Search size={16} color={theme.mutedForeground} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { paddingLeft: 40 }]}
                placeholder="Search workers..."
                placeholderTextColor={theme.mutedForeground}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          {/* Filters */}
          <View style={styles.filterContainer}>
            {[
              { key: 'all', label: 'All' },
              { key: 'active', label: 'Active' },
              { key: 'public', label: 'Public' },
              { key: 'my', label: 'My Workers' }
            ].map((filter) => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterButton,
                  selectedFilter === filter.key && styles.activeFilterButton
                ]}
                onPress={() => setSelectedFilter(filter.key as any)}
              >
                <Text style={[
                  styles.filterButtonText,
                  selectedFilter === filter.key && styles.activeFilterButtonText
                ]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Create New Worker Button */}
            <TouchableOpacity style={styles.createButton} onPress={handleCreateWorker}>
              <Plus size={20} color={theme.background} />
              <Text style={styles.createButtonText}>Create New Worker</Text>
            </TouchableOpacity>


            {/* Workers List */}
            {isLoading ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>Loading workers...</Text>
              </View>
            ) : filteredWorkers.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyStateIcon}>
                  <Wrench size={24} color={theme.mutedForeground} />
                </View>
                <Text style={styles.emptyStateTitle}>No workers found</Text>
                <Text style={styles.emptyStateText}>
                  {searchQuery ? `No workers match "${searchQuery}"` : 'No workers available'}
                </Text>
              </View>
            ) : (
              <View style={styles.workersList}>
                {filteredWorkers.map(worker => renderWorkerCard(worker))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Worker Creation Modal */}
      <WorkerCreationModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onWorkerCreated={handleWorkerCreated}
      />

      {/* Agent Edit Modal */}
      <AgentEditModal
        visible={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingAgent(null);
        }}
        agent={editingAgent}
        onAgentUpdated={handleAgentUpdated}
        onAgentDeleted={handleAgentDeleted}
      />
    </Modal>
  );
};
