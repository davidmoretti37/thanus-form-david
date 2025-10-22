import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { useTheme } from '@/hooks/useThemeColor';
import { X, Search, Zap, Server, Settings, ChevronDown, ChevronUp, ExternalLink, CheckCircle } from 'lucide-react-native';

interface IntegrationsModalProps {
  visible: boolean;
  onClose: () => void;
}

interface IntegrationApp {
  id: string;
  name: string;
  description: string;
  logo?: string;
  category: string;
  isConnected: boolean;
  toolsCount?: number;
  type: 'composio' | 'pipedream' | 'custom';
}

export const IntegrationsModal: React.FC<IntegrationsModalProps> = ({ visible, onClose }) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<'composio' | 'pipedream'>('composio');
  const [searchQuery, setSearchQuery] = useState('');
  const [showConnectedApps, setShowConnectedApps] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  console.log('IntegrationsModal rendered, visible:', visible);

  // Mock data for integrations
  const [integrations] = useState<IntegrationApp[]>([
    // Composio Apps
    {
      id: 'gmail',
      name: 'Gmail',
      description: 'Send and manage emails',
      category: 'communication',
      isConnected: true,
      toolsCount: 12,
      type: 'composio'
    },
    {
      id: 'google-drive',
      name: 'Google Drive',
      description: 'Access and manage files',
      category: 'productivity',
      isConnected: false,
      toolsCount: 8,
      type: 'composio'
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Team communication platform',
      category: 'communication',
      isConnected: true,
      toolsCount: 15,
      type: 'composio'
    },
    {
      id: 'notion',
      name: 'Notion',
      description: 'All-in-one workspace',
      category: 'productivity',
      isConnected: false,
      toolsCount: 20,
      type: 'composio'
    },
    {
      id: 'salesforce',
      name: 'Salesforce',
      description: 'Customer relationship management',
      category: 'crm',
      isConnected: false,
      toolsCount: 25,
      type: 'composio'
    },
    {
      id: 'hubspot',
      name: 'HubSpot',
      description: 'Marketing and sales platform',
      category: 'marketing',
      isConnected: true,
      toolsCount: 18,
      type: 'composio'
    },
    // Pipedream Apps
    {
      id: 'airtable',
      name: 'Airtable',
      description: 'Low-code platform for building apps',
      category: 'productivity',
      isConnected: false,
      toolsCount: 10,
      type: 'pipedream'
    },
    {
      id: 'zapier',
      name: 'Zapier',
      description: 'Automate workflows between apps',
      category: 'productivity',
      isConnected: false,
      toolsCount: 5,
      type: 'pipedream'
    },
    {
      id: 'stripe',
      name: 'Stripe',
      description: 'Online payment processing',
      category: 'analytics',
      isConnected: true,
      toolsCount: 7,
      type: 'pipedream'
    },
    {
      id: 'webhook',
      name: 'Webhook',
      description: 'Custom webhook integrations',
      category: 'custom',
      isConnected: false,
      toolsCount: 3,
      type: 'pipedream'
    }
  ]);

  const [connectedApps, setConnectedApps] = useState<IntegrationApp[]>([]);

  useEffect(() => {
    if (visible) {
      setIsLoading(true);
      // Simulate loading
      setTimeout(() => {
        setConnectedApps(integrations.filter(app => app.isConnected));
        setIsLoading(false);
      }, 1000);
    }
  }, [visible]);

  const filteredIntegrations = integrations.filter(app => {
    const matchesTab = app.type === activeTab;
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         app.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleConnectApp = (app: IntegrationApp) => {
    Alert.alert(
      'Connect App',
      `Connect ${app.name} to your agent?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Connect', 
          onPress: () => {
            // Simulate connection
            setConnectedApps(prev => [...prev, { ...app, isConnected: true }]);
            Alert.alert('Success', `${app.name} connected successfully!`);
          }
        }
      ]
    );
  };

  const handleDisconnectApp = (app: IntegrationApp) => {
    Alert.alert(
      'Disconnect App',
      `Disconnect ${app.name} from your agent?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Disconnect', 
          style: 'destructive',
          onPress: () => {
            setConnectedApps(prev => prev.filter(connectedApp => connectedApp.id !== app.id));
            Alert.alert('Success', `${app.name} disconnected successfully!`);
          }
        }
      ]
    );
  };

  const handleManageTools = (app: IntegrationApp) => {
    Alert.alert(
      'Manage Tools',
      `${app.name} has ${app.toolsCount} available tools. Configure which tools to enable for your agent.`,
      [{ text: 'OK' }]
    );
  };

  const renderAppCard = (app: IntegrationApp, isConnected: boolean = false) => (
    <TouchableOpacity
      key={app.id}
      style={[
        styles.appCard,
        isConnected && styles.connectedAppCard
      ]}
      onPress={() => isConnected ? handleManageTools(app) : handleConnectApp(app)}
      activeOpacity={0.7}
    >
      <View style={styles.appCardHeader}>
        <View style={styles.appIcon}>
          {app.logo ? (
            <Text style={styles.appIconText}>{app.name.charAt(0)}</Text>
          ) : (
            <Text style={styles.appIconText}>{app.name.charAt(0)}</Text>
          )}
        </View>
        <View style={styles.appInfo}>
          <Text style={styles.appName}>{app.name}</Text>
          <Text style={styles.appDescription} numberOfLines={2}>
            {app.description}
          </Text>
        </View>
        {isConnected && (
          <View style={styles.connectedIndicator}>
            <CheckCircle size={16} color={theme.primary} />
          </View>
        )}
      </View>
      
      <View style={styles.appCardFooter}>
        <View style={styles.toolsInfo}>
          <Text style={styles.toolsText}>
            {isConnected ? `${app.toolsCount} tools enabled` : `${app.toolsCount} tools available`}
          </Text>
        </View>
        {isConnected && (
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => handleManageTools(app)}
          >
            <Settings size={16} color={theme.foreground} />
          </TouchableOpacity>
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
      paddingHorizontal: 20,
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
    },
    tabContainer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      marginHorizontal: 4,
    },
    activeTab: {
      backgroundColor: theme.primary + '20',
    },
    tabText: {
      fontSize: 14,
      fontWeight: '500',
      marginLeft: 6,
    },
    activeTabText: {
      color: theme.primary,
    },
    inactiveTabText: {
      color: theme.mutedForeground,
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
    content: {
      flex: 1,
      paddingHorizontal: 20,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.foreground,
    },
    sectionBadge: {
      backgroundColor: theme.mutedWithOpacity(0.2),
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    sectionBadgeText: {
      fontSize: 12,
      color: theme.foreground,
    },
    connectedAppsSection: {
      marginBottom: 20,
    },
    connectedAppsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
    },
    connectedAppsTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.foreground,
    },
    chevronButton: {
      padding: 4,
    },
    appsGrid: {
      gap: 12,
    },
    appCard: {
      backgroundColor: theme.mutedWithOpacity(0.05),
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },
    connectedAppCard: {
      backgroundColor: theme.primary + '10',
      borderColor: theme.primary + '30',
    },
    appCardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    appIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: theme.primary + '20',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    appIconText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.primary,
    },
    appInfo: {
      flex: 1,
    },
    appName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.foreground,
      marginBottom: 4,
    },
    appDescription: {
      fontSize: 14,
      color: theme.mutedForeground,
      lineHeight: 18,
    },
    connectedIndicator: {
      marginLeft: 8,
    },
    appCardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    toolsInfo: {
      flex: 1,
    },
    toolsText: {
      fontSize: 12,
      color: theme.mutedForeground,
    },
    settingsButton: {
      padding: 8,
      borderRadius: 6,
      backgroundColor: theme.mutedWithOpacity(0.1),
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
                <Zap size={20} color={theme.primary} />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>Integrations</Text>
                <Text style={styles.headerSubtitle}>Connect and manage your apps</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={20} color={theme.foreground} />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'composio' && styles.activeTab]}
              onPress={() => setActiveTab('composio')}
            >
              <Zap size={16} color={activeTab === 'composio' ? theme.primary : theme.mutedForeground} />
              <Text style={[styles.tabText, activeTab === 'composio' ? styles.activeTabText : styles.inactiveTabText]}>
                Composio Apps
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'pipedream' && styles.activeTab]}
              onPress={() => setActiveTab('pipedream')}
            >
              <Server size={16} color={activeTab === 'pipedream' ? theme.primary : theme.mutedForeground} />
              <Text style={[styles.tabText, activeTab === 'pipedream' ? styles.activeTabText : styles.inactiveTabText]}>
                Pipedream Apps
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <View style={{ position: 'relative' }}>
              <Search size={16} color={theme.mutedForeground} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { paddingLeft: 40 }]}
                placeholder={`Search ${activeTab} apps...`}
                placeholderTextColor={theme.mutedForeground}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Connected Apps Section */}
            {connectedApps.length > 0 && (
              <View style={styles.connectedAppsSection}>
                <TouchableOpacity
                  style={styles.connectedAppsHeader}
                  onPress={() => setShowConnectedApps(!showConnectedApps)}
                >
                  <Text style={styles.connectedAppsTitle}>
                    Connected to this agent ({connectedApps.length})
                  </Text>
                  {showConnectedApps ? (
                    <ChevronUp size={20} color={theme.foreground} />
                  ) : (
                    <ChevronDown size={20} color={theme.foreground} />
                  )}
                </TouchableOpacity>
                
                {showConnectedApps && (
                  <View style={styles.appsGrid}>
                    {connectedApps.map(app => renderAppCard(app, true))}
                  </View>
                )}
              </View>
            )}

            {/* Available Apps Section */}
            <View>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {connectedApps.length > 0 ? 'Available Apps' : 'Browse Apps'}
                </Text>
                <View style={styles.sectionBadge}>
                  <Text style={styles.sectionBadgeText}>
                    {filteredIntegrations.length}
                  </Text>
                </View>
              </View>

              {isLoading ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>Loading apps...</Text>
                </View>
              ) : filteredIntegrations.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyStateIcon}>
                    <Search size={24} color={theme.mutedForeground} />
                  </View>
                  <Text style={styles.emptyStateTitle}>No apps found</Text>
                  <Text style={styles.emptyStateText}>
                    {searchQuery ? `No apps match "${searchQuery}"` : 'No apps available'}
                  </Text>
                </View>
              ) : (
                <View style={styles.appsGrid}>
                  {filteredIntegrations.map(app => renderAppCard(app))}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
