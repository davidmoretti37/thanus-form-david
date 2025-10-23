import { SERVER_URL } from '@/constants/Server';
import { getSupabaseSession } from '@/utils/supabase';

export interface AgentTool {
  name: string;
  enabled: boolean;
  server?: string;
  description?: string;
  category?: string;
}

export interface AgentToolsResponse {
  agentpress_tools: AgentTool[];
  mcp_tools: AgentTool[];
}

export interface AllToolsResponse {
  success: boolean;
  tools: Record<string, any>;
}

class ToolsService {
  private baseUrl = SERVER_URL; // SERVER_URL already includes /api

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const session = await getSupabaseSession();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Add auth header if available, but don't require it
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    
    return headers;
  }

  // Get all available tools metadata
  async getAllTools(): Promise<Record<string, any>> {
    try {
      const headers = await this.getAuthHeaders();
      const url = `${this.baseUrl}/tools`;
      
      console.log('🔧 ToolsService: Fetching tools from:', url);
      console.log('🔧 ToolsService: Headers:', headers);

      const response = await fetch(url, {
        headers,
      });

      console.log('🔧 ToolsService: Response status:', response.status);
      console.log('🔧 ToolsService: Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('🔧 ToolsService: Error response:', errorText);
        throw new Error(`Failed to fetch tools: ${response.statusText}`);
      }

      const data: AllToolsResponse = await response.json();
      console.log('🔧 ToolsService: Response data success:', data.success);
      console.log('🔧 ToolsService: Tools count:', Array.isArray(data.tools) ? data.tools.length : 'not an array');
      
      if (!data.success) {
        throw new Error('Failed to fetch tools');
      }

      // Convert array of tools to object with tool names as keys
      const toolsObject: Record<string, any> = {};
      if (Array.isArray(data.tools)) {
        data.tools.forEach(tool => {
          if (tool.name) {
            toolsObject[tool.name] = tool;
          }
        });
        console.log('🔧 ToolsService: Converted to object with', Object.keys(toolsObject).length, 'tools');
      } else if (typeof data.tools === 'object') {
        // If it's already an object, use it as is
        console.log('🔧 ToolsService: Using tools object directly with', Object.keys(data.tools).length, 'tools');
        return data.tools;
      }

      return toolsObject;
    } catch (error) {
      console.error('🔧 ToolsService: Error fetching all tools:', error);
      throw error;
    }
  }

  // Get tools for a specific agent
  async getAgentTools(agentId: string): Promise<AgentToolsResponse> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(`${this.baseUrl}/agents/${agentId}/tools`, {
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch agent tools: ${response.statusText}`);
      }

      const data: AgentToolsResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching agent tools:', error);
      throw error;
    }
  }

  // Get custom MCP tools for an agent
  async getAgentCustomMCPTools(agentId: string, mcpType: string, mcpUrl: string): Promise<{
    tools: AgentTool[];
    has_mcp_config: boolean;
    server_type: string;
    server_url: string;
  }> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(`${this.baseUrl}/agents/${agentId}/custom-mcp-tools?mcp_type=${mcpType}&mcp_url=${encodeURIComponent(mcpUrl)}`, {
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch custom MCP tools: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching custom MCP tools:', error);
      throw error;
    }
  }

  // Update agent tools
  async updateAgentTools(agentId: string, tools: {
    agentpress_tools?: AgentTool[];
    mcp_tools?: AgentTool[];
  }): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(`${this.baseUrl}/agents/${agentId}/tools`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(tools),
      });

      if (!response.ok) {
        throw new Error(`Failed to update agent tools: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error updating agent tools:', error);
      throw error;
    }
  }

  // Update custom MCP tools for an agent
  async updateAgentCustomMCPTools(agentId: string, mcpType: string, mcpUrl: string, enabledTools: string[]): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(`${this.baseUrl}/agents/${agentId}/custom-mcp-tools`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          mcp_type: mcpType,
          mcp_url: mcpUrl,
          enabled_tools: enabledTools,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update custom MCP tools: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error updating custom MCP tools:', error);
      throw error;
    }
  }
}

export const toolsService = new ToolsService();
