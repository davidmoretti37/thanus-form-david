#!/usr/bin/env python3
"""
Script to sync hardcoded feature flags with Redis
"""
import asyncio
import sys
import os

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from flags.flags import (
    enable_flag,
    custom_agents,
    mcp_module,
    templates_api,
    triggers_api,
    workflows_api,
    knowledge_base,
    pipedream,
    credentials_api,
    suna_default_agent,
    agent_triggers
)
from utils.logger import logger


async def sync_all_flags():
    """Sync all hardcoded feature flags to Redis"""
    
    flags_to_sync = {
        "custom_agents": custom_agents,
        "mcp_module": mcp_module,
        "templates_api": templates_api,
        "triggers_api": triggers_api,
        "workflows_api": workflows_api,
        "knowledge_base": knowledge_base,
        "pipedream": pipedream,
        "credentials_api": credentials_api,
        "suna_default_agent": suna_default_agent,
        "agent_triggers": agent_triggers,
    }
    
    logger.info("Starting feature flags synchronization...")
    
    for flag_name, flag_value in flags_to_sync.items():
        try:
            if flag_value:
                await enable_flag(flag_name, f"Auto-synced hardcoded flag: {flag_name}")
                logger.info(f"✅ Enabled flag: {flag_name}")
            else:
                logger.info(f"⚠️  Skipped disabled flag: {flag_name}")
        except Exception as e:
            logger.error(f"❌ Failed to sync flag {flag_name}: {e}")
    
    logger.info("Feature flags synchronization completed!")


if __name__ == "__main__":
    asyncio.run(sync_all_flags())
