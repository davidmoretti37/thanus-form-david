import { createClient } from '@/lib/supabase/client';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

export interface Memory {
  id: string;
  account_id: string;
  memoria: string;
  tipo_memoria: string;
  aprovacao_usuario: boolean;
  created_at: string;
  title?: string;
}

/**
 * Fetch memories that need approval
 * @returns Promise with memories that need approval
 */
export const getPendingMemories = async (): Promise<Memory[]> => {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      console.warn('No authenticated session found');
      return [];
    }
    
    const response = await fetch(`${API_URL}/memories/pending-approval`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details available');
      console.error(`Failed to fetch pending memories: ${response.status} ${response.statusText}`, errorText);
      return [];
    }
    
    const data = await response.json();
    return data.memories || [];
  } catch (error) {
    console.error('Error fetching pending memories:', error);
    return [];
  }
};

/**
 * Approve a memory
 * @param memoryId ID of the memory to approve
 * @returns Promise with success status
 */
export const approveMemory = async (memoryId: string): Promise<boolean> => {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      console.warn('No authenticated session found');
      return false;
    }
    
    const response = await fetch(`${API_URL}/memories/${memoryId}/approve`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details available');
      console.error(`Failed to approve memory: ${response.status} ${response.statusText}`, errorText);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error approving memory:', error);
    return false;
  }
};

/**
 * Delete a memory
 * @param memoryId ID of the memory to delete
 * @returns Promise with success status
 */
export const deleteMemory = async (memoryId: string): Promise<boolean> => {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      console.warn('No authenticated session found');
      return false;
    }
    
    const response = await fetch(`${API_URL}/memories/${memoryId}/`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details available');
      console.error(`Failed to delete memory: ${response.status} ${response.statusText}`, errorText);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting memory:', error);
    return false;
  }
};