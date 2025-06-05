import os
import urllib.parse
from typing import Optional, List, Dict

from fastapi import FastAPI, UploadFile, File, HTTPException, APIRouter, Form, Depends, Request
from fastapi.responses import Response
from pydantic import BaseModel
from utils.auth_utils import get_current_user_id_from_jwt, get_user_id_from_stream_auth, verify_thread_access, get_account_id_from_thread
from utils.logger import logger
from services.supabase import DBConnection
from datetime import datetime, timezone
import traceback
from memory.memory_agent import check_for_possible_user_memories, insert_memory_user

# Initialize shared resources
router = APIRouter(tags=["memory"])
db = None

def initialize(_db: DBConnection):
    """Initialize the memory API with resources from the main API."""
    global db
    db = _db
    logger.info("Initialized memory API with database connection")


@router.get("/memories/pending-approval")
async def get_pending_approval_memories(user_id: str = Depends(get_current_user_id_from_jwt)):
    """
    Get memories that need user approval.
    
    Args:
        user_id: ID of the authenticated user
        
    Returns:
        List of memories that need approval
    """
    logger.info(f"Fetching memories pending approval for user: {user_id}")
    
    try:
        client = await db.client
        
        # In Supabase, the user_id from auth.users is the same as account_id
        # So we can use the user_id directly instead of querying the users table
        account_id = user_id
        logger.info(f"Using user_id as account_id: {account_id}")
        
        # Fetch memories that need approval
        try:
            memories = await client.table('memoria_usuario')\
                .select('*')\
                .eq('account_id', account_id)\
                .eq('aprovacao_usuario', False)\
                .order('created_at', desc=True)\
                .execute()
        except Exception as query_error:
            logger.error(f"Error querying memoria_usuario table: {str(query_error)}")
            return {"memories": []}
            
        logger.info(f"Found {len(memories.data)} memories pending approval for user {user_id}")
        return {"memories": memories.data}
        
    except Exception as e:
        logger.error(f"Error fetching pending approval memories: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error fetching memories: {str(e)}")

@router.put("/memories/{memory_id}/approve")
async def approve_memory(memory_id: str, user_id: str = Depends(get_current_user_id_from_jwt)):
    """
    Approve a memory.
    
    Args:
        memory_id: ID of the memory to approve
        user_id: ID of the authenticated user
        
    Returns:
        Success message
    """
    logger.info(f"Approving memory {memory_id} for user {user_id}")
    
    try:
        client = await db.client
        
        # In this case, the user_id is already the account_id (from auth.users)
        account_id = user_id
        
        # Verify the memory belongs to the user
        memory = await client.table('memoria_usuario').select('id').eq('id', memory_id).eq('account_id', account_id).maybe_single().execute()
        if not memory.data:
            raise HTTPException(status_code=404, detail="Memory not found or you don't have permission to approve it")
        
        # Update the memory approval status with current date
        result = await client.table('memoria_usuario').update({
            "aprovacao_usuario": True,
            "aprovado_em": datetime.now(timezone.utc).isoformat()
        }).eq('id', memory_id).execute()
        
        # Check if the update was successful
        if not result or not hasattr(result, 'data') or len(result.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to approve memory")
        
        return {"message": "Memory approved successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error approving memory: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error approving memory: {str(e)}")

@router.delete("/memories/{memory_id}")
async def delete_memory(memory_id: str, user_id: str = Depends(get_current_user_id_from_jwt)):
    """
    Delete a memory.
    
    Args:
        memory_id: ID of the memory to delete
        user_id: ID of the authenticated user
        
    Returns:
        Success message
    """
    logger.info(f"Deleting memory {memory_id} for user: {user_id}")
    
    try:
        client = await db.client
        
        # Verify that the memory belongs to the user
        memory = await client.table('memoria_usuario')\
            .select('*')\
            .eq('id', memory_id)\
            .eq('account_id', user_id)\
            .execute()
            
        if not memory.data:
            logger.warning(f"Memory {memory_id} not found or does not belong to user {user_id}")
            raise HTTPException(status_code=404, detail="Memory not found or unauthorized")
            
        # Delete the memory
        await client.table('memoria_usuario')\
            .delete()\
            .eq('id', memory_id)\
            .execute()
            
        logger.info(f"Successfully deleted memory {memory_id}")
        return {"message": "Memory deleted successfully"}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error deleting memory: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error deleting memory: {str(e)}")


class CheckMemoryRequest(BaseModel):
    thread_id: str
    message: str

@router.post("/memories/check")
async def check_user_memory(request: CheckMemoryRequest, user_id: str = Depends(get_current_user_id_from_jwt)):
    """
    Check if a user message contains memories to be inserted in the database.
    
    Args:
        request: Request containing thread_id and message
        user_id: ID of the authenticated user from JWT
        
    Returns:
        Dictionary with potential memories found in the message
    """
    logger.info(f"Checking for memories in message for user: {user_id}, thread: {request.thread_id}")
    
    try:
        # Get account_id from thread_id
        client = await db.client
        account_id = await get_account_id_from_thread(client, request.thread_id)
        
        # Verify the user has access to this thread
        if account_id != user_id:
            logger.warning(f"User {user_id} attempted to access thread {request.thread_id} belonging to {account_id}")
            raise HTTPException(status_code=403, detail="You don't have permission to access this thread")
        
        # Check for potential memories in the message
        potential_memories = await check_for_possible_user_memories(request.message, account_id)
        
        if potential_memories:
            logger.info(f"Found {len(potential_memories)} potential memories for user {user_id}")
            
            # Insert the memories into the memoria_usuario table
            success = await insert_memory_user(client, account_id, potential_memories)
            
            if success:
                logger.info(f"Successfully inserted {len(potential_memories)} memories for user {user_id}")
            else:
                logger.warning(f"Failed to insert some or all memories for user {user_id}")
                
            return {"memories": potential_memories, "has_memories": True}
        else:
            logger.info(f"No potential memories found for user {user_id}")
            return {"memories": [], "has_memories": False}
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking for user memories: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error checking for memories: {str(e)}")

@router.get("/memories")
async def get_user_memories(user_id: str = Depends(get_current_user_id_from_jwt)):
    """
    Get all memories for a user.
    
    Args:
        user_id: ID of the authenticated user
        
    Returns:
        List of all user memories
    """
    logger.info(f"Fetching all memories for user: {user_id}")
    
    try:
        client = await db.client
        
        # In Supabase, the user_id from auth.users is the same as account_id
        account_id = user_id
        
        # Fetch all memories for the user
        try:
            memories = await client.table('memoria_usuario')\
                .select('*')\
                .eq('account_id', account_id)\
                .order('created_at', desc=True)\
                .execute()
        except Exception as query_error:
            logger.error(f"Error querying memoria_usuario table: {str(query_error)}")
            return {"memories": []}
            
        logger.info(f"Found {len(memories.data)} memories for user {user_id}")
        return {"memories": memories.data}
        
    except Exception as e:
        logger.error(f"Error fetching user memories: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error fetching memories: {str(e)}")