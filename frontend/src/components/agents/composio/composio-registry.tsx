import React, { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Zap, X, Settings, ChevronDown, ChevronUp, Loader2, Server, List, Sparkles } from 'lucide-react';
import { useComposioCategories, useComposioToolkitsInfinite } from '@/hooks/react-query/composio/use-composio';
import { useComposioProfiles } from '@/hooks/react-query/composio/use-composio-profiles';
import { useAgent } from '@/hooks/react-query/agents/use-agents';
import { useUpdateAgentMCPs } from '@/hooks/react-query/agents/use-update-agent-mcps';
import { usePipedreamPopularApps } from '@/hooks/react-query/pipedream/use-pipedream';
import { ComposioConnector } from './composio-connector';
import { ComposioToolsManager } from './composio-tools-manager';
import type { ComposioToolkit, ComposioProfile } from '@/hooks/react-query/composio/utils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CustomMCPDialog } from '../mcp/custom-mcp-dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { pipedreamApi } from '@/hooks/react-query/pipedream/utils';
import { PipedreamConnector } from '../pipedream/pipedream-connector';
import { ToolsManager } from '../mcp/tools-manager';

const CATEGORY_EMOJIS: Record<string, string> = {
  'popular': '🔥',
  'productivity': '📊',
  'crm': '👥',
  'marketing': '📢',
  'analytics': '📈',
  'communication': '💬',
  'project-management': '📋',
  'scheduling': '📅',
};

interface ConnectedApp {
  toolkit: ComposioToolkit;
  profile: ComposioProfile;
  mcpConfig: {
    name: string;
    type: string;
    config: Record<string, any>;
    enabledTools: string[];
  };
}

interface ComposioRegistryProps {
  onToolsSelected?: (profileId: string, selectedTools: string[], appName: string, appSlug: string) => void;
  onAppSelected?: (app: ComposioToolkit) => void;
  mode?: 'full' | 'profile-only';
  onClose?: () => void;
  showAgentSelector?: boolean;
  selectedAgentId?: string;
  onAgentChange?: (agentId: string | undefined) => void;
}

const getAgentConnectedApps = (
  agent: any,
  profiles: ComposioProfile[],
  toolkits: ComposioToolkit[]
): ConnectedApp[] => {
  if (!agent?.custom_mcps || !profiles?.length || !toolkits?.length) return [];

  const connectedApps: ConnectedApp[] = [];
  
  agent.custom_mcps.forEach((mcpConfig: any) => {
    if (mcpConfig.config?.profile_id) {
      const profile = profiles.find(p => p.profile_id === mcpConfig.config.profile_id);
      const toolkit = toolkits.find(t => t.slug === profile?.toolkit_slug);
      if (profile && toolkit) {
        connectedApps.push({
          toolkit,
          profile,
          mcpConfig
        });
      }
    }
  });

  return connectedApps;
};

const isAppConnectedToAgent = (
  agent: any,
  appSlug: string,
  profiles: ComposioProfile[]
): boolean => {
  if (!agent?.custom_mcps) return false;

  return agent.custom_mcps.some((mcpConfig: any) => {
    if (mcpConfig.config?.profile_id) {
      const profile = profiles.find(p => p.profile_id === mcpConfig.config.profile_id);
      return profile?.toolkit_slug === appSlug;
    }
    return false;
  });
};

const AppCardSkeleton = () => (
  <div className="border border-border/50 rounded-xl p-4">
    <div className="flex items-center gap-3 mb-3">
      <Skeleton className="w-10 h-10 rounded-lg" />
      <div className="flex-1">
        <Skeleton className="w-3/4 h-4 mb-2" />
        <Skeleton className="w-full h-3" />
      </div>
    </div>
    <div className="flex flex-wrap gap-1 mb-3">
      <Skeleton className="w-16 h-5" />
      <Skeleton className="w-20 h-5" />
    </div>
    <div className="flex justify-between items-center">
      <Skeleton className="w-24 h-6" />
      <Skeleton className="w-20 h-8" />
    </div>
  </div>
);

const ConnectedAppSkeleton = () => (
  <div className="border border-border/50 rounded-2xl p-4">
    <div className="flex items-start gap-3 mb-3">
      <Skeleton className="w-10 h-10 rounded-lg" />
      <div className="flex-1">
        <Skeleton className="w-3/4 h-4 mb-2" />
        <Skeleton className="w-full h-3" />
      </div>
      <Skeleton className="w-8 h-8 rounded" />
    </div>
    <div className="flex justify-between items-center">
      <Skeleton className="w-32 h-4" />
    </div>
  </div>
);

const ConnectedAppCard = ({ 
  connectedApp, 
  onToggleTools, 
  onConfigure,
  onManageTools,
  isUpdating 
}: {
  connectedApp: ConnectedApp;
  onToggleTools: (profileId: string, enabled: boolean) => void;
  onConfigure: (app: ComposioToolkit, profile: ComposioProfile) => void;
  onManageTools: (connectedApp: ConnectedApp) => void;
  isUpdating: boolean;
}) => {
  const { toolkit, profile, mcpConfig } = connectedApp;
  const hasEnabledTools = mcpConfig.enabledTools && mcpConfig.enabledTools.length > 0;

  return (
    <div 
      className="group border bg-card rounded-2xl p-4 transition-all duration-200 cursor-pointer"
    >
      <div className="flex items-start gap-3 mb-3">
        {toolkit.logo ? (
          <img src={toolkit.logo} alt={toolkit.name} className="w-10 h-10 rounded-lg object-cover p-2 bg-muted rounded-xl border" />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <span className="text-primary text-sm font-medium">{toolkit.name.charAt(0)}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm leading-tight truncate mb-1">{toolkit.name}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            Connected as "{profile.profile_name}"
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onManageTools(connectedApp)}
            disabled={isUpdating}
            type="button"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            {hasEnabledTools ? `${mcpConfig.enabledTools.length} tools enabled` : 'Connected (no tools)'}
          </div>
        </div>
      </div>
    </div>
  );
};

interface PipedreamApp {
  id: string;
  name: string;
  description?: string;
  img_src: string;
  // Add other Pipedream app properties as needed
}

// Type guard to check if an app is a PipedreamApp
function isPipedreamApp(app: any): app is PipedreamApp {
  return 'img_src' in app;
}

// Type guard to check if an app is a ComposioToolkit
function isComposioToolkit(app: any): app is ComposioToolkit {
  return 'logo' in app || 'tags' in app; // Assuming these are unique to ComposioToolkit
}

// Type for the fallback case
interface BasicAppInfo {
  name: string;
  description?: string;
}

type AppCardApp = ComposioToolkit | PipedreamApp | BasicAppInfo;

const AppCard = ({ app, profiles, onConnect, onConfigure, isConnectedToAgent, currentAgentId, mode }: {
  app: AppCardApp; 
  profiles: ComposioProfile[];
  onConnect: () => void;
  onConfigure: (profile: ComposioProfile) => void;
  isConnectedToAgent: boolean;
  currentAgentId?: string;
  mode?: 'full' | 'profile-only';
}) => {
  const connectedProfiles = profiles.filter(p => p.is_connected);
  const canConnect = mode === 'profile-only' ? true : (!isConnectedToAgent && currentAgentId);
  
  // Use type guard to check app type
  
  return (
    <div 
      onClick={canConnect ? (connectedProfiles.length > 0 ? () => onConfigure(connectedProfiles[0]) : onConnect) : undefined}
      className={cn(
        "group border bg-card rounded-2xl p-4 transition-all duration-200",
        canConnect ? "hover:bg-muted cursor-pointer" : "opacity-60 cursor-not-allowed"
      )}
    >
      <div className="flex items-start gap-3 mb-3">
        {/* Render Pipedream app icon */}
        {isPipedreamApp(app) ? (
          <>
            {app.img_src && (
              <img 
                src={app.img_src} 
                alt={app.name} 
                className="w-10 h-10 rounded-lg object-contain p-1"
                onError={(e) => {
                  // Fallback to default icon if image fails to load
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
            )}
            {/* Hidden fallback div that shows if Pipedream image fails to load */}
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center hidden">
              <span className="text-primary text-sm font-medium">{app.name.charAt(0)}</span>
            </div>
          </>
        ) : isComposioToolkit(app) ? (
          // Render Composio app icon
          app.logo ? (
            <img 
              src={app.logo} 
              alt={app.name} 
              className="w-10 h-10 rounded-lg object-cover p-2 bg-muted rounded-xl border" 
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="text-primary text-sm font-medium">{app.name.charAt(0)}</span>
            </div>
          )
        ) : (
          // Fallback for any other type that has at least a name
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <span className="text-primary text-sm font-medium">
              {app.name?.charAt(0) || 'A'}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm leading-tight truncate mb-1">{app.name}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {app.description || `Connect your ${app.name} account to access its features.`}
          </p>
        </div>
      </div>
      
      {/* Render tags for Composio apps */}
      {isComposioToolkit(app) && app.tags && app.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {app.tags.slice(0, 2).map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-xs px-1.5 py-0.5 h-auto">
              {tag}
            </Badge>
          ))}
          {app.tags.length > 2 && (
            <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-auto">
              +{app.tags.length - 2}
            </Badge>
          )}
        </div>
      )}
      
      <div className="flex justify-between items-center">
        {mode === 'profile-only' ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
              {connectedProfiles.length > 0 ? `${connectedProfiles.length} existing profile${connectedProfiles.length !== 1 ? 's' : ''}` : 'Click to connect'}
            </div>
          </div>
        ) : isConnectedToAgent ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Connected to this agent
            </div>
          </div>
        ) : connectedProfiles.length > 0 ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Profile available ({connectedProfiles.length})
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
              Not connected
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

type TabType = 'composio' | 'pipedream';

export const ComposioRegistry: React.FC<ComposioRegistryProps> = ({
  onToolsSelected,
  onAppSelected,
  mode = 'full',
  onClose,
  showAgentSelector = false,
  selectedAgentId,
  onAgentChange,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('composio');
  const [showConnectedApps, setShowConnectedApps] = useState(true);
  const [showCustomMCPDialog, setShowCustomMCPDialog] = useState(false);
  const [showConnector, setShowConnector] = useState(false);
  const [showPipedreamConnector, setShowPipedreamConnector] = useState(false);
  const [selectedApp, setSelectedApp] = useState<ComposioToolkit | null>(null);
  const [selectedPipedreamApp, setSelectedPipedreamApp] = useState<any>(null);
  const [selectedConnectedApp, setSelectedConnectedApp] = useState<ConnectedApp | null>(null);
  const [showToolsManager, setShowToolsManager] = useState(false);
  const [internalSelectedAgentId, setInternalSelectedAgentId] = useState<string | undefined>(selectedAgentId);
  const [selectedToolsProfile, setSelectedToolsProfile] = useState<{
    profileId: string;
    appName: string;
    profileName: string;
  } | null>(null);

  // Pipedream apps state
  const [pipedreamApps, setPipedreamApps] = useState<any[]>([]);
  const [showAllPipedreamApps, setShowAllPipedreamApps] = useState(false);
  const [pipedreamSearch, setPipedreamSearch] = useState('');
  const queryClient = useQueryClient();
  
  // Pipedream apps data - popular apps
  const { 
    data: popularAppsData, 
    isLoading: isLoadingPopular, 
    refetch: refetchPopularApps 
  } = usePipedreamPopularApps();
  
  // Track if we've manually triggered the popular apps fetch
  const [hasTriggeredPopularFetch, setHasTriggeredPopularFetch] = useState(false);
  
  // Handle search and all apps toggle
  const shouldFetchAllApps = showAllPipedreamApps || pipedreamSearch.trim() !== '';
  
  // All apps query with search
  const { 
    data: allAppsData, 
    isLoading: isLoadingAll, 
    refetch: refetchAllApps 
  } = useQuery({
    queryKey: ['pipedream', 'apps', pipedreamSearch],
    queryFn: async () => {
      const result = await pipedreamApi.getApps(undefined, pipedreamSearch);
      return result;
    },
    enabled: false, // We'll trigger this manually
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  // Track if we've loaded Pipedream data
  const [hasLoadedPipedream, setHasLoadedPipedream] = useState(false);

  // Load data when tab changes or search/filter changes
  useEffect(() => {
    if (activeTab === 'pipedream') {
      if (!hasLoadedPipedream) {
        setHasLoadedPipedream(true);
        
        if (shouldFetchAllApps) {
          refetchAllApps().catch(console.error);
        } else if (!hasTriggeredPopularFetch) {
          setHasTriggeredPopularFetch(true);
          refetchPopularApps().catch(console.error);
        }
      }
    }
  }, [activeTab, shouldFetchAllApps, hasLoadedPipedream, hasTriggeredPopularFetch]);

  // Also load when search or showAll changes
  useEffect(() => {
    if (activeTab === 'pipedream' && hasLoadedPipedream) {
      if (shouldFetchAllApps) {
        refetchAllApps().catch(console.error);
      } else if (!popularAppsData && !hasTriggeredPopularFetch) {
        setHasTriggeredPopularFetch(true);
        refetchPopularApps().catch(console.error);
      }
    }
  }, [activeTab, shouldFetchAllApps, hasLoadedPipedream, popularAppsData, hasTriggeredPopularFetch]);

  // Determine which apps to show
  const displayPipedreamApps = useMemo(() => {
    if (pipedreamSearch.trim() || showAllPipedreamApps) {
      return allAppsData?.apps || [];
    }
    return popularAppsData?.apps || [];
  }, [pipedreamSearch, showAllPipedreamApps, allAppsData?.apps, popularAppsData?.apps]);

  // Update pipedreamApps when displayPipedreamApps changes or when tab changes to pipedream
  useEffect(() => {
    if (activeTab === 'pipedream') {
      if (displayPipedreamApps.length > 0) {
        setPipedreamApps(displayPipedreamApps);
      } else if (allAppsData?.apps?.length > 0) {
        // If displayPipedreamApps is empty but we have allAppsData, use that
        setPipedreamApps(allAppsData.apps);
      } else if (popularAppsData?.apps?.length > 0) {
        // Fall back to popular apps if available
        setPipedreamApps(popularAppsData.apps);
      }
    }
  }, [displayPipedreamApps, activeTab, allAppsData?.apps, popularAppsData?.apps]);

  // Loading state for Pipedream apps
  const handlePipedreamSearch = (value: string) => {
    setPipedreamSearch(value);
    if (value.trim() === '') {
      setShowAllPipedreamApps(false);
    } else {
      // When searching, ensure we're showing all apps
      setShowAllPipedreamApps(true);
    }
  };

  const handleClearPipedreamSearch = () => {
    setPipedreamSearch('');
    setShowAllPipedreamApps(false);
  };

  const { data: categoriesData, isLoading: isLoadingCategories } = useComposioCategories();
  const { data: toolkitsInfiniteData,
    isLoading: isLoadingComposio,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isError
  } = useComposioToolkitsInfinite(search, selectedCategory);
  const { data: profiles, isLoading: isLoadingProfiles } = useComposioProfiles();

  const allToolkits = useMemo(() => {
    if (!toolkitsInfiniteData?.pages) return [];
    return toolkitsInfiniteData.pages.flatMap(page => page.toolkits || []);
  }, [toolkitsInfiniteData]);

  const currentAgentId = selectedAgentId ?? internalSelectedAgentId;
  const { data: agent, isLoading: isLoadingAgent } = useAgent(currentAgentId || '');
  const { mutate: updateAgent, isPending: isUpdatingAgent } = useUpdateAgentMCPs();
  
  const effectiveVersionData = useMemo(() => ({
    configured_mcps: [],
    custom_mcps: [],
    system_prompt: '',
    agentpress_tools: {}
  }), []);

  // Search and filter state for Composio apps
  const { data: composioAppsData, isLoading: isLoadingComposioApps } = useQuery({
    queryKey: ['composio', 'apps', search],
    queryFn: async () => {
      // This is a placeholder - replace with actual Composio apps API call if needed
      return { apps: [] };
    },
    enabled: activeTab === 'composio',
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  // Determine which apps to show for Composio and Pipedream tabs
  const displayApps = useMemo(() => {
    if (activeTab === 'pipedream') {
      let appsToShow = [];
      
      if (pipedreamSearch.trim() || showAllPipedreamApps) {
        appsToShow = allAppsData?.apps || [];
      } else {
        appsToShow = popularAppsData?.apps || [];
      }
      
      // Filter by search term if present
      if (pipedreamSearch.trim()) {
        const searchLower = pipedreamSearch.toLowerCase();
        appsToShow = appsToShow.filter(app => 
          app.name.toLowerCase().includes(searchLower) ||
          (app.description && app.description.toLowerCase().includes(searchLower))
        );
      }
      
      return appsToShow;
    } else {
      // Handle Composio apps filtering
      return allToolkits || [];
    }
  }, [
    activeTab, 
    pipedreamSearch, 
    showAllPipedreamApps, 
    allAppsData?.apps, 
    popularAppsData?.apps,
    allToolkits
  ]);

  // Update pipedreamApps when displayApps changes or when tab changes
  useEffect(() => {
    if (activeTab === 'pipedream' && displayApps.length > 0) {
      setPipedreamApps(displayApps);
    }
  }, [displayApps, activeTab]);

  // Handle tab change
  const handleTabChange = (value: string) => {
    const newTab = value as TabType;
    setActiveTab(newTab);
    
    // Reset search and filters when changing tabs
    if (newTab === 'pipedream') {
      setSearch('');
      setPipedreamSearch('');
      setShowAllPipedreamApps(false);
      
      // Reset the loaded state to force a refetch
      setHasLoadedPipedream(false);
      setHasTriggeredPopularFetch(false);
    } else {
      // Reset Composio tab state if needed
      setSearch('');
    }
  };
  // Set loading state for the current tab
  const currentIsLoading = activeTab === 'pipedream' 
    ? (pipedreamSearch.trim() || showAllPipedreamApps ? isLoadingAll : isLoadingPopular)
    : isLoadingComposio;

  const handleSearch = (value: string) => {
    if (activeTab === 'pipedream') {
      setPipedreamSearch(value);
      if (value.trim() === '') {
        setShowAllPipedreamApps(false);
      }
    } else {
      setSearch(value);
    }
  };

  const handleClearSearch = () => {
    if (activeTab === 'pipedream') {
      setPipedreamSearch('');
      setShowAllPipedreamApps(false);
    } else {
      setSearch('');
    }
  };

  const handleAgentSelect = (agentId: string | undefined) => {
    if (onAgentChange) {
      onAgentChange(agentId);
    } else {
      setInternalSelectedAgentId(agentId);
    }
  };

  const connectedApps = useMemo(() => {
    if (!currentAgentId || !agent) return [];
    return getAgentConnectedApps(agent, profiles || [], allToolkits);
  }, [agent, profiles, allToolkits, currentAgentId]);
  
  const profilesByToolkit = useMemo(() => {
    if (!profiles) return {};
    return profiles.reduce((acc, profile) => {
      const toolkitId = (profile as any).toolkit || 'default';
      if (!acc[toolkitId]) {
        acc[toolkitId] = [];
      }
      acc[toolkitId].push(profile);
      return acc;
    }, {} as Record<string, any[]>);
  }, [profiles]);

  const isLoading = currentIsLoading;

  const filteredToolkits = useMemo(() => {
    if (activeTab === 'pipedream') {
      // Return Pipedream apps directly
      return pipedreamApps;
    }

    // For Composio tab, filter the Composio toolkits
    if (!allToolkits) return [];

    let filtered = [...allToolkits];

    // Filter out Pipedream apps from Composio tab
    filtered = filtered.filter(toolkit => !toolkit.slug.startsWith('pipedream_'));

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(toolkit =>
        toolkit.name.toLowerCase().includes(searchLower) ||
        toolkit.description?.toLowerCase().includes(searchLower) ||
        toolkit.slug.toLowerCase().includes(searchLower)
      );
    }

    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(toolkit =>
        toolkit.categories?.includes(selectedCategory)
      );
    }

    return filtered;
  }, [allToolkits, activeTab, search, selectedCategory]);

  const handleConnect = (app: ComposioToolkit) => {
    if (mode !== 'profile-only' && !currentAgentId && showAgentSelector) {
      // toast.error('Please select an agent first');
      return;
    }

    if (activeTab === 'pipedream') {
      setSelectedPipedreamApp(app);
      setShowPipedreamConnector(true);
    } else {
      setSelectedApp(app);
      setShowConnector(true);
    }
  };

  const handleConfigure = (app: ComposioToolkit, profile: ComposioProfile) => {
    if (mode !== 'profile-only' && !currentAgentId) {
      // toast.error('Please select an agent first');
      return;
    }

    if (activeTab === 'pipedream') {
      setSelectedPipedreamApp(app);
      setShowPipedreamConnector(true);
    } else {
      setSelectedApp(app);
      setShowConnector(true);
    }
  };

  const handleToggleTools = (profileId: string, enabled: boolean) => {
    if (!currentAgentId || !agent) return;

    const updatedCustomMcps = agent.custom_mcps?.map((mcpConfig: any) => {
      if (mcpConfig.config?.profile_id === profileId) {
        return {
          ...mcpConfig,
          enabledTools: enabled ? mcpConfig.enabledTools || [] : []
        };
      }
      return mcpConfig;
    }) || [];

    updateAgent({
      agentId: currentAgentId,
      custom_mcps: updatedCustomMcps
    }, {
      onSuccess: () => {
        // toast.success(enabled ? 'Tools enabled' : 'Tools disabled');
      },
      onError: (error: any) => {
        // toast.error(error.message || 'Failed to update tools');
      }
    });
  };

  const handleManageTools = (connectedApp: ConnectedApp) => {
    setSelectedConnectedApp(connectedApp);
    setShowToolsManager(true);
  };

  const handlePipedreamConnectionComplete = (profileId: string, selectedTools: string[], appName: string, appSlug: string) => {
    setShowPipedreamConnector(false);
    queryClient.invalidateQueries({ queryKey: ['composio', 'profiles'] });

    if (currentAgentId) {
      queryClient.invalidateQueries({ queryKey: ['agents', 'detail', currentAgentId] });
    }

    if (onToolsSelected) {
      onToolsSelected(profileId, selectedTools, appName, appSlug);
    }
  };

  const handleConnectionComplete = (profileId: string, appName: string, appSlug: string) => {
    setShowConnector(false);
    queryClient.invalidateQueries({ queryKey: ['composio', 'profiles'] });

    if (currentAgentId) {
      queryClient.invalidateQueries({ queryKey: ['agents', 'detail', currentAgentId] });
    }

    if (onToolsSelected) {
      onToolsSelected(profileId, [], appName, appSlug);
    }
  };

  const handleCustomMCPSave = async (customConfig: any): Promise<void> => {
    if (!currentAgentId) {
      throw new Error('Please select an agent first');
    }

    // Create MCP configuration for agent
    const mcpConfig = {
      name: customConfig.name || 'Custom MCP',
      type: customConfig.type || 'sse',
      config: customConfig.config || {},
      enabledTools: customConfig.enabledTools || [],
    };

    // Get current custom MCPs from agent
    const currentCustomMcps = agent?.custom_mcps || [];
    const updatedCustomMcps = [...currentCustomMcps, mcpConfig];

    // Return a promise that resolves/rejects based on the mutation result
    return new Promise((resolve, reject) => {
      updateAgent({
        agentId: currentAgentId,
        custom_mcps: updatedCustomMcps,
        replace_mcps: true  // Use replace mode to ensure proper updates
      }, {
        onSuccess: () => {
          // toast.success(`Custom MCP "${customConfig.name}" added successfully`);
          queryClient.invalidateQueries({ queryKey: ['agents', 'detail', currentAgentId] });
          resolve();
        },
        onError: (error: any) => {
          reject(new Error(error.message || 'Failed to add custom MCP'));
        }
      });
    });
  };

  const categories = categoriesData?.categories || [];

  return (
    <div className="flex flex-col h-screen max-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b p-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <List className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Apps & Integrations</h2>
              <p className="text-sm text-muted-foreground">Connect and manage your apps</p>
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="composio">
              <Zap className="h-4 w-4 mr-2" />
              Composio Apps
            </TabsTrigger>
            <TabsTrigger value="pipedream">
              <Server className="h-4 w-4 mr-2" />
              Pipedream Apps
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full flex flex-col">
          <div className="flex-shrink-0 border-b p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0 pr-4">
                <h2 className="text-xl font-semibold">
                  {mode === 'profile-only' ? 'Connect New App' : 'App Integrations'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {mode === 'profile-only'
                    ? 'Create a connection profile for your favorite apps'
                    : `Connect your favorite apps with ${currentAgentId ? 'this agent' : 'your agent'}`
                  }
                </p>
              </div>
              <div className="flex-shrink-0">
                <div className="flex items-center gap-3">
                  {/* {showAgentSelector && (
                    <AgentSelector
                      selectedAgentId={currentAgentId}
                      onAgentSelect={handleAgentSelect}
                      isTarsAgent={agent?.metadata?.is_suna_default}
                    />
                  )} */}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="mt-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={activeTab === 'composio' ? 'Search Composio apps...' : 'Search Pipedream apps...'}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10"
                    />
                    {search && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSearch('')}
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                {mode !== 'profile-only' && currentAgentId && (
                  <Button
                    variant="outline"
                    onClick={() => setShowCustomMCPDialog(true)}
                    className="flex items-center gap-2 whitespace-nowrap h-10"
                  >
                    <Server className="h-4 w-4" />
                    Add Custom MCP
                  </Button>
                )}
              </div>

              {selectedCategory && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Filtered by:</span>
                  <Badge variant="outline" className="gap-1 bg-muted-foreground/20 text-muted-foreground">
                    <span>{CATEGORY_EMOJIS[selectedCategory] || '📁'}</span>
                    <span>{categories.find(c => c.id === selectedCategory)?.name}</span>
                    <button
                      onClick={() => setSelectedCategory('')}
                      className="ml-1 hover:bg-muted rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                {currentAgentId && (
                  <Collapsible open={showConnectedApps} onOpenChange={setShowConnectedApps}>
                    <CollapsibleTrigger asChild>
                      <div className="w-full hover:underline flex items-center justify-between p-0 h-auto">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-medium">Connected to this agent</h3>
                          {isLoading ? (
                            <Skeleton className="w-6 h-5 rounded ml-2" />
                          ) : connectedApps.length > 0 && (
                            <Badge variant="outline" className="ml-2">
                              {connectedApps.length}
                            </Badge>
                          )}
                        </div>
                        {showConnectedApps ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-4">
                      {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <ConnectedAppSkeleton key={i} />
                          ))}
                        </div>
                      ) : connectedApps.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4 mx-auto">
                            <Zap className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <h4 className="text-sm font-medium mb-2">No connected apps</h4>
                          <p className="text-xs">Connect apps below to manage tools for this agent.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-4">
                          {connectedApps.map((connectedApp) => (
                            <ConnectedAppCard
                              key={connectedApp.profile.profile_id}
                              connectedApp={connectedApp}
                              onToggleTools={handleToggleTools}
                              onConfigure={handleConfigure}
                              onManageTools={handleManageTools}
                              isUpdating={isUpdatingAgent}
                            />
                          ))}
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                )}
                <div>
                  <h3 className="text-lg font-medium mb-4">
                    {currentAgentId ? 'Available Apps' : 'Browse Apps'}
                  </h3>

                  {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <AppCardSkeleton key={i} />
                      ))}
                    </div>
                  ) : filteredToolkits.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                        <Search className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-medium mb-2">No apps found</h3>
                      <p className="text-muted-foreground">
                        {search ? `No apps match "${search}"` : 'No apps available in this category'}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col h-full">
                      <ScrollArea className="flex-1 pr-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-6">
                          {/* Custom scrollbar styling */}
                          <style jsx global>{`
                            .custom-scrollbar::-webkit-scrollbar {
                              width: 6px;
                              height: 6px;
                            }
                            .custom-scrollbar::-webkit-scrollbar-track {
                              background: transparent;
                              border-radius: 10px;
                            }
                            .custom-scrollbar::-webkit-scrollbar-thumb {
                              background: #888;
                              border-radius: 10px;
                            }
                            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                              background: #555;
                            }
                          `}</style>
                          {filteredToolkits.map((app) => (
                            <AppCard
                              key={app.slug}
                              app={app}
                              profiles={profilesByToolkit[app.slug] || []}
                              onConnect={() => handleConnect(app)}
                              onConfigure={(profile) => handleConfigure(app, profile)}
                              isConnectedToAgent={isAppConnectedToAgent(agent, app.slug, profiles || [])}
                              currentAgentId={currentAgentId}
                              mode={mode}
                            />
                          ))}
                        </div>
                      </ScrollArea>
                      <div className="text-xs text-muted-foreground text-center pt-3 pb-2 border-t mt-2 shrink-0">
                        Mostrando {filteredToolkits.length} de {filteredToolkits.length} aplicativos
                      </div>
                      {hasNextPage && (
                        <div className="flex justify-center pt-4">
                          <Button
                            variant="outline"
                            onClick={() => fetchNextPage()}
                            disabled={isFetchingNextPage}

                          >
                            {isFetchingNextPage ? (
                              <>
                                <Loader2 className="animate-spin h-4 w-4 " />
                                Loading more...
                              </>
                            ) : (
                              'Load More Apps'
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
      {selectedApp && (
        <ComposioConnector
          app={selectedApp}
          agentId={currentAgentId}
          open={showConnector}
          onOpenChange={setShowConnector}
          onComplete={handleConnectionComplete}
          mode={mode}
        />
      )}

      {selectedPipedreamApp && currentAgentId && (
        <PipedreamConnector
          app={selectedPipedreamApp}
          open={showPipedreamConnector}
          onOpenChange={setShowPipedreamConnector}
          onComplete={handlePipedreamConnectionComplete}
          mode={mode === 'profile-only' ? 'profile-only' : 'full'}
          agentId={currentAgentId}
          saveMode="direct"
        />
      )}

      {selectedToolsProfile && currentAgentId && (
        <ToolsManager
          mode="pipedream"
          profileId={selectedToolsProfile.profileId}
          appName={selectedToolsProfile.appName}
          profileName={selectedToolsProfile.profileName}
          agentId={currentAgentId}
          open={showToolsManager}
          onOpenChange={(open) => {
            setShowToolsManager(open);
            if (!open) {
              setSelectedToolsProfile(null);
            }
          }}
          onToolsUpdate={(enabledTools) => {
            queryClient.invalidateQueries({ queryKey: ['agent', currentAgentId] });
          }}
          versionData={effectiveVersionData}
          versionId={undefined}
        />
      )}
      {selectedConnectedApp && currentAgentId && (
        <ComposioToolsManager
          agentId={currentAgentId}
          open={showToolsManager}
          onOpenChange={setShowToolsManager}
          profileId={selectedConnectedApp.profile.profile_id}
          profileInfo={{
            profile_id: selectedConnectedApp.profile.profile_id,
            profile_name: selectedConnectedApp.profile.profile_name,
            toolkit_name: selectedConnectedApp.toolkit.name,
            toolkit_slug: selectedConnectedApp.toolkit.slug,
          }}
          appLogo={selectedConnectedApp.toolkit.logo}
          onToolsUpdate={() => {
            queryClient.invalidateQueries({ queryKey: ['agents', 'detail', currentAgentId] });
          }}
        />
      )}
      <CustomMCPDialog
        open={showCustomMCPDialog}
        onOpenChange={setShowCustomMCPDialog}
        onSave={handleCustomMCPSave}
      />
    </div>
  );
}; 