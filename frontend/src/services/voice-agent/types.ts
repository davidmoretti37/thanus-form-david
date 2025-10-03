export interface VoiceAgentState {
  isActive: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isConnected: boolean;
  currentPage: string;
  conversationHistory: ConversationMessage[];
  error: string | null;
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface NavigationTool {
  name: 'navigate';
  parameters: {
    path: string;
    description: string;
  };
}

export interface DescribeUITool {
  name: 'describe_ui';
  parameters: {
    element: string;
  };
}

export type AgentTool = NavigationTool | DescribeUITool;

export interface OpenAIRealtimeConfig {
  model: string;
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  instructions: string;
  tools: AgentTool[];
}
