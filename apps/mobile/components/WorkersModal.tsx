import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { useTheme } from '@/hooks/useThemeColor';
import { X, Search, Wrench, MessageCircle, Settings, Star, Globe, Download, User, ArrowRight, Plus } from 'lucide-react-native';
import { CreateWorkerChatInput } from './CreateWorkerChatInput';
import { initiateAgent } from '@/api/chat-api';
import { UploadedFile } from '@/utils/file-upload';

interface WorkersModalProps {
  visible: boolean;
  onClose: () => void;
}

interface Worker {
  id: string;
  name: string;
  description: string;
  role: string;
  capabilities: string[];
  tags: string[];
  isDefault: boolean;
  isPublic: boolean;
  downloadCount?: number;
  createdAt: string;
  iconName?: string;
  iconColor?: string;
  iconBackground?: string;
  toolsCount: number;
  status: 'active' | 'inactive' | 'building';
}

export const WorkersModal: React.FC<WorkersModalProps> = ({ visible, onClose }) => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'public' | 'my'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [chatInputValue, setChatInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Mock data for workers
  const [workers] = useState<Worker[]>([
    {
      id: '1',
      name: 'Echo Assistant',
      description: 'Your primary AI assistant for general tasks and conversations',
      role: 'General Assistant',
      capabilities: ['Chat', 'File Analysis', 'Code Review', 'Research'],
      tags: ['AI', 'Assistant', 'General'],
      isDefault: true,
      isPublic: false,
      createdAt: '2024-01-15',
      iconName: 'Bot',
      iconColor: '#3B82F6',
      iconBackground: '#EFF6FF',
      toolsCount: 12,
      status: 'active'
    },
    {
      id: '2',
      name: 'Code Master',
      description: 'Specialized in software development, debugging, and code optimization',
      role: 'Developer',
      capabilities: ['Code Review', 'Debugging', 'Architecture', 'Testing'],
      tags: ['Development', 'Code', 'Programming'],
      isDefault: false,
      isPublic: true,
      downloadCount: 1250,
      createdAt: '2024-01-20',
      iconName: 'Code',
      iconColor: '#10B981',
      iconBackground: '#ECFDF5',
      toolsCount: 8,
      status: 'active'
    },
    {
      id: '3',
      name: 'Data Analyst',
      description: 'Expert in data analysis, visualization, and statistical modeling',
      role: 'Data Scientist',
      capabilities: ['Data Analysis', 'Visualization', 'Statistics', 'ML'],
      tags: ['Data', 'Analytics', 'Science'],
      isDefault: false,
      isPublic: true,
      downloadCount: 890,
      createdAt: '2024-02-01',
      iconName: 'BarChart',
      iconColor: '#F59E0B',
      iconBackground: '#FFFBEB',
      toolsCount: 15,
      status: 'active'
    },
    {
      id: '4',
      name: 'Content Creator',
      description: 'Creates engaging content for blogs, social media, and marketing',
      role: 'Content Writer',
      capabilities: ['Writing', 'SEO', 'Social Media', 'Marketing'],
      tags: ['Content', 'Writing', 'Marketing'],
      isDefault: false,
      isPublic: false,
      createdAt: '2024-02-10',
      iconName: 'PenTool',
      iconColor: '#8B5CF6',
      iconBackground: '#F3F4F6',
      toolsCount: 6,
      status: 'active'
    },
    {
      id: '5',
      name: 'Customer Support',
      description: 'Handles customer inquiries, support tickets, and FAQ responses',
      role: 'Support Agent',
      capabilities: ['Customer Service', 'FAQ', 'Troubleshooting', 'Communication'],
      tags: ['Support', 'Customer', 'Service'],
      isDefault: false,
      isPublic: true,
      downloadCount: 2100,
      createdAt: '2024-02-15',
      iconName: 'Headphones',
      iconColor: '#EF4444',
      iconBackground: '#FEF2F2',
      toolsCount: 10,
      status: 'active'
    },
    {
      id: '6',
      name: 'Research Assistant',
      description: 'Conducts research, fact-checking, and information gathering',
      role: 'Researcher',
      capabilities: ['Research', 'Fact-Checking', 'Information Gathering', 'Analysis'],
      tags: ['Research', 'Information', 'Analysis'],
      isDefault: false,
      isPublic: false,
      createdAt: '2024-02-20',
      iconName: 'Search',
      iconColor: '#06B6D4',
      iconBackground: '#F0FDFA',
      toolsCount: 7,
      status: 'building'
    },
    {
      id: '7',
      name: 'Project Manager',
      description: 'Manages projects, timelines, and team coordination',
      role: 'Project Manager',
      capabilities: ['Planning', 'Coordination', 'Timeline Management', 'Team Work'],
      tags: ['Management', 'Project', 'Planning'],
      isDefault: false,
      isPublic: true,
      downloadCount: 750,
      createdAt: '2024-02-25',
      iconName: 'Calendar',
      iconColor: '#84CC16',
      iconBackground: '#F7FEE7',
      toolsCount: 9,
      status: 'active'
    },
    {
      id: '8',
      name: 'Design Specialist',
      description: 'Creates visual designs, mockups, and UI/UX solutions',
      role: 'Designer',
      capabilities: ['UI/UX', 'Visual Design', 'Prototyping', 'Branding'],
      tags: ['Design', 'UI/UX', 'Visual'],
      isDefault: false,
      isPublic: false,
      createdAt: '2024-03-01',
      iconName: 'Palette',
      iconColor: '#F97316',
      iconBackground: '#FFF7ED',
      toolsCount: 11,
      status: 'inactive'
    }
  ]);

  const [filteredWorkers, setFilteredWorkers] = useState<Worker[]>(workers);

  useEffect(() => {
    if (visible) {
      setIsLoading(true);
      // Simulate loading
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    }
  }, [visible]);

  useEffect(() => {
    let filtered = workers;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(worker =>
        worker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        worker.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        worker.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        worker.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply category filter
    switch (selectedFilter) {
      case 'active':
        filtered = filtered.filter(worker => worker.status === 'active');
        break;
      case 'public':
        filtered = filtered.filter(worker => worker.isPublic);
        break;
      case 'my':
        filtered = filtered.filter(worker => !worker.isPublic);
        break;
      default:
        // 'all' - no additional filtering
        break;
    }

    setFilteredWorkers(filtered);
  }, [searchQuery, selectedFilter, workers]);

  const handleChatWithWorker = (worker: Worker) => {
    Alert.alert(
      'Start Chat',
      `Start a conversation with ${worker.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Start Chat', 
          onPress: () => {
            // Navigate to chat with this worker
            console.log('Starting chat with worker:', worker.name);
            onClose();
          }
        }
      ]
    );
  };

  const handleCustomizeWorker = (worker: Worker) => {
    Alert.alert(
      'Customize Worker',
      `Customize ${worker.name} settings and capabilities?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Customize', 
          onPress: () => {
            console.log('Customizing worker:', worker.name);
          }
        }
      ]
    );
  };

  const handleCreateWorker = () => {
    Alert.alert(
      'Create New Worker',
      'Create a new custom AI worker?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Create', 
          onPress: () => {
            console.log('Creating new worker');
          }
        }
      ]
    );
  };

  const handleSendMessage = async (message: string, selectedAgent?: any, attachedFiles?: UploadedFile[]) => {
    if (isSending) {
      console.log('Already sending, ignoring duplicate request');
      return;
    }

    setIsSending(true);
    
    try {
      console.log('🏭 WORKERS MODAL RECEIVED:');
      console.log('📝 Message:', message);
      console.log('📎 Attached Files:', attachedFiles?.length || 0);
      console.log('📎 Attached Files Details:', attachedFiles);
      console.log('🤖 Selected Agent:', selectedAgent?.agent_id || 'default');

      // Prepare the message with file references
      let finalMessage = message.trim();
      if (attachedFiles && attachedFiles.length > 0) {
        const fileInfo = attachedFiles
          .map(file => `[Uploaded File: ${file.path}]`)
          .join('\n');
        finalMessage = finalMessage ? `${finalMessage}\n\n${fileInfo}` : fileInfo;
      }

      // Call the API to initiate agent with files
      console.log('🚀 CALLING initiateAgent WITH:');
      console.log('📝 Final Message:', finalMessage);
      console.log('📎 Files Array:', attachedFiles || []);
      console.log('🤖 Agent ID:', selectedAgent?.agent_id || '1');
      
      const result = await initiateAgent(finalMessage, {
        agent_id: selectedAgent?.agent_id || '1', // Default to Tars agent
        files: attachedFiles || [],
        stream: true,
      });

      console.log('✅ Message sent successfully:', result);
      
      // Clear the input
      setChatInputValue('');
      
      // Show success message
      Alert.alert('Success', 'Message sent successfully!');
      
    } catch (error) {
      console.error('❌ Error sending message:', error);
      Alert.alert('Error', `Failed to send message: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSending(false);
    }
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
      key={worker.id}
      style={styles.workerCard}
      onPress={() => handleChatWithWorker(worker)}
      activeOpacity={0.7}
    >
      <View style={styles.workerCardHeader}>
        <View style={[styles.workerIcon, { backgroundColor: worker.iconBackground || theme.mutedWithOpacity(0.1) }]}>
          <Wrench size={20} color={worker.iconColor || theme.primary} />
        </View>
        <View style={styles.workerInfo}>
          <View style={styles.workerTitleRow}>
            <Text style={styles.workerName}>{worker.name}</Text>
            {worker.isDefault && (
              <View style={styles.defaultBadge}>
                <Star size={12} color={theme.primary} />
                <Text style={styles.defaultText}>Default</Text>
              </View>
            )}
            {worker.isPublic && (
              <View style={styles.publicBadge}>
                <Globe size={12} color={theme.foreground} />
                <Text style={styles.publicText}>Public</Text>
              </View>
            )}
          </View>
          <Text style={styles.workerRole}>{worker.role}</Text>
          <Text style={styles.workerDescription} numberOfLines={2}>
            {worker.description}
          </Text>
        </View>
        <View style={styles.workerActions}>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(worker.status) }]} />
        </View>
      </View>

      <View style={styles.workerCardFooter}>
        <View style={styles.workerStats}>
          <Text style={styles.statText}>{worker.toolsCount} tools</Text>
          {worker.downloadCount && (
            <Text style={styles.statText}>{worker.downloadCount} downloads</Text>
          )}
          <Text style={[styles.statusText, { color: getStatusColor(worker.status) }]}>
            {getStatusText(worker.status)}
          </Text>
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

      <View style={styles.workerTags}>
        {worker.tags.slice(0, 3).map((tag, index) => (
          <View key={index} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
        {worker.tags.length > 3 && (
          <View style={styles.tag}>
            <Text style={styles.tagText}>+{worker.tags.length - 3}</Text>
          </View>
        )}
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

            {/* Chat Input for Create Worker */}
            <CreateWorkerChatInput
              placeholder="Describe what you need help with..."
              value={chatInputValue}
              onChangeText={setChatInputValue}
         onSubmit={(message, selectedAgent, attachedFiles) => {
           console.log('🏭 WORKERS MODAL onSubmit CALLED with:');
           console.log('📝 Message:', message);
           console.log('📎 Attached Files:', attachedFiles?.length || 0);
           console.log('🤖 Selected Agent:', selectedAgent?.agent_id || 'null');
           handleSendMessage(message, selectedAgent, attachedFiles);
         }}
              onFileAttach={() => console.log('File attach pressed')}
              onAgentSelect={() => console.log('Agent selected for worker creation')}
              onIntegrations={() => {
                // Close workers modal and open integrations modal
                onClose();
                // You would need to pass an onIntegrations prop to WorkersModal
                // For now, we'll just close the modal
                console.log('Opening integrations...');
              }}
              onTools={() => console.log('Tools pressed')}
              onInstructions={() => console.log('Instructions pressed')}
              onKnowledge={() => console.log('Knowledge pressed')}
              onTriggers={() => console.log('Triggers pressed')}
            />

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
    </Modal>
  );
};
