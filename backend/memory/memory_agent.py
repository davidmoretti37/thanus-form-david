import json
from typing import List, Dict, Any, Optional, Union
import logging
from datetime import datetime, timezone
from services.llm import make_llm_api_call
from utils.logger import logger


async def check_for_possible_user_memories(message: str, account_id: str) -> Optional[List[Dict[str, str]]]:
    """
    Check if the user message contains any information worth remembering about the user.
    Makes an LLM call to gpt-4o to analyze the message for potential user-related memories.
    Avoids creating duplicate memories by checking against existing user memories.
    
    Args:
        message: The user message to check for memories
        account_id: Account ID for the user
    
    Returns:
        List of memory dictionaries or None if no memories found
    """
    
    # First, retrieve current user memories to avoid duplicates
    try:
        from services.supabase import DBConnection
        db = DBConnection()
        client = await db.client
        
        # Directly query the database instead of calling get_user_memories to avoid circular import
        # Retrieve all memories regardless of approval status
        query = client.table('memoria_usuario')\
            .select('id, memoria, tipo_memoria, created_at, aprovacao_usuario, aprovado_em')\
            .eq('account_id', account_id)
            
        result = await query.order('created_at', desc=True).execute()
        current_memories = result.data if result and hasattr(result, 'data') else []
        
        # Format current memories for the prompt
        current_memories_text = "\n"
        if current_memories and len(current_memories) > 0:
            current_memories_text = "\nCurrent user memories (DO NOT create duplicates of these):\n"
            for memory in current_memories:
                current_memories_text += f"- {memory.get('memoria', '')}\n"
        else:
            current_memories_text = "\nThere are no existing user memories.\n"
            
    except Exception as e:
        logger.error(f"Error retrieving current user memories: {str(e)}")
        current_memories_text = "\nUnable to retrieve current user memories.\n"
    
    # Construct prompt for the memory agent focused on user-related information
    memory_agent_prompt = f"""
    You are a memory agent. Your task is to check if the user message contains any information about the user that should be remembered.
    
    Here is the user message:
    {message}
    
    {current_memories_text}
    
    Analyze this message and determine if there is any NEW important information about the USER that should be remembered for future reference.
    DO NOT create memories for information that is already included in the current user memories listed above.
    
    Focus specifically on information about the user themselves, such as:
    - User preferences (UI, code style, communication style)
    - User background or expertise
    - User goals or objectives
    - User constraints or requirements
    - Personal information that might be relevant for future interactions
    
    If you find NEW information worth remembering about the USER, return a list of memories in the following JSON format:
    [
        {{
            "content": "User prefers dark mode interfaces",
            "tipo_memoria": "preference"
        }}
    ]
    
    The tipo_memoria field must be one of: "preference", "background", "goal", "constraint".
    If there is no NEW information to remember or all relevant information is already in the current memories, return: null
    
    If there is no important information about the USER to remember, return: null
    
    IMPORTANT: Return ONLY the JSON array or null, with no additional text or explanation. Do not include any markdown formatting.
    Your response must be valid JSON that can be parsed directly by json.loads().
    """
    
    try:
        # Make LLM call to analyze the message
        response = await make_llm_api_call(
            model_name="openai/gpt-4o",
            messages=[
                {"role": "system", "content": memory_agent_prompt},
                {"role": "user", "content": message}
            ],
            temperature=0.2,  # Low temperature for more consistent, factual responses
            max_tokens=1000
        )
        
        # Extract the content from the response
        if not response or not response.get('choices') or len(response['choices']) == 0:
            logger.warning("Empty response from LLM")
            return None
            
        content = response['choices'][0]['message']['content'].strip()
        
        # If the response is 'null' or 'None', no memories were found
        if content.lower() in ['null', 'none', '[]']:
            return None
        
        # Try to parse the JSON response
        try:
            # Remove any markdown code block formatting if present
            if content.startswith('```json'):
                content = content[7:]
            if content.startswith('```'):
                content = content[3:]
            if content.endswith('```'):
                content = content[:-3]
                
            memories = json.loads(content)
            
            # Validate the structure of the memories
            if not isinstance(memories, list):
                logger.warning(f"Invalid memory format, expected list but got: {type(memories)}")
                return None
                
            # Ensure all memories have the required fields
            valid_memories = []
            for memory in memories:
                if isinstance(memory, dict) and 'content' in memory:
                    # Add tipo_memoria if not present
                    if 'tipo_memoria' not in memory:
                        memory['tipo_memoria'] = 'preference'  # Default type for user memories
                    valid_memories.append(memory)
            
            return valid_memories if valid_memories else None
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse memory response as JSON: {e}\nResponse: {content}")
            return None
            
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error in memory agent: {str(e)}")
        return None
    except ValueError as e:
        logger.error(f"Value error in memory agent: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error in memory agent: {str(e)}")
        return None


async def check_for_possible_thread_memories(message: str) -> Optional[List[Dict[str, str]]]:
    """
    Check if the user message contains any information worth remembering about the task or project.
    Makes an LLM call to gpt-4o to analyze the message for potential task-related memories.
    
    Args:
        message: The user message to check for memories
        thread_id: Thread ID for the conversation
    
    Returns:
        List of memory dictionaries or None if no memories found
    """
    # Construct prompt for the memory agent focused on task-related information
    memory_agent_prompt = f"""
    You are a memory agent. Your task is to check if the user message contains any information about the current task or project that should be remembered.
    
    Here is the user message:
    {message}
    
    Analyze this message and determine if there is any important information about the TASK or PROJECT that should be remembered for future reference.
    Focus specifically on technical and task-related information, such as:
    - Technical details about implementations or configurations
    - Problem solutions or workarounds
    - Project requirements or specifications
    - Important decisions or design choices
    - Key facts or data points related to the task
    - directories and files structure
    - images paths are extremely important
    
    If you find information worth remembering about the TASK, return a list of memories in the following JSON format:
    [
        {{
            "content": "The project requires PostgreSQL 13 or higher",
            "tipo_memoria": "technical"
        }}
    ]
    
    The tipo_memoria field must be one of: "technical", "solution", "requirement", "decision".
    
    If there is no important information about the TASK to remember, return: null
    
    IMPORTANT: Return ONLY the JSON array or null, with no additional text or explanation. Do not include any markdown formatting.
    Your response must be valid JSON that can be parsed directly by json.loads().
    """
    
    try:
        # Make LLM call to analyze the message
        response = await make_llm_api_call(
            model_name="openai/gpt-4o",
            messages=[
                {"role": "system", "content": memory_agent_prompt},
                {"role": "user", "content": message}
            ],
            temperature=0.2,  # Low temperature for more consistent, factual responses
            max_tokens=1000
        )
        
        # Extract the content from the response
        if not response or not response.get('choices') or len(response['choices']) == 0:
            logger.warning("Empty response from LLM")
            return None
            
        content = response['choices'][0]['message']['content'].strip()
        
        # If the response is 'null' or 'None', no memories were found
        if content.lower() in ['null', 'none', '[]']:
            return None
        
        # Try to parse the JSON response
        try:
            # Remove any markdown code block formatting if present
            if content.startswith('```json'):
                content = content[7:]
            if content.startswith('```'):
                content = content[3:]
            if content.endswith('```'):
                content = content[:-3]
                
            memories = json.loads(content)
            
            # Validate the structure of the memories
            if not isinstance(memories, list):
                logger.warning(f"Invalid memory format, expected list but got: {type(memories)}")
                return None
                
            # Ensure all memories have the required fields
            valid_memories = []
            for memory in memories:
                if isinstance(memory, dict) and 'content' in memory:
                    # Add tipo_memoria if not present
                    if 'tipo_memoria' not in memory:
                        memory['tipo_memoria'] = 'technical'  # Default type
                    valid_memories.append(memory)
            
            return valid_memories if valid_memories else None
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse memory response as JSON: {e}\nResponse: {content}")
            return None
            
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error in memory agent: {str(e)}")
        return None
    except ValueError as e:
        logger.error(f"Value error in memory agent: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error in memory agent: {str(e)}")
        return None


async def insert_memory_thread(client, thread_id: str, memories: List[Dict[str, str]]) -> bool:
    """
    Insert memories into the memoria_thread table.
    
    Args:
        client: Database client
        thread_id: Thread ID to associate with the memories
        memories: List of memory dictionaries
        
    Returns:
        Boolean indicating success
    """
    try:
        if not memories or not thread_id:
            return False
            
        # Insert each memory into the database
        for memory in memories:
            await client.table('memoria_thread').insert({
                "thread_id": thread_id,
                "memoria": memory["content"],
                "tipo_memoria": memory.get("tipo_memoria", "technical"),
                "created_at": datetime.now(timezone.utc).isoformat()
            }).execute()
            
        return True
        
    except ValueError as e:
        logger.error(f"Value error inserting thread memory: {str(e)}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error inserting thread memory: {str(e)}")
        return False


async def insert_memory_user(client, account_id: str, memories: List[Dict[str, str]]) -> bool:
    """
    Insert memories into the memoria_usuario table.
    Checks for existing memories to avoid duplicates.
    
    Args:
        client: Database client
        account_id: Account ID to associate with the memories
        memories: List of memory dictionaries
        
    Returns:
        Boolean indicating success
    """
    try:
        if not memories or not account_id:
            return False
        
        # Get existing memories for this user
        existing_memories_response = await client.table('memoria_usuario') \
            .select('memoria') \
            .eq('account_id', account_id) \
            .execute()
        
        # Extract memory content from response
        existing_memories = []
        if existing_memories_response.data:
            existing_memories = [item['memoria'] for item in existing_memories_response.data]
        logger.info("Memórias existentes: %s", existing_memories)
        # Insert each memory into the database if not a duplicate
        for memory in memories:
            memory_content = memory["content"]
            
            # Skip if this memory already exists for this user
            if memory_content in existing_memories:
                logger.info(f"Skipping duplicate memory for account {account_id}: {memory_content[:50]}...")
                continue
                
            await client.table('memoria_usuario').insert({
                "account_id": account_id,
                "memoria": memory_content,
                "tipo_memoria": memory.get("tipo_memoria", "preference"),
                "aprovacao_usuario": False,  # Requires user approval
                "created_at": datetime.now(timezone.utc).isoformat()
            }).execute()
            
        return True
        
    except ValueError as e:
        logger.error(f"Value error inserting user memory: {str(e)}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error inserting user memory: {str(e)}")
        return False


async def get_thread_memories(client, thread_id: str) -> List[Dict[str, Any]]:
    """
    Retrieve memories associated with a thread.
    
    Args:
        client: Database client
        thread_id: Thread ID to get memories for
        
    Returns:
        List of memory dictionaries
    """
    try:
        result = await client.table('memoria_thread')\
            .select('id, memoria, tipo_memoria, created_at')\
            .eq('thread_id', thread_id)\
            .order('created_at', desc=True)\
            .execute()
            
        return result.data if result and hasattr(result, 'data') else []
        
    except ValueError as e:
        logger.error(f"Value error retrieving thread memories: {str(e)}")
        return []
    except Exception as e:
        logger.error(f"Unexpected error retrieving thread memories: {str(e)}")
        return []


async def get_user_memories(client, account_id: str, approved_only: bool = True) -> List[Dict[str, Any]]:
    """
    Retrieve memories associated with a user.
    
    Args:
        client: Database client
        account_id: Account ID to get memories for
        approved_only: Whether to return only approved memories
        
    Returns:
        List of memory dictionaries
    """
    try:
        query = client.table('memoria_usuario')\
            .select('id, memoria, tipo_memoria, created_at, aprovacao_usuario, aprovado_em')\
            .eq('account_id', account_id)
            
        if approved_only:
            query = query.eq('aprovacao_usuario', True)
            
        result = await query.order('created_at', desc=True).execute()
            
        return result.data if result and hasattr(result, 'data') else []
        
    except ValueError as e:
        logger.error(f"Value error retrieving user memories: {str(e)}")
        return []
    except Exception as e:
        logger.error(f"Unexpected error retrieving user memories: {str(e)}")
        return []


async def approve_user_memory(client, memory_id: str, account_id: str) -> bool:
    """
    Approve a user memory.
    
    Args:
        client: Database client
        memory_id: ID of the memory to approve
        account_id: Account ID of the user (for verification)
        
    Returns:
        Boolean indicating success
    """
    try:
        # First verify the memory belongs to this user
        verify = await client.table('memoria_usuario')\
            .select('id')\
            .eq('id', memory_id)\
            .eq('account_id', account_id)\
            .execute()
            
        if not verify or not verify.data or len(verify.data) == 0:
            logger.warning(f"Memory {memory_id} does not belong to user {account_id}")
            return False
            
        # Update the memory approval status
        await client.table('memoria_usuario')\
            .update({
                "aprovacao_usuario": True,
                "aprovado_em": datetime.now(timezone.utc).isoformat()
            })\
            .eq('id', memory_id)\
            .execute()
            
        return True
        
    except ValueError as e:
        logger.error(f"Value error approving user memory: {str(e)}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error approving user memory: {str(e)}")
        return False


async def delete_memory(client, memory_id: str, memory_type: str, account_id: Optional[str] = None) -> bool:
    """
    Delete a memory.
    
    Args:
        client: Database client
        memory_id: ID of the memory to delete
        memory_type: Type of memory - 'thread_memory' or 'personal_memory'
        account_id: Account ID of the user (for verification of personal memories)
        
    Returns:
        Boolean indicating success
    """
    try:
        if memory_type == 'thread_memory':
            await client.table('memoria_thread')\
                .delete()\
                .eq('id', memory_id)\
                .execute()
        elif memory_type == 'personal_memory':
            if not account_id:
                logger.error("Account ID is required to delete personal memories")
                return False
                
            # First verify the memory belongs to this user
            verify = await client.table('memoria_usuario')\
                .select('id')\
                .eq('id', memory_id)\
                .eq('account_id', account_id)\
                .execute()
                
            if not verify or not verify.data or len(verify.data) == 0:
                logger.warning(f"Memory {memory_id} does not belong to user {account_id}")
                return False
                
            await client.table('memoria_usuario')\
                .delete()\
                .eq('id', memory_id)\
                .execute()
        else:
            logger.error(f"Invalid memory type: {memory_type}")
            return False
            
        return True
        
    except ValueError as e:
        logger.error(f"Value error deleting memory: {str(e)}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error deleting memory: {str(e)}")
        return False
