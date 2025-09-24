# Multi-Agent (Agno) Implementation Assessment

_Last updated: 2025-09-24_

## Summary

A preliminary multi-agent capability built on top of Agno exists, but it is currently an **MVP** that operates entirely in-memory and does **not** integrate with the core Suna agent ecosystem (threads, agent runs, Supabase persistence, or tool execution). It is not production-ready.

### Key Findings

1. **Persistence & Security**
   - Teams are stored in module-level dictionaries (`_Teams`, `_TeamMembers`) and disappear on restart.
   - No Supabase tables, RLS policies, or account scoping are in place.
   - Endpoints lack auth dependencies; any caller can list/create/run teams using placeholder data.

2. **Agent Reuse**
   - `agent_multi.adapter` returns fake LiteLLM callables; tools are dropped.
   - No integration with `AgentService`, `agent_runs`, or real agent configuration/version management.
   - Team members cannot execute actual tools or workflows defined on existing Suna agents.

3. **Orchestration**
   - `SupervisorOrchestrator` performs a naïve “coordinator + round-robin workers” loop.
   - No tool calls, planning/reflection, or real stop conditions beyond string matching.
   - SSE stream is emitted, but nothing is logged to Supabase, threads, or observability systems.

4. **API Surface**
   - `/agent-teams` endpoints provide list/create/run over SSE.
   - Standalone FastAPI app (`backend/multi_api.py`) mounts the same router, but still uses the MVP in-memory state.
   - No integration with threads or dashboard data sources.

5. **Frontend**
   - `TeamBuilder` and `TeamRunner` components interact with the MVP API made available under `/agent-teams`.
   - The “Multi Agents” tab is present in the Agents dashboard but operates independently of thread conversations.
   - Tooling/UI for editing teams, viewing history, or attaching runs to threads does not exist.

## Recommended Roadmap

1. **Supabase Persistence & RLS**
   - Introduce migrations for:
     - `agent_teams`
     - `agent_team_members`
     - `agent_team_runs`
     - Optional: `agent_team_run_events`
   - Apply account-scoped RLS and auditing columns (created_at, updated_at, etc.).

2. **Backend Integration**
   - Require authentication and account ownership in the router.
   - Replace `_resolve_agent_snapshot` with a service that converts real agents (via `AgentService`) into Agno agents, preserving:
     - Model/provider
     - System prompt
     - Tools (AgentPress, MCP, etc.)
   - Record runs in Supabase (`agent_team_runs`), optionally join with `agent_runs`.
   - Emit thread messages and integrate with existing logging/observability.

3. **Orchestrator Enhancements**
   - Support modular strategies (supervisor, round-robin, planner/worker, tool-exec loops).
   - Add structured stop conditions, memory/context sharing, and tool execution.
   - Provide hook points for tool results, errors, and metrics.

4. **API Design**
   - CRUD endpoints for teams (list/get/update/delete).
   - Run endpoints that can attach to existing threads or spawn new ones.
   - Provide run history, filtering, and event replay (reuse existing pagination helpers).

5. **Frontend**
   - Update state management to consume the new API (React Query query/mutation hooks).
   - Add team detail/edit screens, run history, and ability to launch a team from:
     - Dashboard
     - ChatHuman / Threads
     - Tasks page
   - Render run events using existing thread UI components for consistency.

6. **Testing & Observability**
   - Unit tests for orchestrator logic (including agent selection and tool integration).
   - API tests covering auth, RLS, and SSE responses.
  - Connect to Langfuse/Sentry for tracing multi-agent runs.

## Next Steps

- [ ] Align on final Supabase schema (tables, indexes, RLS policies).
- [ ] Implement backend persistence & real agent resolution (LiteLLM/tool support).
- [ ] Integrate orchestration with threads/agent_runs.
- [ ] Deliver CRUD + run APIs with auth + pagination.
- [ ] Add automated tests and documentation.

Once these steps are complete, Suna will be able to reuse existing single-agent definitions inside robust Agno-powered multi-agent teams that can be orchestrated from both the dashboard and chat interfaces.
