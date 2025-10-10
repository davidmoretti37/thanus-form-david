import json
import base64
from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Request, Body

from core.utils.auth_utils import verify_and_get_user_id_from_jwt
from core.utils.logger import logger
from core.sandbox.sandbox import get_or_start_sandbox
from core.services.supabase import DBConnection
from core.agentpress.thread_manager import ThreadManager

from . import core_utils as utils
from .core_utils import _get_version_service
from typing import List, Dict, Any, Optional
from uuid import UUID
from pydantic import BaseModel

router = APIRouter(tags=["agent-tools"])

class PipedreamToolConfig(BaseModel):
    name: str
    type: str = "pipedream"
    config: Dict[str, Any]
    enabled_tools: List[str]

class PipedreamToolUpdateRequest(BaseModel):
    tools: List[PipedreamToolConfig]

@router.get("/agents/{agent_id}/custom-mcp-tools", summary="Get Agent Custom MCP Tools", operation_id="get_agent_custom_mcp_tools")
async def get_custom_mcp_tools_for_agent(
    agent_id: str,
    request: Request,
    user_id: str = Depends(verify_and_get_user_id_from_jwt)
):
    logger.debug(f"Getting custom MCP tools for agent {agent_id}, user {user_id}")
    try:
        client = await utils.db.client
        agent_result = await client.table('agents').select('current_version_id').eq('agent_id', agent_id).eq('account_id', user_id).execute()
        if not agent_result.data:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        agent = agent_result.data[0]
 
        agent_config = {}
        if agent.get('current_version_id'):
            version_result = await client.table('agent_versions')\
                .select('config')\
                .eq('version_id', agent['current_version_id'])\
                .maybe_single()\
                .execute()
            if version_result.data and version_result.data.get('config'):
                agent_config = version_result.data['config']
        
        tools = agent_config.get('tools', {})
        custom_mcps = tools.get('custom_mcp', [])
        
        mcp_url = request.headers.get('X-MCP-URL')
        mcp_type = request.headers.get('X-MCP-Type', 'sse')
        
        if not mcp_url:
            raise HTTPException(status_code=400, detail="X-MCP-URL header is required")
        
        # For Pipedream, the X-MCP-URL contains the profile_id
        if mcp_type == 'pipedream':
            mcp_config = {
                'profile_id': mcp_url,
                'url': 'https://remote.mcp.pipedream.net',
                'type': mcp_type
            }
        else:
            mcp_config = {
                'url': mcp_url,
                'type': mcp_type
            }
        
        if 'X-MCP-Headers' in request.headers:
            import json
            try:
                mcp_config['headers'] = json.loads(request.headers['X-MCP-Headers'])
            except json.JSONDecodeError:
                logger.warning("Failed to parse X-MCP-Headers as JSON")
        
        from core.mcp_module import mcp_service
        discovery_result = await mcp_service.discover_custom_tools(mcp_type, mcp_config)
        
        existing_mcp = None
        for mcp in custom_mcps:
            if mcp_type == 'composio':
                if (mcp.get('type') == 'composio' and 
                    mcp.get('config', {}).get('profile_id') == mcp_url):
                    existing_mcp = mcp
                    break
            elif mcp_type == 'pipedream':
                if (mcp.get('type') == 'pipedream' and 
                    mcp.get('config', {}).get('profile_id') == mcp_url):
                    existing_mcp = mcp
                    break
            else:
                if (mcp.get('customType') == mcp_type and 
                    mcp.get('config', {}).get('url') == mcp_url):
                    existing_mcp = mcp
                    break
        
        tools = []
        enabled_tools = existing_mcp.get('enabledTools', []) if existing_mcp else []
        
        for tool in discovery_result.tools:
            tools.append({
                'name': tool['name'],
                'description': tool.get('description', f'Tool from {mcp_type.upper()} MCP server'),
                'enabled': tool['name'] in enabled_tools
            })
        
        return {
            'tools': tools,
            'has_mcp_config': existing_mcp is not None,
            'server_type': mcp_type,
            'server_url': mcp_url
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting custom MCP tools for agent {agent_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/agents/{agent_id}/custom-mcp-tools", summary="Update Agent Custom MCP Tools", operation_id="update_agent_custom_mcp_tools")
async def update_custom_mcp_tools_for_agent(
    agent_id: str,
    request: dict,
    user_id: str = Depends(verify_and_get_user_id_from_jwt)
):
    logger.debug(f"Updating custom MCP tools for agent {agent_id}, user {user_id}")
    
    try:
        client = await utils.db.client
        
        agent_result = await client.table('agents').select('current_version_id').eq('agent_id', agent_id).eq('account_id', user_id).execute()
        if not agent_result.data:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        agent = agent_result.data[0]
        
        agent_config = {}
        if agent.get('current_version_id'):
            version_result = await client.table('agent_versions')\
                .select('config')\
                .eq('version_id', agent['current_version_id'])\
                .maybe_single()\
                .execute()
            if version_result.data and version_result.data.get('config'):
                agent_config = version_result.data['config']
        
        tools = agent_config.get('tools', {})
        custom_mcps = tools.get('custom_mcp', [])
        
        mcp_url = request.get('url')
        mcp_type = request.get('type', 'sse')
        enabled_tools = request.get('enabled_tools', [])
        
        if not mcp_url:
            raise HTTPException(status_code=400, detail="MCP URL is required")
        
        updated = False
        for i, mcp in enumerate(custom_mcps):
            if mcp_type == 'composio':
                # For Composio, match by profile_id
                if (mcp.get('type') == 'composio' and 
                    mcp.get('config', {}).get('profile_id') == mcp_url):
                    custom_mcps[i]['enabledTools'] = enabled_tools
                    updated = True
                    break
            elif mcp_type == 'pipedream':
                # For Pipedream, match by profile_id (mcp_url contains profile_id)
                if (mcp.get('type') == 'pipedream' and 
                    mcp.get('config', {}).get('profile_id') == mcp_url):
                    custom_mcps[i]['enabledTools'] = enabled_tools
                    updated = True
                    break
            else:
                if (mcp.get('customType') == mcp_type and 
                    mcp.get('config', {}).get('url') == mcp_url):
                    custom_mcps[i]['enabledTools'] = enabled_tools
                    updated = True
                    break
        
        if not updated:
            if mcp_type == 'composio':
                try:
                    from core.composio_integration.composio_profile_service import ComposioProfileService
                    from core.services.supabase import DBConnection
                    profile_service = ComposioProfileService(DBConnection())
 
                    profile_id = mcp_url
                    mcp_config = await profile_service.get_mcp_config_for_agent(profile_id)
                    mcp_config['enabledTools'] = enabled_tools
                    custom_mcps.append(mcp_config)
                except Exception as e:
                    logger.error(f"Failed to get Composio profile config: {e}")
                    raise HTTPException(status_code=400, detail=f"Failed to get Composio profile: {str(e)}")
            elif mcp_type == 'pipedream':
                # For Pipedream, mcp_url contains the profile_id
                new_mcp_config = {
                    "name": f"Pipedream MCP",
                    "type": "pipedream",
                    "config": {
                        "url": "https://remote.mcp.pipedream.net",
                        "profile_id": mcp_url
                    },
                    "enabledTools": enabled_tools
                }
                custom_mcps.append(new_mcp_config)
            else:
                new_mcp_config = {
                    "name": f"Custom MCP ({mcp_type.upper()})",
                    "customType": mcp_type,
                    "type": mcp_type,
                    "config": {
                        "url": mcp_url
                    },
                    "enabledTools": enabled_tools
                }
                custom_mcps.append(new_mcp_config)
        
        tools['custom_mcp'] = custom_mcps
        agent_config['tools'] = tools
        
        from .versioning.version_service import get_version_service
        try:
            version_service = await get_version_service() 
            new_version = await version_service.create_version(
                agent_id=agent_id,
                user_id=user_id,
                system_prompt=agent_config.get('system_prompt', ''),
                configured_mcps=agent_config.get('tools', {}).get('mcp', []),
                custom_mcps=custom_mcps,
                agentpress_tools=agent_config.get('tools', {}).get('agentpress', {}),
                change_description=f"Updated custom MCP tools for {mcp_type}"
            )
            logger.debug(f"Created version {new_version.version_id} for custom MCP tools update on agent {agent_id}")
        except Exception as e:
            logger.error(f"Failed to create version for custom MCP tools update: {e}")
            raise HTTPException(status_code=500, detail="Failed to save changes")
        
        return {
            'success': True,
            'enabled_tools': enabled_tools,
            'total_tools': len(enabled_tools)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating custom MCP tools for agent {agent_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/agents/{agent_id}/pipedream-tools/{profile_id}")
async def get_agent_pipedream_tools(
    agent_id: str,
    profile_id: str,
    user_id: str = Depends(verify_and_get_user_id_from_jwt),
    version: Optional[str] = None
):
    """
    Get Pipedream tools for a specific profile.
    """
    logger.debug(f"Getting Pipedream tools for agent {agent_id}, profile {profile_id}")
    
    try:
        client = await utils.db.client
        
        # Get agent
        agent_result = await client.table('agents')\
            .select('current_version_id')\
            .eq('agent_id', agent_id)\
            .eq('account_id', user_id)\
            .execute()
            
        if not agent_result.data:
            raise HTTPException(status_code=404, detail="Agent not found")
            
        agent = agent_result.data[0]
        
        # Determine which version to use
        version_id = version if version else agent.get('current_version_id')
        
        # Get agent config from version
        agent_config = {}
        if version_id:
            version_result = await client.table('agent_versions')\
                .select('config')\
                .eq('version_id', version_id)\
                .maybe_single()\
                .execute()
            if version_result.data and version_result.data.get('config'):
                agent_config = version_result.data['config']
        
        # Get profile info from database
        profile_result = await client.table('user_mcp_credential_profiles')\
            .select('profile_name, app_name, app_slug')\
            .eq('profile_id', profile_id)\
            .single()\
            .execute()
            
        if not profile_result.data:
            raise HTTPException(status_code=404, detail="Pipedream profile not found")
            
        profile_data = profile_result.data
        
        # Discover tools using MCP service
        from core.mcp_module import mcp_service
        
        mcp_config = {
            'profile_id': profile_id,
            'url': 'https://remote.mcp.pipedream.net',
            'type': 'pipedream'
        }
        
        discovery_result = await mcp_service.discover_custom_tools('pipedream', mcp_config)
        
        # Check if this profile is already configured in the agent
        tools_config = agent_config.get('tools', {})
        custom_mcps = tools_config.get('custom_mcp', [])
        
        existing_mcp = None
        for mcp in custom_mcps:
            if (mcp.get('type') == 'pipedream' and 
                mcp.get('config', {}).get('profile_id') == profile_id):
                existing_mcp = mcp
                break
        
        # Build tools list with enabled status
        tools = []
        enabled_tools = existing_mcp.get('enabledTools', []) if existing_mcp else []
        
        for tool in discovery_result.tools:
            tools.append({
                'name': tool['name'],
                'description': tool.get('description', ''),
                'enabled': tool['name'] in enabled_tools
            })
        
        return {
            'profile_id': profile_id,
            'app_name': profile_data.get('app_name', ''),
            'app_slug': profile_data.get('app_slug', ''),
            'profile_name': profile_data.get('profile_name', ''),
            'tools': tools,
            'has_mcp_config': existing_mcp is not None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting Pipedream tools for agent {agent_id}, profile {profile_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/agents/{agent_id}/pipedream-tools/{profile_id}")
async def update_agent_pipedream_tools(
    agent_id: str,
    profile_id: str,
    request: dict,
    user_id: str = Depends(verify_and_get_user_id_from_jwt)
):
    """
    Update Pipedream tools configuration for an agent.
    
    The request body should be in the format:
    {
        "name": "Conta Principal do Gmail",
        "type": "pipedream",
        "config": {
            "url": "https://remote.mcp.pipedream.net",
            "headers": {
                "x-pd-app-slug": "gmail"
            },
            "profile_id": "5072d483-0135-4f81-9097-83d43c6d07bc"
        },
        "enabled_tools": ["gmail-send-email"]
    }
    """
    logger.debug(f"Updating Pipedream tools for agent {agent_id}, profile {profile_id}")
    
    try:
        # Validate required fields
        if not isinstance(request.get('enabled_tools', []), list):
            raise HTTPException(status_code=400, detail="enabled_tools must be a list")
            
        # Get the current agent configuration
        client = await utils.db.client
        agent_result = await client.table('agents')\
            .select('current_version_id')\
            .eq('agent_id', agent_id)\
            .eq('account_id', user_id)\
            .execute()
            
        if not agent_result.data:
            raise HTTPException(status_code=404, detail="Agent not found")
            
        agent = agent_result.data[0]
        
        # Get the current agent version config
        version_result = await client.table('agent_versions')\
            .select('config')\
            .eq('version_id', agent['current_version_id'])\
            .maybe_single()\
            .execute()
            
        agent_config = version_result.data.get('config', {}) if version_result.data else {}
        tools = agent_config.get('tools', {})
        
        # Get or initialize custom_mcp array
        custom_mcps = tools.get('custom_mcp', [])
        
        # Check if this Pipedream profile already exists in the config
        existing_tool = None
        existing_index = -1
        for i, mcp in enumerate(custom_mcps):
            if (mcp.get('type') == 'pipedream' and 
                mcp.get('config', {}).get('profile_id') == profile_id):
                existing_tool = mcp
                existing_index = i
                break
        
        # Prepare the Pipedream tool configuration
        if existing_tool:
            # Update existing tool with new values, preserving existing ones if not provided
            pipedream_tool = {
                "name": request.get('name', existing_tool.get('name', 'Pipedream Tool')),
                "type": "pipedream",
                "config": {**existing_tool.get('config', {}), **request.get('config', {})},
                "enabledTools": request.get('enabled_tools', [])
            }
            # Ensure profile_id is preserved in config
            pipedream_tool['config']['profile_id'] = profile_id
        else:
            # Create new tool with default values
            app_name = 'unknown_app'
            request_config = request.get('config', {})
            
            if request_config and 'headers' in request_config and 'x-pd-app-slug' in request_config['headers']:
                app_name = request_config['headers']['x-pd-app-slug']
            
            # Start with default config
            pipedream_tool = {
                "name": f"Pipedream - {app_name}",
                "type": "pipedream",
                "config": {
                    "url": "https://remote.mcp.pipedream.net",
                    "headers": {
                        "x-pd-app-slug": app_name
                    },
                    "profile_id": profile_id
                },
                "enabledTools": request.get('enabled_tools', [])
            }
            
            # Update with any provided values
            if 'name' in request:
                pipedream_tool['name'] = request['name']
                
            # Safely update config if provided
            if request_config:
                if 'url' in request_config:
                    pipedream_tool['config']['url'] = request_config['url']
                if 'headers' in request_config:
                    pipedream_tool['config']['headers'] = {
                        **pipedream_tool['config'].get('headers', {}),
                        **request_config.get('headers', {})
                    }
                # Ensure profile_id is always set
                pipedream_tool['config']['profile_id'] = profile_id
        
        # Update or add the tool in the custom_mcps array
        if existing_index >= 0:
            custom_mcps[existing_index] = pipedream_tool
        else:
            custom_mcps.append(pipedream_tool)
            
        # Update the tools configuration
        tools['custom_mcp'] = custom_mcps
        agent_config['tools'] = tools
        
        # Create a new version with the updated config
        from .versioning.version_service import get_version_service
        try:
            version_service = await get_version_service()
            new_version = await version_service.create_version(
                agent_id=agent_id,
                user_id=user_id,
                system_prompt=agent_config.get('system_prompt', ''),
                configured_mcps=agent_config.get('tools', {}).get('mcp', []),
                custom_mcps=custom_mcps,
                agentpress_tools=agent_config.get('tools', {}).get('agentpress', {}),
                change_description=f"Updated Pipedream tools configuration for profile {profile_id}"
            )
            logger.debug(f"Created version {new_version.version_id} for Pipedream tools update on agent {agent_id}")
            
            # Update the agent's current version
            await client.table('agents')\
                .update({'current_version_id': str(new_version.version_id)})\
                .eq('agent_id', agent_id)\
                .eq('account_id', user_id)\
                .execute()
                
        except Exception as e:
            logger.error(f"Failed to create version for Pipedream tools update: {e}")
            raise HTTPException(status_code=500, detail="Failed to save changes")
            
        return {
            'success': True,
            'message': 'Pipedream tools updated successfully',
            'enabled_tools': request['enabled_tools']
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating Pipedream tools for agent {agent_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/agents/{agent_id}/custom-mcp-tools")
async def update_agent_custom_mcps(
    agent_id: str,
    request: dict,
    user_id: str = Depends(verify_and_get_user_id_from_jwt)
):
    logger.debug(f"Updating agent {agent_id} custom MCPs for user {user_id}")
    
    try:
        client = await utils.db.client
        agent_result = await client.table('agents').select('current_version_id').eq('agent_id', agent_id).eq('account_id', user_id).execute()
        if not agent_result.data:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        agent = agent_result.data[0]
        
        agent_config = {}
        if agent.get('current_version_id'):
            version_result = await client.table('agent_versions')\
                .select('config')\
                .eq('version_id', agent['current_version_id'])\
                .maybe_single()\
                .execute()
            if version_result.data and version_result.data.get('config'):
                agent_config = version_result.data['config']
        
        new_custom_mcps = request.get('custom_mcps', [])
        if not new_custom_mcps:
            raise HTTPException(status_code=400, detail="custom_mcps array is required")
        
        tools = agent_config.get('tools', {})
        existing_custom_mcps = tools.get('custom_mcp', [])
        
        updated = False
        for new_mcp in new_custom_mcps:
            mcp_type = new_mcp.get('type', '')
            
            if mcp_type == 'composio':
                profile_id = new_mcp.get('config', {}).get('profile_id')
                if not profile_id:
                    continue
                    
                for i, existing_mcp in enumerate(existing_custom_mcps):
                    if (existing_mcp.get('type') == 'composio' and 
                        existing_mcp.get('config', {}).get('profile_id') == profile_id):
                        existing_custom_mcps[i] = new_mcp
                        updated = True
                        break
                
                if not updated:
                    existing_custom_mcps.append(new_mcp)
                    updated = True
            else:
                mcp_url = new_mcp.get('config', {}).get('url')
                mcp_name = new_mcp.get('name', '')
                
                for i, existing_mcp in enumerate(existing_custom_mcps):
                    if (existing_mcp.get('config', {}).get('url') == mcp_url or 
                        (mcp_name and existing_mcp.get('name') == mcp_name)):
                        existing_custom_mcps[i] = new_mcp
                        updated = True
                        break
                
                if not updated:
                    existing_custom_mcps.append(new_mcp)
                    updated = True
        
        tools['custom_mcp'] = existing_custom_mcps
        agent_config['tools'] = tools
        
        from .versioning.version_service import get_version_service
        import datetime
        
        try:
            version_service = await get_version_service()
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            change_description = f"MCP tools update {timestamp}"
            
            new_version = await version_service.create_version(
                agent_id=agent_id,
                user_id=user_id,
                system_prompt=agent_config.get('system_prompt', ''),
                configured_mcps=agent_config.get('tools', {}).get('mcp', []),
                custom_mcps=existing_custom_mcps,
                agentpress_tools=agent_config.get('tools', {}).get('agentpress', {}),
                change_description=change_description
            )
            logger.debug(f"Created version {new_version.version_id} for agent {agent_id}")
            
            total_enabled_tools = sum(len(mcp.get('enabledTools', [])) for mcp in new_custom_mcps)
        except Exception as e:
            logger.error(f"Failed to create version for custom MCP tools update: {e}")
            raise HTTPException(status_code=500, detail="Failed to save changes")
        
        return {
            'success': True,
            'data': {
                'custom_mcps': existing_custom_mcps,
                'total_enabled_tools': total_enabled_tools
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating agent custom MCPs: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/agents/{agent_id}/tools", summary="Get Agent Tools", operation_id="get_agent_tools")
async def get_agent_tools(
    agent_id: str,
    user_id: str = Depends(verify_and_get_user_id_from_jwt)
):
        
    logger.debug(f"Fetching enabled tools for agent: {agent_id} by user: {user_id}")
    client = await utils.db.client

    agent_result = await client.table('agents').select('*').eq('agent_id', agent_id).execute()
    if not agent_result.data:
        raise HTTPException(status_code=404, detail="Agent not found")
    agent = agent_result.data[0]
    if agent['account_id'] != user_id and not agent.get('is_public', False):
        raise HTTPException(status_code=403, detail="Access denied")

    version_data = None
    if agent.get('current_version_id'):
        try:
            version_service = await _get_version_service()

            version_obj = await version_service.get_version(
                agent_id=agent_id,
                version_id=agent['current_version_id'],
                user_id=user_id
            )
            version_data = version_obj.to_dict()
        except Exception as e:
            logger.warning(f"Failed to fetch version data for tools endpoint: {e}")
    
    from .config_helper import extract_agent_config
    agent_config = extract_agent_config(agent, version_data)
    
    agentpress_tools_config = agent_config['agentpress_tools']
    configured_mcps = agent_config['configured_mcps'] 
    custom_mcps = agent_config['custom_mcps']

    agentpress_tools = []
    for name, enabled in agentpress_tools_config.items():
        is_enabled_tool = bool(enabled.get('enabled', False)) if isinstance(enabled, dict) else bool(enabled)
        agentpress_tools.append({"name": name, "enabled": is_enabled_tool})

    mcp_tools = []
    for mcp in configured_mcps + custom_mcps:
        server = mcp.get('name')
        enabled_tools = mcp.get('enabledTools') or mcp.get('enabled_tools') or []
        for tool_name in enabled_tools:
            mcp_tools.append({"name": tool_name, "server": server, "enabled": True})
    return {"agentpress_tools": agentpress_tools, "mcp_tools": mcp_tools}
