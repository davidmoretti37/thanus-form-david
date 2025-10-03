import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { VoiceAgentState, ConversationMessage } from '@/services/voice-agent/types';

interface VoiceAgentStore extends VoiceAgentState {
  // Actions
  setActive: (active: boolean) => void;
  setListening: (listening: boolean) => void;
  setSpeaking: (speaking: boolean) => void;
  setConnected: (connected: boolean) => void;
  setCurrentPage: (page: string) => void;
  addMessage: (message: ConversationMessage) => void;
  setError: (error: string | null) => void;
  clearHistory: () => void;
  reset: () => void;
}

const initialState: VoiceAgentState = {
  isActive: false,
  isListening: false,
  isSpeaking: false,
  isConnected: false,
  currentPage: '/home',
  conversationHistory: [],
  error: null,
};

export const useVoiceAgentStore = create<VoiceAgentStore>()(
  persist(
    (set) => ({
      ...initialState,

      setActive: (active) => set({ isActive: active }),
      
      setListening: (listening) => set({ isListening: listening }),
      
      setSpeaking: (speaking) => set({ isSpeaking: speaking }),
      
      setConnected: (connected) => set({ isConnected: connected }),
      
      setCurrentPage: (page) => set({ currentPage: page }),
      
      addMessage: (message) =>
        set((state) => ({
          conversationHistory: [...state.conversationHistory, message],
        })),
      
      setError: (error) => set({ error }),
      
      clearHistory: () => set({ conversationHistory: [] }),
      
      reset: () => set(initialState),
    }),
    {
      name: 'voice-agent-storage',
      partialize: (state) => ({
        conversationHistory: state.conversationHistory,
        currentPage: state.currentPage,
      }),
      skipHydration: true, // Previne hydration mismatch
    }
  )
);
