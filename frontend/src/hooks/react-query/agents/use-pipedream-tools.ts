import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { backendApi } from '@/lib/api-client';
import { agentKeys } from './keys';

export interface PipedreamTool {
  name: string;
  description: string;
  enabled: boolean;
}

export interface PipedreamToolsResponse {
  profile_id: string;
  app_name: string;
  app_slug: string;
  profile_name: string;
  tools: PipedreamTool[];
  has_mcp_config: boolean;
}

export interface UpdatePipedreamToolsRequest {
  enabled_tools: string[];
  name?: string;
  config?: {
    url?: string;
    headers?: {
      'x-pd-app-slug'?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
}

export const usePipedreamToolsForAgent = (agentId: string, profileId: string, versionId?: string) => {
  return useQuery({
    queryKey: ['pipedream-tools', agentId, profileId, versionId],
    queryFn: async (): Promise<PipedreamToolsResponse> => {
      const url = versionId 
        ? `/agents/${agentId}/pipedream-tools/${profileId}?version=${versionId}`
        : `/agents/${agentId}/pipedream-tools/${profileId}`;
      console.log('[usePipedreamToolsForAgent] Making API request to:', url);
      const response = await backendApi.get(url);
      console.log('[usePipedreamToolsForAgent] API response received:', {
        url,
        response: response.data,
        tools: JSON.stringify(response.data?.tools)
      });
      return response.data;
    },
    enabled: !!agentId && !!profileId,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 404 || error?.response?.status === 400) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

export const useUpdatePipedreamToolsForAgent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      agentId,
      profileId,
      enabledTools,
      appName,
      appSlug,
    }: {
      agentId: string;
      profileId: string;
      enabledTools: string[];
      appName?: string;
      appSlug?: string;
    }) => {
      const requestBody: UpdatePipedreamToolsRequest = {
        enabled_tools: enabledTools,
      };

      // Add name and config if appName and appSlug are provided
      if (appName && appSlug) {
        requestBody.name = appName;
        requestBody.config = {
          headers: {
            'x-pd-app-slug': appSlug
          }
        };
      }

      const response = await backendApi.put(
        `/agents/${agentId}/pipedream-tools/${profileId}`,
        requestBody
      );
      console.log('response', JSON.stringify(response.data, null, 2));
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['pipedream-tools', variables.agentId, variables.profileId],
      });
      queryClient.invalidateQueries({
        queryKey: agentKeys.detail(variables.agentId),
      });
      queryClient.invalidateQueries({
        queryKey: ['agent-tools', variables.agentId],
      });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Failed to update Pipedream tools';
      toast.error(message);
    },
  });
};


export const usePipedreamToolsData = (agentId: string, profileId: string, versionId?: string) => {
  const { data, isLoading, error, refetch } = usePipedreamToolsForAgent(agentId, profileId, versionId);
  const updateMutation = useUpdatePipedreamToolsForAgent();
  return {
    data,
    isLoading,
    error,
    refetch,
    updateMutation,
    isUpdating: updateMutation.isPending,
  };
}; 