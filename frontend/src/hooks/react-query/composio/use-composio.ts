'use client';

import { useMutation, useQueryClient, useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { 
  composioApi, 
  type ComposioToolkitsResponse,
  type CompositoCategoriesResponse,
  type CreateComposioProfileRequest,
  type CreateComposioProfileResponse,
  type DetailedComposioToolkitResponse,
  type ComposioToolsResponse,
} from './utils';
import { composioKeys } from './keys';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

export const useComposioCategories = () => {
  return useQuery({
    queryKey: composioKeys.categories(),
    queryFn: async (): Promise<CompositoCategoriesResponse> => {
      const result = await composioApi.getCategories();
      return result;
    },
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });
};

export const useComposioToolkits = (search?: string, category?: string) => {
  return useQuery({
    queryKey: composioKeys.toolkits(search, category),
    queryFn: async (): Promise<ComposioToolkitsResponse> => {
      const result = await composioApi.getToolkits(search, category);
      return result;
    },
    staleTime: 5 * 60 * 1000, 
    retry: 2,
  });
};

export const useComposioToolkitsInfinite = (search?: string, category?: string) => {
  return useInfiniteQuery({
    queryKey: ['composio', 'toolkits', 'infinite', search, category],
    queryFn: async ({ pageParam }): Promise<ComposioToolkitsResponse> => {
      // Buscando mais itens por página
      const result = await composioApi.getToolkits(search, category, pageParam);
      
      // Se houver mais páginas, vamos carregar mais páginas em paralelo
      if (result.next_cursor && (!category || category === 'all')) {
        // Carrega as próximas 10 páginas em paralelo para pegar mais itens de uma vez
        const nextPages = [];
        let currentCursor = result.next_cursor;
        
        // Vamos carregar até 10 páginas adicionais ou até não ter mais páginas
        for (let i = 0; i < 10 && currentCursor; i++) {
          try {
            const nextPage = await composioApi.getToolkits(search, category, currentCursor);
            nextPages.push(nextPage);
            if (!nextPage.next_cursor) break;
            currentCursor = nextPage.next_cursor;
          } catch (error) {
            console.error('Error loading additional page:', error);
            break;
          }
        }
        
        // Combina todos os resultados
        result.toolkits = [
          ...result.toolkits,
          ...nextPages.flatMap(page => page.toolkits || [])
        ];
        
        // Atualiza o cursor para a última página carregada
        if (nextPages.length > 0) {
          const lastPage = nextPages[nextPages.length - 1];
          result.next_cursor = lastPage.next_cursor;
        }
      }
      
      return result;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      // Só retorna o próximo cursor se ainda houver mais itens para carregar
      return lastPage.next_cursor || undefined;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
    maxPages: 20, // Aumentando o número de páginas em cache
  });
};

export const useComposioToolkitDetails = (toolkitSlug: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['composio', 'toolkit-details', toolkitSlug],
    queryFn: async (): Promise<DetailedComposioToolkitResponse> => {
      const result = await composioApi.getToolkitDetails(toolkitSlug);
      return result;
    },
    enabled: options?.enabled !== undefined ? options.enabled : !!toolkitSlug,
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });
};

export const useComposioToolkitIcon = (toolkitSlug: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['composio', 'toolkit-icon', toolkitSlug],
    queryFn: async (): Promise<{ success: boolean; icon_url?: string }> => {
      const result = await composioApi.getToolkitIcon(toolkitSlug);
      return result;
    },
    enabled: options?.enabled !== undefined ? options.enabled : !!toolkitSlug,
    staleTime: 60 * 60 * 1000, // 1 hora
    retry: 2,
  });
};

export const useComposioTools = (toolkitSlug: string, options?: { enabled?: boolean; limit?: number }) => {
  return useQuery({
    queryKey: ['composio', 'tools', toolkitSlug, options?.limit],
    queryFn: async (): Promise<ComposioToolsResponse> => {
      const result = await composioApi.getTools(toolkitSlug, options?.limit);
      return result;
    },
    enabled: (options?.enabled ?? true) && !!toolkitSlug,
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });
};

export const useCreateComposioProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (request: CreateComposioProfileRequest): Promise<CreateComposioProfileResponse> => {
      return await composioApi.createProfile(request);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: composioKeys.profiles.all() });
      toast.success(`Connected to ${variables.profile_name}!`);
      
      // If there's a redirect URL, open it automatically
      if (data.redirect_url) {
        window.open(data.redirect_url, '_blank', 'width=600,height=700,resizable=yes,scrollbars=yes');
      }
    },
    onError: (error) => {
      console.error('Failed to create Composio profile:', error);
      toast.error(error.message || 'Failed to create profile');
    },
  });
};

export const useInvalidateComposioQueries = () => {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: composioKeys.all });
  };
}; 

export const useCheckProfileNameAvailability = (
  toolkitSlug: string,
  profileName: string,
  options?: {
    enabled?: boolean;
    debounceMs?: number;
  }
) => {
  const [debouncedName, setDebouncedName] = useState(profileName);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedName(profileName);
    }, options?.debounceMs || 500);

    return () => clearTimeout(timer);
  }, [profileName, options?.debounceMs]);

  return useQuery({
    queryKey: ['composio', 'profile-name-availability', toolkitSlug, debouncedName],
    queryFn: async () => {
      if (!debouncedName || debouncedName.trim().length < 1) {
        return {
          available: true,
          message: '',
          suggestions: []
        };
      }
      
      const response = await composioApi.checkProfileNameAvailability(toolkitSlug, debouncedName);
      return response;
    },
    enabled: options?.enabled !== false && !!toolkitSlug && !!debouncedName && debouncedName.trim().length > 0,
    staleTime: 30000, // Consider data stale after 30 seconds
    gcTime: 60000, // Keep in cache for 1 minute
  });
}; 