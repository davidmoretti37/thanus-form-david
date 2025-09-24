'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Play, Square, Plus, History, Users, MessageSquare, RefreshCcw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { RunEvent, TeamResponse, TeamRunRequest, TeamCreateRequest } from '@/lib/multi-agents';
import { useAgentTeams } from '@/hooks/react-query/multi-agents/use-agent-teams';
import {
  useAgentTeamRunner,
  type AgentTeamRun,
  type RunStatus,
} from '@/hooks/react-query/multi-agents/use-agent-team-runner';
import TeamBuilder from '@/components/agents/multi/TeamBuilder';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet';
import { toast } from 'sonner';

const DEFAULT_INSTRUCTION = 'Planeje as próximas ações e atribua responsabilidades aos membros.';

const toTeamSnapshot = (team: TeamResponse): TeamCreateRequest => ({
  account_id: team.account_id,
  name: team.name,
  description: team.description ?? undefined,
  strategy: team.strategy,
  members: team.members ?? [],
});

type TranscriptEvent = RunEvent & { _key: string };

export default function MultiAgentWorkspace() {
  const { data, isLoading, refetch } = useAgentTeams();
  const teams = data?.teams ?? [];
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { currentRun, history, startRun, stopRun, isRunning, lastCompleted } = useAgentTeamRunner();

  useEffect(() => {
    if (!selectedTeamId && teams.length > 0) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  useEffect(() => {
    if (currentRun && currentRun.teamId === selectedTeamId) {
      setSelectedRunId(currentRun.runId);
    }
  }, [currentRun?.runId, currentRun?.teamId, selectedTeamId]);

  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === selectedTeamId) ?? null,
    [teams, selectedTeamId],
  );

  const teamRuns = useMemo(() => {
    return history.filter((run) => run.teamId === selectedTeamId);
  }, [history, selectedTeamId]);

  const runsForSidebar = useMemo(() => {
    const deduped: AgentTeamRun[] = [];

    if (currentRun && currentRun.teamId === selectedTeamId) {
      deduped.push(currentRun);
    }

    for (const run of teamRuns) {
      if (!deduped.some((existing) => existing.runId === run.runId)) {
        deduped.push(run);
      }
    }

    return deduped;
  }, [currentRun, selectedTeamId, teamRuns]);

  const focusedRun = useMemo(() => {
    if (selectedRunId) {
      if (currentRun?.runId === selectedRunId) return currentRun;
      return teamRuns.find((run) => run.runId === selectedRunId) ?? currentRun ?? teamRuns[0] ?? lastCompleted ?? null;
    }
    if (currentRun && currentRun.teamId === selectedTeamId) return currentRun;
    return teamRuns[0] ?? lastCompleted ?? null;
  }, [currentRun, teamRuns, selectedRunId, selectedTeamId, lastCompleted]);

  const handleRunSelect = (runId: string) => {
    setSelectedRunId(runId);
  };

  const handleTeamSelect = (teamId: string) => {
    setSelectedTeamId(teamId);
  };

  const handleTeamCreated = (team: TeamResponse) => {
    toast.success(`Time "${team.name}" criado`);
    setCreateOpen(false);
    setSelectedTeamId(team.id);
    refetch();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <TeamSidebar
        teams={teams}
        isLoading={isLoading}
        selectedTeamId={selectedTeamId}
        onSelectTeam={handleTeamSelect}
        onOpenCreate={() => setCreateOpen(true)}
        runs={runsForSidebar}
        activeRunId={focusedRun?.runId ?? null}
        onSelectRun={handleRunSelect}
        onRefresh={refetch}
      />

      <ConversationPanel
        team={selectedTeam}
        run={focusedRun}
        isRunning={isRunning}
        onStart={async (payload) => {
          if (!selectedTeam) {
            toast.error('Selecione um time para iniciar a conversa');
            return;
          }
          if (!payload.input.trim()) {
            toast.error('Descreva uma instrução para o time');
            return;
          }
          setSelectedRunId(null);
          await startRun(selectedTeam.id, { ...payload, team: toTeamSnapshot(selectedTeam) });
        }}
        onStop={stopRun}
      />

      <TeamCreationSheet open={createOpen} onOpenChange={setCreateOpen} onCreated={handleTeamCreated} />
    </div>
  );
}

type TeamSidebarProps = {
  teams: TeamResponse[];
  isLoading: boolean;
  selectedTeamId: string | null;
  onSelectTeam: (teamId: string) => void;
  onOpenCreate: () => void;
  runs: AgentTeamRun[];
  activeRunId: string | null;
  onSelectRun: (runId: string) => void;
  onRefresh: () => void;
};

function TeamSidebar({
  teams,
  isLoading,
  selectedTeamId,
  onSelectTeam,
  onOpenCreate,
  runs,
  activeRunId,
  onSelectRun,
  onRefresh,
}: TeamSidebarProps) {
  return (
    <Card className="relative flex h-[calc(100vh-8rem)] flex-col overflow-hidden border border-white/10 bg-gradient-to-br from-neutral-950/60 via-neutral-950/30 to-neutral-900/10 p-4 shadow-2xl">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Times multi-agent</h2>
          <p className="text-xs text-muted-foreground/70">Selecione ou crie um time para orquestrar múltiplos agentes.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onRefresh} title="Atualizar times">
            <RefreshCcw className="h-4 w-4" />
          </Button>
          <Button size="icon" onClick={onOpenCreate} title="Criar novo time">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Separator className="my-4 border-white/5" />

      <ScrollArea className="flex-1">
        <div className="space-y-2">
          {isLoading && (
            <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando times...
            </div>
          )}

          {!isLoading && teams.length === 0 && (
            <div className="rounded-lg border border-dashed border-white/10 bg-white/5 px-3 py-6 text-center text-sm text-muted-foreground">
              Nenhum time criado ainda. Clique em <span className="font-semibold text-foreground">adicionar</span> para começar.
            </div>
          )}

          {teams.map((team) => {
            const isActive = team.id === selectedTeamId;
            return (
              <button
                key={team.id}
                type="button"
                onClick={() => onSelectTeam(team.id)}
                className={cn(
                  'w-full rounded-xl border px-3 py-2 text-left transition focus:outline-none focus-visible:ring',
                  isActive
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-white/10 bg-white/5 text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-foreground">{team.name}</div>
                  <Badge variant="outline" className="border-white/10 bg-black/40 text-[11px] uppercase tracking-widest text-muted-foreground">
                    {team.strategy}
                  </Badge>
                </div>
                {team.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground/80">{team.description}</p>
                )}
              </button>
            );
          })}
        </div>
      </ScrollArea>

      <Separator className="my-4 border-white/5" />

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          <History className="h-4 w-4" />
          Históricos
        </div>

        <ScrollArea className="max-h-48 pr-2">
          <div className="space-y-2">
            {runs.length === 0 && (
              <div className="rounded-md border border-dashed border-white/10 bg-white/5 px-3 py-4 text-center text-xs text-muted-foreground">
                Nenhuma execução registrada para este time.
              </div>
            )}

            {runs.map((run) => {
              const isActive = activeRunId === run.runId;
              return (
                <button
                  key={run.runId}
                  type="button"
                  onClick={() => onSelectRun(run.runId)}
                  className={cn(
                    'w-full rounded-lg border px-3 py-2 text-left text-xs transition',
                    isActive
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-white/5 bg-white/5 text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-foreground">{formatRunStatus(run.status)}</span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {run.finishedAt ? formatTimestamp(run.finishedAt) : 'em andamento'}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground/80">{run.input}</p>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </Card>
  );
}

type ConversationPanelProps = {
  team: TeamResponse | null;
  run: AgentTeamRun | null;
  isRunning: boolean;
  onStart: (payload: Omit<TeamRunRequest, 'streaming'>) => Promise<void>;
  onStop: () => void;
};

function ConversationPanel({ team, run, isRunning, onStart, onStop }: ConversationPanelProps) {
  const [instruction, setInstruction] = useState(DEFAULT_INSTRUCTION);
  const [maxSteps, setMaxSteps] = useState(12);

  useEffect(() => {
    setInstruction(DEFAULT_INSTRUCTION);
    setMaxSteps(12);
  }, [team?.id]);

  return (
    <Card className="flex h-[calc(100vh-8rem)] flex-col overflow-hidden border border-white/10 bg-gradient-to-br from-slate-950/70 via-slate-950/40 to-slate-900/10 shadow-2xl">
      <div className="flex items-start justify-between gap-3 border-b border-white/5 p-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {team ? team.name : 'Selecione um time'}
          </h2>
          <p className="text-xs text-muted-foreground">
            {team
              ? 'Inicie uma conversa estratégica com o time e acompanhe o diálogo em tempo real.'
              : 'Escolha um time multi-agent na barra lateral para liberar o ambiente de conversa.'}
          </p>
        </div>
        {run ? <RunStatusBadge status={run.status} /> : <RunStatusBadge status="idle" />}
      </div>

      <div className="flex-1">
        <TranscriptStream run={run} />
      </div>

      <div className="border-t border-white/5">
        <TeamComposer
          disabled={!team}
          instruction={instruction}
          onInstructionChange={setInstruction}
          isRunning={isRunning}
          onStart={() => onStart({ input: instruction, max_steps: maxSteps })}
          onStop={onStop}
          maxSteps={maxSteps}
          onMaxStepsChange={setMaxSteps}
        />
      </div>
    </Card>
  );
}

type TeamComposerProps = {
  disabled: boolean;
  instruction: string;
  onInstructionChange: (value: string) => void;
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  maxSteps: number;
  onMaxStepsChange: (value: number) => void;
};

function TeamComposer({
  disabled,
  instruction,
  onInstructionChange,
  isRunning,
  onStart,
  onStop,
  maxSteps,
  onMaxStepsChange,
}: TeamComposerProps) {
  const canSend = !disabled && instruction.trim().length > 0 && !isRunning;

  return (
    <div className="space-y-3 bg-black/30 p-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-1 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          Máximo de passos:
          <Input
            type="number"
            min={1}
            max={128}
            value={maxSteps}
            onChange={(e) => {
              const value = Number(e.target.value);
              const clamped = Number.isNaN(value) ? 1 : Math.min(128, Math.max(1, value));
              onMaxStepsChange(clamped);
            }}
            className="h-7 w-16 border-white/10 bg-background text-center text-xs text-foreground"
          />
        </div>
      </div>

      <Textarea
        disabled={disabled}
        value={instruction}
        onChange={(e) => onInstructionChange(e.target.value)}
        placeholder="Descreva a tarefa, contexto e objetivo para o time..."
        className="min-h-[100px] resize-none border-white/10 bg-black/50 text-sm text-foreground"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (canSend) {
              onStart();
            }
          }
        }}
      />

      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Pressione <span className="rounded bg-white/10 px-1 py-0.5 text-foreground">Shift + Enter</span> para quebrar a linha.
        </div>

        <div className="flex items-center gap-2">
          {isRunning ? (
            <Button variant="destructive" onClick={onStop}>
              <Square className="h-4 w-4" />
              <span className="ml-2">Parar execução</span>
            </Button>
          ) : (
            <Button disabled={!canSend} onClick={() => onStart()}>
              <Play className="h-4 w-4" />
              <span className="ml-2">Iniciar conversa</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

type TranscriptStreamProps = {
  run: AgentTeamRun | null;
};

function TranscriptStream({ run }: TranscriptStreamProps) {
  const events: TranscriptEvent[] = useMemo(() => {
    if (!run) return [];
    return run.events.map((evt, index) => ({
      ...evt,
      _key: `${run.runId}-${index}-${evt.type}`,
    }));
  }, [run]);

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-3 p-5">
        {!run && (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/5 px-4 py-12 text-center text-sm text-muted-foreground">
            Nenhuma execução selecionada. Inicie uma nova conversa ou escolha um histórico na barra lateral.
          </div>
        )}

        {run && events.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Preparando orquestração do time...
          </div>
        )}

        {events.map((evt) => (
          <TranscriptEventBubble key={evt._key} event={evt} />
        ))}
      </div>
    </ScrollArea>
  );
}

function TranscriptEventBubble({ event }: { event: TranscriptEvent }) {
  const timestamp = event.ts_ms ? new Date(event.ts_ms) : null;

  if (event.type === 'message') {
    const isUser = event.sender_type === 'user';
    const label =
      event.sender_type === 'agent'
        ? event.agent_role || event.sender_id || 'Agente'
        : event.sender_type === 'user'
        ? 'Você'
        : event.sender_type === 'system'
        ? 'Sistema'
        : 'Participante';

    return (
      <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
        <div
          className={cn(
            'max-w-[70%] rounded-2xl border px-4 py-3 shadow-sm',
            isUser
              ? 'border-primary/20 bg-primary text-primary-foreground'
              : 'border-white/10 bg-white/10 text-foreground',
          )}
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-white/70">{label}</div>
          <div className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
            {formatContent(event.content)}
          </div>
          {timestamp && (
            <div className="mt-2 text-[10px] uppercase tracking-wider text-white/40">
              {formatTime(timestamp)}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (event.type === 'decision') {
    return (
      <div className="flex justify-start">
        <div className="max-w-[70%] rounded-xl border border-amber-600/40 bg-amber-500/10 px-4 py-3 text-amber-100 shadow-sm">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-amber-200/80">
            <MessageSquare className="h-3.5 w-3.5" />
            Decisão do coordenador
          </div>
          <div className="mt-2 text-sm text-amber-50">{formatContent(event.content)}</div>
        </div>
      </div>
    );
  }

  if (event.type === 'tool') {
    return (
      <div className="flex justify-start">
        <div className="max-w-[70%] rounded-xl border border-cyan-600/30 bg-cyan-500/10 px-4 py-3 text-cyan-100 shadow-sm">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-cyan-200/80">
            <Users className="h-3.5 w-3.5" />
            Execução de ferramenta
          </div>
          <pre className="mt-2 whitespace-pre-wrap text-xs text-cyan-100/90">{formatContent(event.content)}</pre>
        </div>
      </div>
    );
  }

  if (event.type === 'error') {
    return (
      <div className="flex justify-center">
        <div className="max-w-[80%] rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-center text-xs text-red-200">
          {formatContent(event.content)}
        </div>
      </div>
    );
  }

  if (event.type === 'start' || event.type === 'end' || event.type === 'log') {
    return (
      <div className="flex justify-center">
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          {event.type === 'start'
            ? 'Execução iniciada'
            : event.type === 'end'
            ? 'Execução finalizada'
            : formatContent(event.content)}
        </div>
      </div>
    );
  }

  return null;
}

function RunStatusBadge({ status }: { status: RunStatus }) {
  const label = formatRunStatus(status);
  const styles =
    status === 'running'
      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
      : status === 'error'
      ? 'border-red-500/50 bg-red-500/10 text-red-200'
      : status === 'completed'
      ? 'border-blue-500/40 bg-blue-500/10 text-blue-200'
      : status === 'stopped'
      ? 'border-slate-500/40 bg-slate-500/10 text-slate-200'
      : 'border-white/10 bg-white/5 text-muted-foreground';

  return (
    <Badge variant="outline" className={cn('border px-2 py-1 text-[11px] uppercase tracking-widest', styles)}>
      {label}
    </Badge>
  );
}

type TeamCreationSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (team: TeamResponse) => void;
};

function TeamCreationSheet({ open, onOpenChange, onCreated }: TeamCreationSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <span />
      </SheetTrigger>
      <SheetContent side="right" className="w-full max-w-xl border-l border-white/10 bg-gradient-to-br from-neutral-950 to-neutral-900">
        <SheetHeader>
          <SheetTitle className="text-foreground">Montar novo time multi-agent</SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            Combine agentes existentes, defina papéis e orquestração para criar um time colaborativo.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          <TeamBuilder onCreated={onCreated} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function formatRunStatus(status: RunStatus): string {
  switch (status) {
    case 'running':
      return 'Em execução';
    case 'completed':
      return 'Concluído';
    case 'error':
      return 'Com erro';
    case 'stopped':
      return 'Interrompido';
    default:
      return 'Pronto';
  }
}

function formatContent(content: any): string {
  if (content == null) return '';
  if (typeof content === 'string') return content;
  if (typeof content === 'object') {
    try {
      return JSON.stringify(content, null, 2);
    } catch {
      return String(content);
    }
  }
  return String(content);
}

function formatTimestamp(date: Date) {
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
