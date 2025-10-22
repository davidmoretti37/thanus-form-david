import { useQuery } from '@tanstack/react-query';
import { SERVER_URL } from '@/constants/Server';

interface Agent {
  agent_id: string;
  name: string;
  description?: string;
  icon_name?: string;
  icon_color?: string;
  icon_background?: string;
  metadata?: {
    is_suna_default?: boolean;
  };
}

interface AgentsResponse {
  agents: Agent[];
  total: number;
  page: number;
  limit: number;
}

interface UseAgentsParams {
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  search?: string;
  page?: number;
}

export const useAgents = (params: UseAgentsParams = {}) => {
  const {
    limit = 100,
    sort_by = 'name',
    sort_order = 'asc',
    search,
    page = 1,
  } = params;

  return useQuery<AgentsResponse>({
    queryKey: ['agents', { limit, sort_by, sort_order, search, page }],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        limit: limit.toString(),
        sort_by,
        sort_order,
        page: page.toString(),
      });

      if (search) {
        searchParams.append('search', search);
      }

      const response = await fetch(`${SERVER_URL}/agents?${searchParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch agents: ${response.statusText}`);
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};
