'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { RunEvent, TeamRunRequest } from '@/lib/multi-agents';
import { runAgentTeamStream } from '@/lib/multi-agents';

export type RunStatus = 'idle' | 'running' | 'completed' | 'error' | 'stopped';

export type AgentTeamRun = {
  runId: string;
  teamId: string;
  startedAt: Date;
  finishedAt?: Date;
  status: RunStatus;
  input: string;
  events: RunEvent[];
  error?: string;
  snapshot?: TeamRunRequest['team'];
};

type StartRunOptions = Omit<TeamRunRequest, 'streaming'>;

export const useAgentTeamRunner = () => {
  const [currentRun, setCurrentRun] = useState<AgentTeamRun | null>(null);
  const [history, setHistory] = useState<AgentTeamRun[]>([]);
  const stopRef = useRef<(() => void) | null>(null);
  const finalizeRef = useRef<(status: RunStatus, error?: string) => void>(() => {});

  const startRun = useCallback(async (teamId: string, req: StartRunOptions) => {
    if (!teamId) throw new Error('Team ID obrigatório');

    stopRef.current?.();
    finalizeRef.current?.('stopped');

    const baseRun: AgentTeamRun = {
      runId: crypto.randomUUID(),
      teamId,
      startedAt: new Date(),
      status: 'running',
      input: req.input,
      events: [],
      snapshot: req.team,
    };

    const collected: RunEvent[] = [];
    let finished = false;
    let errorMessage: string | undefined;

    const finalize = (status: RunStatus, error?: string) => {
      if (finished) return;
      finished = true;
      stopRef.current = null;
      finalizeRef.current = () => {};

      const finishedAt = new Date();

      setCurrentRun((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status,
          error,
          finishedAt,
        };
      });

      setHistory((prev) => [
        {
          ...baseRun,
          events: [...collected],
          status,
          error,
          finishedAt,
        },
        ...prev,
      ]);
    };

    finalizeRef.current = finalize;
    setCurrentRun(baseRun);

    stopRef.current = await runAgentTeamStream(
      teamId,
      { ...req, streaming: true },
      {
        onEvent: (evt) => {
          collected.push(evt);
          setCurrentRun((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              events: [...prev.events, evt],
            };
          });

          if (evt.type === 'error') {
            errorMessage =
              typeof evt.content === 'string' ? evt.content : JSON.stringify(evt.content);
            setCurrentRun((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                status: 'error',
                error: errorMessage,
              };
            });
          }

          if (evt.type === 'end') {
            finalize(errorMessage ? 'error' : 'completed', errorMessage);
          }
        },
        onError: (err) => {
          const message = typeof err === 'string' ? err : err?.message ?? 'Erro na execução';
          errorMessage = message;
          finalize('error', message);
        },
        onEnd: () => {
          if (!finished) {
            finalize(errorMessage ? 'error' : 'completed', errorMessage);
          }
        },
      },
    );
  }, []);

  const stopRun = useCallback(() => {
    if (!stopRef.current) return;
    stopRef.current();
    stopRef.current = null;
    finalizeRef.current?.('stopped');
  }, []);

  const isRunning = currentRun?.status === 'running';

  const lastCompleted = useMemo(
    () => history.find((run) => run.status === 'completed'),
    [history],
  );

  return {
    currentRun,
    history,
    isRunning,
    startRun,
    stopRun,
    lastCompleted,
  };
};
