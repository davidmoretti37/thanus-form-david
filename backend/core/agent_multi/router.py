from __future__ import annotations

import asyncio
import json
import time
import uuid
from typing import Dict, Iterable, List, Optional, Tuple

from fastapi import APIRouter, HTTPException, Path
from starlette.responses import StreamingResponse

from .models import (
    TeamCreateRequest,
    TeamListResponse,
    TeamResponse,
    TeamRunRequest,
    RunEvent,
)
from .adapter import ExistingAgentSnapshot
from .orchestrator import build_supervisor_orchestrator

router = APIRouter(prefix="/agent-teams", tags=["multi-agents"])


# In-memory store (MVP). Replace with Supabase persistence in next step.
_Teams: Dict[str, Dict] = {}  # team_id -> {"req": TeamCreateRequest, "created_at", "updated_at", "account_id"}
_TeamMembers: Dict[str, List[Dict]] = {}  # team_id -> list of members dict (TeamMemberSpec.model_dump())
# Optional mapping for "resolver" (MVP fallback if we don't have real agent fetch)
# In real code, resolve from DB using agent_id and convert to ExistingAgentSnapshot.
def _persist_team_snapshot(team_id: str, req: TeamCreateRequest) -> None:
    now = _now_iso()
    existing = _Teams.get(team_id)
    created_at = existing["created_at"] if existing else now
    _Teams[team_id] = {
        "req": req.model_dump(),
        "created_at": created_at,
        "updated_at": now,
        "account_id": req.account_id or "account-unknown",
    }
    _TeamMembers[team_id] = [member.model_dump() for member in req.members]


def _get_team_snapshot(team_id: str) -> Optional[TeamCreateRequest]:
    payload = _Teams.get(team_id)
    if not payload:
        return None
    return TeamCreateRequest(**payload["req"])


def _resolve_agent_snapshot(agent_id: str) -> ExistingAgentSnapshot:
    # TODO: integrate with project's agent CRUD/service to fetch real agent config
    # For now, return a minimal snapshot
    return ExistingAgentSnapshot(
        agent_id=agent_id,
        name=f"Agent {agent_id[:8]}",
        description="Auto-resolved placeholder",
        provider="litellm",
        model="gpt-4o-mini",
        temperature=0.2,
        system_prompt="You are an AI agent collaborating in a team.",
        tools={},
        extra={},
    )


def _now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%S%z")


@router.post("", response_model=TeamResponse)
async def create_team(req: TeamCreateRequest) -> TeamResponse:
    team_id = str(uuid.uuid4())
    created_at = _now_iso()
    _persist_team_snapshot(team_id, req)

    payload = _Teams[team_id]
    team_req = TeamCreateRequest(**payload["req"])

    return TeamResponse(
        id=team_id,
        account_id=payload["account_id"],
        name=team_req.name,
        description=team_req.description,
        strategy=team_req.strategy,
        members=team_req.members,
        created_at=payload["created_at"],
        updated_at=payload["updated_at"],
    )


@router.get("", response_model=TeamListResponse)
async def list_teams() -> TeamListResponse:
    teams: List[TeamResponse] = []
    for team_id, payload in _Teams.items():
        req = TeamCreateRequest(**payload["req"])
        teams.append(
            TeamResponse(
                id=team_id,
                account_id=payload["account_id"],
                name=req.name,
                description=req.description,
                strategy=req.strategy,
                members=req.members,
                created_at=payload["created_at"],
                updated_at=payload["updated_at"],
            )
        )
    return TeamListResponse(teams=teams, total=len(teams))


@router.get("/{team_id}", response_model=TeamResponse)
async def get_team(team_id: str = Path(..., description="Team ID")) -> TeamResponse:
    payload = _Teams.get(team_id)
    if not payload:
        raise HTTPException(status_code=404, detail="Team not found")
    req = TeamCreateRequest(**payload["req"])
    return TeamResponse(
        id=team_id,
        account_id=payload["account_id"],
        name=req.name,
        description=req.description,
        strategy=req.strategy,
        members=req.members,
        created_at=payload["created_at"],
        updated_at=payload["updated_at"],
    )


def _iter_events(
    team_id: str,
    run_id: str,
    treq: TeamRunRequest,
    fallback_team: Optional[TeamCreateRequest] = None,
) -> Iterable[str]:
    team_req = fallback_team or _get_team_snapshot(team_id)
    if not team_req:
        err_evt = RunEvent(type="error", run_id=run_id, content="Team not found", ts_ms=int(time.time() * 1000))
        end_evt = RunEvent(type="end", run_id=run_id, content="done", ts_ms=int(time.time() * 1000))
        for evt in [err_evt, end_evt]:
            yield f"data: {evt.model_dump_json()}\n\n"
        return

    members = team_req.members

    orchestrator = build_supervisor_orchestrator(members, _resolve_agent_snapshot)
    for evt in orchestrator.run(run_id, treq):
        yield f"data: {evt.model_dump_json()}\n\n"

    # Final newline to make sure SSE closes cleanly on client side
    yield "\n"


@router.post("/{team_id}/run")
async def run_team(
    team_id: str = Path(..., description="Team ID"),
    treq: TeamRunRequest = None,
):
    if treq is None:
        raise HTTPException(status_code=400, detail="Invalid request")
    run_id = str(uuid.uuid4())

    team_req = _get_team_snapshot(team_id)
    if not team_req and treq.team:
        _persist_team_snapshot(team_id, treq.team)
        team_req = treq.team

    if treq.streaming:
        return StreamingResponse(
            _iter_events(team_id, run_id, treq, fallback_team=team_req),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
        )

    # Non-streaming: return events as an array
    # Reuse SSE generator to avoid duplicated orchestration logic
    events: List[Dict] = []
    for line in _iter_events(team_id, run_id, treq, fallback_team=team_req):
        if line.startswith("data: "):
            payload = line[len("data: ") :].strip()
            try:
                events.append(json.loads(payload))
            except Exception:
                pass
    return {"run_id": run_id, "events": events}
