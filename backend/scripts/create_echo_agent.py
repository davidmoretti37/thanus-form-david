"""
Script to create the default Echo agent for an account.
Usage: python -m scripts.create_echo_agent <account_id>
"""

import asyncio
import sys
from uuid import uuid4
from core.services.supabase import DBConnection
from core.echo_config import ECHO_CONFIG
from core.versioning.version_service import get_version_service
from core.utils.logger import logger


async def create_echo_agent(account_id: str) -> dict:
    """Create the default Echo agent for the specified account."""
    
    db = DBConnection()
    client = await db.client
    
    try:
        # Check if Echo agent already exists for this account
        existing = await client.table('agents').select('*').eq(
            'account_id', account_id
        ).eq('name', 'Echo').execute()
        
        if existing.data:
            logger.info(f"Echo agent already exists for account {account_id}: {existing.data[0]['agent_id']}")
            return existing.data[0]
        
        # Set all other agents as non-default
        await client.table('agents').update(
            {"is_default": False}
        ).eq("account_id", account_id).eq("is_default", True).execute()
        
        # Create agent record
        insert_data = {
            "account_id": account_id,
            "name": ECHO_CONFIG['name'],
            "description": ECHO_CONFIG['description'],
            "icon_name": "sparkles",
            "icon_color": "#8B5CF6",
            "icon_background": "#EDE9FE",
            "is_default": True,
            "version_count": 1,
            "metadata": ECHO_CONFIG.get('metadata', {})
        }
        
        new_agent = await client.table('agents').insert(insert_data).execute()
        
        if not new_agent.data:
            logger.error("Failed to create Echo agent record")
            return None
        
        agent = new_agent.data[0]
        agent_id = agent['agent_id']
        
        logger.info(f"✅ Created Echo agent: {agent_id}")
        
        # Create initial version
        version_service = await get_version_service()
        
        version = await version_service.create_version(
            agent_id=agent_id,
            user_id=account_id,
            system_prompt=ECHO_CONFIG['system_prompt'],
            model=ECHO_CONFIG['model'],
            configured_mcps=ECHO_CONFIG['configured_mcps'],
            custom_mcps=ECHO_CONFIG['custom_mcps'],
            agentpress_tools=ECHO_CONFIG['agentpress_tools'],
            version_name="v1",
            change_description="Initial Echo agent version"
        )
        
        # Update agent with current version
        await client.table('agents').update({
            "current_version_id": version.version_id
        }).eq("agent_id", agent_id).execute()
        
        logger.info(f"✅ Created Echo agent version: {version.version_id}")
        logger.info(f"✅ Echo agent fully configured for account {account_id}")
        
        return agent
        
    except Exception as e:
        logger.error(f"Failed to create Echo agent: {e}", exc_info=True)
        raise


async def main():
    if len(sys.argv) < 2:
        print("Usage: python -m scripts.create_echo_agent <account_id>")
        print("\nExample:")
        print("  python -m scripts.create_echo_agent b5e82c86-2d22-4341-81ee-32928321d5b9")
        sys.exit(1)
    
    account_id = sys.argv[1]
    
    print(f"Creating Echo agent for account: {account_id}")
    
    agent = await create_echo_agent(account_id)
    
    if agent:
        print(f"\n✅ Success!")
        print(f"Agent ID: {agent['agent_id']}")
        print(f"Name: {agent['name']}")
        print(f"Is Default: {agent['is_default']}")
        print(f"\nThe Echo agent is now ready to use!")
    else:
        print(f"\n❌ Failed to create Echo agent")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
