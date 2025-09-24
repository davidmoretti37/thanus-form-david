# Multi-Agent Conversational Environment Plan

## Objective

Replace the current MVP dashboard widgets (`TeamBuilder`, `TeamRunner`) with a **dedicated conversational workspace** for multi-agent teams, matching the visual/interaction quality of the existing project/chat environments. The new UI must allow users to:

1. Browse, create, and manage multi-agent teams.
2. Initiate conversations/runs with a selected team.
3. Stream and display team dialogue in a chat-like layout (messages + decisions + tool logs).
4. Track past runs and replay conversations.
5. Issue follow-up instructions within the same workspace.

## UX Structure

```
┌───────────────────────────────────────────────────────────────┐
│ Header: team selector, create button, run settings             │
├───────────────┬────────────────────────────────────────────────┤
│ Team Sidebar  │ Chat Canvas                                    │
│ - My teams    │ - Message list                                 │
│ - Search      │ - Decision/tool badges                         │
│ - Run history │ - Auto-scroll + timestamps                     │
├───────────────┴────────────────────────────────────────────────┤
│ Composer: instruction input, attach context, run/stop buttons  │
└───────────────────────────────────────────────────────────────┘
```

### Key States

- **No team selected** → Prompt to choose or create a team.
- **Live run** → Show streaming messages, status indicator, stop button.
- **Completed run** → Persisted transcript with ability to replay or fork instruction.
- **Error** → Banner in chat canvas + incident in run history.

## Component Breakdown

| Component | Responsibility |
|-----------|----------------|
| `MultiAgentWorkspace` (page-level container) | Loads teams, runs, drives state machine. |
| `TeamSidebar` | Lists teams & run history (React Query; infinite scroll). |
| `TeamComposer` | Input for instructions + controls for max steps, streaming toggle. |
| `TeamChatTranscript` | Renders incoming `RunEvent` stream with virtualization. |
| `TeamRunHistoryItem` | Summaries for previous runs with replay button. |
| `TeamCreationSheet` | Wraps existing `TeamBuilder` inside sheet/dialog. |
| `useMultiAgentRuns` hook | Encapsulates run lifecycle: SSE subscription, buffering, error handling, optimistic run creation. |

## API / Data Requirements

1. **Persisted Storage** (future backend work):
   - `GET /agent-teams` (paginated, account-scoped).
   - `GET /agent-teams/{id}/runs` (history).
   - `POST /agent-teams/{id}/run` (returns `run_id`, SSE stream).
   - `GET /agent-teams/{id}/runs/{run_id}` (replay).
2. **Frontend Hooks** (React Query):
   - `useAgentTeams`, `useCreateAgentTeam`.
   - `useAgentTeamRuns`, `useRunAgentTeam`.
   - `useReplayAgentTeamRun`.

For the current UI iteration, the run history will be stored in component state until backend persistence is delivered, but interfaces will mirror final API.

## Visual/Interaction Guidelines

- Use shadcn/ui components consistent with ChatHuman (Cards, ScrollArea, Separator).
- Dark mode optimized (matching screenshot).
- Messages:
  - `sender_type=user` → blue bubble.
  - `sender_type=agent` → neutral bubble with agent avatar + role.
  - `type=decision/tool/log` → inline badge with icon & metadata.
- Status indicators: top-right badge showing `Running`, `Completed`, `Error`.
- Composer:
  - Support Enter-to-send, Shift+Enter newline.
  - Optional advanced settings popover (max steps, streaming toggle).
- Run history:
  - Timestamp, instruction preview, duration, participant count.
  - Clicking loads transcript in chat canvas.

## Implementation Steps

1. **Scaffold UI**
   - Create `MultiAgentWorkspace` + placeholder layout in `frontend/src/components/agents/multi/workspace`.
   - Integrate existing `TeamBuilder` in modal.

2. **Data Hooks**
   - Wrap existing REST calls (`listAgentTeams`, `createAgentTeam`, `runAgentTeamStream`) in React Query hooks under `frontend/src/hooks/react-query/multi-agents/`.

3. **Streaming Pipeline**
   - Implement `useAgentTeamRunner` hook that:
     - Starts run (`POST`).
     - Parses SSE stream (`RunEvent`).
     - Normalizes events into `ChatMessage` objects.
     - Emits status updates (start/end/error).

4. **Chat Transcript**
   - Build `TeamChatTranscript` with virtualization (use `react-virtual` or simple ScrollArea + auto-scroll).
   - Handle message grouping, decision badges, tool content.

5. **Run History (temporary in-memory)**
   - Store completed runs per team on client while backend persistence is pending.
   - Provide replay ability (re-render stored transcript).

6. **Integrate with Dashboard**
   - Replace the multi-agents grid on `/app/(dashboard)/agents/page.tsx` with the new workspace.
   - Ensure route guards & Suspense boundaries align with existing layout.

7. **QA & Polish**
   - Ensure responsive behavior.
  - Add loading/error skeletons.
  - Update documentation (`docs/multi-agent-assessment.md`).

## Out of Scope (Future Work)

- Backend persistence & RLS (documented separately).
- Tool execution visualization beyond textual logs.
- Multi-tab collaboration / real-time presence.

Once this plan is approved, proceed with implementation in the specified steps.
