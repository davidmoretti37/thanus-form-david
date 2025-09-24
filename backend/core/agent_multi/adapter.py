from __future__ import annotations

from typing import Any, Dict, Optional

from pydantic import BaseModel
# Removed Agno compatibility

# NOTE: We don't import project-specific Agent models here to avoid circular imports.
# Provide a thin adapter API that higher layers can call with a plain dict/config.


class ExistingAgentSnapshot(BaseModel):
    """Minimal snapshot of an existing single-agent to be adapted into an internal Agent format.
    Extend this with the project's real agent schema fields as needed.
    """
    agent_id: str
    name: str
    description: Optional[str] = None
    # LLM / provider config (LiteLLM or others)
    provider: str = "litellm"
    model: str = "gpt-4o-mini"
    temperature: float = 0.2
    # System prompt / instructions
    system_prompt: Optional[str] = None
    # Tools: map of tool_name -> config
    tools: Dict[str, Dict[str, Any]] = {}
    # Any other config fields already supported by the project
    extra: Dict[str, Any] = {}


def create_litellm_llm(model: str, temperature: float = 0.2):
    """Return a callable or object that our internal Agent can use as LLM.
    For MVP we return a simple callable signature (prompt: str) -> str.
    Integrate real LiteLLM client here.
    """
    # TODO: Wire into project's LiteLLM client with tracing / cost tracking
    def _fake_llm(prompt: str) -> str:
        return f"[{model} temp={temperature}] {prompt}"
    return _fake_llm


def from_existing_agent(snapshot: ExistingAgentSnapshot):
    """Create an Agent from the project's agent snapshot/config."""
    if snapshot.provider == "litellm":
        llm = create_litellm_llm(snapshot.model, snapshot.temperature)
    else:
        # Future: support other providers
        llm = create_litellm_llm(snapshot.model, snapshot.temperature)

    # Tools integration:
    # TODO: Convert project's tools to internal tools.
    # For MVP, we pass None or a minimal list.
    agent = {
        "name": snapshot.name,
        "llm": llm,
        "system_message": snapshot.system_prompt or "",
        "tools": [],  # convert snapshot.tools -> internal tools here
        # extra config that may be supported can go here
    }
    return agent
