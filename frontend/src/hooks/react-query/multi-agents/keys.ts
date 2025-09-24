export const multiAgentKeys = {
  base: ["multi-agent"] as const,
  list: () => [...multiAgentKeys.base, "teams"] as const,
  detail: (teamId: string) => [...multiAgentKeys.base, "team", teamId] as const,
};
