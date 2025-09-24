'use client';

import { useMemo, useState } from 'react';
import { useAgents } from '@/hooks/react-query/agents/use-agents';
import type { TeamCreateRequest, TeamMemberSpec, TeamResponse } from '@/lib/multi-agents';
import { createAgentTeam } from '@/lib/multi-agents';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Props = {
  onCreated: (team: TeamResponse) => void;
};

type Sel = {
  checked: boolean;
  role: string;
  mode: 'reference' | 'snapshot';
};

export default function TeamBuilder({ onCreated }: Props) {
  const { data, isLoading } = useAgents({ content_type: 'agents', limit: 100 });
  const [name, setName] = useState('My Multi-Agent Team');
  const [description, setDescription] = useState('');
  const [strategy, setStrategy] = useState<'supervisor' | 'roundrobin'>('supervisor');
  const [sel, setSel] = useState<Record<string, Sel>>({});

  const agents = data?.agents ?? [];

  const selectedMembers: TeamMemberSpec[] = useMemo(() => {
    return Object.entries(sel)
      .filter(([, v]) => v.checked)
      .map(([agent_id, v]) => ({
        agent_id,
        role: v.role || 'worker',
        mode: v.mode,
        config_overrides: {},
      }));
  }, [sel]);

  const canCreate = name.trim().length > 0 && selectedMembers.length > 0;

  const toggle = (agentId: string, patch: Partial<Sel>) => {
    setSel((prev) => ({
      ...prev,
      [agentId]: {
        checked: prev[agentId]?.checked ?? false,
        role: prev[agentId]?.role ?? 'worker',
        mode: prev[agentId]?.mode ?? 'reference',
        ...patch,
      },
    }));
  };

  const handleCreate = async () => {
    try {
      const req: TeamCreateRequest = {
        name: name.trim(),
        description: description.trim() || undefined,
        strategy,
        members: selectedMembers,
      };
      const team = await createAgentTeam(req);
      toast.success('Time criado');
      onCreated(team);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? 'Falha ao criar time');
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-white/30 dark:bg-black/30 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 p-6">
      <div
        className="pointer-events-none absolute -inset-20 blur-2xl"
        style={{
          backgroundImage: `
            radial-gradient(280px 220px at 18% 20%, rgba(37,99,235,0.35), transparent 62%),
            radial-gradient(260px 200px at 82% 30%, rgba(34,211,238,0.32), transparent 60%)
          `,
        }}
      />
      <div className="relative space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Montar equipe</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Selecione agents existentes, defina papéis e a estratégia de orquestração.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Nome do time</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do time" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Estratégia</label>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as any)}
              className="h-10 w-full rounded-md border bg-background px-2 text-sm"
            >
              <option value="supervisor">Supervisor</option>
              <option value="roundrobin">Round-robin</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Descrição (opcional)</label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição curta" />
        </div>

        <div className="mt-2">
          <div className="text-sm font-medium mb-2">Agents disponíveis</div>
          <div className="rounded-xl border divide-y">
            {isLoading && <div className="p-4 text-sm text-muted-foreground">Carregando agents…</div>}
            {!isLoading && agents.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">Nenhum agent encontrado</div>
            )}
            {agents.map((a: any) => {
              const s = sel[a.agent_id] || { checked: false, role: 'worker', mode: 'reference' as const };
              return (
                <div key={a.agent_id} className="p-3 flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={s.checked}
                    onChange={(e) => toggle(a.agent_id, { checked: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{a.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{a.description}</div>
                  </div>
                  {s.checked && (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={s.role}
                        onChange={(e) => toggle(a.agent_id, { role: e.target.value })}
                        placeholder="papel (ex.: researcher)"
                        className="h-8 rounded-md border bg-background px-2 text-xs w-36"
                      />
                      <select
                        value={s.mode}
                        onChange={(e) => toggle(a.agent_id, { mode: e.target.value as 'reference' | 'snapshot' })}
                        className="h-8 rounded-md border bg-background px-2 text-xs"
                      >
                        <option value="reference">Reference</option>
                        <option value="snapshot">Snapshot</option>
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end">
          <Button disabled={!canCreate} onClick={handleCreate}>
            Criar time
          </Button>
        </div>
      </div>
    </div>
  );
}
