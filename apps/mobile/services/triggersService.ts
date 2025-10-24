import { SERVER_URL } from '@/constants/SupabaseConfig';
import { getSupabaseSession } from '@/utils/supabase';

export interface TriggerProvider {
  provider_id: string;
  name: string;
  description: string;
  trigger_type: string;
  webhook_enabled: boolean;
  config_schema: Record<string, any>;
}

export interface TriggerConfiguration {
  trigger_id: string;
  agent_id: string;
  trigger_type: string;
  provider_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  webhook_url?: string;
  created_at: string;
  updated_at: string;
  config: Record<string, any>;
}

export interface CreateTriggerRequest {
  provider_id: string;
  name: string;
  description?: string;
  config: Record<string, any>;
}

export interface UpdateTriggerRequest {
  name?: string;
  description?: string;
  config?: Record<string, any>;
  is_active?: boolean;
}

export interface UpcomingRun {
  trigger_id: string;
  trigger_name: string;
  next_run: string;
  schedule_description: string;
}

export interface UpcomingRunsResponse {
  runs: UpcomingRun[];
  total: number;
}

class TriggersService {
  private baseUrl = SERVER_URL; // SERVER_URL already includes /api

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const session = await getSupabaseSession();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    
    return headers;
  }

  // Provider operations
  async getProviders(): Promise<TriggerProvider[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/triggers/providers`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch providers: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching providers:', error);
      throw error;
    }
  }

  // Agent trigger operations
  async getAgentTriggers(agentId: string): Promise<TriggerConfiguration[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/triggers/agents/${agentId}/triggers`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch agent triggers: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching agent triggers:', error);
      throw error;
    }
  }

  async createTrigger(agentId: string, triggerData: CreateTriggerRequest): Promise<TriggerConfiguration> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/triggers/agents/${agentId}/triggers`, {
        method: 'POST',
        headers,
        body: JSON.stringify(triggerData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to create trigger: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating trigger:', error);
      throw error;
    }
  }

  async updateTrigger(triggerId: string, triggerData: UpdateTriggerRequest): Promise<TriggerConfiguration> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/triggers/${triggerId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(triggerData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to update trigger: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating trigger:', error);
      throw error;
    }
  }

  async deleteTrigger(triggerId: string): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/triggers/${triggerId}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to delete trigger: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting trigger:', error);
      throw error;
    }
  }

  async toggleTrigger(triggerId: string, isActive: boolean): Promise<TriggerConfiguration> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/triggers/${triggerId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ is_active: isActive }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to toggle trigger: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error toggling trigger:', error);
      throw error;
    }
  }

  async getTrigger(triggerId: string): Promise<TriggerConfiguration> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/triggers/${triggerId}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch trigger: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching trigger:', error);
      throw error;
    }
  }

  // Get all user triggers
  async getAllTriggers(): Promise<TriggerConfiguration[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/triggers/all`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch all triggers: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching all triggers:', error);
      throw error;
    }
  }

  // Get upcoming runs for an agent
  async getUpcomingRuns(agentId: string, limit: number = 10): Promise<UpcomingRunsResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/triggers/agents/${agentId}/upcoming-runs?limit=${limit}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch upcoming runs: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching upcoming runs:', error);
      throw error;
    }
  }

  // Utility methods
  getTriggerIcon(triggerType: string): string {
    switch (triggerType.toLowerCase()) {
      case 'schedule':
      case 'scheduled':
        return 'repeat';
      case 'telegram':
        return 'message-square';
      case 'github':
        return 'github';
      case 'slack':
        return 'slack';
      case 'webhook':
        return 'webhook';
      case 'discord':
        return 'hash';
      case 'event':
        return 'sparkles';
      default:
        return 'globe';
    }
  }

  getTriggerTypeColor(triggerType: string): string {
    switch (triggerType.toLowerCase()) {
      case 'schedule':
      case 'scheduled':
        return '#10b981'; // green
      case 'telegram':
        return '#0088cc';
      case 'github':
        return '#333333';
      case 'slack':
        return '#4a154b';
      case 'webhook':
        return '#f59e0b'; // amber
      case 'discord':
        return '#5865f2';
      case 'event':
        return '#8b5cf6'; // purple
      default:
        return '#6b7280'; // gray
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return `${Math.floor(diffInDays / 30)} months ago`;
  }

  formatScheduleDescription(config: Record<string, any>): string {
    if (config.schedule_type === 'cron') {
      return `Cron: ${config.cron_expression || 'Not specified'}`;
    } else if (config.schedule_type === 'interval') {
      const interval = config.interval_minutes || config.interval_hours || config.interval_days;
      const unit = config.interval_minutes ? 'minutes' : 
                   config.interval_hours ? 'hours' : 'days';
      return `Every ${interval} ${unit}`;
    } else if (config.schedule_type === 'once') {
      return `Once: ${config.run_at || 'Not specified'}`;
    }
    return 'Custom schedule';
  }
}

export const triggersService = new TriggersService();
