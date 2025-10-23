import { SERVER_URL } from '@/constants/Server';

export interface Agent {
  agent_id: string;
  name: string;
  description?: string;
  system_prompt?: string;
  instructions?: string; // Keep for backward compatibility
  icon_name?: string;
  icon_color?: string;
  icon_background?: string;
  is_default?: boolean;
  is_public?: boolean;
  created_at: string;
  updated_at?: string;
  version_count?: number;
  current_version_name?: string;
}

export interface AgentsResponse {
  agents: Agent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
}

class AgentService {
  private baseUrl = SERVER_URL;
  private cache = new Map<string, { data: AgentsResponse; timestamp: number }>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  async getAgents(page: number = 1, limit: number = 20, search?: string): Promise<AgentsResponse> {
    try {
      // Create cache key
      const cacheKey = `agents_${page}_${limit}_${search || ''}`;
      
      // Check cache first
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log('Using cached agents data');
        return cached.data;
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (search) {
        params.append('search', search);
      }

      // Get authentication token
      const { createSupabaseClient } = await import('@/constants/SupabaseConfig');
      const supabase = createSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${this.baseUrl}/agents?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch agents: ${response.status}`);
      }

      const data = await response.json();
      
      // Cache the result
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      return data;
    } catch (error) {
      console.error('Error fetching agents:', error);
      throw error;
    }
  }

  async getAgent(agentId: string): Promise<Agent> {
    try {
      // Get authentication token
      const { createSupabaseClient } = await import('@/constants/SupabaseConfig');
      const supabase = createSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${this.baseUrl}/agents/${agentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch agent: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching agent:', error);
      throw error;
    }
  }

  async createAgent(agentData: Partial<Agent>): Promise<Agent> {
    try {
      // Get authentication token
      const { createSupabaseClient } = await import('@/constants/SupabaseConfig');
      const supabase = createSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${this.baseUrl}/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(agentData),
      });

      if (!response.ok) {
        throw new Error(`Failed to create agent: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating agent:', error);
      throw error;
    }
  }

  async updateAgent(agentId: string, updateData: Partial<Agent>): Promise<Agent> {
    try {
      // Get authentication token
      const { createSupabaseClient } = await import('@/constants/SupabaseConfig');
      const supabase = createSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${this.baseUrl}/agents/${agentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error(`Failed to update agent: ${response.status}`);
      }

      const data = await response.json();
      
      // Clear cache to ensure fresh data
      this.cache.clear();
      
      return data;
    } catch (error) {
      console.error('Error updating agent:', error);
      throw error;
    }
  }

  // Clear cache when needed
  clearCache(): void {
    this.cache.clear();
  }

  // Preload agents for faster initial load
  async preloadAgents(): Promise<void> {
    try {
      await this.getAgents(1, 20);
    } catch (error) {
      console.log('Preload failed, will load on demand');
    }
  }
}

export const agentService = new AgentService();
