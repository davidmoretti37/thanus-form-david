from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


# ========== Domain models (Pydantic v2) ==========


class TeamMemberSpec(BaseModel):
    agent_id: str = Field(..., description="Existing single-agent ID in the system")
    role: str = Field(..., description="Human readable role in the team (e.g., 'researcher', 'planner')")
    mode: Literal["reference", "snapshot"] = Field(
        "reference",
        description="reference=use current agent config by reference; snapshot=copy config into team",
    )
    config_overrides: Dict[str, Any] = Field(
        default_factory=dict,
        description="Optional overrides for the agent when participating in the team",
    )


class TeamCreateRequest(BaseModel):
    account_id: Optional[str] = Field(default=None, description="Owning account for RLS (derived from auth if omitted)")
    name: str = Field(..., description="Team name")
    description: Optional[str] = Field(default=None, description="Team description")
    strategy: Literal["supervisor", "roundrobin"] = Field(
        "supervisor", description="Initial orchestration strategy"
    )
    members: List[TeamMemberSpec] = Field(default_factory=list, description="Team members")


class TeamResponse(BaseModel):
    id: str
    account_id: str
    name: str
    description: Optional[str] = None
    strategy: Literal["supervisor", "roundrobin"]
    members: List[TeamMemberSpec] = Field(default_factory=list)
    created_at: str
    updated_at: str


class TeamListResponse(BaseModel):
    teams: List[TeamResponse]
    total: int


class TeamRunRequest(BaseModel):
    input: str = Field(..., description="Initial input/user message for the team")
    max_steps: int = Field(12, ge=1, le=128, description="Safety limit for orchestration steps")
    streaming: bool = Field(True, description="If true, stream events (server-sent events in API)")
    team: Optional[TeamCreateRequest] = Field(
        default=None,
        description="Optional inline team definition for fallback execution if server snapshot is unavailable",
    )


class RunEvent(BaseModel):
    type: Literal[
        "start", "message", "tool", "decision", "end", "error", "log"
    ] = "message"
    run_id: str
    step: int = 0
    sender_type: Literal["system", "agent", "user", "tool"] = "agent"
    sender_id: Optional[str] = None
    agent_role: Optional[str] = None
    content: Any = None
    ts_ms: int = 0


class RunStartResponse(BaseModel):
    run_id: str
    status: Literal["queued", "running", "done"] = "queued"


# ========== Orchestrator configuration ==========


class SupervisorConfig(BaseModel):
    """Config for supervisor-style coordination."""
    allow_self_assign: bool = Field(True, description="Allow supervisor to execute if no worker fits")


class RoundRobinConfig(BaseModel):
    """Config for round-robin style coordination."""
    order: List[str] = Field(default_factory=list, description="Agent IDs order; empty -> derived from members order")


class StrategyConfig(BaseModel):
    kind: Literal["supervisor", "roundrobin"] = "supervisor"
    supervisor: Optional[SupervisorConfig] = None
    roundrobin: Optional[RoundRobinConfig] = None


# ========== Persistence DTOs (snapshots) ==========


class MemberSnapshot(BaseModel):
    agent_id: str
    role: str
    effective_config: Dict[str, Any] = Field(default_factory=dict)
