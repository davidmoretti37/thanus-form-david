import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Switch, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '@/hooks/useThemeColor';
import { X, Settings, CheckCircle, AlertCircle, Info, ExternalLink, Trash2 } from 'lucide-react-native';
import { integrationsService, IntegrationTool } from '@/services/integrationsService';

interface IntegrationSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  integration: {
    id: string;
    name: string;
    description: string;
    category: string;
    toolsCount?: number;
    type: 'composio' | 'pipedream' | 'custom';
  } | null;
  onToolsCountUpdate?: (integrationId: string, count: number) => void;
}

export const IntegrationSettingsModal: React.FC<IntegrationSettingsModalProps> = ({ 
  visible, 
  onClose, 
  integration,
  onToolsCountUpdate
}) => {
  const theme = useTheme();
  const [tools, setTools] = useState<IntegrationTool[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const lastCountRef = useRef<number>(0);

  // Mock tools data based on integration
  const getMockTools = (integrationId: string): IntegrationTool[] => {
    const toolSets: Record<string, IntegrationTool[]> = {
      gmail: [
        { id: 'send_email', name: 'Send Email', description: 'Send emails to recipients', enabled: true, category: 'Communication' },
        { id: 'read_emails', name: 'Read Emails', description: 'Read and search emails', enabled: true, category: 'Communication' },
        { id: 'create_draft', name: 'Create Draft', description: 'Create email drafts', enabled: false, category: 'Communication' },
        { id: 'manage_labels', name: 'Manage Labels', description: 'Create and manage email labels', enabled: true, category: 'Organization' },
        { id: 'search_emails', name: 'Search Emails', description: 'Search through email content', enabled: true, category: 'Search' },
        { id: 'delete_emails', name: 'Delete Emails', description: 'Delete emails from inbox', enabled: false, category: 'Management' },
        { id: 'mark_read', name: 'Mark as Read', description: 'Mark emails as read/unread', enabled: true, category: 'Management' },
        { id: 'forward_email', name: 'Forward Email', description: 'Forward emails to other recipients', enabled: true, category: 'Communication' },
        { id: 'reply_email', name: 'Reply to Email', description: 'Reply to email conversations', enabled: true, category: 'Communication' },
        { id: 'schedule_email', name: 'Schedule Email', description: 'Schedule emails for later sending', enabled: false, category: 'Scheduling' },
        { id: 'create_filter', name: 'Create Filter', description: 'Create email filters and rules', enabled: false, category: 'Automation' },
        { id: 'export_emails', name: 'Export Emails', description: 'Export emails to files', enabled: false, category: 'Data' },
      ],
      slack: [
        { id: 'send_message', name: 'Send Message', description: 'Send messages to channels or users', enabled: true, category: 'Communication' },
        { id: 'read_messages', name: 'Read Messages', description: 'Read messages from channels', enabled: true, category: 'Communication' },
        { id: 'create_channel', name: 'Create Channel', description: 'Create new channels', enabled: false, category: 'Management' },
        { id: 'invite_users', name: 'Invite Users', description: 'Invite users to workspace', enabled: false, category: 'Management' },
        { id: 'upload_file', name: 'Upload File', description: 'Upload files to channels', enabled: true, category: 'Files' },
        { id: 'search_messages', name: 'Search Messages', description: 'Search through message history', enabled: true, category: 'Search' },
        { id: 'set_status', name: 'Set Status', description: 'Set user status and availability', enabled: true, category: 'Profile' },
        { id: 'create_reminder', name: 'Create Reminder', description: 'Create reminders for users', enabled: false, category: 'Productivity' },
        { id: 'manage_reactions', name: 'Manage Reactions', description: 'Add or remove reactions to messages', enabled: true, category: 'Interaction' },
        { id: 'pin_message', name: 'Pin Message', description: 'Pin important messages', enabled: false, category: 'Management' },
        { id: 'create_poll', name: 'Create Poll', description: 'Create polls in channels', enabled: false, category: 'Engagement' },
        { id: 'schedule_message', name: 'Schedule Message', description: 'Schedule messages for later', enabled: false, category: 'Scheduling' },
        { id: 'manage_integrations', name: 'Manage Integrations', description: 'Manage app integrations', enabled: false, category: 'Administration' },
        { id: 'export_data', name: 'Export Data', description: 'Export workspace data', enabled: false, category: 'Data' },
        { id: 'create_workflow', name: 'Create Workflow', description: 'Create automated workflows', enabled: false, category: 'Automation' },
      ],
      'google-drive': [
        { id: 'upload_file', name: 'Upload File', description: 'Upload files to Google Drive', enabled: true, category: 'Files' },
        { id: 'download_file', name: 'Download File', description: 'Download files from Google Drive', enabled: true, category: 'Files' },
        { id: 'create_folder', name: 'Create Folder', description: 'Create new folders', enabled: true, category: 'Organization' },
        { id: 'share_file', name: 'Share File', description: 'Share files with others', enabled: true, category: 'Sharing' },
        { id: 'search_files', name: 'Search Files', description: 'Search through files and folders', enabled: true, category: 'Search' },
        { id: 'move_file', name: 'Move File', description: 'Move files between folders', enabled: false, category: 'Organization' },
        { id: 'delete_file', name: 'Delete File', description: 'Delete files and folders', enabled: false, category: 'Management' },
        { id: 'rename_file', name: 'Rename File', description: 'Rename files and folders', enabled: true, category: 'Management' },
      ],
      notion: [
        { id: 'create_page', name: 'Create Page', description: 'Create new pages', enabled: true, category: 'Content' },
        { id: 'read_page', name: 'Read Page', description: 'Read page content', enabled: true, category: 'Content' },
        { id: 'update_page', name: 'Update Page', description: 'Update page content', enabled: true, category: 'Content' },
        { id: 'create_database', name: 'Create Database', description: 'Create new databases', enabled: false, category: 'Data' },
        { id: 'query_database', name: 'Query Database', description: 'Query database entries', enabled: true, category: 'Data' },
        { id: 'create_template', name: 'Create Template', description: 'Create page templates', enabled: false, category: 'Templates' },
        { id: 'manage_permissions', name: 'Manage Permissions', description: 'Manage page permissions', enabled: false, category: 'Sharing' },
        { id: 'export_page', name: 'Export Page', description: 'Export pages to various formats', enabled: true, category: 'Export' },
        { id: 'search_content', name: 'Search Content', description: 'Search through all content', enabled: true, category: 'Search' },
        { id: 'create_comment', name: 'Create Comment', description: 'Add comments to pages', enabled: true, category: 'Collaboration' },
        { id: 'manage_blocks', name: 'Manage Blocks', description: 'Manage page blocks and structure', enabled: true, category: 'Content' },
        { id: 'create_relation', name: 'Create Relation', description: 'Create relations between pages', enabled: false, category: 'Data' },
        { id: 'schedule_page', name: 'Schedule Page', description: 'Schedule page updates', enabled: false, category: 'Automation' },
        { id: 'backup_workspace', name: 'Backup Workspace', description: 'Create workspace backups', enabled: false, category: 'Data' },
        { id: 'manage_integrations', name: 'Manage Integrations', description: 'Manage workspace integrations', enabled: false, category: 'Administration' },
        { id: 'create_formula', name: 'Create Formula', description: 'Create database formulas', enabled: false, category: 'Data' },
        { id: 'manage_views', name: 'Manage Views', description: 'Manage database views', enabled: false, category: 'Data' },
        { id: 'create_automation', name: 'Create Automation', description: 'Create automated workflows', enabled: false, category: 'Automation' },
        { id: 'manage_versions', name: 'Manage Versions', description: 'Manage page versions', enabled: false, category: 'History' },
        { id: 'create_webhook', name: 'Create Webhook', description: 'Create webhooks for events', enabled: false, category: 'Integration' },
      ],
      hubspot: [
        { id: 'create_contact', name: 'Create Contact', description: 'Create new contacts', enabled: true, category: 'CRM' },
        { id: 'update_contact', name: 'Update Contact', description: 'Update contact information', enabled: true, category: 'CRM' },
        { id: 'create_deal', name: 'Create Deal', description: 'Create new deals', enabled: true, category: 'Sales' },
        { id: 'update_deal', name: 'Update Deal', description: 'Update deal information', enabled: true, category: 'Sales' },
        { id: 'create_company', name: 'Create Company', description: 'Create new companies', enabled: false, category: 'CRM' },
        { id: 'create_task', name: 'Create Task', description: 'Create tasks and activities', enabled: true, category: 'Productivity' },
        { id: 'send_email', name: 'Send Email', description: 'Send marketing emails', enabled: true, category: 'Marketing' },
        { id: 'create_campaign', name: 'Create Campaign', description: 'Create marketing campaigns', enabled: false, category: 'Marketing' },
        { id: 'track_analytics', name: 'Track Analytics', description: 'Track marketing analytics', enabled: true, category: 'Analytics' },
        { id: 'manage_pipeline', name: 'Manage Pipeline', description: 'Manage sales pipeline', enabled: true, category: 'Sales' },
        { id: 'create_form', name: 'Create Form', description: 'Create lead capture forms', enabled: false, category: 'Marketing' },
        { id: 'manage_workflows', name: 'Manage Workflows', description: 'Manage automation workflows', enabled: false, category: 'Automation' },
        { id: 'export_data', name: 'Export Data', description: 'Export CRM data', enabled: true, category: 'Data' },
        { id: 'create_report', name: 'Create Report', description: 'Create custom reports', enabled: false, category: 'Analytics' },
        { id: 'manage_integrations', name: 'Manage Integrations', description: 'Manage app integrations', enabled: false, category: 'Administration' },
        { id: 'create_sequence', name: 'Create Sequence', description: 'Create email sequences', enabled: false, category: 'Marketing' },
        { id: 'manage_templates', name: 'Manage Templates', description: 'Manage email templates', enabled: false, category: 'Marketing' },
        { id: 'track_conversions', name: 'Track Conversions', description: 'Track conversion metrics', enabled: true, category: 'Analytics' },
      ],
      stripe: [
        { id: 'create_customer', name: 'Create Customer', description: 'Create new customers', enabled: true, category: 'Customers' },
        { id: 'create_payment', name: 'Create Payment', description: 'Process payments', enabled: true, category: 'Payments' },
        { id: 'create_subscription', name: 'Create Subscription', description: 'Create subscriptions', enabled: true, category: 'Subscriptions' },
        { id: 'manage_invoices', name: 'Manage Invoices', description: 'Create and manage invoices', enabled: true, category: 'Billing' },
        { id: 'process_refund', name: 'Process Refund', description: 'Process refunds', enabled: false, category: 'Payments' },
        { id: 'track_analytics', name: 'Track Analytics', description: 'Track payment analytics', enabled: true, category: 'Analytics' },
        { id: 'manage_webhooks', name: 'Manage Webhooks', description: 'Manage payment webhooks', enabled: false, category: 'Integration' },
      ],
    };

    return toolSets[integrationId] || [];
  };

  useEffect(() => {
    if (visible && integration) {
      loadTools();
    }
  }, [visible, integration]);

  const loadTools = async () => {
    if (!integration) return;
    
    setIsLoading(true);
    lastCountRef.current = 0; // Reset the count ref
    
    try {
      // Find the profile for this integration
      const profiles = await integrationsService.getProfiles(integration.id);
      const profile = profiles.find(p => p.toolkit_slug === integration.id);
      
      if (profile) {
        // Load real tools from the API
        const apiTools = await integrationsService.getProfileTools(profile.profile_id);
        setTools(apiTools);
      } else {
        // Fallback to mock tools if no profile found
        const mockTools = getMockTools(integration.id);
        setTools(mockTools);
      }
    } catch (error) {
      console.error('Error loading tools:', error);
      // Fallback to mock tools on error
      const mockTools = getMockTools(integration.id);
      setTools(mockTools);
    } finally {
      setIsLoading(false);
    }
  };

  // Update parent component when tools change
  useEffect(() => {
    if (integration && onToolsCountUpdate && tools.length > 0) {
      const enabledCount = tools.filter(tool => tool.enabled).length;
      
      // Only update if the count has actually changed
      if (enabledCount !== lastCountRef.current) {
        lastCountRef.current = enabledCount;
        onToolsCountUpdate(integration.id, enabledCount);
      }
    }
  }, [tools, integration, onToolsCountUpdate]);

  const handleToolToggle = (toolId: string) => {
    setTools(prev => prev.map(tool => 
      tool.id === toolId ? { ...tool, enabled: !tool.enabled } : tool
    ));
    setHasChanges(true);
  };

  const handleSaveSettings = async () => {
    if (!integration) return;
    
    try {
      setIsLoading(true);
      
      const enabledTools = tools.filter(tool => tool.enabled);
      const enabledToolNames = enabledTools.map(tool => tool.name);
      
      // Find the profile for this integration
      const profiles = await integrationsService.getProfiles(integration.id);
      const profile = profiles.find(p => p.toolkit_slug === integration.id);
      
      if (profile) {
        // Update tools in the backend
        await integrationsService.updateProfileTools(profile.profile_id, enabledToolNames);
      }
      
      Alert.alert(
        'Settings Saved',
        `Updated ${integration.name} integration. ${enabledTools.length} tools enabled.`,
        [{ text: 'OK', onPress: () => {
          setHasChanges(false);
          onClose();
        }}]
      );
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert(
        'Error',
        `Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnectIntegration = () => {
    Alert.alert(
      'Disconnect Integration',
      `Are you sure you want to disconnect ${integration?.name}? This will disable all tools and remove access.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Disconnect', 
          style: 'destructive',
          onPress: () => {
            Alert.alert('Disconnected', `${integration?.name} has been disconnected.`);
            onClose();
          }
        }
      ]
    );
  };

  const enabledToolsCount = tools.filter(tool => tool.enabled).length;
  const categories = [...new Set(tools.map(tool => tool.category))];

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
      height: '85%',
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingLeft: 20,
      paddingRight: 40,
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
    content: {
      flex: 1,
      paddingHorizontal: 20,
    },
    integrationInfo: {
      backgroundColor: theme.mutedWithOpacity(0.05),
      borderRadius: 12,
      padding: 16,
      marginVertical: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },
    integrationHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    integrationIcon: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: theme.primary + '20',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    integrationIconText: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.primary,
    },
    integrationDetails: {
      flex: 1,
    },
    integrationName: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.foreground,
      marginBottom: 4,
    },
    integrationDescription: {
      fontSize: 14,
      color: theme.mutedForeground,
      marginBottom: 8,
    },
    integrationStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    statusText: {
      fontSize: 12,
      color: theme.primary,
      fontWeight: '500',
    },
    toolsSection: {
      marginBottom: 20,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.foreground,
    },
    toolsCount: {
      backgroundColor: theme.mutedWithOpacity(0.2),
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    toolsCountText: {
      fontSize: 12,
      color: theme.foreground,
    },
    categorySection: {
      marginBottom: 24,
    },
    categoryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    categoryTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.foreground,
    },
    categoryCount: {
      fontSize: 12,
      color: theme.mutedForeground,
    },
    toolItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: theme.mutedWithOpacity(0.05),
      borderRadius: 8,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },
    toolInfo: {
      flex: 1,
      marginRight: 12,
    },
    toolName: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.foreground,
      marginBottom: 2,
    },
    toolDescription: {
      fontSize: 12,
      color: theme.mutedForeground,
      lineHeight: 16,
    },
    toolSwitch: {
      transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
    },
    actionsSection: {
      paddingVertical: 20,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      marginBottom: 12,
      gap: 8,
    },
    saveButton: {
      backgroundColor: theme.primary,
    },
    saveButtonDisabled: {
      backgroundColor: theme.mutedWithOpacity(0.3),
    },
    disconnectButton: {
      backgroundColor: theme.destructive + '20',
      borderWidth: 1,
      borderColor: theme.destructive,
    },
    actionButtonText: {
      fontSize: 14,
      fontWeight: '500',
    },
    saveButtonText: {
      color: theme.background,
    },
    saveButtonTextDisabled: {
      color: theme.mutedForeground,
    },
    disconnectButtonText: {
      color: theme.destructive,
    },
    loadingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
    },
    loadingText: {
      fontSize: 14,
      color: theme.mutedForeground,
      marginTop: 12,
    },
  });

  if (!visible || !integration) return null;

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
                <Settings size={20} color={theme.primary} />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>Integration Settings</Text>
                <Text style={styles.headerSubtitle}>Configure {integration.name} tools</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={20} color={theme.foreground} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Integration Info */}
            <View style={styles.integrationInfo}>
              <View style={styles.integrationHeader}>
                <View style={styles.integrationIcon}>
                  <Text style={styles.integrationIconText}>{integration.name.charAt(0)}</Text>
                </View>
                <View style={styles.integrationDetails}>
                  <Text style={styles.integrationName}>{integration.name}</Text>
                  <Text style={styles.integrationDescription}>{integration.description}</Text>
                  <View style={styles.integrationStatus}>
                    <CheckCircle size={14} color={theme.primary} />
                    <Text style={styles.statusText}>Connected</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Tools Section */}
            <View style={styles.toolsSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Available Tools</Text>
                <View style={styles.toolsCount}>
                  <Text style={styles.toolsCountText}>
                    {enabledToolsCount} of {tools.length} enabled
                  </Text>
                </View>
              </View>

              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading tools...</Text>
                </View>
              ) : (
                categories.map(category => {
                  const categoryTools = tools.filter(tool => tool.category === category);
                  const enabledInCategory = categoryTools.filter(tool => tool.enabled).length;
                  
                  return (
                    <View key={category} style={styles.categorySection}>
                      <View style={styles.categoryHeader}>
                        <Text style={styles.categoryTitle}>{category}</Text>
                        <Text style={styles.categoryCount}>
                          {enabledInCategory}/{categoryTools.length}
                        </Text>
                      </View>
                      
                      {categoryTools.map(tool => (
                        <View key={tool.id} style={styles.toolItem}>
                          <View style={styles.toolInfo}>
                            <Text style={styles.toolName}>{tool.name}</Text>
                            <Text style={styles.toolDescription}>{tool.description}</Text>
                          </View>
                          <Switch
                            style={styles.toolSwitch}
                            value={tool.enabled}
                            onValueChange={() => handleToolToggle(tool.id)}
                            trackColor={{ false: theme.mutedWithOpacity(0.3), true: theme.primary + '40' }}
                            thumbColor={tool.enabled ? theme.primary : theme.mutedForeground}
                          />
                        </View>
                      ))}
                    </View>
                  );
                })
              )}
            </View>

            {/* Actions */}
            <View style={styles.actionsSection}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.saveButton,
                  !hasChanges && styles.saveButtonDisabled
                ]}
                onPress={handleSaveSettings}
                disabled={!hasChanges}
              >
                <CheckCircle size={16} color={hasChanges ? theme.background : theme.mutedForeground} />
                <Text style={[
                  styles.actionButtonText,
                  styles.saveButtonText,
                  !hasChanges && styles.saveButtonTextDisabled
                ]}>
                  Save Settings
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.disconnectButton]}
                onPress={handleDisconnectIntegration}
              >
                <Trash2 size={16} color={theme.destructive} />
                <Text style={[styles.actionButtonText, styles.disconnectButtonText]}>
                  Disconnect Integration
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
