import { SERVER_URL } from '@/constants/Server';
import { getSupabaseSession } from '@/constants/SupabaseConfig';

export interface IntegrationProfile {
  profile_id: string;
  profile_name: string;
  toolkit_name: string;
  toolkit_slug: string;
  status: 'connected' | 'disconnected' | 'error';
  created_at?: string;
  enabled_tools?: string[];
  mcp_url?: string;
}

export interface IntegrationToolkit {
  slug: string;
  name: string;
  description: string;
  category: string;
  icon_url?: string;
  is_connected: boolean;
  tools_count: number;
}

export interface IntegrationTool {
  name: string;
  description: string;
  enabled: boolean;
  category: string;
}

export interface IntegrationCategory {
  name: string;
  display_name: string;
  count: number;
}

class IntegrationsService {
  // SERVER_URL already includes /api
  private baseUrl = `${SERVER_URL}/composio`;

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const session = await getSupabaseSession();
    if (!session?.access_token) {
      throw new Error('Please log in to access integrations');
    }
    
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    };
  }

  // Get all available toolkits (integrations)
  async getToolkits(search?: string, category?: string, limit: number = 50): Promise<IntegrationToolkit[]> {
    try {
      const headers = await this.getAuthHeaders();
      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(search && { search }),
        ...(category && { category }),
      });

      const response = await fetch(`${this.baseUrl}/toolkits?${params}`, {
        headers,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Failed to fetch toolkits: ${response.status} ${response.statusText} ${body}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch toolkits');
      }

      // Get connected profiles to determine which toolkits are connected
      const profiles = await this.getProfiles();
      const connectedSlugs = new Set(profiles.map(p => p.toolkit_slug));

      return data.toolkits.map((toolkit: any) => ({
        slug: toolkit.slug,
        name: toolkit.name,
        description: toolkit.description,
        category: toolkit.category || 'other',
        icon_url: toolkit.icon_url,
        is_connected: connectedSlugs.has(toolkit.slug),
        tools_count: toolkit.tools_count || 0,
      }));
    } catch (error) {
      console.error('Error fetching toolkits:', error);
      return [];
    }
  }

  // Get all connected profiles
  async getProfiles(toolkitSlug?: string): Promise<IntegrationProfile[]> {
    try {
      const headers = await this.getAuthHeaders();
      const params = new URLSearchParams();
      if (toolkitSlug) {
        params.append('toolkit_slug', toolkitSlug);
      }

      const response = await fetch(`${this.baseUrl}/profiles?${params}`, {
        headers,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Failed to fetch profiles: ${response.status} ${response.statusText} ${body}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        return [];
      }

      return data.profiles.map((profile: any) => ({
        profile_id: profile.profile_id,
        profile_name: profile.profile_name,
        toolkit_name: profile.toolkit_name,
        toolkit_slug: profile.toolkit_slug,
        status: profile.status || 'connected',
        created_at: profile.created_at,
        enabled_tools: profile.enabled_tools || [],
        mcp_url: profile.mcp_url,
      }));
    } catch (error) {
      console.error('Error fetching profiles:', error);
      return [];
    }
  }

  // Get tools for a specific profile
  async getProfileTools(profileId: string): Promise<IntegrationTool[]> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(`${this.baseUrl}/profiles/${profileId}/discover-tools`, {
        method: 'POST',
        headers,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Failed to fetch tools: ${response.status} ${response.statusText} ${body}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch tools');
      }

      return data.tools.map((tool: any) => ({
        name: tool.name,
        description: tool.description || 'No description available',
        enabled: true, // Default to enabled, will be updated based on profile config
        category: tool.category || 'general',
      }));
    } catch (error) {
      console.error('Error fetching profile tools:', error);
      return [];
    }
  }

  // Get available categories
  async getCategories(): Promise<IntegrationCategory[]> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(`${this.baseUrl}/categories`, {
        headers,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Failed to fetch categories: ${response.status} ${response.statusText} ${body}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        return [];
      }

      return data.categories.map((category: any) => ({
        name: category.name,
        display_name: category.display_name || category.name,
        count: category.count || 0,
      }));
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  // Create a new integration profile
  async createProfile(toolkitSlug: string, profileName: string): Promise<{ profile_id: string; connection_url?: string }> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(`${this.baseUrl}/integrate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          toolkit_slug: toolkitSlug,
          profile_name: profileName,
          display_name: profileName,
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Failed to create profile: ${response.status} ${response.statusText} ${body}`);
      }

      const data = await response.json();
      
      if (data.status !== 'integrated') {
        throw new Error(data.message || 'Failed to create profile');
      }

      return {
        profile_id: data.profile_id,
        connection_url: data.redirect_url,
      };
    } catch (error) {
      console.error('Error creating profile:', error);
      throw error;
    }
  }

  // Update enabled tools for a profile
  async updateProfileTools(profileId: string, enabledTools: string[]): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(`${this.baseUrl}/profiles/${profileId}/tools`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          enabled_tools: enabledTools,
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Failed to update tools: ${response.status} ${response.statusText} ${body}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to update tools');
      }
    } catch (error) {
      console.error('Error updating profile tools:', error);
      throw error;
    }
  }

  // Delete a profile
  async deleteProfile(profileId: string): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(`${this.baseUrl}/profiles/${profileId}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Failed to delete profile: ${response.status} ${response.statusText} ${body}`);
      }
    } catch (error) {
      console.error('Error deleting profile:', error);
      throw error;
    }
  }

  // Get toolkit details
  async getToolkitDetails(toolkitSlug: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(`${this.baseUrl}/toolkits/${toolkitSlug}/details`, {
        headers,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Failed to fetch toolkit details: ${response.status} ${response.statusText} ${body}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch toolkit details');
      }

      return data.toolkit;
    } catch (error) {
      console.error('Error fetching toolkit details:', error);
      throw error;
    }
  }
}

export const integrationsService = new IntegrationsService();
