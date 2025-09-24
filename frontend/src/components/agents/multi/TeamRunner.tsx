'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  listAgentTeams,
  runAgentTeamStream,
  type TeamResponse,
  type RunEvent,
} from '@/lib/multi-agents';
import { toast } from 'sonner';

type Props = {
  team?: TeamResponse | null;
  onTeamChange?: (team: TeamResponse | null) => void;
};

export default function TeamRunner({ team, onTeamChange }: Props) {
  const [teams, setTeams] = useState<TeamResponse[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [selected, setSelected] = useState<TeamResponse | null>(team ?? null);

  const [prompt, setPrompt] = useState('Faça um plano de ações e distribua entre os membros.');
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<RunEvent[]>([]);
  const stopRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    if (team?.id !== selected?.id) {
      setSelected(team ?? null);
    }
  }, [team]);

  const refreshTeams = async () => {
    try {
      setLoadingTeams(true);
      const res = await listAgentTeams();
      setTeams(res.teams);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? 'Falha ao carregar times');
    } finally {
      setLoadingTeams(false);
    }
  };

  useEffect(() => {
    refreshTeams();
  }, []);

  const handleSelectTeam = (id: string) => {
    const t = teams.find((x) => x.id === id) || null;
    setSelected(t);
    onTeamChange?.(t);
  };

  const startRun = async () => {
    if (!selected) {
      toast.error('Selecione um time');
      return;
    }
    if (!prompt.trim()) {
      toast.error('Digite uma instrução para o time');
      return;
    }

    setEvents([]);
    setRunning(true);

    stopRef.current = await runAgentTeamStream(
      selected.id,
      { input: prompt, max_steps: 12, streaming: true },
      {
        onEvent: (evt) => {
          setEvents((prev) => [...prev, evt]);
        },
        onError: (err) => {
          console.error(err);
          toast.error(typeof err === 'string' ? err : (err as any)?.message ?? 'Erro na execução');
        },
        onEnd: () => {
          setRunning(false);
          stopRef.current = null;
        },
      },
    );
  };

  const stopRun = () => {
    if (stopRef.current) {
      stopRef.current();
      stopRef.current = null;
    }
    setRunning(false);
  };

  const messages = useMemo(() => events.filter((e) => e.type === 'message' || e.type === 'decision'), [events]);

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-white/30 dark:bg-black/30 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 p-6">
      <div
        className="pointer-events-none absolute -inset-20 blur-2xl"
        style={{
          backgroundImage: `
            radial-gradient(280px 220px at 18% 20%, rgba(99,102,241,0.35), transparent 62%),
            radial-gradient(260px 200px at 82% 30%, rgba(6,182,212,0.32), transparent 60%)
          `,
        }}
      />
      <div className="relative space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Executar equipe</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Selecione um time e envie uma instrução para iniciar a conversa orquestrada.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={refreshTeams} disabled={loadingTeams}>
            {loadingTeams ? 'Carregando…' : 'Atualizar times'}
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Time</label>
            <select
              value={selected?.id ?? ''}
              onChange={(e) => handleSelectTeam(e.target.value)}
              className="h-10 w-full rounded-md border bg-background px-2 text-sm"
            >
              <option value="">Selecione um time</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Ações</label>
            <div className="flex gap-2">
              {!running ? (
                <Button onClick={startRun} disabled={!selected}>
                  Iniciar
                </Button>
              ) : (
                <Button variant="destructive" onClick={stopRun}>
                  Parar
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Instrução</label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Descreva a tarefa, objetivos e contexto…"
            className="min-h-[80px]"
          />
        </div>

        <div className="rounded-xl border overflow-hidden">
          <div className="bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Conversa do time
          </div>
          <div className="max-h-[360px] overflow-auto p-3 space-y-2 text-sm">
            {messages.length === 0 && (
              <div className="text-muted-foreground">Nenhuma mensagem ainda</div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  'rounded-lg border p-2',
                  m.sender_type === 'user' ? 'bg-blue-500/10 border-blue-500/20' : 'bg-white/60 dark:bg-zinc-900/60',
                )}
              >
                <div className="text-[11px] text-muted-foreground mb-1">
                  {m.type === 'decision' ? 'Decisão' : m.sender_type === 'user' ? 'Usuário' : `Agente ${m.agent_role || ''}`}
                </div>
                <div className="whitespace-pre-wrap break-words">{String(m.content ?? '')}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
