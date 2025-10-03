import json
import re
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

    def __init__(self, thread_manager: ThreadManager, db_connection, account_id: str, project_id: str = None, thread_id: str = None):
        super().__init__()
        self.thread_manager = thread_manager
        self.db = db_connection
        self.account_id = account_id
        self.project_id = project_id
        self.thread_id = thread_id

    async def _get_current_account_id(self) -> Optional[str]:
        return self.account_id

    def _is_uuid_format(self, identifier: str) -> bool:
        """Check if the identifier looks like a UUID."""
        # UUID v4 pattern: 8-4-4-4-12 hexadecimal characters
        uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        return bool(re.match(uuid_pattern, identifier.lower()))

    def _calculate_similarity(self, query: str, target: str) -> float:
        """Calculate similarity score between two strings using simple ratio."""
        query_lower = query.lower().strip()
        target_lower = target.lower().strip()

        # Exact match
        if query_lower == target_lower:
            return 1.0

        # One string contains the other
        if query_lower in target_lower or target_lower in query_lower:
            return 0.8

        # Simple character-based similarity (Jaccard similarity)
        set1 = set(query_lower)
        set2 = set(target_lower)
        intersection = len(set1.intersection(set2))
        union = len(set1.union(set2))

        if union == 0:
            return 0.0

        return intersection / union

    def _find_similar_agents(self, query: str, agents: List[dict], threshold: float = 0.3) -> List[dict]:
        """Find agents with names similar to the query."""
        similar_agents = []

        for agent in agents:
            agent_name = agent.get('name', '')
            similarity = self._calculate_similarity(query, agent_name)

            if similarity >= threshold:
                agent_copy = agent.copy()
                agent_copy['similarity_score'] = similarity
                similar_agents.append(agent_copy)

        # Sort by similarity score (highest first)
        similar_agents.sort(key=lambda x: x['similarity_score'], reverse=True)

        return similar_agents

    async def _resolve_agent_by_identifier(self, identifier: str) -> tuple[Optional[dict], Optional[str]]:
        """
        Smart agent resolution that handles both UUIDs and names.

        Returns:
            tuple: (agent_data, error_message)
        """
        try:
            account_id = self.account_id
            if not account_id:
                return None, "Unable to determine current account ID"

            client = await self.db.client

            # Strategy 1: If it looks like a UUID, search by agent_id
            if self._is_uuid_format(identifier):
                logger.debug(f"Treating '{identifier}' as UUID, searching by agent_id")
                agent_result = await client.table('agents').select(
                    'agent_id, name, description, icon_name, icon_color, icon_background, is_default, current_version_id'
                ).eq('agent_id', identifier).eq('account_id', account_id).single().execute()

                if agent_result.data:
                    return agent_result.data, None
                else:
                    return None, f"Agent with ID '{identifier}' not found or access denied."

            # Strategy 2: Search by name (case-insensitive)
            logger.debug(f"Treating '{identifier}' as name, searching case-insensitively")

            # Get all agents for the account
            all_agents_result = await client.table('agents').select(
                'agent_id, name, description, icon_name, icon_color, icon_background, is_default, current_version_id'
            ).eq('account_id', account_id).execute()

            if not all_agents_result.data:
                return None, "No agents found for your account."

            all_agents = all_agents_result.data

            # Try exact case-insensitive match first
            for agent in all_agents:
                if agent['name'].lower() == identifier.lower():
                    logger.debug(f"Found exact name match: '{agent['name']}'")
                    return agent, None

            # Strategy 3: No exact match found, try fuzzy matching
            logger.debug(f"No exact match for '{identifier}', trying fuzzy matching")
            similar_agents = self._find_similar_agents(identifier, all_agents, threshold=0.3)

            if similar_agents:
                # If we have a very good match (>90%), use it
                best_match = similar_agents[0]
                if best_match['similarity_score'] >= 0.9:
                    logger.debug(f"Found high-confidence match: '{best_match['name']}' (score: {best_match['similarity_score']:.2f})")
                    return best_match, None

                # Otherwise, show suggestions
                suggestions = []
                for agent in similar_agents[:5]:  # Show top 5 matches
                    score_percent = int(agent['similarity_score'] * 100)
                    suggestions.append(f"• **{agent['name']}** (similarity: {score_percent}%) - ID: `{agent['agent_id']}`")

                suggestion_text = "\n".join(suggestions)
                return None, f"Agent '{identifier}' not found. Did you mean:\n\n{suggestion_text}\n\nUse the exact name or agent ID to switch."

            # Strategy 4: No similar agents found, show all available agents
            agent_list = []
            for agent in all_agents[:10]:  # Show first 10 agents
                agent_list.append(f"• **{agent['name']}** - ID: `{agent['agent_id']}`")

            agents_text = "\n".join(agent_list)
            more_text = f"\n\n... and {len(all_agents) - 10} more agents." if len(all_agents) > 10 else ""

            return None, f"Agent '{identifier}' not found. Available agents:\n\n{agents_text}{more_text}\n\nUse `list_available_agents` to see all agents with details."

        except Exception as e:
            logger.error(f"Failed to resolve agent identifier '{identifier}': {e}")
            return None, f"Failed to resolve agent identifier: {str(e)}"

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
            "description": "Switch to a specific agent while maintaining the current workspace and conversation context. This works like the @ agent switching system, allowing you to change the active agent without losing conversation history or workspace state. You can use either the agent's name (e.g., 'roteirista') or its UUID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "agent_id": {
                        "type": "string",
                        "description": "The agent name or ID to switch to. Can be either the agent's name (case-insensitive, e.g., 'roteirista', 'Roteirista') or the exact agent UUID. If using a name with typos, the system will suggest similar agents."
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
        <parameter name="agent_id">roteirista</parameter>
        <parameter name="confirm_switch">true</parameter>
        </invoke>
        </function_calls>

        <function_calls>
        <invoke name="switch_to_agent">
        <parameter name="agent_id">agent-uuid-123</parameter>
        <parameter name="confirm_switch">true</parameter>
        </invoke>
        </function_calls>

        <function_calls>
        <invoke name="switch_to_agent">
        <parameter name="agent_id">ROTEIRISTA</parameter>
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
            # Use smart agent resolution to handle both UUIDs and names
            agent, error_message = await self._resolve_agent_by_identifier(agent_id)

            if not agent:
                return self.fail_response(error_message or "Agent not found or access denied.")

            agent_name = agent['name']
            actual_agent_id = agent['agent_id']

            # Log the resolution for debugging
            if agent_id != actual_agent_id:
                logger.info(f"Resolved agent identifier '{agent_id}' to agent '{agent_name}' (ID: {actual_agent_id})")

            client = await self.db.client

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

            # Update the thread manager's agent configuration and tools
            if agent_config:
                # Ensure agent_id is included in the config
                agent_config['agent_id'] = actual_agent_id
                agent_config['agent_name'] = agent_name

                # Get old configuration for comparison
                old_config = self.thread_manager.agent_config
                old_agent_id = old_config.get('agent_id') if old_config else None

                # Update the agent configuration in the thread manager
                self.thread_manager.agent_config = agent_config

                # Update the response processor with new agent config
                self.thread_manager.response_processor.agent_config = agent_config

                logger.info(f"Successfully switched agent configuration from '{old_agent_id}' to '{actual_agent_id}' ({agent_name})")

                # Reload tools based on new agent configuration
                if self.project_id and self.thread_id:
                    try:
                        tool_stats = self.thread_manager.reload_tools_for_agent(
                            new_agent_config=agent_config,
                            project_id=self.project_id,
                            thread_id=self.thread_id,
                            account_id=self.account_id
                        )
                        logger.info(f"Successfully reloaded tools for agent '{actual_agent_id}': {tool_stats['total_functions']} functions available")

                        # Add tool reload info to success message
                        tools_reloaded = True
                        new_tool_count = tool_stats['total_functions']
                    except Exception as e:
                        logger.error(f"Failed to reload tools for agent '{agent_id}': {e}")
                        tools_reloaded = False
                        new_tool_count = None
                else:
                    logger.warning("Cannot reload tools: project_id or thread_id not available")
                    tools_reloaded = False
                    new_tool_count = None
            else:
                tools_reloaded = False
                new_tool_count = None

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

                success_message += f"\n**System Updates:**\n"
                success_message += f"• Thread: Maintained ✅\n"
                success_message += f"• Conversation History: Preserved ✅\n"
                success_message += f"• Workspace State: Unchanged ✅\n"

                if tools_reloaded and new_tool_count is not None:
                    success_message += f"• Tools: Reloaded ({new_tool_count} functions) ✅\n"
                elif not tools_reloaded:
                    success_message += f"• Tools: Configuration updated ⚠️\n"

                success_message += f"\n"

            success_message += f"The agent is now active with the correct configuration and tools!"

            return self.success_response({
                "message": success_message,
                "switched_to": {
                    "agent_id": actual_agent_id,
                    "agent_name": agent_name,
                    "description": agent.get('description'),
                    "is_default": agent.get('is_default', False),
                    "resolved_from": agent_id if agent_id != actual_agent_id else None
                },
                "workspace_preserved": True,
                "thread_preserved": True
            })

        except Exception as e:
            logger.error(f"Failed to switch to agent '{agent_id}': {e}")
            return self.fail_response(f"Failed to switch to agent '{agent_id}': {str(e)}")

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

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "list_current_tools",
            "description": "List all currently available tools and their functions. Useful for debugging and verifying that agent switching worked correctly.",
            "parameters": {
                "type": "object",
                "properties": {
                    "include_statistics": {
                        "type": "boolean",
                        "description": "Whether to include detailed statistics about the tool registry",
                        "default": True
                    }
                }
            }
        }
    })
    @usage_example('''
        <function_calls>
        <invoke name="list_current_tools">
        <parameter name="include_statistics">true</parameter>
        </invoke>
        </function_calls>
        ''')
    async def list_current_tools(self, include_statistics: bool = True) -> ToolResult:
        """List all currently available tools and their functions."""
        try:
            # Get tool registry statistics
            stats = self.thread_manager.tool_registry.get_tool_statistics()

            message = f"**Current Tool Registry Status**\n\n"
            message += f"• **Total Functions**: {stats['total_functions']}\n"
            message += f"• **Unique Tool Classes**: {stats['unique_tool_classes']}\n\n"

            message += f"**Available Functions:**\n"
            for i, func_name in enumerate(sorted(stats['function_names']), 1):
                message += f"{i:2d}. `{func_name}`\n"

            if include_statistics:
                message += f"\n**Tool Classes:**\n"
                for i, class_name in enumerate(sorted(stats['tool_class_names']), 1):
                    message += f"{i:2d}. {class_name}\n"

            # Get current agent info if available
            current_config = self.thread_manager.agent_config
            if current_config and current_config.get('agent_id'):
                agent_name = current_config.get('agent_name', 'Unknown')
                agent_id = current_config.get('agent_id')
                message += f"\n**Current Agent**: {agent_name} (`{agent_id}`)\n"

                # Show enabled/disabled tools from agent config
                if 'tools' in current_config:
                    tools_config = current_config['tools'].get('agentpress', {})
                    enabled_count = sum(1 for enabled in tools_config.values() if enabled)
                    disabled_count = sum(1 for enabled in tools_config.values() if not enabled)
                    message += f"**Agent Tool Config**: {enabled_count} enabled, {disabled_count} disabled\n"
            else:
                message += f"\n**Current Agent**: Default system configuration\n"

            return self.success_response({
                "message": message,
                "statistics": stats if include_statistics else None,
                "current_agent": current_config.get('agent_id') if current_config else None
            })

        except Exception as e:
            logger.error(f"Failed to list current tools: {e}")
            return self.fail_response("Failed to list current tools")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "test_agent_resolution",
            "description": "Test the smart agent resolution system with different input formats. Useful for debugging and demonstrating the name resolution capabilities.",
            "parameters": {
                "type": "object",
                "properties": {
                    "test_identifier": {
                        "type": "string",
                        "description": "Test identifier to resolve (can be name, partial name, UUID, etc.)"
                    }
                },
                "required": ["test_identifier"]
            }
        }
    })
    @usage_example('''
        <function_calls>
        <invoke name="test_agent_resolution">
        <parameter name="test_identifier">roteirista</parameter>
        </invoke>
        </function_calls>

        <function_calls>
        <invoke name="test_agent_resolution">
        <parameter name="test_identifier">roteirist</parameter>
        </invoke>
        </function_calls>
        ''')
    async def test_agent_resolution(self, test_identifier: str) -> ToolResult:
        """Test the smart agent resolution system."""
        try:
            is_uuid = self._is_uuid_format(test_identifier)

            message = f"**Agent Resolution Test**\n\n"
            message += f"**Input**: `{test_identifier}`\n"
            message += f"**Detected as**: {'UUID' if is_uuid else 'Name'}\n\n"

            agent, error_message = await self._resolve_agent_by_identifier(test_identifier)

            if agent:
                message += f"**✅ Resolution Successful**\n"
                message += f"• **Resolved to**: {agent['name']}\n"
                message += f"• **Agent ID**: `{agent['agent_id']}`\n"
                message += f"• **Description**: {agent.get('description', 'No description')}\n"

                if test_identifier != agent['agent_id']:
                    message += f"• **Input Transformation**: `{test_identifier}` → `{agent['name']}`\n"

                return self.success_response({
                    "message": message,
                    "test_result": "success",
                    "input": test_identifier,
                    "resolved_agent": {
                        "agent_id": agent['agent_id'],
                        "name": agent['name'],
                        "description": agent.get('description')
                    },
                    "is_uuid": is_uuid
                })
            else:
                message += f"**❌ Resolution Failed**\n"
                message += f"• **Error**: {error_message}\n"

                return self.success_response({
                    "message": message,
                    "test_result": "failed",
                    "input": test_identifier,
                    "error": error_message,
                    "is_uuid": is_uuid
                })

        except Exception as e:
            logger.error(f"Failed to test agent resolution: {e}")
            return self.fail_response(f"Failed to test agent resolution: {str(e)}")