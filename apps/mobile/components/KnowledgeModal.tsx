import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useTheme } from '@/hooks/useThemeColor';
import { X, Database, Plus, FileText, Upload } from 'lucide-react-native';

interface KnowledgeItemProps {
  id: string;
  name: string;
  type: 'document' | 'url' | 'text';
  size?: string;
  lastUpdated: string;
}

const KnowledgeItem: React.FC<KnowledgeItemProps> = ({ name, type, size, lastUpdated }) => {
  const theme = useTheme();
  
  const getIcon = () => {
    switch (type) {
      case 'document': return <FileText size={20} color={theme.primary} />;
      case 'url': return <Database size={20} color={theme.primary} />;
      case 'text': return <FileText size={20} color={theme.primary} />;
      default: return <FileText size={20} color={theme.primary} />;
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
      backgroundColor: theme.primary + '20',
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
    details: {
      fontSize: 12,
      color: theme.mutedForeground,
      marginTop: 2,
    },
  });

  return (
    <View style={styles.itemContainer}>
      <View style={styles.iconContainer}>
        {getIcon()}
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.details}>
          {type.toUpperCase()} • {size} • {lastUpdated}
        </Text>
      </View>
    </View>
  );
};

interface KnowledgeModalProps {
  visible: boolean;
  onClose: () => void;
}

export const KnowledgeModal: React.FC<KnowledgeModalProps> = ({ visible, onClose }) => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [knowledgeItems] = useState<KnowledgeItemProps[]>([
    { id: '1', name: 'Company Handbook.pdf', type: 'document', size: '2.4 MB', lastUpdated: '2 days ago' },
    { id: '2', name: 'API Documentation', type: 'url', size: 'Online', lastUpdated: '1 week ago' },
    { id: '3', name: 'Product Specifications', type: 'text', size: '1.2 KB', lastUpdated: '3 days ago' },
    { id: '4', name: 'User Manual.docx', type: 'document', size: '5.1 MB', lastUpdated: '1 month ago' },
  ]);

  const filteredItems = knowledgeItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    searchBarContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderRadius: 10,
      paddingHorizontal: 15,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: theme.border,
    },
    searchInput: {
      flex: 1,
      height: 40,
      color: theme.foreground,
      marginLeft: 10,
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
                <Database size={16} color={theme.primary} />
              </View>
              <Text style={styles.headerText}>Knowledge</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color={theme.mutedForeground} />
            </TouchableOpacity>
          </View>

          <View style={styles.titleContainer}>
            <Text style={styles.title}>Knowledge Base</Text>
            <Text style={styles.subtitle}>Manage documents and data sources for your agent</Text>
          </View>

          <View style={styles.searchBarContainer}>
            <Database size={20} color={theme.mutedForeground} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search knowledge base..."
              placeholderTextColor={theme.mutedForeground}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <TouchableOpacity style={styles.addButton}>
            <Plus size={16} color={theme.background} />
            <Text style={styles.addButtonText}>Add Knowledge Source</Text>
          </TouchableOpacity>

          <ScrollView contentContainerStyle={styles.scrollViewContent}>
            {filteredItems.length === 0 ? (
              <View style={styles.emptyState}>
                <Database size={48} color={theme.mutedForeground} />
                <Text style={styles.emptyStateText}>No knowledge sources found</Text>
              </View>
            ) : (
              filteredItems.map(item => (
                <KnowledgeItem
                  key={item.id}
                  id={item.id}
                  name={item.name}
                  type={item.type}
                  size={item.size}
                  lastUpdated={item.lastUpdated}
                />
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
