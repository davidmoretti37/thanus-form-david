from __future__ import annotations

import time
import uuid
from typing import Any, Callable, Iterable, List, Optional, Tuple

# Removed Agno compatibility

from .models import RunEvent, TeamMemberSpec, TeamRunRequest
from .adapter import ExistingAgentSnapshot, from_existing_agent


def _now_ms() -> int:
    return int(time.time() * 1000)


def _ensure_call(agent: AgnoAgent, prompt: str) -> str:
    """Best-effort call into the agent. Fallback to its llm callable if present.
    This keeps us resilient to agno's API differences.
    """
    # agno may expose .run() or similar. Try .run then fallback.
    run_fn = getattr(agent, "run", None)
    if callable(run_fn):
        try:
            return str(run_fn(prompt))
        except Exception:
            pass

    # fallback: try to call the inner llm callable if present
    llm = getattr(agent, "llm", None)
    if callable(llm):
        return str(llm(prompt))

    # last resort
    return f"[no-llm] {prompt}"


class SupervisorOrchestrator:
    """Simple MVP supervisor pattern:
    - First member is considered the 'coordinator' (supervisor).
    - Remaining members are workers.
    - Steps:
        1) coordinator receives user input, decides (naively) a worker
        2) selected worker responds
        3) repeat until max_steps or a simple stopping condition
    """

    def __init__(self, members: List[TeamMemberSpec], resolve_agent: Callable[[str], ExistingAgentSnapshot]) -> None:
        self.members = members
        self.resolve_agent = resolve_agent
        self._agents: List[Tuple[TeamMemberSpec, AgnoAgent]] = []

    def _build_agents(self) -> None:
        if self._agents:
            return
        for spec in self.members:
            snap = self.resolve_agent(spec.agent_id)
            # Apply minimal overrides to snapshot for MVP (model/temperature/system_prompt)
            if "model" in spec.config_overrides:
                snap.model = str(spec.config_overrides["model"])
            if "temperature" in spec.config_overrides:
                try:
                    snap.temperature = float(spec.config_overrides["temperature"])
                except Exception:
                    pass
            if "system_prompt" in spec.config_overrides:
                snap.system_prompt = str(spec.config_overrides["system_prompt"])

            ag = from_existing_agent(snap)
            self._agents.append((spec, ag))

    def run(self, run_id: str, req: TeamRunRequest) -> Iterable[RunEvent]:
        self._build_agents()

        ts = _now_ms()
        yield RunEvent(type="start", run_id=run_id, sender_type="system", content={"info": "team-start"}, ts_ms=ts)

        if not self._agents:
            yield RunEvent(type="error", run_id=run_id, content="No team members", ts_ms=_now_ms())
            yield RunEvent(type="end", run_id=run_id, content="done", ts_ms=_now_ms())
            return

        # Coordinator is the first
        (coord_spec, coord_agent) = self._agents[0]
        workers = self._agents[1:] if len(self._agents) > 1 else []

        # Step 0: user prompt visible
        yield RunEvent(
            type="message",
            run_id=run_id,
            step=0,
            sender_type="user",
            content=req.input,
            ts_ms=_now_ms(),
        )

        # Coordinator "decides" which worker should act (MVP: pick next worker / or self)
        step = 1
        memo = req.input
        for _ in range(max(1, req.max_steps)):
            # Ask coordinator who should act next (MVP: alternating workers; if none, coordinator acts)
            if workers:
                # naive rotate
                worker_index = (step - 1) % len(workers)
                (w_spec, w_agent) = workers[worker_index]
                # coordinator makes decision (MVP: not used, but we log a decision event)
                yield RunEvent(
                    type="decision",
                    run_id=run_id,
                    step=step,
                    sender_type="agent",
                    sender_id=coord_spec.agent_id,
                    agent_role=coord_spec.role,
                    content={"assign": w_spec.agent_id},
                    ts_ms=_now_ms(),
                )
                # selected worker responds
                worker_output = _ensure_call(w_agent, memo)
                yield RunEvent(
                    type="message",
                    run_id=run_id,
                    step=step,
                    sender_type="agent",
                    sender_id=w_spec.agent_id,
                    agent_role=w_spec.role,
                    content=worker_output,
                    ts_ms=_now_ms(),
                )
                memo = worker_output
            else:
                # No workers -> coordinator acts directly
                coord_output = _ensure_call(coord_agent, memo)
                yield RunEvent(
                    type="message",
                    run_id=run_id,
                    step=step,
                    sender_type="agent",
                    sender_id=coord_spec.agent_id,
                    agent_role=coord_spec.role,
                    content=coord_output,
                    ts_ms=_now_ms(),
                )
                memo = coord_output

            # Simple stopping heuristic: if agent says something like "[done]" break
            if "[done]" in str(memo).lower():
                break

            step += 1

        yield RunEvent(type="end", run_id=run_id, content="done", ts_ms=_now_ms())


# Helper to build orchestrator from TeamMemberSpec list.
def build_supervisor_orchestrator(
    members: List[TeamMemberSpec],
    resolve_agent: Callable[[str], ExistingAgentSnapshot],
) -> SupervisorOrchestrator:
    return SupervisorOrchestrator(members=members, resolve_agent=resolve_agent)
