import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '../hooks/useThemeColor';
import { X, Bot, Palette, Save, Sparkles } from 'lucide-react-native';
import { agentService, Agent } from '../services/agentService';

interface WorkerCreationModalProps {
  visible: boolean;
  onClose: () => void;
  onWorkerCreated: (worker: Agent) => void;
}

interface WorkerFormData {
  name: string;
  description: string;
  system_prompt: string;
  icon_name: string;
  icon_color: string;
  icon_background: string;
  is_default: boolean;
}

const ICON_OPTIONS = [
  { name: 'bot', label: 'Bot', color: '#3B82F6', background: '#EFF6FF' },
  { name: 'brain', label: 'Brain', color: '#8B5CF6', background: '#F3F4F6' },
  { name: 'sparkles', label: 'Sparkles', color: '#F59E0B', background: '#FEF3C7' },
  { name: 'zap', label: 'Zap', color: '#10B981', background: '#ECFDF5' },
  { name: 'rocket', label: 'Rocket', color: '#EF4444', background: '#FEF2F2' },
  { name: 'briefcase', label: 'Briefcase', color: '#6B7280', background: '#F9FAFB' },
  { name: 'code', label: 'Code', color: '#059669', background: '#F0FDF4' },
  { name: 'database', label: 'Database', color: '#7C3AED', background: '#F5F3FF' },
  { name: 'globe', label: 'Globe', color: '#0EA5E9', background: '#F0F9FF' },
  { name: 'heart', label: 'Heart', color: '#EC4899', background: '#FDF2F8' },
  { name: 'lightbulb', label: 'Lightbulb', color: '#F59E0B', background: '#FFFBEB' },
  { name: 'message-circle', label: 'Message', color: '#06B6D4', background: '#F0FDFA' },
  { name: 'shield', label: 'Shield', color: '#84CC16', background: '#F7FEE7' },
  { name: 'star', label: 'Star', color: '#F97316', background: '#FFF7ED' },
  { name: 'user', label: 'User', color: '#6366F1', background: '#EEF2FF' },
  { name: 'cpu', label: 'CPU', color: '#8B5CF6', background: '#F3F4F6' },
];

const COLOR_OPTIONS = [
  '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#6B7280',
  '#059669', '#7C3AED', '#0EA5E9', '#EC4899', '#06B6D4', '#84CC16',
  '#F97316', '#6366F1', '#000000', '#FFFFFF'
];

const BACKGROUND_OPTIONS = [
  '#F3F4F6', '#E5E7EB', '#DBEAFE', '#D1FAE5', '#FEF3C7', '#FEE2E2',
  '#EDE9FE', '#FED7AA', '#F0FDF4', '#F5F3FF', '#F0F9FF', '#FDF2F8',
  '#FFFBEB', '#F0FDFA', '#F7FEE7', '#FFF7ED', '#EEF2FF', '#F9FAFB'
];

export const WorkerCreationModal: React.FC<WorkerCreationModalProps> = ({ 
  visible, 
  onClose, 
  onWorkerCreated 
}) => {
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<WorkerFormData>({
    name: '',
    description: '',
    system_prompt: '',
    icon_name: 'bot',
    icon_color: '#3B82F6',
    icon_background: '#F3F4F6',
    is_default: false,
  });

  const handleInputChange = (field: keyof WorkerFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCreateWorker = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a worker name');
      return;
    }

    if (!formData.description.trim()) {
      Alert.alert('Error', 'Please enter a worker description');
      return;
    }

    if (!formData.system_prompt.trim()) {
      Alert.alert('Error', 'Please enter a system prompt');
      return;
    }

    setIsLoading(true);
    
    try {
      const workerData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        system_prompt: formData.system_prompt.trim(),
        icon_name: formData.icon_name,
        icon_color: formData.icon_color,
        icon_background: formData.icon_background,
        is_default: formData.is_default,
        agentpress_tools: {
          'sb_shell_tool': true,
          'sb_files_tool': true,
          'web_search_tool': true,
          'browser_tool': true,
          'sb_vision_tool': true,
          'data_providers_tool': true,
        },
        configured_mcps: [],
        custom_mcps: [],
      };

      console.log('Creating worker with data:', workerData);
      
      const newWorker = await agentService.createAgent(workerData);
      
      console.log('Worker created successfully:', newWorker);
      
      Alert.alert('Success', `${newWorker.name} has been created successfully!`);
      
      onWorkerCreated(newWorker);
      onClose();
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        system_prompt: '',
        icon_name: 'bot',
        icon_color: '#3B82F6',
        icon_background: '#F3F4F6',
        is_default: false,
      });
      
    } catch (error) {
      console.error('Error creating worker:', error);
      Alert.alert('Error', `Failed to create worker: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedIcon = ICON_OPTIONS.find(icon => icon.name === formData.icon_name) || ICON_OPTIONS[0];

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: theme.background,
      borderRadius: 20,
      width: '90%',
      maxHeight: '80%',
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
    headerTitle: {
      fontSize: 20,
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
    content: {
      padding: 20,
    },
    formGroup: {
      marginBottom: 20,
    },
    label: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.foreground,
      marginBottom: 8,
    },
    input: {
      backgroundColor: theme.mutedWithOpacity(0.1),
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: theme.foreground,
      borderWidth: 1,
      borderColor: theme.border,
    },
    textArea: {
      height: 80,
      textAlignVertical: 'top',
    },
    iconSection: {
      marginBottom: 20,
    },
    iconGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    iconOption: {
      width: 60,
      height: 60,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    selectedIcon: {
      borderColor: theme.primary,
    },
    colorSection: {
      marginBottom: 20,
    },
    colorGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    colorOption: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    selectedColor: {
      borderColor: theme.foreground,
    },
    defaultToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
    },
    toggleText: {
      fontSize: 16,
      color: theme.foreground,
    },
    toggle: {
      width: 50,
      height: 30,
      borderRadius: 15,
      backgroundColor: theme.muted,
      justifyContent: 'center',
      paddingHorizontal: 2,
    },
    toggleActive: {
      backgroundColor: theme.primary,
    },
    toggleThumb: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: theme.background,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      gap: 12,
    },
    cancelButton: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: theme.mutedWithOpacity(0.1),
    },
    cancelButtonText: {
      fontSize: 16,
      color: theme.mutedForeground,
      fontWeight: '500',
    },
    createButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: theme.primary,
    },
    createButtonText: {
      fontSize: 16,
      color: theme.background,
      fontWeight: '600',
      marginLeft: 8,
    },
  });

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Create New Worker</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={20} color={theme.foreground} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Name */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Worker Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter worker name"
                placeholderTextColor={theme.mutedForeground}
                value={formData.name}
                onChangeText={(text) => handleInputChange('name', text)}
              />
            </View>

            {/* Description */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe what this worker does"
                placeholderTextColor={theme.mutedForeground}
                value={formData.description}
                onChangeText={(text) => handleInputChange('description', text)}
                multiline
              />
            </View>

            {/* System Prompt */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>System Prompt *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Define the worker's behavior and expertise"
                placeholderTextColor={theme.mutedForeground}
                value={formData.system_prompt}
                onChangeText={(text) => handleInputChange('system_prompt', text)}
                multiline
              />
            </View>

            {/* Icon Selection */}
            <View style={styles.iconSection}>
              <Text style={styles.label}>Icon</Text>
              <View style={styles.iconGrid}>
                {ICON_OPTIONS.map((icon) => (
                  <TouchableOpacity
                    key={icon.name}
                    style={[
                      styles.iconOption,
                      { backgroundColor: icon.background },
                      formData.icon_name === icon.name && styles.selectedIcon
                    ]}
                    onPress={() => {
                      handleInputChange('icon_name', icon.name);
                      handleInputChange('icon_color', icon.color);
                      handleInputChange('icon_background', icon.background);
                    }}
                  >
                    <Bot size={24} color={icon.color} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Color Customization */}
            <View style={styles.colorSection}>
              <Text style={styles.label}>Icon Color</Text>
              <View style={styles.colorGrid}>
                {COLOR_OPTIONS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      formData.icon_color === color && styles.selectedColor
                    ]}
                    onPress={() => handleInputChange('icon_color', color)}
                  />
                ))}
              </View>
            </View>

            {/* Background Color */}
            <View style={styles.colorSection}>
              <Text style={styles.label}>Background Color</Text>
              <View style={styles.colorGrid}>
                {BACKGROUND_OPTIONS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      formData.icon_background === color && styles.selectedColor
                    ]}
                    onPress={() => handleInputChange('icon_background', color)}
                  />
                ))}
              </View>
            </View>

            {/* Default Toggle */}
            <View style={styles.formGroup}>
              <View style={styles.defaultToggle}>
                <Text style={styles.toggleText}>Set as Default Worker</Text>
                <TouchableOpacity
                  style={[styles.toggle, formData.is_default && styles.toggleActive]}
                  onPress={() => handleInputChange('is_default', !formData.is_default)}
                >
                  <View style={[
                    styles.toggleThumb,
                    { alignSelf: formData.is_default ? 'flex-end' : 'flex-start' }
                  ]} />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.createButton} 
              onPress={handleCreateWorker}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={theme.background} />
              ) : (
                <>
                  <Sparkles size={20} color={theme.background} />
                  <Text style={styles.createButtonText}>Create Worker</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
