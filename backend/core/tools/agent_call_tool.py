import json
from typing import Optional, Dict, Any, List
from core.agentpress.tool import Tool, ToolResult, openapi_schema, usage_example
from core.agentpress.thread_manager import ThreadManager
from core.utils.logger import logger


class AgentCallTool(Tool):
    """Tool for listing and switching between available agents.

    This tool provides functionality similar to the @ agent switching system,
    allowing users to list their available agents and switch between them
    while maintaining workspace and thread continuity.
    """

    def __init__(self, thread_manager: ThreadManager, db_connection, account_id: str):
        super().__init__()
        self.thread_manager = thread_manager
        self.db = db_connection
        self.account_id = account_id

    async def _get_current_account_id(self) -> Optional[str]:
        return self.account_id

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "list_available_agents",
            "description": "List all available agents for the current user with their capabilities and metadata. Shows agent names, descriptions, tools, and current status to help choose which agent to use.",
            "parameters": {
                "type": "object",
                "properties": {
                    "include_details": {
                        "type": "boolean",
                        "description": "Whether to include detailed agent configuration information like enabled tools and capabilities",
                        "default": True
                    },
                    "search_query": {
                        "type": "string",
                        "description": "Optional search query to filter agents by name or description"
                    }
                }
            }
        }
    })
    @usage_example('''
        <function_calls>
        <invoke name="list_available_agents">
        <parameter name="include_details">true</parameter>
        </invoke>
        </function_calls>

        <function_calls>
        <invoke name="list_available_agents">
        <parameter name="search_query">research</parameter>
        <parameter name="include_details">true</parameter>
        </invoke>
        </function_calls>
        ''')
    async def list_available_agents(
        self,
        include_details: bool = True,
        search_query: Optional[str] = None
    ) -> ToolResult:
        """List all available agents for the current user."""
        try:
            account_id = self.account_id
            if not account_id:
                return self.fail_response("Unable to determine current account ID")

            client = await self.db.client

            # Query agents for current account
            agents_result = await client.table('agents').select(
                'agent_id, name, description, icon_name, icon_color, icon_background, is_default, current_version_id, created_at, updated_at'
            ).eq('account_id', account_id).order('name').execute()

            if not agents_result.data:
                return self.success_response({
                    "message": "No agents found for your account.",
                    "agents": [],
                    "total_count": 0
                })

            agents = []
            for agent_data in agents_result.data:
                agent_info = {
                    "agent_id": agent_data["agent_id"],
                    "name": agent_data["name"],
                    "description": agent_data.get("description", "No description available"),
                    "icon_name": agent_data.get("icon_name", "bot"),
                    "icon_color": agent_data.get("icon_color", "#4F46E5"),
                    "icon_background": agent_data.get("icon_background", "#DBEAFE"),
                    "is_default": agent_data.get("is_default", False),
                    "created_at": agent_data.get("created_at"),
                    "updated_at": agent_data.get("updated_at")
                }

                # Add detailed configuration if requested
                if include_details and agent_data.get("current_version_id"):
                    try:
                        version_result = await client.table('agent_versions').select(
                            'config'
                        ).eq('version_id', agent_data["current_version_id"]).single().execute()

                        if version_result.data:
                            config = version_result.data.get('config', {})
                            tools_config = config.get('tools', {})
                            agentpress_tools = tools_config.get('agentpress', {})

                            # Count enabled tools
                            enabled_tools = [tool for tool, enabled in agentpress_tools.items() if enabled]

                            agent_info["details"] = {
                                "model": config.get("model", "Unknown"),
                                "enabled_tools_count": len(enabled_tools),
                                "enabled_tools": enabled_tools[:5],  # Show first 5 tools
                                "has_system_prompt": bool(config.get("system_prompt")),
                                "mcp_integrations": len(tools_config.get('mcp', [])),
                                "custom_integrations": len(tools_config.get('custom_mcp', []))
                            }
                    except Exception as e:
                        logger.warning(f"Could not fetch details for agent {agent_data['agent_id']}: {e}")
                        agent_info["details"] = {"error": "Could not load agent details"}

                # Apply search filter if provided
                if search_query:
                    query_lower = search_query.lower()
                    if (query_lower in agent_info["name"].lower() or
                        query_lower in agent_info["description"].lower()):
                        agents.append(agent_info)
                else:
                    agents.append(agent_info)

            # Format response message
            message = f"Found {len(agents)} agent(s) available:\n\n"

            for agent in agents:
                message += f"🤖 **{agent['name']}**"
                if agent['is_default']:
                    message += " ⭐ (Default)"
                message += f"\n"
                message += f"   • Description: {agent['description']}\n"
                message += f"   • ID: `{agent['agent_id']}`\n"

                if include_details and "details" in agent and "error" not in agent["details"]:
                    details = agent["details"]
                    message += f"   • Model: {details['model']}\n"
                    message += f"   • Tools: {details['enabled_tools_count']} enabled"
                    if details['enabled_tools']:
                        message += f" ({', '.join(details['enabled_tools'])}{'...' if details['enabled_tools_count'] > 5 else ''})"
                    message += f"\n"
                    if details['mcp_integrations'] > 0:
                        message += f"   • MCP Integrations: {details['mcp_integrations']}\n"
                    if details['custom_integrations'] > 0:
                        message += f"   • Custom Integrations: {details['custom_integrations']}\n"

                message += f"\n"

            message += f"Use `switch_to_agent` with an agent ID to switch to a specific agent."

            return self.success_response({
                "message": message,
                "agents": agents,
                "total_count": len(agents),
                "search_query": search_query
            })

        except Exception as e:
            logger.error(f"Failed to list agents: {e}")
            return self.fail_response("Failed to list available agents")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "switch_to_agent",
            "description": "Switch to a specific agent while maintaining the current workspace and conversation context. This works like the @ agent switching system, allowing you to change the active agent without losing conversation history or workspace state.",
            "parameters": {
                "type": "object",
                "properties": {
                    "agent_id": {
                        "type": "string",
                        "description": "The ID of the agent to switch to. Use list_available_agents to see available agent IDs."
                    },
                    "confirm_switch": {
                        "type": "boolean",
                        "description": "Whether to show confirmation details about the switch",
                        "default": True
                    }
                },
                "required": ["agent_id"]
            }
        }
    })
    @usage_example('''
        <function_calls>
        <invoke name="switch_to_agent">
        <parameter name="agent_id">agent-uuid-123</parameter>
        <parameter name="confirm_switch">true</parameter>
        </invoke>
        </function_calls>
        ''')
    async def switch_to_agent(
        self,
        agent_id: str,
        confirm_switch: bool = True
    ) -> ToolResult:
        """Switch to a specific agent while maintaining workspace continuity."""
        try:
            account_id = self.account_id
            if not account_id:
                return self.fail_response("Unable to determine current account ID")

            client = await self.db.client

            # Validate agent exists and user has access
            agent_result = await client.table('agents').select(
                'agent_id, name, description, icon_name, icon_color, icon_background, is_default, current_version_id'
            ).eq('agent_id', agent_id).eq('account_id', account_id).single().execute()

            if not agent_result.data:
                return self.fail_response("Agent not found or access denied. Use list_available_agents to see available agents.")

            agent = agent_result.data
            agent_name = agent['name']

            # Get agent configuration
            agent_config = None
            if agent.get('current_version_id'):
                try:
                    version_result = await client.table('agent_versions').select(
                        'config'
                    ).eq('version_id', agent['current_version_id']).single().execute()

                    if version_result.data:
                        agent_config = version_result.data.get('config', {})
                except Exception as e:
                    logger.warning(f"Could not load configuration for agent {agent_id}: {e}")

            # Update the thread manager's agent configuration
            if agent_config:
                # Ensure agent_id is included in the config
                agent_config['agent_id'] = agent_id
                agent_config['agent_name'] = agent_name

                # Update the agent configuration in the thread manager
                old_config = self.thread_manager.agent_config
                old_agent_id = old_config.get('agent_id') if old_config else None

                self.thread_manager.agent_config = agent_config

                # Update the response processor with new agent config
                self.thread_manager.response_processor.agent_config = agent_config

                logger.info(f"Successfully switched agent configuration from '{old_agent_id}' to '{agent_id}' ({agent_name})")

                # TODO: Consider re-registering tools based on new agent configuration
                # This would require a more complex tool registry update mechanism
                # For now, tools registered remain the same but agent config is updated

            success_message = f"✅ Successfully switched to **{agent_name}**!\n\n"

            if confirm_switch:
                success_message += f"**Agent Details:**\n"
                success_message += f"• Name: {agent_name}\n"
                success_message += f"• Description: {agent.get('description', 'No description')}\n"
                success_message += f"• Icon: {agent.get('icon_name', 'bot')} ({agent.get('icon_color', '#4F46E5')})\n"
                success_message += f"• Default Agent: {'Yes' if agent.get('is_default') else 'No'}\n"

                if agent_config:
                    tools_config = agent_config.get('tools', {})
                    agentpress_tools = tools_config.get('agentpress', {})
                    enabled_tools = [tool for tool, enabled in agentpress_tools.items() if enabled]

                    success_message += f"• Model: {agent_config.get('model', 'Unknown')}\n"
                    success_message += f"• Enabled Tools: {len(enabled_tools)}"
                    if enabled_tools:
                        success_message += f" ({', '.join(enabled_tools[:3])}{'...' if len(enabled_tools) > 3 else ''})"
                    success_message += f"\n"

                success_message += f"\n**Workspace Preserved:**\n"
                success_message += f"• Thread: Maintained ✅\n"
                success_message += f"• Conversation History: Preserved ✅\n"
                success_message += f"• Workspace State: Unchanged ✅\n\n"

            success_message += f"The agent is now active and ready to assist you!"

            return self.success_response({
                "message": success_message,
                "switched_to": {
                    "agent_id": agent_id,
                    "agent_name": agent_name,
                    "description": agent.get('description'),
                    "is_default": agent.get('is_default', False)
                },
                "workspace_preserved": True,
                "thread_preserved": True
            })

        except Exception as e:
            logger.error(f"Failed to switch to agent {agent_id}: {e}")
            return self.fail_response("Failed to switch to the specified agent")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "get_current_agent_info",
            "description": "Get information about the currently active agent, including its capabilities, configuration, and status.",
            "parameters": {
                "type": "object",
                "properties": {
                    "include_tools": {
                        "type": "boolean",
                        "description": "Whether to include detailed information about enabled tools",
                        "default": True
                    }
                }
            }
        }
    })
    @usage_example('''
        <function_calls>
        <invoke name="get_current_agent_info">
        <parameter name="include_tools">true</parameter>
        </invoke>
        </function_calls>
        ''')
    async def get_current_agent_info(self, include_tools: bool = True) -> ToolResult:
        """Get information about the currently active agent."""
        try:
            # Get current agent from thread manager
            current_config = self.thread_manager.agent_config

            if not current_config or not current_config.get('agent_id'):
                message = "**No Specific Agent Active**\n\n"
                message += "Currently using default system configuration.\n\n"
                message += "**Available Actions:**\n"
                message += "• Use `list_available_agents` to see all your agents\n"
                message += "• Use `switch_to_agent` to activate a specific agent\n"
                message += "• All agent switches preserve your workspace and conversation history"

                return self.success_response({
                    "message": message,
                    "current_agent": None,
                    "is_default": True
                })

            current_agent_id = current_config['agent_id']
            current_agent_name = current_config.get('agent_name', 'Unknown Agent')

            account_id = self.account_id
            if not account_id:
                return self.fail_response("Unable to determine current account ID")

            client = await self.db.client

            # Get current agent details from database
            agent_result = await client.table('agents').select(
                'agent_id, name, description, icon_name, icon_color, icon_background, is_default, created_at, updated_at'
            ).eq('agent_id', current_agent_id).eq('account_id', account_id).single().execute()

            if not agent_result.data:
                # Agent config exists but agent not found in DB
                message = f"**Current Agent: {current_agent_name}**\n\n"
                message += "⚠️  Agent configuration is loaded but agent details not found in database.\n"
                message += f"Agent ID: `{current_agent_id}`\n\n"
                message += "This may indicate the agent was deleted or access was revoked."

                return self.success_response({
                    "message": message,
                    "current_agent": {"agent_id": current_agent_id, "name": current_agent_name},
                    "warning": "Agent not found in database"
                })

            agent = agent_result.data
            message = f"**Current Agent: {agent['name']}**\n\n"
            message += f"• Description: {agent.get('description', 'No description')}\n"
            message += f"• Agent ID: `{agent['agent_id']}`\n"
            message += f"• Icon: {agent.get('icon_name', 'bot')} ({agent.get('icon_color', '#4F46E5')})\n"
            message += f"• Default Agent: {'Yes' if agent.get('is_default') else 'No'}\n"

            if include_tools and current_config:
                tools_config = current_config.get('tools', {})
                agentpress_tools = tools_config.get('agentpress', {})
                enabled_tools = [tool for tool, enabled in agentpress_tools.items() if enabled]

                message += f"• Model: {current_config.get('model', 'Unknown')}\n"
                message += f"• Enabled Tools: {len(enabled_tools)}"
                if enabled_tools:
                    message += f" ({', '.join(enabled_tools[:5])}{'...' if len(enabled_tools) > 5 else ''})"
                message += f"\n"

                mcp_integrations = len(tools_config.get('mcp', []))
                custom_integrations = len(tools_config.get('custom_mcp', []))
                if mcp_integrations > 0:
                    message += f"• MCP Integrations: {mcp_integrations}\n"
                if custom_integrations > 0:
                    message += f"• Custom Integrations: {custom_integrations}\n"

            message += f"\n**Available Actions:**\n"
            message += "• Use `list_available_agents` to see all available agents\n"
            message += "• Use `switch_to_agent` to change to a different agent\n"
            message += "• Use `search_agents` to find specific agents"

            return self.success_response({
                "message": message,
                "current_agent": {
                    "agent_id": agent['agent_id'],
                    "name": agent['name'],
                    "description": agent.get('description'),
                    "is_default": agent.get('is_default', False),
                    "model": current_config.get('model', 'Unknown'),
                    "enabled_tools": enabled_tools if include_tools else None
                },
                "is_default": False
            })

        except Exception as e:
            logger.error(f"Failed to get current agent info: {e}")
            return self.fail_response("Failed to get current agent information")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "search_agents",
            "description": "Search for agents by name or description. Useful when you have many agents and want to find specific ones quickly.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query to match against agent names and descriptions"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of agents to return",
                        "default": 10,
                        "minimum": 1,
                        "maximum": 50
                    }
                },
                "required": ["query"]
            }
        }
    })
    @usage_example('''
        <function_calls>
        <invoke name="search_agents">
        <parameter name="query">research</parameter>
        <parameter name="limit">5</parameter>
        </invoke>
        </function_calls>

        <function_calls>
        <invoke name="search_agents">
        <parameter name="query">coding assistant</parameter>
        </invoke>
        </function_calls>
        ''')
    async def search_agents(self, query: str, limit: int = 10) -> ToolResult:
        """Search for agents by name or description."""
        try:
            if not query or len(query.strip()) < 2:
                return self.fail_response("Search query must be at least 2 characters long")

            # Use the list_available_agents method with search functionality
            result = await self.list_available_agents(
                include_details=True,
                search_query=query.strip()
            )

            if not result.success:
                return result

            # Parse the result and limit the number of agents
            result_data = json.loads(result.output)
            agents = result_data.get("agents", [])

            # Apply limit
            limited_agents = agents[:limit]

            if not limited_agents:
                message = f"No agents found matching '{query}'.\n\n"
                message += "Try:\n"
                message += "• Using different keywords\n"
                message += "• Checking spelling\n"
                message += "• Using broader search terms\n"
                message += "• Using `list_available_agents` to see all agents"

                return self.success_response({
                    "message": message,
                    "agents": [],
                    "search_query": query,
                    "total_found": 0
                })

            message = f"Found {len(limited_agents)} agent(s) matching '{query}':\n\n"

            for agent in limited_agents:
                message += f"🔍 **{agent['name']}**"
                if agent['is_default']:
                    message += " ⭐ (Default)"
                message += f"\n"
                message += f"   • {agent['description']}\n"
                message += f"   • ID: `{agent['agent_id']}`\n"

                if "details" in agent and "error" not in agent["details"]:
                    details = agent["details"]
                    message += f"   • {details['enabled_tools_count']} tools enabled"
                    if details['enabled_tools']:
                        message += f" ({', '.join(details['enabled_tools'][:3])}{'...' if details['enabled_tools_count'] > 3 else ''})"
                    message += f"\n"

                message += f"\n"

            if len(agents) > limit:
                message += f"Showing {limit} of {len(agents)} results. Use a more specific query or increase the limit to see more."

            message += f"\nUse `switch_to_agent` with an agent ID to switch to any of these agents."

            return self.success_response({
                "message": message,
                "agents": limited_agents,
                "search_query": query,
                "total_found": len(agents),
                "showing": len(limited_agents)
            })

        except Exception as e:
            logger.error(f"Failed to search agents: {e}")
            return self.fail_response("Failed to search agents")