from fastapi import APIRouter, HTTPException, Depends, Request, Header, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, HttpUrl
from typing import List, Optional, Dict, Any, Union
import hashlib
import secrets
import uuid
import json
import asyncio
from datetime import datetime
from core.utils.auth_utils import verify_and_get_user_id_from_jwt, get_user_id_from_stream_auth
from core.services.supabase import DBConnection
from core.services import redis
from core.utils.logger import logger
from core.utils.config import config
import httpx
from daytona_sdk import SessionExecuteRequest

router = APIRouter()

db: Optional[DBConnection] = None

def initialize(database: DBConnection):
    global db
    db = database

class CreateTokenRequest(BaseModel):
    name: str

class TokenResponse(BaseModel):
    token_id: str
    name: str
    token_prefix: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

class CreateTokenResponse(BaseModel):
    token_id: str
    name: str
    token: str  # Only returned on creation
    token_prefix: str
    is_active: bool
    created_at: datetime

class UpdateTokenRequest(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None

def generate_api_token() -> tuple[str, str, str]:
    """Generate a new API token with hash and prefix"""
    # Generate a secure random token
    token = f"thanus_{secrets.token_urlsafe(32)}"
    
    # Create SHA-256 hash
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    
    # Get first 12 characters as prefix
    token_prefix = token[:12]
    
    return token, token_hash, token_prefix

@router.get("/api-tokens", response_model=List[TokenResponse])
async def list_api_tokens(
    request: Request,
    user_id: str = Depends(verify_and_get_user_id_from_jwt)
):
    """List all API tokens for the current user"""
    try:
        client = await db.client
        
        # Get API tokens for this user
        result = await client.table('api_tokens').select('token_id, name, token_prefix, is_active, created_at, updated_at').eq('account_id', user_id).order('created_at', desc=True).execute()
        return [TokenResponse(**token) for token in result.data]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing API tokens: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to list API tokens")

@router.post("/api-tokens", response_model=CreateTokenResponse)
async def create_api_token(
    token_request: CreateTokenRequest,
    request: Request,
    user_id: str = Depends(verify_and_get_user_id_from_jwt)
):
    """Create a new API token"""
    try:
        client = await db.client
        
        # Generate token
        token, token_hash, token_prefix = generate_api_token()
        
        # Insert into database
        result = await client.table('api_tokens').insert({
            'account_id': user_id,
            'name': token_request.name,
            'token_hash': token_hash,
            'token_prefix': token_prefix,
            'is_active': True
        }).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create API token")
        
        created_token = result.data[0]
        
        return CreateTokenResponse(
            token_id=created_token['token_id'],
            name=created_token['name'],
            token=token,  # Only returned on creation
            token_prefix=created_token['token_prefix'],
            is_active=created_token['is_active'],
            created_at=created_token['created_at']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating API token: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create API token")

@router.put("/api-tokens/{token_id}", response_model=TokenResponse)
async def update_api_token(
    token_id: str,
    update_request: UpdateTokenRequest,
    request: Request,
    user_id: str = Depends(verify_and_get_user_id_from_jwt)
):
    """Update an API token"""
    try:
        client = await db.client
        
        # Prepare update data
        update_data = {}
        if update_request.name is not None:
            update_data['name'] = update_request.name
        if update_request.is_active is not None:
            update_data['is_active'] = update_request.is_active
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Update token
        result = await client.table('api_tokens').update(update_data).eq('token_id', token_id).eq('account_id', user_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="API token not found")
        
        updated_token = result.data[0]
        
        return TokenResponse(**updated_token)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating API token: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update API token")

@router.delete("/api-tokens/{token_id}")
async def delete_api_token(
    token_id: str,
    request: Request,
    user_id: str = Depends(verify_and_get_user_id_from_jwt)
):
    """Delete an API token"""
    try:
        client = await db.client
        
        # Delete token
        result = await client.table('api_tokens').delete().eq('token_id', token_id).eq('account_id', user_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="API token not found")
        
        return {"message": "API token deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting API token: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete API token")

# Utility function to validate API token (for use in other parts of the application)
async def validate_api_token(token: str) -> Optional[str]:
    """Validate an API token and return the associated account_id if valid"""
    try:
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        
        client = await db.client
        
        result = await client.table('api_tokens').select('account_id').eq('token_hash', token_hash).eq('is_active', True).execute()
        
        if result.data:
            return result.data[0]['account_id']
        
        return None
        
    except Exception as e:
        logger.error(f"Error validating API token: {str(e)}")
        return None

# Dependency to validate API key from Authorization header
async def get_account_id_from_api_key(authorization: str = Header(...)):
    """Extract and validate API key from Authorization header"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    # Expected format: "Bearer thanus_..."
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format. Use 'Bearer <api_key>'")
    
    api_key = authorization[7:]  # Remove "Bearer " prefix
    
    if not api_key.startswith("thanus_"):
        raise HTTPException(status_code=401, detail="Invalid API key format")
    
    account_id = await validate_api_token(api_key)
    
    if not account_id:
        raise HTTPException(status_code=401, detail="Invalid or inactive API key")
    
    return account_id

# Agent models for API responses
class AgentListResponse(BaseModel):
    agent_id: str
    name: str
    description: Optional[str] = None
    is_default: bool
    is_public: bool
    avatar: Optional[str] = None
    avatar_color: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    version_count: int
    current_version_name: Optional[str] = None

class AgentsListResponse(BaseModel):
    agents: List[AgentListResponse]
    total: int

# Agent execution models
class AgentExecuteRequest(BaseModel):
    prompt: str
    agent_id: Optional[str] = None  # If not provided, uses default agent
    model_name: Optional[str] = None  # If not provided, uses config default
    enable_thinking: Optional[bool] = False
    reasoning_effort: Optional[str] = "low"
    stream: Optional[bool] = True
    enable_context_manager: Optional[bool] = False

class AgentExecuteResponse(BaseModel):
    thread_id: str
    agent_run_id: str
    project_id: str
    status: str
    message: str
    view_url: str  # URL for viewing the execution in the frontend

# Send message to existing execution models
class SendMessageRequest(BaseModel):
    message: str
    model_name: Optional[str] = None  # If not provided, uses previous execution model
    enable_thinking: Optional[bool] = None  # If not provided, uses previous execution setting
    reasoning_effort: Optional[str] = None  # If not provided, uses previous execution setting
    stream: Optional[bool] = True
    enable_context_manager: Optional[bool] = None  # If not provided, uses previous execution setting

class SendMessageResponse(BaseModel):
    agent_run_id: str
    thread_id: str
    project_id: str
    status: str
    message: str
    view_url: str


class WhatsAppMessageRequest(BaseModel):
    """Request model for sending a WhatsApp message."""
    to: str = Field(..., description="The recipient's phone number in international format (e.g., 5511999999999)")
    message: str = Field(..., description="The message content to send")
    preview_url: Optional[bool] = Field(True, description="Whether to show URL preview in the message")
    reply_to_message_id: Optional[str] = Field(None, description="The message ID this message is replying to")
    media_url: Optional[HttpUrl] = Field(None, description="URL of the media to send (image, document, video, or audio)")
    media_caption: Optional[str] = Field(None, description="Caption for the media (if media_url is provided)")


class WhatsAppMessageResponse(BaseModel):
    """Response model for sent WhatsApp messages."""
    message_id: str
    status: str
    timestamp: datetime
    recipient_id: str
    whatsapp_message_id: Optional[str] = None
    error: Optional[Dict[str, Any]] = None

# Models listing
class ModelInfo(BaseModel):
    name: str
    display_name: str
    provider: str
    description: str
    max_tokens: Optional[int] = None
    supports_thinking: bool = False
    supports_vision: bool = False

class ModelsListResponse(BaseModel):
    models: List[ModelInfo]
    total: int
    default_model: str

# Project models
class ProjectInfo(BaseModel):
    project_id: str
    name: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    is_api_execution: bool = False
    thread_id: Optional[str] = None

class ProjectsListResponse(BaseModel):
    projects: List[ProjectInfo]
    total: int

@router.get("/agents", response_model=AgentsListResponse)
async def list_user_agents(
    request: Request,
    account_id: str = Depends(get_account_id_from_api_key)
):
    """List all agents for the current user (requires valid API key)"""
    try:
        client = await db.client
        
        # Get all agents for this account
        result = await client.table('agents').select('*').eq('account_id', account_id).order('created_at', desc=True).execute()
        
        agents_list = []
        for agent in result.data:
            # Get current version name if available
            current_version_name = None
            if agent.get('current_version_id'):
                try:
                    version_result = await client.table('agent_versions').select('version_name').eq('version_id', agent['current_version_id']).execute()
                    if version_result.data:
                        current_version_name = version_result.data[0]['version_name']
                except Exception as e:
                    logger.warning(f"Failed to get version name for agent {agent['agent_id']}: {e}")
            
            agents_list.append(AgentListResponse(
                agent_id=agent['agent_id'],
                name=agent['name'],
                description=agent.get('description'),
                is_default=agent.get('is_default', False),
                is_public=agent.get('is_public', False),
                avatar=agent.get('avatar'),
                avatar_color=agent.get('avatar_color'),
                created_at=agent['created_at'],
                updated_at=agent.get('updated_at'),
                version_count=agent.get('version_count', 1),
                current_version_name=current_version_name
            ))
        
        logger.info(f"Listed {len(agents_list)} agents for account {account_id}")
        return AgentsListResponse(
            agents=agents_list,
            total=len(agents_list)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing agents: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to list agents")

@router.get("/models", response_model=ModelsListResponse)
async def list_available_models(
    request: Request,
    account_id: str = Depends(get_account_id_from_api_key)
):
    """List all available models for the current user (requires valid API key)"""
    try:
        from utils.config import config
        from services.billing import can_use_model
        
        client = await db.client
        
        # Get available models from system configuration
        from utils.constants import MODELS, get_model_display_name
        
        def get_model_info(model_name: str, model_config: dict) -> dict:
            """Extract model information from system configuration"""
            # Extract provider from model name
            if model_name.startswith("anthropic/"):
                provider = "Anthropic"
                display_name = get_model_display_name(model_name) or model_name.replace("anthropic/", "").replace("-", " ").title()
            elif model_name.startswith("openai/"):
                provider = "OpenAI"
                display_name = get_model_display_name(model_name) or model_name.replace("openai/", "").upper()
            elif model_name.startswith("gemini/") or model_name.startswith("google/"):
                provider = "Google"
                display_name = get_model_display_name(model_name) or model_name.replace("gemini/", "").replace("google/", "").replace("-", " ").title()
            elif model_name.startswith("xai/"):
                provider = "xAI"
                display_name = get_model_display_name(model_name) or model_name.replace("xai/", "").upper()
            elif model_name.startswith("openrouter/"):
                # Extract provider from OpenRouter path
                parts = model_name.split("/")
                if len(parts) >= 3:
                    provider = parts[1].title()
                    display_name = get_model_display_name(model_name) or parts[2].replace("-", " ").title()
                else:
                    provider = "OpenRouter"
                    display_name = get_model_display_name(model_name) or model_name
            else:
                provider = "Unknown"
                display_name = get_model_display_name(model_name) or model_name
            
            # Determine capabilities based on model name
            supports_thinking = "sonnet-4" in model_name or "o1" in model_name or "grok" in model_name
            supports_vision = not ("o1" in model_name or "kimi" in model_name)
            
            # Estimate max tokens based on model
            max_tokens = None
            if "gemini" in model_name:
                if "pro" in model_name:
                    max_tokens = 2000000
                else:
                    max_tokens = 1000000
            elif "gpt-4" in model_name or "claude" in model_name:
                max_tokens = 200000
            elif "kimi" in model_name:
                max_tokens = 200000
            elif "grok" in model_name:
                max_tokens = 128000
            
            # Generate description
            if "thanus" in display_name.lower():
                description = "Advanced AI model optimized for complex reasoning and analysis"
            elif "sonnet" in model_name:
                description = "High-performance model for complex reasoning and creative tasks"
            elif "haiku" in model_name:
                description = "Fast and efficient model for everyday tasks"
            elif "gpt-4o" in model_name:
                description = "Advanced multimodal model with vision capabilities"
            elif "o1" in model_name:
                description = "Reasoning-focused model with enhanced problem-solving capabilities"
            elif "gemini" in model_name:
                if "pro" in model_name:
                    description = "Large context window model for complex tasks"
                else:
                    description = "Fast and efficient model with large context"
            elif "grok" in model_name:
                description = "Advanced reasoning model with real-time information access"
            elif "kimi" in model_name:
                description = "Long-context model optimized for document analysis"
            else:
                description = f"AI model provided by {provider}"
            
            return {
                "name": model_name,
                "display_name": display_name,
                "provider": provider,
                "description": description,
                "max_tokens": max_tokens,
                "supports_thinking": supports_thinking,
                "supports_vision": supports_vision
            }
        
        # Generate model list from system configuration
        available_models = [
            get_model_info(model_name, model_config) 
            for model_name, model_config in MODELS.items()
        ]
        
        # Sort by provider and then by name
        available_models.sort(key=lambda x: (x["provider"], x["display_name"]))
        
        # Return all available models without filtering
        accessible_models = [ModelInfo(**model_info) for model_info in available_models]
        
        # Get default model - use Sonnet 4 as default
        default_model = "openrouter/anthropic/claude-sonnet-4"
        
        logger.info(f"Listed {len(accessible_models)} accessible models for account {account_id}")
        return ModelsListResponse(
            models=accessible_models,
            total=len(accessible_models),
            default_model=default_model
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing models: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to list models")

@router.get("/projects", response_model=ProjectsListResponse)
async def list_user_projects(
    request: Request,
    api_only: Optional[bool] = Query(None, description="Filter projects: true for API-created only, false for dashboard-created only, null for all"),
    page: int = Query(1, ge=1, description="Page number (starts from 1)"),
    limit: int = Query(100, ge=1, le=100, description="Number of projects per page (max 100)"),
    account_id: str = Depends(get_account_id_from_api_key)
):
    """List all projects for the current user with pagination (requires valid API key)"""
    try:
        client = await db.client
        
        # Build query with optional filtering
        query = client.table('projects').select('*').eq('account_id', account_id)
        
        # Apply filter if specified
        if api_only is not None:
            query = query.eq('is_api_execution', api_only)
        
        # Apply pagination with the same filter
        offset = (page - 1) * limit
        projects_result = await query.order('created_at', desc=True).range(offset, offset + limit - 1).execute()
        
        # Get total count with the same filter (rebuild query to avoid conflicts)
        count_query = client.table('projects').select('project_id', count='exact').eq('account_id', account_id)
        if api_only is not None:
            count_query = count_query.eq('is_api_execution', api_only)
        
        count_result = await count_query.execute()
        total_count = count_result.count if hasattr(count_result, 'count') else len(count_result.data) if count_result.data else 0
        
        projects_list = []
        for project in projects_result.data:
            project_id = project['project_id']
            
            # Get the first thread_id for this project (if any)
            thread_id = None
            try:
                threads_result = await client.table('threads').select('thread_id').eq('project_id', project_id).limit(1).execute()
                if threads_result.data:
                    thread_id = threads_result.data[0]['thread_id']
            except Exception as e:
                logger.warning(f"Failed to get thread for project {project_id}: {e}")
            
            projects_list.append(ProjectInfo(
                project_id=project_id,
                name=project['name'],
                created_at=project['created_at'],
                updated_at=project.get('updated_at'),
                is_api_execution=project.get('is_api_execution', False),
                thread_id=thread_id
            ))
        
        logger.info(f"Listed {len(projects_list)} projects (page {page}, limit {limit}) for account {account_id}. Total: {total_count}")
        return ProjectsListResponse(
            projects=projects_list,
            total=total_count
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing projects: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to list projects")

@router.post("/agents/execute", response_model=AgentExecuteResponse)
async def execute_agent(
    execute_request: AgentExecuteRequest,
    request: Request,
    account_id: str = Depends(get_account_id_from_api_key)
):
    """Execute an agent with the given prompt (requires valid API key)"""
    try:
        # Import agent API functions
        from agent.api import initiate_agent_with_files
        from utils.config import config
        from utils.constants import MODEL_NAME_ALIASES
        
        client = await db.client
        
        # Use model from config if not specified
        model_name = execute_request.model_name
        if model_name is None:
            model_name = config.MODEL_TO_USE
        
        # Resolve model aliases
        resolved_model = MODEL_NAME_ALIASES.get(model_name, model_name)
        model_name = resolved_model
        
        logger.info(f"Executing agent via API for account {account_id} with model {model_name}")
        
        # Check billing and model access
        from services.billing import check_billing_status, can_use_model
        
        can_use, model_message, allowed_models = await can_use_model(client, account_id, model_name)
        if not can_use:
            raise HTTPException(status_code=403, detail={"message": model_message, "allowed_models": allowed_models})

        can_run, message, subscription = await check_billing_status(client, account_id)
        if not can_run:
            raise HTTPException(status_code=402, detail={"message": message, "subscription": subscription})
        
        # Load agent configuration if agent_id is provided
        agent_config = None
        if execute_request.agent_id:
            logger.info(f"Loading agent configuration for agent_id: {execute_request.agent_id}")
            agent_result = await client.table('agents').select('*').eq('agent_id', execute_request.agent_id).eq('account_id', account_id).execute()
            
            if not agent_result.data:
                raise HTTPException(status_code=404, detail="Agent not found or access denied")
            
            agent_data = agent_result.data[0]
            
            # Get version data if available
            version_data = None
            if agent_data.get('current_version_id'):
                try:
                    from agent.versioning.version_service import get_version_service
                    version_service = await get_version_service()
                    version_obj = await version_service.get_version(
                        agent_id=execute_request.agent_id,
                        version_id=agent_data['current_version_id'],
                        user_id=account_id  # Using account_id as user_id for API access
                    )
                    version_data = version_obj.to_dict()
                    logger.info(f"Got version data from version manager: {version_data.get('version_name')}")
                except Exception as e:
                    logger.warning(f"Failed to get version data: {e}")
            
            # Extract agent configuration
            from agent.config_helper import extract_agent_config
            agent_config = extract_agent_config(agent_data, version_data)
            
            if version_data:
                logger.info(f"Using agent {agent_config['name']} ({execute_request.agent_id}) version {agent_config.get('version_name', 'v1')}")
            else:
                logger.info(f"Using agent {agent_config['name']} ({execute_request.agent_id}) - no version data")
        else:
            # Try to get default agent
            logger.info(f"No agent_id provided, looking for default agent for account {account_id}")
            default_agent_result = await client.table('agents').select('*').eq('account_id', account_id).eq('is_default', True).execute()
            
            if default_agent_result.data:
                agent_data = default_agent_result.data[0]
                
                # Get version data if available
                version_data = None
                if agent_data.get('current_version_id'):
                    try:
                        from agent.versioning.version_service import get_version_service
                        version_service = await get_version_service()
                        version_obj = await version_service.get_version(
                            agent_id=agent_data['agent_id'],
                            version_id=agent_data['current_version_id'],
                            user_id=account_id
                        )
                        version_data = version_obj.to_dict()
                        logger.info(f"Got default agent version from version manager: {version_data.get('version_name')}")
                    except Exception as e:
                        logger.warning(f"Failed to get default agent version data: {e}")
                
                from agent.config_helper import extract_agent_config
                agent_config = extract_agent_config(agent_data, version_data)
                
                if version_data:
                    logger.info(f"Using default agent: {agent_config['name']} ({agent_config['agent_id']}) version {agent_config.get('version_name', 'v1')}")
                else:
                    logger.info(f"Using default agent: {agent_config['name']} ({agent_config['agent_id']}) - no version data")
            else:
                logger.warning(f"No default agent found for account {account_id}")
        
        # Create project
        project_id = str(uuid.uuid4())
        placeholder_name = f"API: {execute_request.prompt[:30]}..." if len(execute_request.prompt) > 30 else f"API: {execute_request.prompt}"
        
        project = await client.table('projects').insert({
            "project_id": project_id,
            "account_id": account_id,
            "name": placeholder_name,
            "created_at": datetime.now().isoformat(),
            "is_api_execution": True  # Mark as API execution
        }).execute()
        
        if not project.data:
            raise HTTPException(status_code=500, detail="Failed to create project")
        
        logger.info(f"Created new project: {project_id}")
        
        # Create sandbox
        from sandbox.sandbox import create_sandbox
        try:
            sandbox_pass = str(uuid.uuid4())
            sandbox = await create_sandbox(sandbox_pass, project_id)
            sandbox_id = sandbox.id
            logger.info(f"Created new sandbox {sandbox_id} for project {project_id}")
            
            # Get preview links
            vnc_link = await sandbox.get_preview_link(6080)
            website_link = await sandbox.get_preview_link(8080)
            vnc_url = vnc_link.url if hasattr(vnc_link, 'url') else str(vnc_link).split("url='")[1].split("'")[0]
            website_url = website_link.url if hasattr(website_link, 'url') else str(website_link).split("url='")[1].split("'")[0]
            token = None
            if hasattr(vnc_link, 'token'):
                token = vnc_link.token
            elif "token='" in str(vnc_link):
                token = str(vnc_link).split("token='")[1].split("'")[0]
        except Exception as e:
            logger.error(f"Error creating sandbox: {str(e)}")
            await client.table('projects').delete().eq('project_id', project_id).execute()
            raise HTTPException(status_code=500, detail="Failed to create sandbox")
        
        # Update project with sandbox info
        update_result = await client.table('projects').update({
            'sandbox': {
                'id': sandbox_id,
                'pass': sandbox_pass,
                'vnc_preview': vnc_url,
                'sandbox_url': website_url,
                'token': token
            }
        }).eq('project_id', project_id).execute()
        
        if not update_result.data:
            logger.error(f"Failed to update project {project_id} with sandbox {sandbox_id}")
            raise HTTPException(status_code=500, detail="Failed to update project with sandbox")
        
        # Create thread
        thread_id = str(uuid.uuid4())
        thread_data = {
            "thread_id": thread_id,
            "project_id": project_id,
            "account_id": account_id,
            "created_at": datetime.now().isoformat()
        }
        
        if agent_config:
            logger.info(f"Using agent {agent_config['agent_id']} for this conversation")
        
        thread = await client.table('threads').insert(thread_data).execute()
        if not thread.data:
            raise HTTPException(status_code=500, detail="Failed to create thread")
        
        logger.info(f"Created new thread: {thread_id}")
        
        # Add initial user message
        import json
        message_id = str(uuid.uuid4())
        message_payload = {"role": "user", "content": execute_request.prompt}
        await client.table('messages').insert({
            "message_id": message_id,
            "thread_id": thread_id,
            "type": "user",
            "is_llm_message": True,
            "content": json.dumps(message_payload),
            "created_at": datetime.now().isoformat()
        }).execute()
        
        # Create agent run
        agent_run_metadata = {
            "model_name": model_name,
            "enable_thinking": execute_request.enable_thinking,
            "reasoning_effort": execute_request.reasoning_effort,
            "enable_context_manager": execute_request.enable_context_manager
        }
        
        agent_run = await client.table('agent_runs').insert({
            "thread_id": thread_id,
            "status": "running",
            "started_at": datetime.now().isoformat(),
            "agent_id": agent_config.get('agent_id') if agent_config else None,
            "agent_version_id": agent_config.get('current_version_id') if agent_config else None,
            "metadata": agent_run_metadata
        }).execute()
        
        if not agent_run.data:
            raise HTTPException(status_code=500, detail="Failed to create agent run")
        
        agent_run_id = agent_run.data[0]['id']
        logger.info(f"Created new agent run: {agent_run_id}")
        
        # Start agent execution in background
        from run_agent_background import run_agent_background
        from services import redis
        
        # Register run in Redis
        instance_key = f"active_run:api:{agent_run_id}"
        try:
            await redis.set(instance_key, "running", ex=redis.REDIS_KEY_TTL)
        except Exception as e:
            logger.warning(f"Failed to register agent run in Redis ({instance_key}): {str(e)}")
        
        # Execute agent in background
        run_agent_background.send(
            agent_run_id=agent_run_id,
            thread_id=thread_id,
            instance_id="api",
            project_id=project_id,
            model_name=model_name,
            enable_thinking=execute_request.enable_thinking,
            reasoning_effort=execute_request.reasoning_effort,
            stream=execute_request.stream,
            enable_context_manager=execute_request.enable_context_manager,
            agent_config=agent_config,
            is_agent_builder=False,
            target_agent_id=None,
            request_id=str(uuid.uuid4()),
        )
        
        logger.info(f"Successfully initiated agent execution via API for account {account_id}")
        
        # Generate view URL for frontend
        view_url = f"http://localhost:3000/projects/{project_id}/thread/{thread_id}"
        
        return AgentExecuteResponse(
            thread_id=thread_id,
            agent_run_id=agent_run_id,
            project_id=project_id,
            status="running",
            message="Agent execution started successfully",
            view_url=view_url
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error executing agent via API: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to execute agent: {str(e)}")

@router.post("/threads/{thread_id}/send-message", response_model=SendMessageResponse)
async def send_message_to_thread(
    thread_id: str,
    send_request: SendMessageRequest,
    request: Request,
    account_id: str = Depends(get_account_id_from_api_key)
):
    """Send a new message to an existing thread to continue the conversation (requires valid API key)"""
    try:
        from utils.config import config
        from utils.constants import MODEL_NAME_ALIASES
        
        client = await db.client
        
        # Verify access to the thread and get project info
        thread_result = await client.table('threads').select('project_id, account_id').eq('thread_id', thread_id).execute()
        if not thread_result.data:
            raise HTTPException(status_code=404, detail="Thread not found")
        
        thread_data = thread_result.data[0]
        if thread_data['account_id'] != account_id:
            raise HTTPException(status_code=403, detail="Access denied to this thread")
        
        project_id = thread_data['project_id']
        
        # Get the most recent agent run from this thread for defaults
        recent_run_result = await client.table('agent_runs').select('*').eq('thread_id', thread_id).order('started_at', desc=True).limit(1).execute()
        previous_metadata = {}
        recent_agent_id = None
        recent_agent_version_id = None
        
        if recent_run_result.data:
            recent_run = recent_run_result.data[0]
            previous_metadata = recent_run.get('metadata', {})
            recent_agent_id = recent_run.get('agent_id')
            recent_agent_version_id = recent_run.get('agent_version_id')
        
        # Use provided values or fall back to previous execution settings
        model_name = send_request.model_name or previous_metadata.get('model_name') or config.MODEL_TO_USE
        enable_thinking = send_request.enable_thinking if send_request.enable_thinking is not None else previous_metadata.get('enable_thinking', False)
        reasoning_effort = send_request.reasoning_effort or previous_metadata.get('reasoning_effort', 'low')
        enable_context_manager = send_request.enable_context_manager if send_request.enable_context_manager is not None else previous_metadata.get('enable_context_manager', False)
        
        # Resolve model aliases
        resolved_model = MODEL_NAME_ALIASES.get(model_name, model_name)
        model_name = resolved_model
        
        logger.info(f"Sending message to thread {thread_id} via API for account {account_id} with model {model_name}")
        
        # Check billing and model access
        from services.billing import check_billing_status, can_use_model
        
        can_use, model_message, allowed_models = await can_use_model(client, account_id, model_name)
        if not can_use:
            raise HTTPException(status_code=403, detail={"message": model_message, "allowed_models": allowed_models})

        can_run, message, subscription = await check_billing_status(client, account_id)
        if not can_run:
            raise HTTPException(status_code=402, detail={"message": message, "subscription": subscription})
        
        # Get agent configuration from previous run
        agent_config = None
        if recent_agent_id:
            logger.info(f"Loading agent configuration for agent_id: {recent_agent_id}")
            agent_result = await client.table('agents').select('*').eq('agent_id', recent_agent_id).eq('account_id', account_id).execute()
            
            if agent_result.data:
                agent_data = agent_result.data[0]
                
                # Get version data if available
                version_data = None
                if agent_data.get('current_version_id'):
                    try:
                        from agent.versioning.version_service import get_version_service
                        version_service = await get_version_service()
                        version_obj = await version_service.get_version(
                            agent_id=recent_agent_id,
                            version_id=agent_data['current_version_id'],
                            user_id=account_id
                        )
                        version_data = version_obj.to_dict()
                        logger.info(f"Got version data from version manager: {version_data.get('version_name')}")
                    except Exception as e:
                        logger.warning(f"Failed to get version data: {e}")
                
                # Extract agent configuration
                from agent.config_helper import extract_agent_config
                agent_config = extract_agent_config(agent_data, version_data)
                
                logger.info(f"Using agent {agent_config['name']} ({recent_agent_id}) for continued conversation")
        
        # Add new user message to the thread
        message_id = str(uuid.uuid4())
        message_payload = {"role": "user", "content": send_request.message}
        await client.table('messages').insert({
            "message_id": message_id,
            "thread_id": thread_id,
            "type": "user",
            "is_llm_message": True,
            "content": json.dumps(message_payload),
            "created_at": datetime.now().isoformat()
        }).execute()
        
        # Create new agent run for this message
        agent_run_metadata = {
            "model_name": model_name,
            "enable_thinking": enable_thinking,
            "reasoning_effort": reasoning_effort,
            "enable_context_manager": enable_context_manager
        }
        
        new_agent_run = await client.table('agent_runs').insert({
            "thread_id": thread_id,
            "status": "running",
            "started_at": datetime.now().isoformat(),
            "agent_id": recent_agent_id,
            "agent_version_id": recent_agent_version_id,
            "metadata": agent_run_metadata
        }).execute()
        
        if not new_agent_run.data:
            raise HTTPException(status_code=500, detail="Failed to create new agent run")
        
        new_agent_run_id = new_agent_run.data[0]['id']
        logger.info(f"Created new agent run: {new_agent_run_id}")
        
        # Start agent execution in background
        from run_agent_background import run_agent_background
        from services import redis
        
        # Register run in Redis
        instance_key = f"active_run:api:{new_agent_run_id}"
        try:
            await redis.set(instance_key, "running", ex=redis.REDIS_KEY_TTL)
        except Exception as e:
            logger.warning(f"Failed to register agent run in Redis ({instance_key}): {str(e)}")
        
        # Execute agent in background
        run_agent_background.send(
            agent_run_id=new_agent_run_id,
            thread_id=thread_id,
            instance_id="api",
            project_id=project_id,
            model_name=model_name,
            enable_thinking=enable_thinking,
            reasoning_effort=reasoning_effort,
            stream=send_request.stream,
            enable_context_manager=enable_context_manager,
            agent_config=agent_config,
            is_agent_builder=False,
            target_agent_id=None,
            request_id=str(uuid.uuid4()),
        )
        
        logger.info(f"Successfully sent message to agent run via API for account {account_id}")
        
        # Generate view URL for frontend
        view_url = f"http://localhost:3000/projects/{project_id}/thread/{thread_id}"
        
        return SendMessageResponse(
            agent_run_id=new_agent_run_id,
            thread_id=thread_id,
            project_id=project_id,
            status="running",
            message="Message sent successfully, new agent run started",
            view_url=view_url
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending message to agent run via API: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send message to agent run: {str(e)}")

async def get_agent_run_with_access_check_api(client, agent_run_id: str, account_id: str):
    """Check if the account has access to the agent run"""
    agent_run = await client.table('agent_runs').select('*').eq('id', agent_run_id).execute()
    if not agent_run.data:
        raise HTTPException(status_code=404, detail="Agent run not found")

    agent_run_data = agent_run.data[0]
    thread_id = agent_run_data['thread_id']
    
    # Check if the thread belongs to the account
    thread_result = await client.table('threads').select('account_id').eq('thread_id', thread_id).execute()
    if not thread_result.data:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    if thread_result.data[0]['account_id'] != account_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return agent_run_data

# ---------------- Sandbox Initialization & File Listing ----------------

class SandboxInitRequest(BaseModel):
    project_id: Optional[str] = None
    agent_run_id: Optional[str] = None
    refresh: Optional[bool] = False

class SandboxFileEntry(BaseModel):
    path: str
    size: Optional[int] = None
    modified: Optional[str] = None

class SandboxInitResponse(BaseModel):
    project_id: str
    sandbox: Dict[str, Any]
    files: List[SandboxFileEntry]
    listing_error: Optional[str] = None

@router.post("/sandbox/init-and-list", response_model=SandboxInitResponse)
async def init_and_list_sandbox(
    body: SandboxInitRequest,
    request: Request,
    account_id: str = Depends(get_account_id_from_api_key)
):
    """
    Initialize or start the sandbox for a project/agent run and list available files.
    - If sandbox doesn't exist in the project, creates it and stores metadata in projects.sandbox
    - If sandbox exists, ensures it's running
    - Lists up to 500 files from the sandbox workspace
    """
    client = await db.client
    try:
        # Resolve project_id from input
        project_id: Optional[str] = body.project_id

        if not project_id and body.agent_run_id:
            # agent_run_id -> thread_id -> project_id
            agent_run = await client.table('agent_runs').select('thread_id').eq('id', body.agent_run_id).maybe_single().execute()
            if not agent_run.data:
                raise HTTPException(status_code=404, detail="Agent run not found")
            thread_id = agent_run.data.get('thread_id')
            if not thread_id:
                raise HTTPException(status_code=404, detail="Agent run has no associated thread")
            thread = await client.table('threads').select('project_id').eq('thread_id', thread_id).maybe_single().execute()
            if not thread.data:
                raise HTTPException(status_code=404, detail="Thread not found")
            project_id = thread.data.get('project_id')

        if not project_id:
            raise HTTPException(status_code=400, detail="Provide either project_id or agent_run_id")

        # Verify access and fetch project sandbox metadata
        project = await client.table('projects').select('account_id, sandbox').eq('project_id', project_id).maybe_single().execute()
        if not project.data:
            raise HTTPException(status_code=404, detail="Project not found")

        if project.data['account_id'] != account_id:
            raise HTTPException(status_code=403, detail="Access denied to this project")

        sandbox_meta = project.data.get('sandbox') or {}
        sandbox_id = sandbox_meta.get('id')

        from sandbox.sandbox import create_sandbox, get_or_start_sandbox

        sandbox = None
        created_new = False

        # Create or start sandbox
        if not sandbox_id or body.refresh:
            # Create new sandbox
            created_new = True
            sandbox_pass = str(uuid.uuid4())
            try:
                sandbox = await create_sandbox(sandbox_pass, project_id)
                sandbox_id = sandbox.id

                # Preview links
                vnc_link = await sandbox.get_preview_link(6080)
                website_link = await sandbox.get_preview_link(8080)
                vnc_url = vnc_link.url if hasattr(vnc_link, 'url') else str(vnc_link)
                website_url = website_link.url if hasattr(website_link, 'url') else str(website_link)
                token = getattr(vnc_link, 'token', None)
                if not token and "token='" in str(vnc_link):
                    token = str(vnc_link).split("token='")[1].split("'")[0]

                sandbox_meta = {
                    'id': sandbox_id,
                    'pass': sandbox_pass,
                    'vnc_preview': vnc_url,
                    'sandbox_url': website_url,
                    'token': token
                }

                # Store metadata in project
                upd = await client.table('projects').update({'sandbox': sandbox_meta}).eq('project_id', project_id).execute()
                if not upd.data:
                    logger.warning(f"Failed to update project {project_id} with sandbox metadata")
            except Exception as e:
                logger.error(f"Failed to create sandbox for project {project_id}: {e}")
                raise HTTPException(status_code=500, detail=f"Failed to create sandbox: {str(e)}")
        else:
            # Ensure sandbox is running
            try:
                sandbox = await get_or_start_sandbox(sandbox_id)
                # Ensure preview urls exist in metadata
                if not sandbox_meta.get('vnc_preview') or not sandbox_meta.get('sandbox_url'):
                    vnc_link = await sandbox.get_preview_link(6080)
                    website_link = await sandbox.get_preview_link(8080)
                    sandbox_meta['vnc_preview'] = vnc_link.url if hasattr(vnc_link, 'url') else str(vnc_link)
                    sandbox_meta['sandbox_url'] = website_link.url if hasattr(website_link, 'url') else str(website_link)
                    try:
                        await client.table('projects').update({'sandbox': sandbox_meta}).eq('project_id', project_id).execute()
                    except Exception as e:
                        logger.warning(f"Failed updating project preview links: {e}")
            except Exception as e:
                logger.error(f"Failed to start sandbox {sandbox_id}: {e}")
                raise HTTPException(status_code=500, detail=f"Failed to start sandbox: {str(e)}")

        # List files from sandbox workspace using Daytona FS API (consistent with /api/sandboxes/{id}/files)
        files: List[SandboxFileEntry] = []
        listing_error: Optional[str] = None
        try:
            base_path = "/workspace"
            entries = await sandbox.fs.list_files(base_path)
            for entry in entries:
                try:
                    full_path = f"{base_path.rstrip('/')}/{entry.name}" if base_path != "/" else f"/{entry.name}"
                    size = getattr(entry, "size", None)
                    mod_time = getattr(entry, "mod_time", None)
                    files.append(SandboxFileEntry(
                        path=full_path,
                        size=int(size) if isinstance(size, int) else None,
                        modified=str(mod_time) if mod_time is not None else None
                    ))
                except Exception as item_err:
                    logger.warning(f"Failed to process sandbox entry {getattr(entry, 'name', 'unknown')}: {item_err}")
        except Exception as e:
            logger.error(f"Failed to list files from sandbox {sandbox_id} via FS API: {e}")
            listing_error = str(e)

        # Remove sensitive fields from sandbox metadata before returning
        safe_sandbox_meta = {
            'id': sandbox_meta.get('id')
        }
        
        logger.info(f"Sandbox {'created' if created_new else 'started'} for project {project_id}. Files listed: {len(files)}")
        return SandboxInitResponse(
            project_id=project_id,
            sandbox=safe_sandbox_meta,
            files=files,
            listing_error=listing_error
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error initializing/listing sandbox: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to initialize/list sandbox: {str(e)}")

# ---------------- Sandbox Files Listing via API Key (Client API) ----------------

class ClientSandboxFileInfo(BaseModel):
    name: str
    path: str
    is_dir: bool
    size: Optional[int] = None
    mod_time: Optional[str] = None
    permissions: Optional[str] = None

@router.get("/sandbox/files")
async def list_sandbox_files_api(
    request: Request,
    project_id: Optional[str] = Query(None, description="Project ID that owns the sandbox"),
    agent_run_id: Optional[str] = Query(None, description="Agent run ID to resolve project"),
    path: str = Query("/workspace", description="Path inside the sandbox to list"),
    account_id: str = Depends(get_account_id_from_api_key),
):
    """
    List files in the sandbox using API key authentication (client API).
    Mirrors the server endpoint /api/sandboxes/{sandbox_id}/files but validates by API key (account_id).
    """
    client = await db.client
    try:
        # Resolve project_id if not provided
        if not project_id and agent_run_id:
            agent_run = await client.table('agent_runs').select('thread_id').eq('id', agent_run_id).maybe_single().execute()
            if not agent_run.data:
                raise HTTPException(status_code=404, detail="Agent run not found")
            thread_id = agent_run.data.get('thread_id')
            if not thread_id:
                raise HTTPException(status_code=404, detail="Agent run has no associated thread")
            thread = await client.table('threads').select('project_id').eq('thread_id', thread_id).maybe_single().execute()
            if not thread.data:
                raise HTTPException(status_code=404, detail="Thread not found")
            project_id = thread.data.get('project_id')

        if not project_id:
            raise HTTPException(status_code=400, detail="Provide either project_id or agent_run_id")

        # Verify access
        project = await client.table('projects').select('account_id, sandbox').eq('project_id', project_id).maybe_single().execute()
        if not project.data:
            raise HTTPException(status_code=404, detail="Project not found")
        if project.data['account_id'] != account_id:
            raise HTTPException(status_code=403, detail="Access denied to this project")

        sandbox_meta = project.data.get('sandbox') or {}
        sandbox_id = sandbox_meta.get('id')
        if not sandbox_id:
            raise HTTPException(status_code=404, detail="No sandbox found for this project")

        # Ensure sandbox is active
        from sandbox.sandbox import get_or_start_sandbox
        sandbox = await get_or_start_sandbox(sandbox_id)

        # List files non-recursively under given path
        entries = await sandbox.fs.list_files(path)
        result = []
        base = path or "/"
        for entry in entries:
            full_path = f"{base.rstrip('/')}/{entry.name}" if base != "/" else f"/{entry.name}"
            result.append(ClientSandboxFileInfo(
                name=getattr(entry, "name", ""),
                path=full_path,
                is_dir=bool(getattr(entry, "is_dir", False)),
                size=getattr(entry, "size", None),
                mod_time=str(getattr(entry, "mod_time", "")) if getattr(entry, "mod_time", None) is not None else None,
                permissions=getattr(entry, "permissions", None)
            ).dict())

        return {"files": result}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing sandbox files via client API: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list sandbox files: {str(e)}")

# ---------------- Sandbox File Download via API Key (Client API) ----------------

@router.get("/sandbox/files/download")
async def download_sandbox_file_api(
    request: Request,
    project_id: Optional[str] = Query(None, description="Project ID that owns the sandbox"),
    agent_run_id: Optional[str] = Query(None, description="Agent run ID to resolve project"),
    path: str = Query(..., description="Path of the file to download"),
    account_id: str = Depends(get_account_id_from_api_key),
):
    """
    Download a specific file from the sandbox using API key authentication (client API).
    Mirrors the server endpoint /api/sandboxes/{sandbox_id}/files/content but validates by API key (account_id).
    """
    client = await db.client
    try:
        # Resolve project_id if not provided
        if not project_id and agent_run_id:
            agent_run = await client.table('agent_runs').select('thread_id').eq('id', agent_run_id).maybe_single().execute()
            if not agent_run.data:
                raise HTTPException(status_code=404, detail="Agent run not found")
            thread_id = agent_run.data.get('thread_id')
            if not thread_id:
                raise HTTPException(status_code=404, detail="Agent run has no associated thread")
            thread = await client.table('threads').select('project_id').eq('thread_id', thread_id).maybe_single().execute()
            if not thread.data:
                raise HTTPException(status_code=404, detail="Thread not found")
            project_id = thread.data.get('project_id')

        if not project_id:
            raise HTTPException(status_code=400, detail="Provide either project_id or agent_run_id")

        # Verify access
        project = await client.table('projects').select('account_id, sandbox').eq('project_id', project_id).maybe_single().execute()
        if not project.data:
            raise HTTPException(status_code=404, detail="Project not found")
        if project.data['account_id'] != account_id:
            raise HTTPException(status_code=403, detail="Access denied to this project")

        sandbox_meta = project.data.get('sandbox') or {}
        sandbox_id = sandbox_meta.get('id')
        if not sandbox_id:
            raise HTTPException(status_code=404, detail="No sandbox found for this project")

        # Ensure sandbox is active
        from sandbox.sandbox import get_or_start_sandbox
        sandbox = await get_or_start_sandbox(sandbox_id)

        # Download file content
        try:
            content = await sandbox.fs.download_file(path)
        except Exception as download_err:
            logger.error(f"Error downloading file {path} from sandbox {sandbox_id}: {str(download_err)}")
            raise HTTPException(
                status_code=404, 
                detail=f"Failed to download file: {str(download_err)}"
            )

        # Return file content with proper headers
        import os
        filename = os.path.basename(path)
        logger.info(f"Successfully downloaded file {filename} from sandbox {sandbox_id} via client API")
        
        # Ensure proper encoding by explicitly using UTF-8 for the filename in Content-Disposition header
        # This applies RFC 5987 encoding for the filename to support non-ASCII characters
        encoded_filename = filename.encode('utf-8').decode('latin-1')
        content_disposition = f"attachment; filename*=UTF-8''{encoded_filename}"
        
        from fastapi.responses import Response
        return Response(
            content=content,
            media_type="application/octet-stream",
            headers={"Content-Disposition": content_disposition}
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading sandbox file via client API: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to download sandbox file: {str(e)}")

@router.get("/agents/runs/{agent_run_id}/stream")
async def stream_agent_run_api(
    agent_run_id: str,
    request: Request,
    account_id: str = Depends(get_account_id_from_api_key)
):
    """Stream the responses of an agent run using Redis Lists and Pub/Sub for API clients."""
    logger.info(f"Starting API stream for agent run: {agent_run_id}")
    client = await db.client

    # Verify access to the agent run
    agent_run_data = await get_agent_run_with_access_check_api(client, agent_run_id, account_id)

    response_list_key = f"agent_run:{agent_run_id}:responses"
    response_channel = f"agent_run:{agent_run_id}:new_response"
    control_channel = f"agent_run:{agent_run_id}:control"

    async def stream_generator():
        logger.debug(f"API streaming responses for {agent_run_id} using Redis list {response_list_key} and channel {response_channel}")
        last_processed_index = -1
        pubsub_response = None
        pubsub_control = None
        listener_task = None
        terminate_stream = False
        initial_yield_complete = False

        try:
            # 1. Fetch and yield initial responses from Redis list
            initial_responses_json = await redis.lrange(response_list_key, 0, -1)
            initial_responses = []
            if initial_responses_json:
                for r in initial_responses_json:
                    try:
                        if isinstance(r, dict):
                            initial_responses.append(r)
                        elif isinstance(r, (str, bytes)):
                            if isinstance(r, bytes):
                                r = r.decode('utf-8')
                            initial_responses.append(json.loads(r))
                        else:
                            initial_responses.append(json.loads(str(r)))
                    except (json.JSONDecodeError, TypeError, ValueError) as e:
                        logger.warning(f"Failed to parse initial Redis response: {e}, item: {r}")
                        if isinstance(r, dict):
                            initial_responses.append(r)
                logger.debug(f"Sending {len(initial_responses)} initial responses for {agent_run_id}")
                for response in initial_responses:
                    yield f"data: {json.dumps(response)}\n\n"
                last_processed_index = len(initial_responses) - 1
            initial_yield_complete = True

            # 2. Check run status *after* yielding initial data
            run_status = await client.table('agent_runs').select('status', 'thread_id').eq("id", agent_run_id).maybe_single().execute()
            current_status = run_status.data.get('status') if run_status.data else None

            if current_status != 'running':
                logger.info(f"Agent run {agent_run_id} is not running (status: {current_status}). Ending stream.")
                yield f"data: {json.dumps({'type': 'status', 'status': 'completed'})}\n\n"
                return

            # 3. Set up Pub/Sub listeners for new responses and control signals
            pubsub_response = await redis.create_pubsub()
            await pubsub_response.subscribe(response_channel)
            logger.debug(f"Subscribed to response channel: {response_channel}")

            pubsub_control = await redis.create_pubsub()
            await pubsub_control.subscribe(control_channel)
            logger.debug(f"Subscribed to control channel: {control_channel}")

            # Queue to communicate between listeners and the main generator loop
            message_queue = asyncio.Queue()

            async def listen_messages():
                response_reader = pubsub_response.listen()
                control_reader = pubsub_control.listen()
                tasks = [asyncio.create_task(response_reader.__anext__()), asyncio.create_task(control_reader.__anext__())]

                while not terminate_stream:
                    done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
                    for task in done:
                        try:
                            message = task.result()
                            if message and isinstance(message, dict) and message.get("type") == "message":
                                channel = message.get("channel")
                                data = message.get("data")
                                if isinstance(data, bytes): 
                                    data = data.decode('utf-8')

                                if channel == response_channel and data == "new":
                                    await message_queue.put({"type": "new_response"})
                                elif channel == control_channel and data in ["STOP", "END_STREAM", "ERROR"]:
                                    logger.info(f"Received control signal '{data}' for {agent_run_id}")
                                    await message_queue.put({"type": "control", "data": data})
                                    return

                        except StopAsyncIteration:
                            logger.warning(f"Listener {task} stopped.")
                            await message_queue.put({"type": "error", "data": "Listener stopped unexpectedly"})
                            return
                        except Exception as e:
                            logger.error(f"Error in listener for {agent_run_id}: {e}")
                            await message_queue.put({"type": "error", "data": "Listener failed"})
                            return
                        finally:
                            # Reschedule the completed listener task
                            if task in tasks:
                                tasks.remove(task)
                                if message and isinstance(message, dict) and message.get("channel") == response_channel:
                                     tasks.append(asyncio.create_task(response_reader.__anext__()))
                                elif message and isinstance(message, dict) and message.get("channel") == control_channel:
                                     tasks.append(asyncio.create_task(control_reader.__anext__()))

                # Cancel pending listener tasks on exit
                for p_task in pending: 
                    p_task.cancel()
                for task in tasks: 
                    task.cancel()

            listener_task = asyncio.create_task(listen_messages())

            # 4. Main loop to process messages from the queue
            while not terminate_stream:
                try:
                    queue_item = await message_queue.get()

                    if queue_item["type"] == "new_response":
                        # Fetch new responses from Redis list starting after the last processed index
                        new_start_index = last_processed_index + 1
                        new_responses_json = await redis.lrange(response_list_key, new_start_index, -1)

                        if new_responses_json:
                            new_responses = []
                            for r in new_responses_json:
                                try:
                                    if isinstance(r, dict):
                                        new_responses.append(r)
                                    elif isinstance(r, (str, bytes)):
                                        if isinstance(r, bytes):
                                            r = r.decode('utf-8')
                                        new_responses.append(json.loads(r))
                                    else:
                                        new_responses.append(json.loads(str(r)))
                                except (json.JSONDecodeError, TypeError, ValueError) as e:
                                    logger.warning(f"Failed to parse new Redis response: {e}, item: {r}")
                                    if isinstance(r, dict):
                                        new_responses.append(r)
                            num_new = len(new_responses)
                            for response in new_responses:
                                yield f"data: {json.dumps(response)}\n\n"
                                # Check if this response signals completion
                                if response.get('type') == 'status' and response.get('status') in ['completed', 'failed', 'stopped']:
                                    logger.info(f"Detected run completion via status message in stream: {response.get('status')}")
                                    terminate_stream = True
                                    break
                            last_processed_index += num_new
                        if terminate_stream: 
                            break

                    elif queue_item["type"] == "control":
                        control_signal = queue_item["data"]
                        terminate_stream = True
                        yield f"data: {json.dumps({'type': 'status', 'status': control_signal})}\n\n"
                        break

                    elif queue_item["type"] == "error":
                        logger.error(f"Listener error for {agent_run_id}: {queue_item['data']}")
                        terminate_stream = True
                        yield f"data: {json.dumps({'type': 'status', 'status': 'error'})}\n\n"
                        break

                except asyncio.CancelledError:
                     logger.info(f"Stream generator main loop cancelled for {agent_run_id}")
                     terminate_stream = True
                     break
                except Exception as loop_err:
                    logger.error(f"Error in stream generator main loop for {agent_run_id}: {loop_err}", exc_info=True)
                    terminate_stream = True
                    yield f"data: {json.dumps({'type': 'status', 'status': 'error', 'message': f'Stream failed: {loop_err}'})}\n\n"
                    break

        except Exception as e:
            logger.error(f"Error setting up stream for agent run {agent_run_id}: {e}", exc_info=True)
            if not initial_yield_complete:
                 yield f"data: {json.dumps({'type': 'status', 'status': 'error', 'message': f'Failed to start stream: {e}'})}\n\n"
        finally:
            terminate_stream = True
            # Graceful shutdown
            if pubsub_response: 
                await pubsub_response.unsubscribe(response_channel)
            if pubsub_control: 
                await pubsub_control.unsubscribe(control_channel)
            if pubsub_response: 
                await pubsub_response.close()
            if pubsub_control: 
                await pubsub_control.close()

            if listener_task:
                listener_task.cancel()
                try:
                    await listener_task
                except asyncio.CancelledError:
                    pass
                except Exception as e:
                    logger.debug(f"listener_task ended with: {e}")
            
            await asyncio.sleep(0.1)
            logger.debug(f"API streaming cleanup complete for agent run: {agent_run_id}")

    return StreamingResponse(stream_generator(), media_type="text/event-stream", headers={
        "Cache-Control": "no-cache, no-transform", 
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no", 
        "Content-Type": "text/event-stream",
        "Access-Control-Allow-Origin": "*"
    })

@router.get("/agents/runs/{agent_run_id}/status")
async def get_agent_run_status_api(
    agent_run_id: str,
    request: Request,
    account_id: str = Depends(get_account_id_from_api_key)
):
    """Get agent run status for API clients."""
    logger.info(f"Getting agent run status for API: {agent_run_id}")
    client = await db.client
    
    try:
        agent_run_data = await get_agent_run_with_access_check_api(client, agent_run_id, account_id)
        
        return {
            "id": agent_run_data['id'],
            "thread_id": agent_run_data['thread_id'],
            "status": agent_run_data['status'],
            "started_at": agent_run_data['started_at'],
            "completed_at": agent_run_data['completed_at'],
            "error": agent_run_data['error'],
            "metadata": agent_run_data.get('metadata', {})
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting agent run status via API: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get agent run status: {str(e)}")

@router.get("/threads/{thread_id}/messages")
async def get_thread_messages_api(
    thread_id: str,
    request: Request,
    account_id: str = Depends(get_account_id_from_api_key),
    include_responses: bool = Query(True, description="Include all responses from Redis and database"),
    format_output: bool = Query(True, description="Format output for better readability")
):
    """Get complete messages and responses for a thread (non-streaming)."""
    logger.info(f"Getting complete messages for thread: {thread_id}")
    client = await db.client
    
    try:
        # Verify access to the thread
        thread_result = await client.table('threads').select('project_id, account_id').eq('thread_id', thread_id).execute()
        if not thread_result.data:
            raise HTTPException(status_code=404, detail="Thread not found")
        
        thread_data = thread_result.data[0]
        if thread_data['account_id'] != account_id:
            raise HTTPException(status_code=403, detail="Access denied to this thread")
        
        # Get the most recent agent run for this thread
        recent_run_result = await client.table('agent_runs').select('*').eq('thread_id', thread_id).order('started_at', desc=True).limit(1).execute()
        
        result = {
            "thread_id": thread_id,
            "project_id": thread_data['project_id'],
            "messages": [],
            "responses": [],
            "summary": {
                "total_messages": 0,
                "total_responses": 0,
                "user_messages": 0,
                "assistant_messages": 0,
                "tool_uses": 0,
                "tool_results": 0
            }
        }
        
        # Add agent run info if available
        if recent_run_result.data:
            recent_run = recent_run_result.data[0]
            result.update({
                "latest_agent_run_id": recent_run['id'],
                "status": recent_run['status'],
                "started_at": recent_run['started_at'],
                "completed_at": recent_run['completed_at'],
                "error": recent_run['error']
            })
        
        # Get thread messages from database
        messages_result = await client.table('messages').select('*').eq('thread_id', thread_id).order('created_at', desc=False).execute()
        
        if messages_result.data:
            for message in messages_result.data:
                message_data = {
                    "message_id": message['message_id'],
                    "type": message['type'],
                    "created_at": message['created_at'],
                    "is_llm_message": message.get('is_llm_message', False)
                }
                
                # Parse content if it's JSON
                content = message.get('content', '')
                logger.debug(f"DB message content type={type(content)}, is_llm_message={message.get('is_llm_message')}")
                if content and message.get('is_llm_message'):
                    try:
                        if isinstance(content, dict):
                            parsed_content = content
                        elif isinstance(content, (bytes, bytearray)):
                            parsed_content = json.loads(content.decode('utf-8'))
                        elif isinstance(content, str):
                            parsed_content = json.loads(content)
                        else:
                            logger.warning(f"Unexpected content type in DB message: {type(content)}")
                            parsed_content = {"role": message.get('type'), "content": str(content)}
                        message_data['content'] = parsed_content
                        
                        # Count message types
                        if parsed_content.get('role') == 'user':
                            result['summary']['user_messages'] += 1
                        elif parsed_content.get('role') == 'assistant':
                            result['summary']['assistant_messages'] += 1
                    except (json.JSONDecodeError, TypeError, ValueError) as e:
                        logger.error(f"Failed to parse DB message content: {e}, preview={str(content)[:200]}")
                        message_data['content'] = content if isinstance(content, str) else str(content)
                else:
                    message_data['content'] = content
                
                result['messages'].append(message_data)
            
            result['summary']['total_messages'] = len(result['messages'])
        
        # Get responses from Redis if requested - use latest agent run if available
        if include_responses and recent_run_result.data:
            latest_agent_run_id = recent_run_result.data[0]['id']
            response_list_key = f"agent_run:{latest_agent_run_id}:responses"
            logger.info(f"Getting responses from Redis key: {response_list_key}")
            try:
                responses_json = await redis.lrange(response_list_key, 0, -1)
                logger.info(f"Retrieved {len(responses_json) if responses_json else 0} items from Redis")
                if responses_json:
                    responses = []
                    for i, r in enumerate(responses_json):
                        logger.debug(f"Processing Redis item {i}: type={type(r)}, length={len(str(r)) if r else 0}")
                        try:
                            if isinstance(r, dict):
                                logger.debug(f"Item {i} is already a dict")
                                responses.append(r)
                            elif isinstance(r, (str, bytes)):
                                if isinstance(r, bytes):
                                    logger.debug(f"Item {i} is bytes, decoding to string")
                                    r = r.decode('utf-8')
                                logger.debug(f"Item {i} is string, parsing JSON")
                                parsed = json.loads(r)
                                responses.append(parsed)
                            else:
                                logger.warning(f"Item {i} has unexpected type {type(r)}, converting to string")
                                responses.append(json.loads(str(r)))
                        except (json.JSONDecodeError, TypeError, ValueError) as e:
                            logger.error(f"Failed to parse Redis response item {i}: {e}, item type: {type(r)}, item preview: {str(r)[:200]}")
                            # Skip invalid items or add as raw data
                            if isinstance(r, dict):
                                responses.append(r)
                            else:
                                responses.append({"type": "error", "raw_data": str(r)[:500], "parse_error": str(e)})
                    
                    if format_output:
                        # Format responses for better readability
                        formatted_responses = []
                        for response in responses:
                            formatted_response = {
                                "type": response.get('type', 'unknown'),
                                "timestamp": response.get('timestamp'),
                            }
                            
                            if response.get('type') == 'message':
                                formatted_response.update({
                                    "role": response.get('role'),
                                    "content": response.get('content', ''),
                                })
                                
                            elif response.get('type') == 'tool_use':
                                formatted_response.update({
                                    "tool_name": response.get('tool_name'),
                                    "tool_input": response.get('tool_input', {}),
                                })
                                result['summary']['tool_uses'] += 1
                                
                            elif response.get('type') == 'tool_result':
                                formatted_response.update({
                                    "tool_name": response.get('tool_name'),
                                    "success": response.get('success', False),
                                    "result": response.get('result', ''),
                                })
                                result['summary']['tool_results'] += 1
                                
                            elif response.get('type') == 'status':
                                formatted_response.update({
                                    "status": response.get('status'),
                                    "message": response.get('message', ''),
                                })
                                
                            elif response.get('type') == 'thinking':
                                formatted_response.update({
                                    "thinking": response.get('content', ''),
                                })
                                
                            else:
                                # Include all other fields for unknown types
                                formatted_response.update(response)
                            
                            formatted_responses.append(formatted_response)
                        
                        result['responses'] = formatted_responses
                    else:
                        result['responses'] = responses
                    
                    result['summary']['total_responses'] = len(result['responses'])
                    
            except Exception as e:
                logger.warning(f"Failed to get responses from Redis for {latest_agent_run_id}: {e}")
                result['responses'] = []
                result['redis_error'] = str(e)
        
        # Generate a formatted conversation if requested
        if format_output and result['responses']:
            conversation = []
            current_message = None
            
            for response in result['responses']:
                if response['type'] == 'message':
                    if current_message and current_message['role'] != response['role']:
                        conversation.append(current_message)
                        current_message = None
                    
                    if not current_message:
                        current_message = {
                            "role": response['role'],
                            "content": response['content'],
                            "timestamp": response['timestamp']
                        }
                    else:
                        current_message['content'] += '\n' + response['content']
                
                elif response['type'] == 'tool_use':
                    if current_message:
                        conversation.append(current_message)
                        current_message = None
                    
                    conversation.append({
                        "type": "tool_use",
                        "tool_name": response['tool_name'],
                        "tool_input": response['tool_input'],
                        "timestamp": response['timestamp']
                    })
                
                elif response['type'] == 'tool_result':
                    conversation.append({
                        "type": "tool_result",
                        "tool_name": response['tool_name'],
                        "success": response['success'],
                        "result": response['result'],
                        "timestamp": response['timestamp']
                    })
                
                elif response['type'] == 'thinking':
                    conversation.append({
                        "type": "thinking",
                        "content": response['thinking'],
                        "timestamp": response['timestamp']
                    })
            
            # Add the last message if exists
            if current_message:
                conversation.append(current_message)
            
            result['conversation'] = conversation
        
        logger.info(f"Retrieved {result['summary']['total_messages']} messages and {result['summary']['total_responses']} responses for thread {thread_id}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting agent run messages via API: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get agent run messages: {str(e)}")

class WhatsAppSaveNumberRequest(BaseModel):
    phone_number: str = Field(..., description="Phone number to save and verify in E.164 format (e.g., +5511999999999)")

@router.post("/whatsapp/verify-number", status_code=status.HTTP_200_OK)
async def verify_whatsapp_number(
    request: Request,
    request_data: WhatsAppSaveNumberRequest,
    account_id: str = Depends(verify_and_get_user_id_from_jwt)
):
    """
    Save the user's phone number and send a verification message.
    
    This endpoint saves the user's phone number in the database and sends a verification message
    to confirm ownership of the number.
    
    Required scopes: whatsapp:verify
    """
    try:
        # Validate phone number format (E.164, with optional +)
        import re
        if not re.match(r'^\+?[1-9]\d{1,14}$', request_data.phone_number):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid phone number format. Please use E.164 format (e.g., 5511999999999 or +5511999999999)"
            )
        
        # Get database client
        client = await db.client
        
        # Save to database using Supabase client
        try:
            phone_number = request_data.phone_number.replace('+', '')

            result = await client.table("usuario_celular").upsert(
                {
                    "account_id": account_id,
                    "celular": phone_number
                },
                on_conflict=["account_id"]
            ).execute()

            logger.debug(f"Supabase raw result: {result}")

            if not result.data:  
                logger.warning("Nenhum dado retornado pelo upsert (pode ter gravado mesmo assim).")

            logger.info(f"Número salvo/atualizado para conta {account_id}")

            
        except Exception as e:
            logger.error(f"Error saving to database: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save phone number: {str(e)}"
            )
        
        # Send verification message
        if not config.WHATSAPP_API_URL or not config.WHATSAPP_API_TOKEN:
            logger.warning("WhatsApp integration not fully configured")
            return {"status": "success", "message": "Phone number saved, but could not send verification message"}
            
        headers = {
            'Authorization': f'Bearer {config.WHATSAPP_API_TOKEN}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            "numero": request_data.phone_number,
            "mensagem": '✅ Seu número foi cadastrado com sucesso! Agora você pode conversar e solicitar tarefas para o Thanus pelo WhatsApp.'
        }
        
        async with httpx.AsyncClient() as http_client:
            response = await http_client.post(
                f"{config.WHATSAPP_API_URL.rstrip('/')}/whatsapp/send-text",
                json=payload,
                headers=headers,
                timeout=30.0
            )
            
            if response.status_code != 200:
                logger.error(f"Failed to send WhatsApp message: {response.text}")
                
        return {"status": "success", "message": "Phone number saved and verification message sent"}
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying phone number: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while processing your request"
        )
        
@router.get("/agents/runs/{agent_run_id}/result")
async def get_agent_run_result_api(
    agent_run_id: str,
    request: Request,
    account_id: str = Depends(get_account_id_from_api_key)
):
    """Get the final result/output of a completed agent run in a simplified format."""
    logger.info(f"Getting agent run result for API: {agent_run_id}")
    client = await db.client
    
    try:
        # Verify access to the agent run
        agent_run_data = await get_agent_run_with_access_check_api(client, agent_run_id, account_id)
        
        if agent_run_data['status'] == 'running':
            return {
                "agent_run_id": agent_run_id,
                "status": "running",
                "message": "Agent is still running. Use the streaming endpoint or check back later.",
                "result": None
            }
        
        # Get the final assistant message(s) from responses
        response_list_key = f"agent_run:{agent_run_id}:responses"
        final_result = {
            "agent_run_id": agent_run_id,
            "status": agent_run_data['status'],
            "started_at": agent_run_data['started_at'],
            "completed_at": agent_run_data['completed_at'],
            "error": agent_run_data['error'],
            "result": None,
            "tool_outputs": [],
            "files_created": []
        }
        
        logger.info(f"Getting responses from Redis key: {response_list_key}")
        try:
            responses_json = await redis.lrange(response_list_key, 0, -1)
            logger.info(f"Retrieved {len(responses_json) if responses_json else 0} items from Redis for result endpoint")
            if responses_json:
                responses = []
                for i, r in enumerate(responses_json):
                    logger.debug(f"Processing Redis item {i} for result: type={type(r)}, length={len(str(r)) if r else 0}")
                    try:
                        if isinstance(r, dict):
                            logger.debug(f"Result item {i} is already a dict")
                            responses.append(r)
                        elif isinstance(r, (str, bytes)):
                            if isinstance(r, bytes):
                                logger.debug(f"Result item {i} is bytes, decoding to string")
                                r = r.decode('utf-8')
                            logger.debug(f"Result item {i} is string, parsing JSON")
                            parsed = json.loads(r)
                            responses.append(parsed)
                        else:
                            logger.warning(f"Result item {i} has unexpected type {type(r)}, converting to string")
                            responses.append(json.loads(str(r)))
                    except (json.JSONDecodeError, TypeError, ValueError) as e:
                        logger.error(f"Failed to parse Redis response item {i} for result: {e}, item type: {type(r)}, item preview: {str(r)[:200]}")
                        # Skip invalid items or add as raw data
                        if isinstance(r, dict):
                            responses.append(r)
                        else:
                            responses.append({"type": "error", "raw_data": str(r)[:500], "parse_error": str(e)})
                
                # Extract the final assistant message
                assistant_messages = []
                tool_outputs = []
                
                for response in responses:
                    if response.get('type') == 'message' and response.get('role') == 'assistant':
                        assistant_messages.append(response.get('content', ''))
                    
                    elif response.get('type') == 'tool_result':
                        tool_name = response.get('tool_name', 'unknown')
                        success = response.get('success', False)
                        result_content = response.get('result', '')
                        
                        tool_outputs.append({
                            "tool": tool_name,
                            "success": success,
                            "output": result_content
                        })
                        
                        # Check for file creation
                        if 'file' in tool_name.lower() and success:
                            if 'created' in result_content.lower() or 'written' in result_content.lower():
                                # Try to extract file paths from the result
                                import re
                                file_patterns = [
                                    r'(?:created|written|saved)\s+(?:file\s+)?["\']?([^\s"\']+\.[a-zA-Z0-9]+)["\']?',
                                    r'["\']?([^\s"\']+\.[a-zA-Z0-9]+)["\']?\s+(?:created|written|saved)',
                                    r'/workspace/([^\s"\']+\.[a-zA-Z0-9]+)'
                                ]
                                
                                for pattern in file_patterns:
                                    matches = re.findall(pattern, result_content, re.IGNORECASE)
                                    for match in matches:
                                        if match not in final_result['files_created']:
                                            final_result['files_created'].append(match)
                
                # Combine all assistant messages
                if assistant_messages:
                    final_result['result'] = '\n\n'.join(assistant_messages).strip()
                
                final_result['tool_outputs'] = tool_outputs
                
        except Exception as e:
            logger.warning(f"Failed to get responses from Redis for {agent_run_id}: {e}")
            final_result['redis_error'] = str(e)
        
        # If no result from Redis, try to get from database messages
        if not final_result['result']:
            thread_id = agent_run_data['thread_id']
            messages_result = await client.table('messages').select('*').eq('thread_id', thread_id).eq('type', 'assistant').order('created_at', desc=True).limit(1).execute()
            
            if messages_result.data:
                last_message = messages_result.data[0]
                content = last_message.get('content', '')
                logger.debug(f"Result fallback DB content type={type(content)}, is_llm_message={last_message.get('is_llm_message')}")
                if content and last_message.get('is_llm_message'):
                    try:
                        if isinstance(content, dict):
                            parsed_content = content
                        elif isinstance(content, (bytes, bytearray)):
                            parsed_content = json.loads(content.decode('utf-8'))
                        elif isinstance(content, str):
                            parsed_content = json.loads(content)
                        else:
                            logger.warning(f"Unexpected content type for result content: {type(content)}")
                            parsed_content = {"content": str(content)}
                        final_result['result'] = parsed_content.get('content', content if isinstance(content, str) else str(content))
                    except (json.JSONDecodeError, TypeError, ValueError) as e:
                        logger.error(f"Failed to parse assistant message content for result: {e}, preview={str(content)[:200]}")
                        final_result['result'] = content if isinstance(content, str) else str(content)
                else:
                    final_result['result'] = content if isinstance(content, str) else str(content)
        
        if not final_result['result']:
            if agent_run_data['status'] == 'failed':
                final_result['result'] = f"Agent execution failed: {agent_run_data['error'] or 'Unknown error'}"
            elif agent_run_data['status'] == 'stopped':
                final_result['result'] = "Agent execution was stopped before completion."
            else:
                final_result['result'] = "No output available."
        
        logger.info(f"Retrieved final result for agent run {agent_run_id}: {len(final_result['result'])} characters")
        return final_result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting agent run result via API: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get agent run result: {str(e)}")
