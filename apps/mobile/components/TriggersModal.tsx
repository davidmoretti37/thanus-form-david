import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { useTheme } from '@/hooks/useThemeColor';
import { X, Zap, Clock, Calendar, MessageSquare, Plus } from 'lucide-react-native';

interface TriggerItemProps {
  id: string;
  name: string;
  type: 'schedule' | 'webhook' | 'email' | 'manual';
  description: string;
  isActive: boolean;
  lastTriggered?: string;
  onToggle?: (id: string, isActive: boolean) => void;
}

const TriggerItem: React.FC<TriggerItemProps> = ({
  name,
  type,
  description,
  isActive,
  lastTriggered,
  onToggle,
  id,
}) => {
  const theme = useTheme();
  
  const getIcon = () => {
    switch (type) {
      case 'schedule': return <Clock size={20} color={theme.primary} />;
      case 'webhook': return <Zap size={20} color={theme.primary} />;
      case 'email': return <MessageSquare size={20} color={theme.primary} />;
      case 'manual': return <Calendar size={20} color={theme.primary} />;
      default: return <Zap size={20} color={theme.primary} />;
    }
  };

  const getTypeColor = () => {
    switch (type) {
      case 'schedule': return '#10B981';
      case 'webhook': return '#3B82F6';
      case 'email': return '#F59E0B';
      case 'manual': return '#8B5CF6';
      default: return theme.primary;
    }
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
      fontSize: 13,
      color: theme.mutedForeground,
      marginTop: 2,
    },
    lastTriggered: {
      fontSize: 12,
      color: theme.mutedForeground,
      marginTop: 4,
    },
    typeBadge: {
      backgroundColor: getTypeColor() + '20',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      marginTop: 4,
      alignSelf: 'flex-start',
    },
    typeText: {
      fontSize: 10,
      fontWeight: '600',
      color: getTypeColor(),
      textTransform: 'uppercase',
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
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.description}>{description}</Text>
        {lastTriggered && <Text style={styles.lastTriggered}>Last triggered: {lastTriggered}</Text>}
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{type}</Text>
        </View>
      </View>
      <View style={styles.toggleContainer}>
        <Switch
          trackColor={{ false: theme.muted, true: getTypeColor() }}
          thumbColor={isActive ? theme.background : theme.foreground}
          onValueChange={(newValue) => onToggle && onToggle(id, newValue)}
          value={isActive}
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
  const [triggers, setTriggers] = useState<TriggerItemProps[]>([
    {
      id: '1',
      name: 'Daily Report',
      type: 'schedule',
      description: 'Generate daily summary report every morning at 9 AM',
      isActive: true,
      lastTriggered: '2 hours ago',
    },
    {
      id: '2',
      name: 'Email Notification',
      type: 'email',
      description: 'Trigger when new emails arrive in inbox',
      isActive: true,
      lastTriggered: '1 day ago',
    },
    {
      id: '3',
      name: 'Webhook Trigger',
      type: 'webhook',
      description: 'Execute when webhook receives data',
      isActive: false,
      lastTriggered: '3 days ago',
    },
    {
      id: '4',
      name: 'Manual Trigger',
      type: 'manual',
      description: 'Execute manually from dashboard',
      isActive: true,
    },
  ]);

  const handleToggle = (id: string, isActive: boolean) => {
    setTriggers(prevTriggers =>
      prevTriggers.map(trigger => (trigger.id === id ? { ...trigger, isActive } : trigger))
    );
  };

  const activeTriggersCount = triggers.filter(trigger => trigger.isActive).length;

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
    triggersEnabledText: {
      fontSize: 14,
      color: theme.mutedForeground,
      alignSelf: 'flex-end',
      marginBottom: 15,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.primary,
      paddingHorizontal: 16,
      paddingVertical: 10,
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

          <TouchableOpacity style={styles.addButton}>
            <Plus size={16} color={theme.background} />
            <Text style={styles.addButtonText}>Create New Trigger</Text>
          </TouchableOpacity>

          <ScrollView contentContainerStyle={styles.scrollViewContent}>
            {triggers.length === 0 ? (
              <View style={styles.emptyState}>
                <Zap size={48} color={theme.mutedForeground} />
                <Text style={styles.emptyStateText}>No triggers configured</Text>
              </View>
            ) : (
              triggers.map(trigger => (
                <TriggerItem
                  key={trigger.id}
                  id={trigger.id}
                  name={trigger.name}
                  type={trigger.type}
                  description={trigger.description}
                  isActive={trigger.isActive}
                  lastTriggered={trigger.lastTriggered}
                  onToggle={handleToggle}
                />
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
