import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { useTheme } from '@/hooks/useThemeColor';
import { X, Search, Clock, Zap, Plus, History, CheckCircle, Circle, XCircle, Play, Pause, Settings, Calendar, AlertCircle } from 'lucide-react-native';

interface TasksModalProps {
  visible: boolean;
  onClose: () => void;
}

interface Task {
  id: string;
  name: string;
  description: string;
  type: 'scheduled' | 'event';
  status: 'active' | 'paused' | 'completed' | 'failed';
  nextRun?: string;
  lastRun?: string;
  frequency?: string;
  agentName: string;
  createdAt: string;
  isActive: boolean;
}

export const TasksModal: React.FC<TasksModalProps> = ({ visible, onClose }) => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'scheduled' | 'event'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Mock data for tasks
  const [tasks] = useState<Task[]>([
    {
      id: '1',
      name: 'Daily Report Generator',
      description: 'Generates and sends daily performance reports',
      type: 'scheduled',
      status: 'active',
      nextRun: '2024-01-15 09:00',
      lastRun: '2024-01-14 09:00',
      frequency: 'Daily at 9:00 AM',
      agentName: 'Echo Assistant',
      createdAt: '2024-01-10',
      isActive: true
    },
    {
      id: '2',
      name: 'Email Monitoring',
      description: 'Monitors incoming emails and categorizes them',
      type: 'event',
      status: 'active',
      lastRun: '2024-01-15 14:30',
      agentName: 'Customer Support',
      createdAt: '2024-01-12',
      isActive: true
    },
    {
      id: '3',
      name: 'Code Quality Check',
      description: 'Runs automated code quality checks on commits',
      type: 'event',
      status: 'paused',
      lastRun: '2024-01-13 16:45',
      agentName: 'Code Master',
      createdAt: '2024-01-08',
      isActive: false
    },
    {
      id: '4',
      name: 'Weekly Analytics',
      description: 'Compiles weekly analytics and insights',
      type: 'scheduled',
      status: 'active',
      nextRun: '2024-01-21 18:00',
      lastRun: '2024-01-14 18:00',
      frequency: 'Weekly on Sunday',
      agentName: 'Data Analyst',
      createdAt: '2024-01-05',
      isActive: true
    },
    {
      id: '5',
      name: 'Social Media Post',
      description: 'Automatically posts content to social media',
      type: 'scheduled',
      status: 'completed',
      nextRun: '2024-01-16 12:00',
      lastRun: '2024-01-15 12:00',
      frequency: 'Daily at 12:00 PM',
      agentName: 'Content Creator',
      createdAt: '2024-01-03',
      isActive: true
    },
    {
      id: '6',
      name: 'Database Backup',
      description: 'Creates automated database backups',
      type: 'scheduled',
      status: 'failed',
      nextRun: '2024-01-16 02:00',
      lastRun: '2024-01-15 02:00',
      frequency: 'Daily at 2:00 AM',
      agentName: 'System Admin',
      createdAt: '2024-01-01',
      isActive: true
    },
    {
      id: '7',
      name: 'Customer Inquiry Response',
      description: 'Automatically responds to customer inquiries',
      type: 'event',
      status: 'active',
      lastRun: '2024-01-15 15:22',
      agentName: 'Customer Support',
      createdAt: '2024-01-14',
      isActive: true
    },
    {
      id: '8',
      name: 'Project Status Update',
      description: 'Sends weekly project status updates to team',
      type: 'scheduled',
      status: 'active',
      nextRun: '2024-01-19 17:00',
      lastRun: '2024-01-12 17:00',
      frequency: 'Weekly on Friday',
      agentName: 'Project Manager',
      createdAt: '2024-01-07',
      isActive: true
    }
  ]);

  const [filteredTasks, setFilteredTasks] = useState<Task[]>(tasks);

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
    let filtered = tasks;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(task =>
        task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.agentName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply category filter
    switch (selectedFilter) {
      case 'active':
        filtered = filtered.filter(task => task.status === 'active');
        break;
      case 'scheduled':
        filtered = filtered.filter(task => task.type === 'scheduled');
        break;
      case 'event':
        filtered = filtered.filter(task => task.type === 'event');
        break;
      default:
        // 'all' - no additional filtering
        break;
    }

    setFilteredTasks(filtered);
  }, [searchQuery, selectedFilter, tasks]);

  const handleToggleTask = (task: Task) => {
    Alert.alert(
      task.isActive ? 'Pause Task' : 'Resume Task',
      `${task.isActive ? 'Pause' : 'Resume'} "${task.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: task.isActive ? 'Pause' : 'Resume', 
          onPress: () => {
            console.log(`${task.isActive ? 'Pausing' : 'Resuming'} task:`, task.name);
            // In a real app, this would update the task status
          }
        }
      ]
    );
  };

  const handleConfigureTask = (task: Task) => {
    Alert.alert(
      'Configure Task',
      `Configure settings for "${task.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Configure', 
          onPress: () => {
            console.log('Configuring task:', task.name);
          }
        }
      ]
    );
  };

  const handleCreateTask = () => {
    Alert.alert(
      'Create New Task',
      'What type of task would you like to create?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Scheduled Task', 
          onPress: () => {
            console.log('Creating scheduled task');
          }
        },
        { 
          text: 'Event-based Task', 
          onPress: () => {
            console.log('Creating event-based task');
          }
        }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return theme.primary;
      case 'paused': return '#F59E0B';
      case 'completed': return '#10B981';
      case 'failed': return '#EF4444';
      default: return theme.mutedForeground;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return Play;
      case 'paused': return Pause;
      case 'completed': return CheckCircle;
      case 'failed': return XCircle;
      default: return Circle;
    }
  };

  const getTypeIcon = (type: string) => {
    return type === 'scheduled' ? Clock : Zap;
  };

  const renderTaskCard = (task: Task) => {
    const StatusIcon = getStatusIcon(task.status);
    const TypeIcon = getTypeIcon(task.type);

    return (
      <TouchableOpacity
        key={task.id}
        style={styles.taskCard}
        onPress={() => handleConfigureTask(task)}
        activeOpacity={0.7}
      >
        <View style={styles.taskCardHeader}>
          <View style={styles.taskIconContainer}>
            <TypeIcon size={20} color={theme.primary} />
          </View>
          <View style={styles.taskInfo}>
            <View style={styles.taskTitleRow}>
              <Text style={styles.taskName}>{task.name}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) + '20' }]}>
                <StatusIcon size={12} color={getStatusColor(task.status)} />
                <Text style={[styles.statusText, { color: getStatusColor(task.status) }]}>
                  {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                </Text>
              </View>
            </View>
            <Text style={styles.taskDescription} numberOfLines={2}>
              {task.description}
            </Text>
            <Text style={styles.agentName}>Agent: {task.agentName}</Text>
          </View>
        </View>

        <View style={styles.taskCardFooter}>
          <View style={styles.taskDetails}>
            {task.nextRun && (
              <Text style={styles.detailText}>Next: {task.nextRun}</Text>
            )}
            {task.lastRun && (
              <Text style={styles.detailText}>Last: {task.lastRun}</Text>
            )}
            {task.frequency && (
              <Text style={styles.detailText}>{task.frequency}</Text>
            )}
          </View>
          <View style={styles.taskActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleToggleTask(task)}
            >
              {task.isActive ? (
                <Pause size={16} color={theme.mutedForeground} />
              ) : (
                <Play size={16} color={theme.primary} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleConfigureTask(task)}
            >
              <Settings size={16} color={theme.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

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
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
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
    headerActions: {
      flexDirection: 'row',
      gap: 8,
      flexShrink: 0,
    },
    actionButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.mutedWithOpacity(0.15),
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
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
      backgroundColor: theme.primary,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 12,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.primary,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    createButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    tasksList: {
      gap: 12,
    },
    taskCard: {
      backgroundColor: theme.mutedWithOpacity(0.05),
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },
    taskCardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    taskIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: theme.primary + '20',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    taskInfo: {
      flex: 1,
    },
    taskTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    taskName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.foreground,
      flex: 1,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '500',
      marginLeft: 4,
    },
    taskDescription: {
      fontSize: 14,
      color: theme.mutedForeground,
      lineHeight: 18,
      marginBottom: 4,
    },
    agentName: {
      fontSize: 12,
      color: theme.primary,
      fontWeight: '500',
    },
    taskCardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    taskDetails: {
      flex: 1,
    },
    detailText: {
      fontSize: 12,
      color: theme.mutedForeground,
      marginBottom: 2,
    },
    taskActions: {
      flexDirection: 'row',
      gap: 8,
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
                <Clock size={20} color={theme.primary} />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>Tasks</Text>
                <Text style={styles.headerSubtitle}>Automated tasks and triggers</Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.actionButton} onPress={() => setShowHistory(true)}>
                <History size={16} color={theme.foreground} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={onClose}>
                <X size={20} color={theme.foreground} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <View style={{ position: 'relative' }}>
              <Search size={16} color={theme.mutedForeground} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { paddingLeft: 40 }]}
                placeholder="Search tasks..."
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
              { key: 'scheduled', label: 'Scheduled' },
              { key: 'event', label: 'Event-based' }
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
            {/* Create New Task Button */}
            <TouchableOpacity style={styles.createButton} onPress={handleCreateTask}>
              <Plus size={20} color="white" />
              <Text style={styles.createButtonText}>Create New Task</Text>
            </TouchableOpacity>

            {/* Tasks List */}
            {isLoading ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>Loading tasks...</Text>
              </View>
            ) : filteredTasks.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyStateIcon}>
                  <Clock size={24} color={theme.mutedForeground} />
                </View>
                <Text style={styles.emptyStateTitle}>No tasks found</Text>
                <Text style={styles.emptyStateText}>
                  {searchQuery ? `No tasks match "${searchQuery}"` : 'No tasks available'}
                </Text>
              </View>
            ) : (
              <View style={styles.tasksList}>
                {filteredTasks.map(task => renderTaskCard(task))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
