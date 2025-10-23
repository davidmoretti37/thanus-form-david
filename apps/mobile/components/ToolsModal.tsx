import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput, Switch, ActivityIndicator, Alert } from 'react-native';
import { useTheme } from '@/hooks/useThemeColor';
import { X, Search, Folder, Terminal, Globe, Users, Building2, ArrowRight, Server, Zap, ChevronDown, ChevronRight, Settings2 } from 'lucide-react-native';
import { toolsService, AgentTool } from '@/services/toolsService';

interface ToolMethod {
  name: string;
  display_name: string;
  description: string;
  enabled: boolean;
  is_core: boolean;
  visible: boolean;
}

interface ToolGroup {
  name: string;
  display_name: string;
  description: string;
  icon: string;
  color: string;
  tool_class: string;
  methods: ToolMethod[];
  enabled: boolean;
  is_core: boolean;
  visible: boolean;
  weight: number;
}

interface ToolItemProps {
  icon: React.ComponentType<any>;
  name: string;
  description: string;
  capabilitiesEnabled?: string;
  isEnabled: boolean;
  onToggle?: (id: string, isEnabled: boolean) => void;
  id: string;
  toolGroup?: ToolGroup;
  expandedGroups: Set<string>;
  onToggleExpansion: (toolName: string) => void;
  onMethodToggle?: (toolName: string, methodName: string, enabled: boolean) => void;
}

const ToolItem: React.FC<ToolItemProps> = ({
  icon: Icon,
  name,
  description,
  capabilitiesEnabled,
  isEnabled,
  onToggle,
  id,
  toolGroup,
  expandedGroups,
  onToggleExpansion,
  onMethodToggle,
}) => {
  const theme = useTheme();
  const isExpanded = expandedGroups.has(id);
  const hasGranularControl = toolGroup && toolGroup.methods && toolGroup.methods.length > 1;
  const enabledMethodsCount = toolGroup ? toolGroup.methods.filter(m => m.enabled).length : 0;
  const totalMethodsCount = toolGroup ? toolGroup.methods.length : 0;

  const itemStyles = StyleSheet.create({
    itemContainer: {
      backgroundColor: theme.card,
      borderRadius: 10,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
    },
    mainRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
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
      marginBottom: 4,
    },
    description: {
      fontSize: 13,
      color: theme.mutedForeground,
      lineHeight: 18,
    },
    capabilitiesText: {
      fontSize: 12,
      color: theme.primary,
      marginTop: 4,
      fontWeight: '500',
    },
    controlsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    expandButton: {
      padding: 4,
    },
    methodsContainer: {
      borderTopWidth: 1,
      borderTopColor: theme.border,
      padding: 16,
      paddingTop: 12,
    },
    methodsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      gap: 8,
    },
    methodsHeaderText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.mutedForeground,
    },
    methodItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingLeft: 16,
    },
    methodTextContainer: {
      flex: 1,
    },
    methodName: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.foreground,
      marginBottom: 2,
    },
    methodDescription: {
      fontSize: 12,
      color: theme.mutedForeground,
      lineHeight: 16,
    },
    coreBadge: {
      backgroundColor: theme.primary + '20',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      marginLeft: 8,
    },
    coreBadgeText: {
      fontSize: 10,
      fontWeight: '500',
      color: theme.primary,
    },
  });

  const isMethodEnabled = (methodName: string): boolean => {
    if (!toolGroup) return false;
    const method = toolGroup.methods.find(m => m.name === methodName);
    return method ? method.enabled : false;
  };

  return (
    <View style={itemStyles.itemContainer}>
      <View style={itemStyles.mainRow}>
        <View style={itemStyles.iconContainer}>
          <Icon size={20} color={theme.primary} />
        </View>
        <View style={itemStyles.textContainer}>
          <Text style={itemStyles.name}>{name}</Text>
          <Text style={itemStyles.description}>{description}</Text>
          {hasGranularControl && isEnabled && (
            <Text style={itemStyles.capabilitiesText}>
              {enabledMethodsCount} / {totalMethodsCount} capabilities enabled
            </Text>
          )}
        </View>
        <View style={itemStyles.controlsContainer}>
          {hasGranularControl && (
            <TouchableOpacity
              style={itemStyles.expandButton}
              onPress={() => onToggleExpansion(id)}
              disabled={!isEnabled}
            >
              {isExpanded ? (
                <ChevronDown size={16} color={isEnabled ? theme.foreground : theme.mutedForeground} />
              ) : (
                <ChevronRight size={16} color={isEnabled ? theme.foreground : theme.mutedForeground} />
              )}
            </TouchableOpacity>
          )}
          <Switch
            trackColor={{ false: theme.muted, true: theme.primary }}
            thumbColor={isEnabled ? theme.background : theme.foreground}
            onValueChange={(newValue) => onToggle && onToggle(id, newValue)}
            value={isEnabled}
          />
        </View>
      </View>

      {hasGranularControl && isExpanded && isEnabled && toolGroup && (
        <View style={itemStyles.methodsContainer}>
          <View style={itemStyles.methodsHeader}>
            <Settings2 size={16} color={theme.mutedForeground} />
            <Text style={itemStyles.methodsHeaderText}>Individual Capabilities</Text>
          </View>
          {toolGroup.methods
            .filter(method => method.visible !== false)
            .map((method) => (
              <View key={method.name} style={itemStyles.methodItem}>
                <View style={itemStyles.methodTextContainer}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={itemStyles.methodName}>{method.display_name}</Text>
                    {method.is_core && (
                      <View style={itemStyles.coreBadge}>
                        <Text style={itemStyles.coreBadgeText}>Core</Text>
                      </View>
                    )}
                  </View>
                  <Text style={itemStyles.methodDescription}>{method.description}</Text>
                </View>
                <Switch
                  value={isMethodEnabled(method.name)}
                  onValueChange={(value) => onMethodToggle?.(id, method.name, value)}
                  trackColor={{ false: theme.muted, true: theme.primary }}
                  thumbColor={isMethodEnabled(method.name) ? theme.background : theme.foreground}
                  disabled={method.is_core}
                />
              </View>
            ))}
        </View>
      )}
    </View>
  );
};

interface ToolsModalProps {
  visible: boolean;
  onClose: () => void;
  selectedAgent?: {
    id: string;
    name: string;
  } | null;
}

export const ToolsModal: React.FC<ToolsModalProps> = ({ visible, onClose, selectedAgent }) => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [tools, setTools] = useState<Array<{
    id: string;
    icon: React.ComponentType<any>;
    name: string;
    description: string;
    capabilitiesEnabled?: string;
    isEnabled: boolean;
    server?: string;
    category: 'agentpress' | 'mcp';
    toolGroup?: ToolGroup;
  }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  console.log('🔧 ToolsModal: Rendered with visible:', visible, 'selectedAgent:', selectedAgent);

  // Load tools when modal opens
  useEffect(() => {
    if (visible && selectedAgent) {
      loadTools();
    }
  }, [visible, selectedAgent]);

  const loadTools = async () => {
    if (!selectedAgent) return;
    
    console.log('🔧 ToolsModal: Starting to load tools for agent:', selectedAgent);
    setIsLoading(true);
    setError(null);
    
    try {
      // Get all available tools metadata first
      let allTools: Record<string, any> = {};
      try {
        console.log('🔧 ToolsModal: Calling toolsService.getAllTools()');
        allTools = await toolsService.getAllTools();
        console.log('🔧 ToolsModal: Got tools from API:', Object.keys(allTools).length, 'tools');
      } catch (err) {
        console.log('🔧 ToolsModal: Failed to fetch tools from API, using fallback tools');
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tools';
        
        // Don't show authentication errors for tools since they work without auth
        console.log('🔧 ToolsModal: Tools API error:', errorMessage);
        
        // Fallback tools if API is not accessible for other reasons
        allTools = {
          'sb_files_tool': {
            name: 'sb_files_tool',
            description: 'File operations and management',
            methods: { 'create_file': {}, 'read_file': {}, 'list_files': {} }
          },
          'sb_shell_tool': {
            name: 'sb_shell_tool', 
            description: 'Shell commands and terminal operations',
            methods: { 'execute_command': {}, 'run_script': {} }
          },
          'web_search_tool': {
            name: 'web_search_tool',
            description: 'Search the web for information',
            methods: { 'search': {}, 'scrape': {} }
          },
          'people_search_tool': {
            name: 'people_search_tool',
            description: 'Search for people and professional profiles',
            methods: { 'search_people': {} }
          },
          'company_search_tool': {
            name: 'company_search_tool',
            description: 'Search for companies and business information',
            methods: { 'search_companies': {} }
          }
        };
      }
      
      // Get current agent configuration to see which tools are enabled
      let agentTools = { agentpress_tools: [], mcp_tools: [] };
      try {
        agentTools = await toolsService.getAgentTools(selectedAgent.id);
      } catch (err) {
        console.log('No existing agent configuration, starting fresh');
      }
      
      // Create a map of enabled tools for quick lookup
      const enabledTools = new Set<string>();
      agentTools.agentpress_tools.forEach(tool => {
        if (tool.enabled) enabledTools.add(tool.name);
      });
      agentTools.mcp_tools.forEach(tool => {
        if (tool.enabled) enabledTools.add(tool.name);
      });

      // Convert all available tools to the UI format
      const combinedTools: Array<{
        id: string;
        icon: React.ComponentType<any>;
        name: string;
        description: string;
        capabilitiesEnabled?: string;
        isEnabled: boolean;
        server?: string;
        category: 'agentpress' | 'mcp';
        toolGroup?: ToolGroup;
      }> = [];

      // Add all available AgentPress tools
      Object.entries(allTools).forEach(([toolName, toolMetadata]) => {
        // Skip MCP tools for now, they'll be added separately
        if (toolName.startsWith('mcp_') || toolName.includes('composio')) return;
        
        // Create ToolGroup from metadata
        const toolGroup: ToolGroup = {
          name: toolName,
          display_name: toolMetadata?.display_name || formatToolName(toolName),
          description: toolMetadata?.description || `AgentPress tool: ${formatToolName(toolName)}`,
          icon: toolMetadata?.icon || 'wrench',
          color: toolMetadata?.color || theme.primary,
          tool_class: toolMetadata?.tool_class || 'agentpress',
          methods: toolMetadata?.methods ? (Array.isArray(toolMetadata.methods) 
            ? toolMetadata.methods.map((method: any) => ({
                name: method.name,
                display_name: method.display_name || method.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                description: method.description || `Method: ${method.name}`,
                enabled: method.enabled ?? true,
                is_core: method.is_core ?? false,
                visible: method.visible ?? true,
              }))
            : Object.entries(toolMetadata.methods).map(([methodName, methodData]: [string, any]) => ({
                name: methodName,
                display_name: methodData?.display_name || methodName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                description: methodData?.description || `Method: ${methodName}`,
                enabled: methodData?.enabled ?? true,
                is_core: methodData?.is_core ?? false,
                visible: methodData?.visible ?? true,
              }))
          ) : [],
          enabled: enabledTools.has(toolName),
          is_core: toolMetadata?.is_core ?? false,
          visible: toolMetadata?.visible ?? true,
          weight: toolMetadata?.weight ?? 100,
        };
        
        console.log('🔧 Tool:', toolName, 'Methods:', toolGroup.methods.length, toolGroup.methods);
        
        combinedTools.push({
          id: `agentpress-${toolName}`,
          icon: getToolIcon(toolName),
          name: formatToolName(toolName),
          description: toolMetadata?.description || `AgentPress tool: ${formatToolName(toolName)}`,
          capabilitiesEnabled: toolGroup.methods.length > 0 ? `${toolGroup.methods.length} capabilities available` : undefined,
          isEnabled: enabledTools.has(toolName),
          category: 'agentpress',
          toolGroup,
        });
      });

      // Add MCP tools from agent configuration (these are integration-specific)
      agentTools.mcp_tools.forEach(tool => {
        combinedTools.push({
          id: `mcp-${tool.name}`,
          icon: getToolIcon(tool.name, tool.server),
          name: tool.name,
          description: tool.description || `MCP tool from ${tool.server || 'unknown server'}`,
          capabilitiesEnabled: tool.server ? `From ${tool.server}` : undefined,
          isEnabled: tool.enabled,
          server: tool.server,
          category: 'mcp',
        });
      });

      setTools(combinedTools);
    } catch (err) {
      console.error('Error loading tools:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load tools';
      
      if (errorMessage.includes('log in') || errorMessage.includes('authentication')) {
        setError('Please log in to view tools');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatToolName = (toolName: string): string => {
    // Convert snake_case to Title Case
    return toolName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .replace(/Sb /g, '') // Remove "Sb" prefix
      .replace(/Tool$/, ''); // Remove "Tool" suffix
  };

  const getToolIcon = (toolName: string, server?: string): React.ComponentType<any> => {
    // Map tool names to icons
    const iconMap: Record<string, React.ComponentType<any>> = {
      'file': Folder,
      'files': Folder,
      'shell': Terminal,
      'web': Globe,
      'search': Globe,
      'people': Users,
      'company': Building2,
      'gmail': Globe,
      'slack': Users,
      'notion': Building2,
      'github': Terminal,
      'google_drive': Folder,
      'browser': Globe,
      'image': Globe,
      'video': Globe,
      'presentation': Building2,
      'upload': Folder,
      'vision': Globe,
      'task': Building2,
      'message': Users,
      'agent': Users,
      'data': Building2,
    };

    // Check for partial matches
    const lowerName = toolName.toLowerCase();
    for (const [key, icon] of Object.entries(iconMap)) {
      if (lowerName.includes(key)) {
        return icon;
      }
    }

    // Default icons based on server
    if (server) {
      return Server;
    }
    
    return Zap; // Default icon
  };

  const filteredTools = tools.filter(tool =>
    tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggle = (id: string, isEnabled: boolean) => {
    setTools(prevTools =>
      prevTools.map(tool => (tool.id === id ? { ...tool, isEnabled } : tool))
    );
    setHasChanges(true);
  };

  const handleToggleExpansion = (toolName: string) => {
    console.log('🔧 Toggle expansion for tool:', toolName);
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(toolName)) {
        newSet.delete(toolName);
        console.log('🔧 Collapsed tool:', toolName);
      } else {
        newSet.add(toolName);
        console.log('🔧 Expanded tool:', toolName);
      }
      console.log('🔧 New expanded groups:', Array.from(newSet));
      return newSet;
    });
  };

  const handleMethodToggle = (toolName: string, methodName: string, enabled: boolean) => {
    setTools(prevTools =>
      prevTools.map(tool => {
        if (tool.id === toolName && tool.toolGroup) {
          const updatedToolGroup = {
            ...tool.toolGroup,
            methods: tool.toolGroup.methods.map(method =>
              method.name === methodName ? { ...method, enabled } : method
            ),
          };
          return { ...tool, toolGroup: updatedToolGroup };
        }
        return tool;
      })
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!selectedAgent) return;
    
    try {
      setIsLoading(true);
      
      // Separate tools by category and only include enabled ones
      const agentpressTools = tools
        .filter(tool => tool.category === 'agentpress' && tool.isEnabled)
        .map(tool => ({
          name: tool.name,
          enabled: true, // Only save enabled tools
        }));

      const mcpTools = tools
        .filter(tool => tool.category === 'mcp' && tool.isEnabled)
        .map(tool => ({
          name: tool.name,
          enabled: true, // Only save enabled tools
          server: tool.server,
        }));

      // Update tools in backend
      await toolsService.updateAgentTools(selectedAgent.id, {
        agentpress_tools: agentpressTools,
        mcp_tools: mcpTools,
      });

      setHasChanges(false);
      Alert.alert('Success', `Updated ${selectedAgent.name}'s tools successfully!`);
    } catch (error) {
      console.error('Error saving tools:', error);
      Alert.alert('Error', `Failed to save tools: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const enabledToolsCount = tools.filter(tool => tool.isEnabled).length;

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
      marginBottom: 15,
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
    toolsEnabledText: {
      fontSize: 14,
      color: theme.mutedForeground,
      alignSelf: 'flex-end',
      marginBottom: 10,
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
    scrollViewContent: {
      paddingBottom: 20,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 20,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      paddingTop: 15,
    },
    cancelButton: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 10,
      marginRight: 10,
    },
    cancelButtonText: {
      color: theme.foreground,
      fontSize: 16,
      fontWeight: '600',
    },
    saveButton: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 10,
      backgroundColor: theme.primary,
    },
    saveButtonText: {
      color: theme.background,
      fontSize: 16,
      fontWeight: '600',
    },
    saveButtonDisabled: {
      backgroundColor: theme.muted,
      opacity: 0.6,
    },
    errorContainer: {
      backgroundColor: theme.destructive + '10',
      borderWidth: 1,
      borderColor: theme.destructive + '30',
      borderRadius: 8,
      padding: 12,
      marginBottom: 15,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    errorText: {
      fontSize: 14,
      color: theme.destructive,
      flex: 1,
      marginRight: 12,
    },
    retryButton: {
      backgroundColor: theme.destructive,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    retryButtonText: {
      fontSize: 12,
      color: theme.background,
      fontWeight: '500',
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
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
    },
    emptyStateText: {
      fontSize: 14,
      color: theme.mutedForeground,
      textAlign: 'center',
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
            <Text style={styles.headerText}>Tool Configuration</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color={theme.mutedForeground} />
            </TouchableOpacity>
          </View>

          <View style={styles.titleContainer}>
            <Text style={styles.title}>Tool Configuration</Text>
            <Text style={styles.subtitle}>
              {selectedAgent 
                ? `Select which tools ${selectedAgent.name} can use` 
                : 'Select which tools your agent can use'
              }
            </Text>
          </View>

          <Text style={styles.toolsEnabledText}>{enabledToolsCount} / {tools.length} tools enabled</Text>

          {/* Error Display */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={loadTools} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.searchBarContainer}>
            <Search size={20} color={theme.mutedForeground} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search tools and capabilities..."
              placeholderTextColor={theme.mutedForeground}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <ScrollView contentContainerStyle={styles.scrollViewContent}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={styles.loadingText}>Loading tools...</Text>
              </View>
            ) : filteredTools.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No tools found</Text>
              </View>
            ) : (
              filteredTools.map(tool => (
                <ToolItem
                  key={tool.id}
                  id={tool.id}
                  icon={tool.icon}
                  name={tool.name}
                  description={tool.description}
                  capabilitiesEnabled={tool.capabilitiesEnabled}
                  isEnabled={tool.isEnabled}
                  onToggle={handleToggle}
                  toolGroup={tool.toolGroup}
                  expandedGroups={expandedGroups}
                  onToggleExpansion={handleToggleExpansion}
                  onMethodToggle={handleMethodToggle}
                />
              ))
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleSave} 
              style={[styles.saveButton, (!hasChanges || isLoading) && styles.saveButtonDisabled]}
              disabled={!hasChanges || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={theme.background} />
              ) : (
                <Text style={styles.saveButtonText}>
                  {hasChanges ? 'Save Changes' : 'No Changes'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
