'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TeamCreateRequest, TeamListResponse, TeamResponse } from '@/lib/multi-agents';
import { createAgentTeam, listAgentTeams } from '@/lib/multi-agents';
import { multiAgentKeys } from './keys';
import { toast } from 'sonner';

const normalizeTeam = (team: TeamResponse): TeamResponse => ({
  ...team,
  members: team.members ?? [],
});

export const useAgentTeams = () => {
  return useQuery({
    queryKey: multiAgentKeys.list(),
    queryFn: async (): Promise<TeamListResponse> => {
      const response = await listAgentTeams();
      return {
        ...response,
        teams: response.teams.map(normalizeTeam),
      };
    },
    staleTime: 60 * 1000,
  });
};

export const useCreateAgentTeam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: TeamCreateRequest): Promise<TeamResponse> => {
      return await createAgentTeam(payload);
    },
    onSuccess: (team) => {
      const normalized = normalizeTeam(team);
      toast.success('Time multi-agent criado');
      queryClient.invalidateQueries({ queryKey: multiAgentKeys.list() });
      return normalized;
    },
    onError: (err: any) => {
      console.error('[MultiAgent] create team failed', err);
      toast.error(err?.message ?? 'Falha ao criar time multi-agent');
    },
  });
};
