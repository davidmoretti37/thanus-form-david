import { SERVER_URL } from '@/constants/Server';
import { createSupabaseClient } from '@/constants/SupabaseConfig';
import { createStreamingQuery } from '@/stores/query-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { handleApiError } from './error-handlers';

// Import EventSource polyfill for React Native  
import { Platform } from 'react-native';

// Use global EventSource if available, otherwise try polyfill
let EventSourceClass: typeof EventSource;
if (Platform.OS === 'web' || typeof global.EventSource !== 'undefined') {
  EventSourceClass = global.EventSource || EventSource;
} else {
  // For React Native, we'll implement a simple fetch-based alternative
  console.warn('[STREAM] Using fetch-based streaming instead of EventSource for React Native');
}

// Message types (aligned with existing MessageThread)
export interface Message {
  message_id: string;
  thread_id: string;
  type: 'user' | 'assistant' | 'system' | 'cost' | 'summary' | 'status';
  is_llm_message: boolean;
  content: string | Record<string, any>;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Thread {
  thread_id: string;
  project_id: string;
  account_id: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  agent_id: string | null;
  metadata: Record<string, any>;
}

export interface AgentRun {
  id: string;
  thread_id: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  model_name: string;
  created_at: string;
  updated_at: string;
}

export interface ParsedContent {
  type: 'tool_call' | 'text';
  name?: string;
  content: string;
  [key: string]: any;
}

// Error classes
export class NoAccessTokenAvailableError extends Error {
  constructor() {
    super('No access token available');
    this.name = 'NoAccessTokenAvailableError';
  }
}

export class BillingError extends Error {
  public status: number;
  public detail: { message: string };

  constructor(status: number, detail: { message: string }, message?: string) {
    super(message || detail.message);
    this.name = 'BillingError';
    this.status = status;
    this.detail = detail;
  }
}

// Active streams management
const activeStreams = new Map<string, EventSource>();
const activePollingStreams = new Map<string, () => void>(); // Track polling cleanup functions
const nonRunningAgentRuns = new Set<string>();

// Polling-based streaming for React Native (fetch streaming doesn't work reliably)
const setupPollingStream = async (
  agentRunId: string,
  threadId: string,
  callbacks: {
    onMessage: (content: string) => void;
    onError: (error: Error | string) => void;
    onClose: () => void;
  }
): Promise<() => void> => {
  
  return new Promise(async (resolve) => {
    let isActive = true;
    let lastMessageId: string | null = null;
    let lastCheckedAt = Date.now();
    let pollInterval: NodeJS.Timeout | null = null;
    let statusCheckInterval: NodeJS.Timeout | null = null;
    let startTime = Date.now();
    const MAX_POLLING_DURATION = 5 * 60 * 1000; // Stop after 5 minutes
    const STUCK_DETECTION_TIME = 30 * 1000; // Consider stuck if no NEW messages for 30 seconds after baseline
    let lastNewMessageTime: number | null = null; // Track when we last saw a NEW message (after baseline)
    
    const cleanup = () => {
      isActive = false;
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
        statusCheckInterval = null;
      }
      activePollingStreams.delete(agentRunId);
      console.log(`[POLL-STREAM] Cleaned up polling for ${agentRunId}`);
    };

    console.log(`[POLL-STREAM] Starting polling for agent run: ${agentRunId}, thread: ${threadId}`);
    
    const pollMessages = async () => {
      // Double-check isActive at the very start - might have been set to false during async operations
      if (!isActive) {
        console.log(`[POLL-STREAM] Poll messages called but stream is inactive, ignoring`);
        return;
      }
      
      try {
        // Fetch new messages from the thread
        const messages = await getMessages(threadId);
        
        // Check again after async operation - cleanup might have happened during fetch
        if (!isActive) {
          console.log(`[POLL-STREAM] Stream became inactive during message fetch, aborting`);
          return;
        }
        
        console.log(`[POLL-STREAM] Polled messages: ${messages.length}, lastMessageId: ${lastMessageId}`);
        
        // Find messages we haven't seen yet
        let newMessages: typeof messages = [];
        
        if (!lastMessageId) {
          // First poll - emit all existing messages to ensure UI is in sync
          // This handles cases where optimistic updates were lost or messages exist before polling starts
          if (messages.length > 0) {
            console.log(`[POLL-STREAM] First poll - emitting ${messages.length} existing messages`);
            // Emit all existing messages on first poll
            newMessages = messages;
            // Note: lastMessageId will be set after processing these messages in the loop below
            // Set baseline time - after this, we'll track new messages
            lastNewMessageTime = Date.now();
          } else {
            console.log(`[POLL-STREAM] First poll - no messages found`);
            newMessages = [];
            // No messages yet - start tracking from now
            lastNewMessageTime = Date.now();
          }
        } else {
          // Find the index of the last message we've seen
          const lastMessageIndex = messages.findIndex(m => (m.message_id || (m as any).id) === lastMessageId);
          
          if (lastMessageIndex === -1) {
            // Last message not found - might have been cleared, get all new messages
            console.log(`[POLL-STREAM] Last message ${lastMessageId} not found, getting all messages`);
            newMessages = messages;
            if (messages.length > 0) {
              const lastMsg = messages[messages.length - 1];
              lastMessageId = lastMsg.message_id || (lastMsg as any).id || null;
            }
          } else {
            // Get all messages after the last one we've seen
            newMessages = messages.slice(lastMessageIndex + 1);
            console.log(`[POLL-STREAM] Found ${newMessages.length} new messages after index ${lastMessageIndex}`);
          }
        }
        
        // Process new messages
        for (const message of newMessages) {
          if (!isActive) break;
          
          // Update last seen message ID to the latest one we're processing
          lastMessageId = message.message_id || (message as any).id || null;
          lastNewMessageTime = Date.now(); // Reset stuck detection
          
          // Convert message to SSE format for compatibility with existing handlers
          // The stream handler expects: content and metadata as JSON strings that parse to objects
          try {
            // Extract actual content text from the message
            let contentText = '';
            let contentObj: any = {};
            
            if (typeof message.content === 'string') {
              try {
                const parsed = JSON.parse(message.content);
                // Handle different content structures:
                // - {"role": "assistant", "content": "text"} (from DB)
                // - {"content": "text"} (our format)
                // - "text" (plain string)
                contentText = parsed.content || parsed.text || message.content;
                contentObj = parsed; // Preserve the structure for assistant messages
              } catch {
                contentText = message.content;
                contentObj = { content: message.content };
              }
            } else if (typeof message.content === 'object') {
              // Already an object - extract text and preserve structure
              contentText = message.content.content || message.content.text || JSON.stringify(message.content);
              contentObj = message.content;
            } else {
              contentText = String(message.content || '');
              contentObj = { content: contentText };
            }
            
            // Handle different message types and their content structures
            if (message.type === 'assistant' && contentObj.role === 'assistant') {
              // Standard assistant message: {"role": "assistant", "content": "text"}
              contentText = contentObj.content || contentText;
              contentObj = { content: contentText };
            } else if (message.type === 'llm_response_end') {
              // llm_response_end messages have nested structure: {choices: [{message: {role: "assistant", content: "text"}}]}
              // Extract the assistant content from the nested structure
              if (contentObj.choices && Array.isArray(contentObj.choices) && contentObj.choices.length > 0) {
                const firstChoice = contentObj.choices[0];
                if (firstChoice.message && firstChoice.message.content) {
                  contentText = firstChoice.message.content;
                  contentObj = { content: contentText };
                  // Convert llm_response_end to assistant type for display
                  message.type = 'assistant' as any;
                  console.log(`[POLL-STREAM] Converted llm_response_end to assistant, extracted content: ${contentText.substring(0, 50)}...`);
                }
              }
            }
            
            // Format content as JSON string: '{"content": "actual text"}'
            const contentJson = JSON.stringify(contentObj);
            
            // Format metadata as JSON string: '{"stream_status": "complete"}'
            const metadataObj: any = message.metadata || {};
            // Mark as complete since we're fetching finished messages from DB
            // All message types should be marked complete when fetched from DB
            metadataObj.stream_status = 'complete';
            const metadataJson = JSON.stringify(metadataObj);
            
            const messageData = {
              type: message.type,
              content: contentJson, // JSON string that parses to { content: "text" }
              metadata: metadataJson, // JSON string that parses to { stream_status: "complete" }
              message_id: message.message_id || (message as any).id,
              thread_id: message.thread_id,
              created_at: message.created_at,
            };
            
            // Format as SSE data line (the handler expects the full "data: " line)
            const sseLine = `data: ${JSON.stringify(messageData)}\n\n`;
            console.log(`[POLL-STREAM] Sending message: ${message.message_id}, type: ${message.type}`);
            console.log(`[POLL-STREAM] Content text (first 100 chars):`, contentText.substring(0, 100));
            console.log(`[POLL-STREAM] Content JSON:`, contentJson);
            console.log(`[POLL-STREAM] Full message data:`, JSON.stringify(messageData));
            callbacks.onMessage(sseLine);
            console.log(`[POLL-STREAM] Message sent to callback`);
          } catch (error) {
            console.error(`[POLL-STREAM] Error processing message:`, error);
            console.error(`[POLL-STREAM] Message that failed:`, JSON.stringify(message).substring(0, 500));
          }
        }
        
        if (newMessages.length === 0) {
          const timeSinceStart = Date.now() - startTime;
          const timeSinceLastNewMessage = lastNewMessageTime ? Date.now() - lastNewMessageTime : timeSinceStart;
          
          // Check if the agent has already responded by looking for assistant/llm_response_end messages
          // If any exist in the thread, the agent has responded (even if user sent another message after)
          const hasResponse = messages.some(msg => 
            msg.type === 'assistant' || msg.type === 'llm_response_end'
          );
          const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
          const lastMessageIsResponse = lastMessage && (
            lastMessage.type === 'assistant' || 
            lastMessage.type === 'llm_response_end'
          );
          
          // If we have a response and no new messages for a while, consider it complete
          if (hasResponse && lastMessageId && timeSinceLastNewMessage > 5 * 1000) {
            // 5 seconds after the last message with no new activity - agent completed
            console.log(`[POLL-STREAM] Agent has completed response (found ${messages.filter(m => m.type === 'assistant' || m.type === 'llm_response_end').length} response message(s)), stopping polling gracefully`);
            cleanup();
            callbacks.onClose();
            return;
          }
          
          // Check if we've been polling too long (absolute maximum)
          if (timeSinceStart > MAX_POLLING_DURATION) {
            console.log(`[POLL-STREAM] Stopping polling after ${Math.round(timeSinceStart / 1000)}s - max duration exceeded`);
            callbacks.onError('Agent response timeout - polling stopped after 5 minutes');
            cleanup();
            callbacks.onClose();
            return;
          }
          
          // Check if agent appears stuck (no NEW messages for 30 seconds after baseline was set)
          // Only check if we have a baseline (lastMessageId) and have been tracking time (lastNewMessageTime)
          // AND we don't already have a response
          if (!hasResponse && lastMessageId && lastNewMessageTime && timeSinceLastNewMessage > STUCK_DETECTION_TIME) {
            // Double-check isActive before cleanup - might have been cleaned up by another path
            if (!isActive) {
              console.log(`[POLL-STREAM] Stream already inactive, skipping stuck detection cleanup`);
              return;
            }
            
            console.log(`[POLL-STREAM] Agent appears stuck - no new messages for ${Math.round(timeSinceLastNewMessage / 1000)}s (total polling: ${Math.round(timeSinceStart / 1000)}s)`);
            console.log(`[POLL-STREAM] Stopping polling - agent is stuck`);
            
            // Set isActive to false FIRST to prevent any queued intervals from running
            isActive = false;
            
            // Clear intervals immediately
            if (pollInterval) {
              clearInterval(pollInterval);
              pollInterval = null;
            }
            if (statusCheckInterval) {
              clearInterval(statusCheckInterval);
              statusCheckInterval = null;
            }
            
            callbacks.onError(`Agent appears stuck - no response after ${Math.round(timeSinceLastNewMessage / 1000)} seconds`);
            activePollingStreams.delete(agentRunId);
            console.log(`[POLL-STREAM] Cleaned up polling for ${agentRunId}`);
            callbacks.onClose();
            return;
          }
          
          // Only log every 10 polls to reduce noise (every ~10 seconds)
          const pollCount = Math.floor(timeSinceStart / 1000);
          if (pollCount % 10 === 0 && pollCount > 0) {
            console.log(`[POLL-STREAM] No new messages (total: ${messages.length}, last seen: ${lastMessageId}, polling for ${pollCount}s, last new: ${lastNewMessageTime ? Math.round(timeSinceLastNewMessage / 1000) + 's ago' : 'never'})`);
          }
        }
        
        lastCheckedAt = Date.now();
      } catch (error) {
        if (!isActive) return;
        console.error(`[POLL-STREAM] Error polling messages:`, error);
        // Don't call onError for polling errors - keep trying
      }
    };
    
    const checkAgentStatus = async () => {
      // Double-check isActive at the very start
      if (!isActive) {
        console.log(`[POLL-STREAM] Status check called but stream is inactive, ignoring`);
        return;
      }
      
      // If agent is already marked as non-running, skip status check
      if (nonRunningAgentRuns.has(agentRunId)) {
        console.log(`[POLL-STREAM] Agent run ${agentRunId} is non-running, skipping status check`);
        return;
      }
      
      try {
        const status = await getAgentStatus(agentRunId);
        
        // Check again after async operation
        if (!isActive) {
          console.log(`[POLL-STREAM] Stream became inactive during status check, aborting`);
          return;
        }
        
        // Stuck detection is handled in pollMessages - no need to duplicate here
        // Just check if agent completed/failed
        
        if (status.status === 'completed' || status.status === 'failed' || status.status === 'error') {
          console.log(`[POLL-STREAM] Agent run ${agentRunId} finished with status: ${status.status}`);
          
          // Do one final poll to get any remaining messages
          await pollMessages();
          
          if (status.error) {
            callbacks.onError(status.error);
          } else {
            // Send completion message
            callbacks.onMessage(`data: ${JSON.stringify({ type: 'status', status: 'completed' })}\n\n`);
          }
          
          cleanup();
          callbacks.onClose();
        }
      } catch (error) {
        if (!isActive) return;
        
        // Handle "agent not running" errors gracefully - this is expected when agent completes
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('is not running') || errorMessage.includes('non-running')) {
          console.log(`[POLL-STREAM] Agent run ${agentRunId} is no longer running, stopping status checks`);
          // Mark as non-running to skip future status checks
          nonRunningAgentRuns.add(agentRunId);
          return;
        }
        
        console.error(`[POLL-STREAM] Error checking agent status:`, error);
      }
    };
    
    // Start polling immediately
    await pollMessages();
    
    // Poll for new messages every 1 second (reduced from 500ms to save resources)
    pollInterval = setInterval(pollMessages, 1000);
    
    // Check agent status every 3 seconds (reduced frequency)
    statusCheckInterval = setInterval(checkAgentStatus, 3000);
    
    resolve(cleanup);
  });
};

// SSE streaming helper
export const fetchSSE = async (url: string): Promise<ReadableStream<string>> => {
  const response = await fetch(url, {
    headers: {
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const stream = new ReadableStream({
    start(controller) {
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      function pump(): Promise<void> {
        return reader!.read().then(({ done, value }) => {
          if (done) {
            controller.close();
            return;
          }

          const chunk = decoder.decode(value);
          controller.enqueue(chunk);
          return pump();
        });
      }

      return pump();
    },
  });

  return stream;
};

// Streaming query helper
const streamedQuery = <T>(streamPromise: Promise<ReadableStream<string>>): Promise<T[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      const stream = await streamPromise;
      const reader = stream.getReader();
      const results: T[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Parse SSE data
        const lines = value.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              results.push(data);
            } catch (e) {
              // Skip malformed JSON
            }
          }
        }
      }

      resolve(results);
    } catch (error) {
      reject(error);
    }
  });
};

// Chat queries following your guidelines
export const useChat = (sessionId: string) => {
  return useQuery({
    ...createStreamingQuery(
      ['chat', 'messages'],
      () => streamedQuery<Message>(fetchSSE(`/api/chat/${sessionId}/stream`)),
      sessionId
    ),
    enabled: !!sessionId,
  });
};

// Regular chat session query (persisted)
export const useChatSession = (sessionId: string) => {
  return useQuery({
    queryKey: ['chat', 'session', sessionId],
    queryFn: async (): Promise<ChatSession> => {
      const response = await fetch(`/api/chat/sessions/${sessionId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch chat session');
      }
      return response.json();
    },
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes for session data
  });
};

// Chat sessions list (persisted)
export const useChatSessions = () => {
  return useQuery({
    queryKey: ['chat', 'sessions'],
    queryFn: async (): Promise<ChatSession[]> => {
      const response = await fetch('/api/chat/sessions');
      if (!response.ok) {
        throw new Error('Failed to fetch chat sessions');
      }
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Send message mutation
export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, message }: { sessionId: string; message: string }) => {
      const response = await fetch(`/api/chat/${sessionId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      return response.json();
    },
    onSuccess: (_, { sessionId }) => {
      // Invalidate chat queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['chat', 'messages', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['chat', 'session', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['chat', 'sessions'] });
    },
  });
};

// Create new chat session
export const useCreateChatSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ title }: { title?: string } = {}): Promise<ChatSession> => {
      const response = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: title || 'New Chat' }),
      });

      if (!response.ok) {
        throw new Error('Failed to create chat session');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate sessions list
      queryClient.invalidateQueries({ queryKey: ['chat', 'sessions'] });
    },
  });
};

// Delete chat session
export const useDeleteChatSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/chat/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete chat session');
      }
    },
    onSuccess: (_, sessionId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ['chat', 'messages', sessionId] });
      queryClient.removeQueries({ queryKey: ['chat', 'session', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['chat', 'sessions'] });
    },
  });
};

// API Functions
export const addUserMessage = async (
  threadId: string,
  content: string,
): Promise<void> => {
  try {
    const supabase = createSupabaseClient();

    // Check auth
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      throw new Error('User not authenticated');
    }

    const message = {
      role: 'user',
      content: content,
    };

    const { error } = await supabase.from('messages').insert({
      thread_id: threadId,
      type: 'user',
      is_llm_message: true,
      content: JSON.stringify(message),
    });

    if (error) {
      console.error('Error adding user message:', error);
      handleApiError(error, { operation: 'add message', resource: 'message' });
      throw new Error(`Error adding message: ${error.message}`);
    }
  } catch (error) {
    console.error('Failed to add user message:', error);
    throw error;
  }
};

export const getMessages = async (threadId: string): Promise<Message[]> => {
  try {
    const supabase = createSupabaseClient();

    // Check auth
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      console.log('[API] No user logged in for messages');
      return [];
    }

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('thread_id', threadId)
      .neq('type', 'cost')
      .neq('type', 'summary')
      .neq('type', 'status') // Filter out status messages
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      handleApiError(error, { operation: 'load messages', resource: `messages for thread ${threadId}` });
      throw new Error(`Error getting messages: ${error.message}`);
    }

    console.log(`[API] Messages fetched: ${data?.length || 0} for thread ${threadId}`);
    if (data && data.length > 0) {
      const messageTypes = data.map(m => m.type).join(', ');
      console.log(`[API] Message types found: ${messageTypes}`);
      // Log any llm_response_end messages
      const llmMessages = data.filter(m => m.type === 'llm_response_end');
      if (llmMessages.length > 0) {
        console.log(`[API] Found ${llmMessages.length} llm_response_end message(s)`);
      }
    }
    return data || [];
  } catch (error) {
    console.error('Failed to get messages:', error);
    throw error;
  }
};

export const getThreadForProject = async (projectId: string): Promise<Thread | null> => {
  try {
    const supabase = createSupabaseClient();

    // Check auth
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      console.log('[API] No user logged in for thread');
      return null;
    }

    const { data, error } = await supabase
      .from('threads')
      .select('*')
      .eq('project_id', projectId)
      .eq('account_id', userData.user.id) // Filter by user's account
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No thread found, this is ok
        return null;
      }
      console.error('Error fetching thread:', error);
      handleApiError(error, { operation: 'load thread', resource: `thread for project ${projectId}` });
      throw new Error(`Error getting thread: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Failed to get thread:', error);
    throw error;
  }
};

export const createThreadForProject = async (projectId: string): Promise<Thread> => {
  try {
    const supabase = createSupabaseClient();

    // Check auth
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('threads')
      .insert({
        project_id: projectId,
        account_id: userData.user.id, // Set the account_id for RLS
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating thread:', error);
      handleApiError(error, { operation: 'create thread', resource: 'thread' });
      throw new Error(`Error creating thread: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Failed to create thread:', error);
    throw error;
  }
};

export const startAgent = async (
  threadId: string,
  options?: {
    model_name?: string;
    enable_thinking?: boolean;
    reasoning_effort?: string;
    stream?: boolean;
    agent_id?: string;
  },
): Promise<{ agent_run_id: string }> => {
  try {
    const supabase = createSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new NoAccessTokenAvailableError();
    }

    if (!SERVER_URL) {
      throw new Error(
        'Backend URL is not configured. Set EXPO_PUBLIC_SERVER_URL in your environment.',
      );
    }

    console.log(`[API] Starting agent for thread ${threadId}`);

    const defaultOptions = {
      model_name: 'claude-sonnet-4',
      enable_thinking: false,
      reasoning_effort: 'low',
      stream: true,
      agent_id: undefined,
    };

    const finalOptions = { ...defaultOptions, ...options };

    const body: any = {
      model_name: finalOptions.model_name,
      enable_thinking: finalOptions.enable_thinking,
      reasoning_effort: finalOptions.reasoning_effort,
      stream: finalOptions.stream,
    };
    
    if (finalOptions.agent_id) {
      body.agent_id = finalOptions.agent_id;
    }

    const response = await fetch(`${SERVER_URL}/thread/${threadId}/agent/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 402) {
        try {
          const errorData = await response.json();
          console.error(`[API] Billing error starting agent (402):`, errorData);
          const detail = errorData?.detail || { message: 'Payment Required' };
          if (typeof detail.message !== 'string') {
            detail.message = 'Payment Required';
          }
          throw new BillingError(response.status, detail);
        } catch (parseError) {
          console.error('[API] Could not parse 402 error response body:', parseError);
          throw new BillingError(
            response.status,
            { message: 'Payment Required' },
            `Error starting agent: ${response.statusText} (402)`,
          );
        }
      }

      const errorText = await response.text().catch(() => 'No error details available');
      console.error(`[API] Error starting agent: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Error starting agent: ${response.statusText} (${response.status})`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    if (error instanceof BillingError || error instanceof NoAccessTokenAvailableError) {
      throw error;
    }

    console.error('[API] Failed to start agent:', error);
    
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      const networkError = new Error(
        `Cannot connect to backend server. Please check your internet connection and make sure the backend is running.`,
      );
      handleApiError(networkError, { operation: 'start agent', resource: 'AI assistant' });
      throw networkError;
    }

    handleApiError(error, { operation: 'start agent', resource: 'AI assistant' });
    throw error;
  }
};

export const stopAgent = async (agentRunId: string): Promise<void> => {
  nonRunningAgentRuns.add(agentRunId);

  const existingStream = activeStreams.get(agentRunId);
  if (existingStream) {
    console.log(`[API] Closing existing stream for ${agentRunId}`);
    existingStream.close();
    activeStreams.delete(agentRunId);
  }

  try {
    const supabase = createSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      const authError = new NoAccessTokenAvailableError();
      handleApiError(authError, { operation: 'stop agent', resource: 'AI assistant' });
      throw authError;
    }

    const response = await fetch(`${SERVER_URL}/agent-run/${agentRunId}/stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      const stopError = new Error(`Error stopping agent: ${response.statusText}`);
      handleApiError(stopError, { operation: 'stop agent', resource: 'AI assistant' });
      throw stopError;
    }
  } catch (error) {
    console.error('Failed to stop agent:', error);
    throw error;
  }
};

export const getAgentStatus = async (agentRunId: string): Promise<AgentRun> => {
  console.log(`[API] Requesting agent status for ${agentRunId}`);

  if (nonRunningAgentRuns.has(agentRunId)) {
    console.log(`[API] Agent run ${agentRunId} is known to be non-running`);
    throw new Error(`Agent run ${agentRunId} is not running`);
  }

  try {
    const supabase = createSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      console.error('[API] No access token available for getAgentStatus');
      throw new NoAccessTokenAvailableError();
    }

    const response = await fetch(`${SERVER_URL}/agent-run/${agentRunId}`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details available');
      console.error(`[API] Error getting agent status: ${response.status} ${response.statusText}`, errorText);

      if (response.status === 404) {
        nonRunningAgentRuns.add(agentRunId);
      }

      throw new Error(`Error getting agent status: ${response.statusText} (${response.status})`);
    }

    const data = await response.json();
    console.log(`[API] Successfully got agent status:`, data);

    if (data.status !== 'running') {
      nonRunningAgentRuns.add(agentRunId);
    }

    return data;
  } catch (error) {
    console.error('[API] Failed to get agent status:', error);
    handleApiError(error, { operation: 'get agent status', resource: 'AI assistant status' });
    throw error;
  }
};

export const getAgentRuns = async (threadId: string): Promise<AgentRun[]> => {
  try {
    const supabase = createSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new NoAccessTokenAvailableError();
    }

    const response = await fetch(`${SERVER_URL}/thread/${threadId}/agent-runs`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Error getting agent runs: ${response.statusText}`);
    }

    const data = await response.json();
    return data.agent_runs || [];
  } catch (error) {
    if (error instanceof NoAccessTokenAvailableError) {
      throw error;
    }

    console.error('Failed to get agent runs:', error);
    handleApiError(error, { operation: 'load agent runs', resource: 'conversation history' });
    throw error;
  }
};

export const streamAgent = (
  agentRunId: string,
  callbacks: {
    onMessage: (content: string) => void;
    onError: (error: Error | string) => void;
    onClose: () => void;
  },
): (() => void) => {
  console.log(`[STREAM] streamAgent called for ${agentRunId}`);

  if (nonRunningAgentRuns.has(agentRunId)) {
    console.log(`[STREAM] Agent run ${agentRunId} is known to be non-running`);
    setTimeout(() => {
      callbacks.onError(`Agent run ${agentRunId} is not running`);
      callbacks.onClose();
    }, 0);
    return () => {};
  }

  const existingStream = activeStreams.get(agentRunId);
  if (existingStream) {
    console.log(`[STREAM] Stream already exists for ${agentRunId}, closing it first`);
    existingStream.close();
    activeStreams.delete(agentRunId);
  }

  // Also check for existing polling streams
  const existingPollingStream = activePollingStreams.get(agentRunId);
  if (existingPollingStream) {
    console.log(`[STREAM] Polling stream already exists for ${agentRunId}, closing it first`);
    existingPollingStream();
    activePollingStreams.delete(agentRunId);
  }

  try {
    const setupStream = async () => {
      // Check for existing polling stream BEFORE starting (prevent duplicates)
      const existingPollingStream = activePollingStreams.get(agentRunId);
      if (existingPollingStream) {
        console.log(`[STREAM] Polling stream already active for ${agentRunId}, skipping duplicate`);
        // Return the existing cleanup function so caller can still clean up if needed
        return existingPollingStream;
      }
      
      // Set placeholder IMMEDIATELY to prevent race conditions (before any async operations)
      let placeholderCleanup: (() => void) | null = null;
      const placeholder = () => {
        if (placeholderCleanup) {
          placeholderCleanup();
        }
        activePollingStreams.delete(agentRunId);
      };
      activePollingStreams.set(agentRunId, placeholder);
      console.log(`[STREAM] Set placeholder for ${agentRunId} to prevent duplicates`);
      
      try {
        const status = await getAgentStatus(agentRunId);
        if (status.status !== 'running') {
          // Clean up placeholder on error
          activePollingStreams.delete(agentRunId);
          console.log(`[STREAM] Agent run ${agentRunId} is not running (status: ${status.status})`);
          nonRunningAgentRuns.add(agentRunId);
          callbacks.onError(`Agent run ${agentRunId} is not running (status: ${status.status})`);
          callbacks.onClose();
          return;
        }
      } catch (err) {
        console.error(`[STREAM] Error verifying agent run ${agentRunId}:`, err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        const isNotFoundError = errorMessage.includes('not found') || errorMessage.includes('404');

        if (isNotFoundError) {
          console.log(`[STREAM] Agent run ${agentRunId} not found`);
          nonRunningAgentRuns.add(agentRunId);
        }

        // Clean up placeholder on error
        activePollingStreams.delete(agentRunId);
        callbacks.onError(errorMessage);
        callbacks.onClose();
        return;
      }

      const supabase = createSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();

        if (!session?.access_token) {
        // Clean up placeholder on error
        activePollingStreams.delete(agentRunId);
        const authError = new NoAccessTokenAvailableError();
        console.error('[STREAM] No auth token available');
        callbacks.onError(authError);
        callbacks.onClose();
        return;
      }

      const url = new URL(`${SERVER_URL}/agent-run/${agentRunId}/stream`);
      url.searchParams.append('token', session.access_token);

      console.log(`[STREAM] Creating EventSource for ${agentRunId}`);
      console.log(`[STREAM] Stream URL:`, url.toString());
      console.log(`[STREAM] SERVER_URL:`, SERVER_URL);
      console.log(`[STREAM] Platform:`, Platform.OS);
      console.log(`[STREAM] EventSource available:`, typeof global.EventSource !== 'undefined');
      
      // Use polling-based streaming for React Native (fetch streaming doesn't work reliably)
      if (Platform.OS !== 'web' && typeof global.EventSource === 'undefined') {
        console.log(`[STREAM] Using polling-based streaming for React Native`);
        
        // Get thread ID from agent status (use status we already fetched)
        let threadIdForPolling: string | null = null;
        try {
          // Re-use the status we already fetched, or fetch if needed
          const agentStatus = await getAgentStatus(agentRunId);
          threadIdForPolling = agentStatus.threadId;
        } catch (error) {
          // Clean up placeholder on error
          activePollingStreams.delete(agentRunId);
          console.error(`[STREAM] Failed to get thread ID for polling:`, error);
          callbacks.onError('Failed to get thread ID for polling');
          callbacks.onClose();
          return () => {};
        }
        
        if (!threadIdForPolling) {
          // Clean up placeholder on error
          activePollingStreams.delete(agentRunId);
          callbacks.onError('No thread ID available for polling');
          callbacks.onClose();
          return () => {};
        }
        
        // Placeholder already set above - now set the real cleanup function
        const pollCleanup = await setupPollingStream(agentRunId, threadIdForPolling, callbacks);
        placeholderCleanup = pollCleanup;
        activePollingStreams.set(agentRunId, pollCleanup);
        console.log(`[STREAM] Replaced placeholder with real cleanup for ${agentRunId}`);
        return pollCleanup;
      }
      
      // Use EventSource for web or if available
      const eventSource = new EventSource(url.toString());
      console.log(`[STREAM] EventSource created, readyState:`, eventSource.readyState);

      activeStreams.set(agentRunId, eventSource);

      // Set a timeout to detect connection issues
      const connectionTimeout = setTimeout(() => {
        if (eventSource.readyState === EventSource.CONNECTING) {
          console.error(`[STREAM] EventSource connection timeout for ${agentRunId}`);
          console.error(`[STREAM] Still connecting after 10 seconds - possible network/CORS issue`);
          eventSource.close();
          activeStreams.delete(agentRunId);
          callbacks.onError('Connection timeout - check network and backend availability');
          callbacks.onClose();
        }
      }, 10000); // 10 second timeout

      eventSource.onopen = () => {
        console.log(`[STREAM] Connection opened for ${agentRunId}`);
        console.log(`[STREAM] EventSource URL: ${url.toString()}`);
        console.log(`[STREAM] EventSource readyState: ${eventSource.readyState}`);
        clearTimeout(connectionTimeout);
      };

      eventSource.onmessage = (event) => {
        try {
          const rawData = event.data;
          console.log(`[STREAM] Raw EventSource data received:`, rawData);
          
          if (rawData.includes('"type":"ping"')) {
            console.log(`[STREAM] Received ping, ignoring`);
            return;
          }

          console.log(`[STREAM] Processing data for ${agentRunId}: ${rawData.substring(0, 200)}${rawData.length > 200 ? '...' : ''}`);

          if (!rawData || rawData.trim() === '') {
            console.log(`[STREAM] Empty data received, skipping`);
            return;
          }

          // Try to parse as JSON first for debugging
          try {
            const jsonData = JSON.parse(rawData);
            console.log(`[STREAM] Parsed JSON data:`, {
              type: jsonData.type,
              sequence: jsonData.sequence,
              contentPreview: typeof jsonData.content === 'string' ? jsonData.content.substring(0, 100) : jsonData.content,
              metadata: jsonData.metadata
            });
            
            if (jsonData.status === 'error') {
              console.error(`[STREAM] Error status received for ${agentRunId}:`, jsonData);
              callbacks.onError(jsonData.message || 'Unknown error occurred');
              return;
            }
          } catch (jsonError) {
            console.log(`[STREAM] Not JSON data, treating as raw:`, rawData.substring(0, 100));
          }

          // Pass all data to the callback for processing
          callbacks.onMessage(rawData);
        } catch (error) {
          console.error(`[STREAM] Error handling message:`, error);
          callbacks.onError(error instanceof Error ? error : String(error));
        }
      };

      eventSource.onerror = (event) => {
        console.error(`[STREAM] EventSource error for ${agentRunId}:`, event);
        console.log(`[STREAM] EventSource readyState: ${eventSource.readyState}`);
        console.log(`[STREAM] Event details:`, {
          type: event.type,
          target: event.target,
          currentTarget: event.currentTarget
        });
        console.error(`[STREAM] EventSource failed to connect to: ${url.toString()}`);
        clearTimeout(connectionTimeout);
        
        // If connection failed, try to get more info
        if (eventSource.readyState === EventSource.CLOSED) {
          console.error(`[STREAM] Connection closed immediately - possible CORS or network issue`);
        }

        getAgentStatus(agentRunId)
          .then((status) => {
            if (status.status !== 'running') {
              console.log(`[STREAM] Agent run ${agentRunId} is not running after error`);
              nonRunningAgentRuns.add(agentRunId);
              eventSource.close();
              activeStreams.delete(agentRunId);
              callbacks.onClose();
            }
          })
          .catch((err) => {
            console.error(`[STREAM] Error checking agent status after stream error:`, err);
            const errMsg = err instanceof Error ? err.message : String(err);
            const isNotFoundErr = errMsg.includes('not found') || errMsg.includes('404');

            if (isNotFoundErr) {
              nonRunningAgentRuns.add(agentRunId);
              eventSource.close();
              activeStreams.delete(agentRunId);
              callbacks.onClose();
            }

            callbacks.onError(errMsg);
          });
      };
    };

    setupStream();

    return () => {
      console.log(`[STREAM] Cleanup called for ${agentRunId}`);
      const stream = activeStreams.get(agentRunId);
      if (stream) {
        stream.close();
        activeStreams.delete(agentRunId);
      }
    };
  } catch (error) {
    console.error(`[STREAM] Error setting up stream for ${agentRunId}:`, error);
    callbacks.onError(error instanceof Error ? error : String(error));
    callbacks.onClose();
    return () => {};
  }
};

// Utility function to parse streaming content
export const parseStreamContent = (rawData: string): ParsedContent | null => {
  try {
    const data = JSON.parse(rawData);
    
    if (data.type === 'content' && data.content) {
      return {
        type: 'text',
        content: data.content,
      };
    }
    
    if (data.type === 'tool_call') {
      return {
        type: 'tool_call',
        name: data.tool_name || data.name,
        content: data.content || JSON.stringify(data),
        ...data,
      };
    }
    
    return null;
  } catch (error) {
    return null;
  }
};

// NEW CHAT - Initiate Agent API
export const initiateAgent = async (
  message: string,
  options?: {
    agent_id?: string;
    model_name?: string;
    enable_thinking?: boolean;
    reasoning_effort?: string;
    stream?: boolean;
    enable_context_manager?: boolean;
    files?: any[]; // Add files parameter
  }
): Promise<{ thread_id: string; agent_run_id: string }> => {
  console.log('[API] initiateAgent called with message:', message.substring(0, 50) + '...');
  console.log('[API] initiateAgent files:', options?.files?.length || 0);
  
  if (options?.files?.length) {
    console.log('[API] File details:');
    options.files.forEach((file, index) => {
      console.log(`[API] File ${index}:`, {
        name: file.name,
        localUri: file.localUri,
        type: file.type,
        size: file.size
      });
    });
  }

  const supabase = createSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new NoAccessTokenAvailableError();
  }

  const formData = new FormData();
  formData.append('prompt', message);
  formData.append('stream', String(options?.stream ?? true));
  
  if (options?.agent_id) formData.append('agent_id', options.agent_id);
  if (options?.model_name) formData.append('model_name', options.model_name);
  if (options?.enable_thinking !== undefined) formData.append('enable_thinking', String(options.enable_thinking));
  if (options?.reasoning_effort) formData.append('reasoning_effort', options.reasoning_effort);
  if (options?.enable_context_manager !== undefined) formData.append('enable_context_manager', String(options.enable_context_manager));

  // Add files to FormData if provided
  if (options?.files?.length) {
    console.log('[API] Adding files to FormData...');
    options.files.forEach((file, index) => {
      const normalizedName = file.name || file.fileName || 'unknown_file';
      console.log(`[API] Adding file ${index} to FormData:`, normalizedName);
      
      formData.append('files', {
        uri: file.localUri || file.uri,
        name: normalizedName,
        type: file.type || file.mimeType || 'application/octet-stream',
      } as any, normalizedName);
    });
    console.log('[API] All files added to FormData');
  }

  try {
    console.log('[API] Sending request to /agent/initiate...');
    
    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch(`${SERVER_URL}/agent/initiate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: formData,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    console.log('[API] Response status:', response.status);
    console.log('[API] Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries())));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API] Error response body:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    const result = await response.json();
    console.log('[API] initiateAgent success:', result);
    return result;
  } catch (error) {
    console.error('[API] initiateAgent error:', error);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - please check your network connection');
    }
    
    throw error;
  }
}; 
// ============= AGENTS & MODELS =============

export interface Agent {
  agent_id: string;
  name: string;
  description?: string;
  avatar?: string;
  avatar_color?: string;
  is_default?: boolean;
  is_public?: boolean;
}

export interface AgentsResponse {
  agents: Agent[];
  pagination?: {
    current_page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
}

export const getAgents = async (): Promise<Agent[]> => {
  try {
    const supabase = createSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new NoAccessTokenAvailableError();
    }

    const response = await fetch(`${SERVER_URL}/agents`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Error fetching agents: ${response.statusText}`);
    }

    const data: AgentsResponse = await response.json();
    console.log('[API] Fetched agents:', data.agents.length);
    return data.agents || [];
  } catch (error) {
    console.error('[API] Failed to fetch agents:', error);
    handleApiError(error, { operation: 'fetch agents', resource: 'available agents' });
    throw error;
  }
};

export interface Model {
  name: string;
  display_name: string;
  provider: string;
  description?: string;
  max_tokens?: number;
  supports_thinking?: boolean;
  supports_vision?: boolean;
}

export interface ModelsResponse {
  models: Model[];
  total: number;
}

export const getModels = async (): Promise<Model[]> => {
  try {
    const supabase = createSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new NoAccessTokenAvailableError();
    }

    const response = await fetch(`${SERVER_URL}/billing/available-models`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Error fetching models: ${response.statusText}`);
    }

    const data: ModelsResponse = await response.json();
    console.log('[API] Fetched models:', data.models.length);
    return data.models || [];
  } catch (error) {
    console.error('[API] Failed to fetch models:', error);
    handleApiError(error, { operation: 'fetch models', resource: 'available models' });
    throw error;
  }
};
