import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, TextInput, Alert } from 'react-native';
import { useTheme } from '@/hooks/useThemeColor';
import { 
  X, 
  Eye, 
  EyeOff, 
  Plus, 
  Trash, 
  Wrench,
  Save
} from 'lucide-react-native';

interface EnvManagerModalProps {
  visible: boolean;
  onClose: () => void;
}

interface EnvVar {
  key: string;
  value: string;
  id: string;
}

export const EnvManagerModal: React.FC<EnvManagerModalProps> = ({ visible, onClose }) => {
  const theme = useTheme();
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [newEnvVars, setNewEnvVars] = useState<EnvVar[]>([]);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (visible) {
      // Simulate loading
      setIsLoading(true);
      setTimeout(() => {
        setEnvVars([]); // Start with empty environment variables
        setIsLoading(false);
      }, 500);
    }
  }, [visible]);

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys(prev => ({
      ...prev,
      [keyId]: !prev[keyId]
    }));
  };

  const handleAddNewKey = () => {
    const newKey = {
      key: '',
      value: '',
      id: Math.random().toString(36).substr(2, 9)
    };
    setNewEnvVars([...newEnvVars, newKey]);
    setIsDirty(true);
  };

  const handleNewKeyChange = (id: string, field: 'key' | 'value', value: string) => {
    setNewEnvVars(prev => 
      prev.map(entry => entry.id === id ? {...entry, [field]: value} : entry)
    );
    setIsDirty(true);
  };

  const handleExistingKeyChange = (id: string, value: string) => {
    setEnvVars(prev => 
      prev.map(entry => entry.id === id ? {...entry, value} : entry)
    );
    setIsDirty(true);
  };

  const handleDeleteKey = (id: string) => {
    setNewEnvVars(prev => prev.filter(entry => entry.id !== id));
    setIsDirty(true);
  };

  const checkKeyIsDuplicate = (key: string): boolean => {
    const trimmedKey = key.trim();
    if (!trimmedKey) return false;
    
    const existingKeys = envVars.map(entry => entry.key);
    const newKeys = newEnvVars.map(entry => entry.key.trim());
    const allKeys = [...existingKeys, ...newKeys];
    
    return allKeys.filter(k => k === trimmedKey).length > 1;
  };

  const hasEmptyKeyValues = newEnvVars.some(entry => 
    entry.key.trim() === "" || entry.value.trim() === ""
  );

  const hasDuplicateKeys = (): boolean => {
    const allKeys = [
      ...envVars.map(entry => entry.key),
      ...newEnvVars.map(entry => entry.key.trim())
    ];
    const uniqueKeys = new Set(allKeys);
    return uniqueKeys.size !== allKeys.length;
  };

  const handleSave = () => {
    if (hasEmptyKeyValues) {
      Alert.alert('Error', 'Please fill in all key-value pairs');
      return;
    }
    
    if (hasDuplicateKeys()) {
      Alert.alert('Error', 'Duplicate keys found. Please remove duplicates.');
      return;
    }

    // Simulate save
    Alert.alert('Success', 'Environment variables saved successfully!', [
      { text: 'OK', onPress: () => {
        setNewEnvVars([]);
        setIsDirty(false);
        onClose();
      }}
    ]);
  };

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      backgroundColor: theme.background,
      borderRadius: 16,
      width: '100%',
      maxWidth: 500,
      maxHeight: '90%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.primary + '20',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    headerText: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.foreground,
      marginBottom: 4,
    },
    headerDescription: {
      fontSize: 14,
      color: theme.mutedForeground,
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
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    loadingContainer: {
      paddingVertical: 40,
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 16,
      color: theme.mutedForeground,
      marginTop: 12,
    },
    localModeWarning: {
      backgroundColor: theme.mutedWithOpacity(0.1),
      padding: 16,
      borderRadius: 8,
      marginBottom: 20,
    },
    warningText: {
      fontSize: 14,
      color: theme.mutedForeground,
      textAlign: 'center',
    },
    envVarSection: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.foreground,
      marginBottom: 16,
    },
    envVarItem: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.foreground,
      marginBottom: 8,
    },
    inputContainer: {
      position: 'relative',
    },
    input: {
      backgroundColor: theme.mutedWithOpacity(0.1),
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 14,
      color: theme.foreground,
      borderWidth: 1,
      borderColor: theme.border,
      paddingRight: 50,
    },
    visibilityButton: {
      position: 'absolute',
      right: 8,
      top: 8,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.mutedWithOpacity(0.1),
      alignItems: 'center',
      justifyContent: 'center',
    },
    newKeyRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    newKeyInput: {
      flex: 1,
      backgroundColor: theme.mutedWithOpacity(0.1),
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 14,
      color: theme.foreground,
      borderWidth: 1,
      borderColor: theme.border,
    },
    deleteButton: {
      width: 40,
      height: 40,
      borderRadius: 8,
      backgroundColor: theme.mutedWithOpacity(0.1),
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorText: {
      fontSize: 12,
      color: '#ef4444',
      marginTop: 4,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.mutedWithOpacity(0.1),
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 20,
    },
    addButtonText: {
      fontSize: 14,
      color: theme.foreground,
      marginLeft: 8,
    },
    emptyState: {
      paddingVertical: 20,
      paddingHorizontal: 16,
      backgroundColor: theme.mutedWithOpacity(0.05),
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      borderStyle: 'dashed',
    },
    emptyStateText: {
      fontSize: 14,
      color: theme.mutedForeground,
      textAlign: 'center',
      fontStyle: 'italic',
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    saveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    saveButtonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    saveButtonDisabled: {
      backgroundColor: theme.mutedWithOpacity(0.3),
    },
  });

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Wrench size={18} color={theme.primary} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Local .Env Manager</Text>
              <Text style={styles.headerDescription}>
                Manage your local environment variables
              </Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={16} color={theme.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading environment variables...</Text>
              </View>
            ) : (
              <>
                {/* Local Mode Warning */}
                <View style={styles.localModeWarning}>
                  <Text style={styles.warningText}>
                    Local .Env Manager is only available in local mode.
                  </Text>
                </View>

                {/* Existing Environment Variables */}
                <View style={styles.envVarSection}>
                  <Text style={styles.sectionTitle}>Current Environment Variables</Text>
                  {envVars.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateText}>
                        No environment variables found. Add your first variable below.
                      </Text>
                    </View>
                  ) : (
                    envVars.map((envVar) => (
                      <View key={envVar.id} style={styles.envVarItem}>
                        <Text style={styles.label}>{envVar.key}</Text>
                        <View style={styles.inputContainer}>
                          <TextInput
                            style={styles.input}
                            value={envVar.value}
                            onChangeText={(value) => handleExistingKeyChange(envVar.id, value)}
                            placeholder={envVar.key}
                            secureTextEntry={!visibleKeys[envVar.id]}
                            autoCapitalize="none"
                            autoCorrect={false}
                          />
                          <TouchableOpacity
                            style={styles.visibilityButton}
                            onPress={() => toggleKeyVisibility(envVar.id)}
                          >
                            {visibleKeys[envVar.id] ? (
                              <EyeOff size={16} color={theme.mutedForeground} />
                            ) : (
                              <Eye size={16} color={theme.mutedForeground} />
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )}
                </View>

                {/* New Environment Variables */}
                <View style={styles.envVarSection}>
                  <Text style={styles.sectionTitle}>Add New Variables</Text>
                  {newEnvVars.map((envVar) => (
                    <View key={envVar.id} style={styles.envVarItem}>
                      <Text style={styles.label}>
                        {envVar.key || "New API Key"}
                      </Text>
                      <View style={styles.newKeyRow}>
                        <TextInput
                          style={[styles.newKeyInput, { flex: 1 }]}
                          placeholder="KEY"
                          value={envVar.key}
                          onChangeText={(value) => handleNewKeyChange(envVar.id, 'key', value)}
                          autoCapitalize="characters"
                          autoCorrect={false}
                        />
                        <TextInput
                          style={[styles.newKeyInput, { flex: 1 }]}
                          placeholder="VALUE"
                          value={envVar.value}
                          onChangeText={(value) => handleNewKeyChange(envVar.id, 'value', value)}
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleDeleteKey(envVar.id)}
                        >
                          <Trash size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                      {checkKeyIsDuplicate(envVar.key) && (
                        <Text style={styles.errorText}>Key already exists</Text>
                      )}
                    </View>
                  ))}

                  <TouchableOpacity style={styles.addButton} onPress={handleAddNewKey}>
                    <Plus size={16} color={theme.foreground} />
                    <Text style={styles.addButtonText}>Add New Key</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <View />
            <TouchableOpacity
              style={[
                styles.saveButton,
                (!isDirty && newEnvVars.length === 0) || hasEmptyKeyValues || hasDuplicateKeys() 
                  ? styles.saveButtonDisabled 
                  : null
              ]}
              onPress={handleSave}
              disabled={(!isDirty && newEnvVars.length === 0) || hasEmptyKeyValues || hasDuplicateKeys()}
            >
              <Save size={16} color="#ffffff" />
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
