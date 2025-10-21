import { Platform } from 'react-native';
import { createSupabaseClient } from '@/constants/SupabaseConfig';
import { SERVER_URL } from '@/constants/Server';

// Unified API base URL for all fetches
export const API_URL: string = SERVER_URL;

export async function getAuthToken(): Promise<string | null> {
  try {
    const supabase = createSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

export async function getAuthHeaders(extra?: HeadersInit): Promise<HeadersInit> {
  const token = await getAuthToken();
  const base: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  return { ...base, ...(extra || {}) };
}


