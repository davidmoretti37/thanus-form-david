import { createClient } from "@/lib/supabase/client";

const RAW_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "";
// Normalize base URLs to be resilient whether backend is mounted at /api or root
const ROOT_BASE = RAW_BASE.replace(/\/$/, "");
const API_URL = ROOT_BASE.endsWith("/api") ? ROOT_BASE : `${ROOT_BASE}/api`;
const API_URL_NO_API = ROOT_BASE.endsWith("/api") ? ROOT_BASE.slice(0, -4) : ROOT_BASE;

// Types kept aligned with backend/core/agent_multi/models.py
export type TeamMemberSpec = {
  agent_id: string;
  role: string;
  mode: "reference" | "snapshot";
  config_overrides?: Record<string, any>;
};

export type TeamCreateRequest = {
  account_id?: string | null;
  name: string;
  description?: string | null;
  strategy: "supervisor" | "roundrobin";
  members: TeamMemberSpec[];
};

export type TeamResponse = {
  id: string;
  account_id: string;
  name: string;
  description?: string | null;
  strategy: "supervisor" | "roundrobin";
  members?: TeamMemberSpec[];
  created_at: string;
  updated_at: string;
};

export type TeamListResponse = {
  teams: TeamResponse[];
  total: number;
};

export type TeamRunRequest = {
  input: string;
  max_steps?: number;
  streaming?: boolean;
  team?: TeamCreateRequest;
};

export type RunEvent = {
  type: "start" | "message" | "tool" | "decision" | "end" | "error" | "log";
  run_id: string;
  step: number;
  sender_type: "system" | "agent" | "user" | "tool";
  sender_id?: string | null;
  agent_role?: string | null;
  content: any;
  ts_ms: number;
};

// Helpers
async function authHeaders() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const token = session?.access_token;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

// API functions
export async function createAgentTeam(req: TeamCreateRequest): Promise<TeamResponse> {
  if (!API_URL) throw new Error("NEXT_PUBLIC_BACKEND_URL is not configured");
  const headers = await authHeaders();

  // Try primary path (/api/agent-teams), then fallback to (/agent-teams) if 404
  let res = await fetch(`${API_URL}/agent-teams`, {
    method: "POST",
    headers,
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    if (res.status === 404) {
      const res2 = await fetch(`${API_URL_NO_API}/agent-teams`, {
        method: "POST",
        headers,
        body: JSON.stringify(req),
      });
      if (res2.ok) return res2.json();
      const txt2 = await res2.text().catch(() => "");
      throw new Error(`Failed to create team: ${res2.status} ${res2.statusText} ${txt2}`);
    }
    const txt = await res.text().catch(() => "");
    throw new Error(`Failed to create team: ${res.status} ${res.statusText} ${txt}`);
  }
  return res.json();
}

export async function listAgentTeams(): Promise<TeamListResponse> {
  if (!API_URL) throw new Error("NEXT_PUBLIC_BACKEND_URL is not configured");
  const headers = await authHeaders();

  // Try primary path, fallback to alternate base if not found
  let res = await fetch(`${API_URL}/agent-teams`, {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    const fallbackHeaders = { ...headers };
    if (!fallbackHeaders["Content-Type"]) {
      fallbackHeaders["Content-Type"] = "application/json";
    }
    if (res.status === 404) {
      const res2 = await fetch(`${API_URL_NO_API}/agent-teams`, {
        method: "GET",
        headers: fallbackHeaders,
      });
      if (res2.ok) return res2.json();
      const txt2 = await res2.text().catch(() => "");
      throw new Error(`Failed to list teams: ${res2.status} ${res2.statusText} ${txt2}`);
    }
    const txt = await res.text().catch(() => "");
    throw new Error(`Failed to list teams: ${res.status} ${res.statusText} ${txt}`);
  }
  return res.json();
}

/**
 * Stream a team run (POST + ReadableStream parser for SSE).
 * EventSource only supports GET; our backend uses POST for streaming responses.
 * This helper parses "data: {json}\n\n" chunks and yields RunEvent objects.
 */
export async function runAgentTeamStream(
  teamId: string,
  req: TeamRunRequest,
  handlers: {
    onEvent: (evt: RunEvent) => void;
    onError?: (err: any) => void;
    onEnd?: () => void;
  },
): Promise<() => void> {
  if (!API_URL) throw new Error("NEXT_PUBLIC_BACKEND_URL is not configured");
  const headers = await authHeaders();
  const controller = new AbortController();

  try {
    // Try primary path, then fallback to alternate base if 404
    let res = await fetch(`${API_URL}/agent-teams/${encodeURIComponent(teamId)}/run`, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...req, streaming: true }),
      signal: controller.signal,
    });

    if ((!res.ok || !res.body) && res.status === 404) {
      const res2 = await fetch(`${API_URL_NO_API}/agent-teams/${encodeURIComponent(teamId)}/run`, {
        method: "POST",
        headers,
        body: JSON.stringify({ ...req, streaming: true }),
        signal: controller.signal,
      });
      if (res2.ok && res2.body) {
        res = res2;
      } else {
        const txt2 = await res2.text().catch(() => "");
        throw new Error(`Run failed: ${res2.status} ${res2.statusText} ${txt2}`);
      }
    }

    if (!res.ok || !res.body) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Run failed: ${res.status} ${res.statusText} ${txt}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    const processBuffer = () => {
      if (!buffer) return;

      // Normalize CRLF to LF so we can detect SSE frame boundaries consistently.
      buffer = buffer.replace(/\r\n/g, "\n");

      let idx: number;
      while ((idx = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);

        for (const line of frame.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) {
            continue;
          }

          const json = trimmed.slice(5).trim();
          if (!json) continue;

          try {
            const evt: RunEvent = JSON.parse(json);
            handlers.onEvent(evt);
          } catch {
            // ignore non-JSON payloads
          }
        }
      }
    };

    const pump = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          processBuffer();
        }

        // Flush any remaining buffered data after the stream closes.
        processBuffer();
      } catch (e) {
        handlers.onError?.(e);
      } finally {
        handlers.onEnd?.();
      }
    };

    pump();
  } catch (e) {
    handlers.onError?.(e);
    handlers.onEnd?.();
  }

  return () => controller.abort();
}
