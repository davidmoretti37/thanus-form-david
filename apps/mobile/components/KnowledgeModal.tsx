import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useTheme } from '@/hooks/useThemeColor';
import { X, Database, Plus, FileText, Upload, Folder, FolderPlus, Trash2, Edit3, ChevronRight, ChevronDown, MoreVertical, Search } from 'lucide-react-native';
import { knowledgeService, KnowledgeFolder, KnowledgeEntry } from '@/services/knowledgeService';
import * as DocumentPicker from 'expo-document-picker';

interface TreeItem {
  id: string;
  type: 'folder' | 'file';
  name: string;
  parentId?: string;
  data?: KnowledgeFolder | KnowledgeEntry;
  children?: TreeItem[];
  expanded?: boolean;
  level?: number;
}

interface TreeItemProps {
  item: TreeItem;
  onPress: (item: TreeItem) => void;
  onToggleExpand: (item: TreeItem) => void;
  onDelete: (item: TreeItem) => void;
  onEdit: (item: TreeItem) => void;
  onUpload: (folderId: string) => void;
}

const TreeItemComponent: React.FC<TreeItemProps> = ({ 
  item, 
  onPress, 
  onToggleExpand, 
  onDelete, 
  onEdit, 
  onUpload 
}) => {
  const theme = useTheme();
  
  const getIcon = () => {
    if (item.type === 'folder') {
      return <Folder size={20} color={theme.primary} />;
    } else {
      return <FileText size={20} color={theme.primary} />;
    }
  };

  const getExpandIcon = () => {
    if (item.type === 'folder') {
      return item.expanded ? 
        <ChevronDown size={16} color={theme.mutedForeground} /> : 
        <ChevronRight size={16} color={theme.mutedForeground} />;
    }
    return null;
  };

  const getFileSize = () => {
    if (item.type === 'file' && item.data && 'file_size' in item.data) {
      return knowledgeService.formatFileSize(item.data.file_size);
    }
    return '';
  };

  const getEntryCount = () => {
    if (item.type === 'folder' && item.data && 'entry_count' in item.data) {
      return item.data.entry_count;
    }
    return 0;
  };

  const getLastUpdated = () => {
    if (item.data && 'created_at' in item.data) {
      return knowledgeService.formatDate(item.data.created_at);
    }
    return '';
  };

  const styles = StyleSheet.create({
    itemContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginBottom: 4,
      borderWidth: 1,
      borderColor: theme.border,
      marginLeft: (item.level || 0) * 20,
    },
    expandButton: {
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    iconContainer: {
      width: 32,
      height: 32,
      borderRadius: 6,
      backgroundColor: theme.primary + '20',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    textContainer: {
      flex: 1,
    },
    name: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.foreground,
    },
    details: {
      fontSize: 12,
      color: theme.mutedForeground,
      marginTop: 2,
    },
    actionButtons: {
      flexDirection: 'row',
      gap: 4,
    },
    actionButton: {
      padding: 6,
      borderRadius: 4,
      backgroundColor: theme.mutedWithOpacity(0.1),
    },
  });

  return (
    <View>
      <TouchableOpacity 
        style={styles.itemContainer} 
        onPress={() => onPress(item)} 
        activeOpacity={0.7}
      >
        <TouchableOpacity 
          style={styles.expandButton} 
          onPress={() => onToggleExpand(item)}
          disabled={item.type !== 'folder'}
        >
          {getExpandIcon()}
        </TouchableOpacity>
        
        <View style={styles.iconContainer}>
          {getIcon()}
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.details}>
            {item.type === 'folder' 
              ? `${getEntryCount()} items • ${getLastUpdated()}`
              : `${getFileSize()} • ${getLastUpdated()}`
            }
          </Text>
        </View>
        
        <View style={styles.actionButtons}>
          {item.type === 'folder' && (
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => onUpload(item.id)}
            >
              <Upload size={14} color={theme.mutedForeground} />
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => onEdit(item)}
          >
            <Edit3 size={14} color={theme.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => onDelete(item)}
          >
            <Trash2 size={14} color={theme.destructive} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
      
      {/* Render children if expanded */}
      {item.expanded && item.children && (
        <View>
          {item.children.map(child => (
            <TreeItemComponent
              key={child.id}
              item={{ ...child, level: (item.level || 0) + 1 }}
              onPress={onPress}
              onToggleExpand={onToggleExpand}
              onDelete={onDelete}
              onEdit={onEdit}
              onUpload={onUpload}
            />
          ))}
        </View>
      )}
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
  const [treeData, setTreeData] = useState<TreeItem[]>([]);
  const [folders, setFolders] = useState<KnowledgeFolder[]>([]);
  const [folderEntries, setFolderEntries] = useState<{ [folderId: string]: KnowledgeEntry[] }>({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDescription, setNewFolderDescription] = useState('');

  // Load folders on modal open
  useEffect(() => {
    if (visible) {
      loadFolders();
    }
  }, [visible]);

  // Build tree structure when folders or entries change
  useEffect(() => {
    buildTree();
  }, [folders, folderEntries]);

  const buildTree = () => {
    const tree: TreeItem[] = folders.map(folder => {
      const existingFolder = treeData.find(item => item.id === folder.folder_id);
      const isExpanded = existingFolder?.expanded || false;

      return {
        id: folder.folder_id,
        type: 'folder' as const,
        name: folder.name,
        data: folder,
        children: folderEntries[folder.folder_id]?.map(entry => ({
          id: entry.entry_id,
          type: 'file' as const,
          name: entry.filename,
          parentId: folder.folder_id,
          data: entry,
        })) || [],
        expanded: isExpanded,
        level: 0,
      };
    });
    setTreeData(tree);
  };

  const loadFolders = async () => {
    try {
      setLoading(true);
      const foldersData = await knowledgeService.getFolders();
      setFolders(foldersData);
    } catch (error) {
      console.error('Error loading folders:', error);
      Alert.alert('Error', 'Failed to load knowledge base folders');
    } finally {
      setLoading(false);
    }
  };

  const loadFolderEntries = async (folderId: string) => {
    try {
      setLoading(true);
      const entriesData = await knowledgeService.getFolderEntries(folderId);
      setFolderEntries(prev => ({ ...prev, [folderId]: entriesData }));
    } catch (error) {
      console.error('Error loading entries:', error);
      Alert.alert('Error', 'Failed to load folder entries');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFolders();
    setRefreshing(false);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      Alert.alert('Error', 'Please enter a folder name');
      return;
    }

    try {
      setLoading(true);
      const newFolder = await knowledgeService.createFolder({
        name: newFolderName.trim(),
        description: newFolderDescription.trim() || undefined,
      });
      
      setFolders(prev => [newFolder, ...prev]);
      setNewFolderName('');
      setNewFolderDescription('');
      setShowCreateFolder(false);
      Alert.alert('Success', 'Folder created successfully');
    } catch (error) {
      console.error('Error creating folder:', error);
      Alert.alert('Error', 'Failed to create folder');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleExpand = (item: TreeItem) => {
    if (item.type === 'folder') {
      setTreeData(prev => 
        prev.map(folder => 
          folder.id === item.id 
            ? { ...folder, expanded: !folder.expanded }
            : folder
        )
      );

      // Load entries if expanding and not already loaded
      if (!item.expanded && !folderEntries[item.id]) {
        loadFolderEntries(item.id);
      }
    }
  };

  const handleItemPress = (item: TreeItem) => {
    if (item.type === 'folder') {
      handleToggleExpand(item);
    } else {
      // Handle file selection - could open preview modal
      console.log('File selected:', item.name);
    }
  };

  const handleDelete = (item: TreeItem) => {
    const itemName = item.name;
    const itemType = item.type === 'folder' ? 'Folder' : 'File';
    
    Alert.alert(
      `Delete ${itemType}`,
      `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              if (item.type === 'folder') {
                await knowledgeService.deleteFolder(item.id);
                setFolders(prev => prev.filter(f => f.folder_id !== item.id));
                setFolderEntries(prev => {
                  const newEntries = { ...prev };
                  delete newEntries[item.id];
                  return newEntries;
                });
              } else {
                await knowledgeService.deleteEntry(item.id);
                const parentId = item.parentId!;
                setFolderEntries(prev => ({
                  ...prev,
                  [parentId]: prev[parentId]?.filter(e => e.entry_id !== item.id) || []
                }));
                
                // Update folder entry count
                setFolders(prev => prev.map(f => 
                  f.folder_id === parentId 
                    ? { ...f, entry_count: Math.max(0, f.entry_count - 1) }
                    : f
                ));
              }
              
              Alert.alert('Success', `${itemType} deleted successfully`);
            } catch (error) {
              console.error(`Error deleting ${item.type}:`, error);
              Alert.alert('Error', `Failed to delete ${itemType.toLowerCase()}`);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleEdit = (item: TreeItem) => {
    if (item.type === 'folder') {
      // Handle folder editing
      Alert.prompt(
        'Edit Folder',
        'Enter new folder name:',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Save',
            onPress: async (newName) => {
              if (newName && newName.trim()) {
                try {
                  setLoading(true);
                  await knowledgeService.updateFolder(item.id, { name: newName.trim() });
                  setFolders(prev => prev.map(f => 
                    f.folder_id === item.id 
                      ? { ...f, name: newName.trim() }
                      : f
                  ));
                  Alert.alert('Success', 'Folder updated successfully');
                } catch (error) {
                  console.error('Error updating folder:', error);
                  Alert.alert('Error', 'Failed to update folder');
                } finally {
                  setLoading(false);
                }
              }
            },
          },
        ],
        'plain-text',
        item.name
      );
    } else {
      // Handle file editing (summary)
      const entry = item.data as KnowledgeEntry;
      Alert.prompt(
        'Edit Summary',
        'Enter new summary:',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Save',
            onPress: async (newSummary) => {
              if (newSummary && newSummary.trim()) {
                try {
                  setLoading(true);
                  await knowledgeService.updateEntry(item.id, { summary: newSummary.trim() });
                  setFolderEntries(prev => ({
                    ...prev,
                    [item.parentId!]: prev[item.parentId!]?.map(e => 
                      e.entry_id === item.id 
                        ? { ...e, summary: newSummary.trim() }
                        : e
                    ) || []
                  }));
                  Alert.alert('Success', 'Summary updated successfully');
                } catch (error) {
                  console.error('Error updating entry:', error);
                  Alert.alert('Error', 'Failed to update summary');
                } finally {
                  setLoading(false);
                }
              }
            },
          },
        ],
        'plain-text',
        entry.summary
      );
    }
  };

  const handleUpload = async (folderId: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];
        setLoading(true);
        
        // Create a File object from the document picker result
        const response = await fetch(file.uri);
        const blob = await response.blob();
        const fileObj = new File([blob], file.name, { type: file.mimeType || 'application/octet-stream' });
        
        const newEntry = await knowledgeService.uploadFile(folderId, fileObj);
        setFolderEntries(prev => ({
          ...prev,
          [folderId]: [newEntry, ...(prev[folderId] || [])]
        }));
        
        // Update folder entry count
        setFolders(prev => prev.map(f => 
          f.folder_id === folderId 
            ? { ...f, entry_count: f.entry_count + 1 }
            : f
        ));
        
        Alert.alert('Success', 'File uploaded successfully');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      Alert.alert('Error', 'Failed to upload file');
    } finally {
      setLoading(false);
    }
  };

  const filteredTreeData = treeData.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.children && item.children.some(child => 
      child.name.toLowerCase().includes(searchQuery.toLowerCase())
    ))
  );

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
    actionButtons: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 15,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.primary,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
      flex: 1,
    },
    addButtonText: {
      color: theme.background,
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 8,
    },
    uploadButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.secondary,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
      flex: 1,
    },
    uploadButtonText: {
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
    createFolderContainer: {
      backgroundColor: theme.card,
      borderRadius: 10,
      padding: 16,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: theme.border,
    },
    createFolderTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.foreground,
      marginBottom: 10,
    },
    inputContainer: {
      marginBottom: 10,
    },
    inputLabel: {
      fontSize: 14,
      color: theme.foreground,
      marginBottom: 5,
    },
    textInput: {
      backgroundColor: theme.background,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: theme.border,
      color: theme.foreground,
    },
    createFolderButtons: {
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
                <Database size={16} color={theme.primary} />
              </View>
              <Text style={styles.headerText}>Knowledge Base</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color={theme.mutedForeground} />
            </TouchableOpacity>
          </View>

          <View style={styles.titleContainer}>
            <Text style={styles.title}>Organize Documents</Text>
            <Text style={styles.subtitle}>Manage files and folders for AI agents to search and reference</Text>
          </View>

          <View style={styles.searchBarContainer}>
            <Search size={20} color={theme.mutedForeground} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search knowledge base..."
              placeholderTextColor={theme.mutedForeground}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setShowCreateFolder(true)}
            >
              <FolderPlus size={16} color={theme.background} />
              <Text style={styles.addButtonText}>New Folder</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.uploadButton}
              onPress={() => {
                if (folders.length === 0) {
                  Alert.alert('No Folders', 'Please create a folder first before uploading files.');
                  return;
                }
                // Show folder selection for upload
                const folderNames = folders.map(f => f.name);
                Alert.alert(
                  'Select Folder',
                  'Choose a folder to upload files to:',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    ...folderNames.map((name, index) => ({
                      text: name,
                      onPress: () => handleUpload(folders[index].folder_id)
                    }))
                  ]
                );
              }}
            >
              <Upload size={16} color={theme.background} />
              <Text style={styles.uploadButtonText}>Upload File</Text>
            </TouchableOpacity>
          </View>

          {showCreateFolder && (
            <View style={styles.createFolderContainer}>
              <Text style={styles.createFolderTitle}>Create New Folder</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Folder Name</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter folder name"
                  placeholderTextColor={theme.mutedForeground}
                  value={newFolderName}
                  onChangeText={setNewFolderName}
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Description (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter folder description"
                  placeholderTextColor={theme.mutedForeground}
                  value={newFolderDescription}
                  onChangeText={setNewFolderDescription}
                  multiline
                />
              </View>
              <View style={styles.createFolderButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowCreateFolder(false);
                    setNewFolderName('');
                    setNewFolderDescription('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.createButton}
                  onPress={handleCreateFolder}
                  disabled={loading}
                >
                  <Text style={styles.createButtonText}>
                    {loading ? 'Creating...' : 'Create'}
                  </Text>
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
            {loading && treeData.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={styles.loadingText}>Loading knowledge base...</Text>
              </View>
            ) : filteredTreeData.length === 0 ? (
              <View style={styles.emptyState}>
                <Database size={48} color={theme.mutedForeground} />
                <Text style={styles.emptyStateText}>
                  {searchQuery ? 'No items found matching your search' : 'No knowledge base items yet'}
                </Text>
                {!searchQuery && (
                  <Text style={[styles.emptyStateText, { marginTop: 8, fontSize: 14 }]}>
                    Create a folder and upload some files to get started
                  </Text>
                )}
              </View>
            ) : (
              filteredTreeData.map(item => (
                <TreeItemComponent
                  key={item.id}
                  item={item}
                  onPress={handleItemPress}
                  onToggleExpand={handleToggleExpand}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  onUpload={handleUpload}
                />
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
