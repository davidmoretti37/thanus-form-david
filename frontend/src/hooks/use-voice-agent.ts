import { useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useVoiceAgentStore } from '@/stores/voice-agent-store';
import { openAIRealtimeService } from '@/services/voice-agent/openai-realtime';
import { agentToolExecutor } from '@/services/voice-agent/agent-tools';

export function useVoiceAgent() {
  const router = useRouter();
  const pathname = usePathname();
  const store = useVoiceAgentStore();

  // Hydrate store on mount
  useEffect(() => {
    useVoiceAgentStore.persist.rehydrate();
  }, []);

  // Atualiza o router no executor de tools
  useEffect(() => {
    agentToolExecutor.setRouter(router);
  }, [router]);

  // Atualiza a página atual no store quando navegar
  useEffect(() => {
    store.setCurrentPage(pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const startAgent = useCallback(async (apiKey: string) => {
    try {
      store.setActive(true);
      store.setError(null);
      
      await openAIRealtimeService.connect(apiKey);
      
      console.log('✅ Voice agent started successfully');
    } catch (error: any) {
      console.error('❌ Failed to start voice agent:', error);
      store.setError(error.message || 'Falha ao iniciar agente de voz');
      store.setActive(false);
    }
  }, [store]);

  const stopAgent = useCallback(async () => {
    try {
      await openAIRealtimeService.disconnect();
      store.setActive(false);
      console.log('Voice agent stopped');
    } catch (error) {
      console.error('Failed to stop voice agent:', error);
    }
  }, [store]);

  const toggleAgent = useCallback(async (apiKey: string) => {
    if (store.isActive) {
      await stopAgent();
    } else {
      await startAgent(apiKey);
    }
  }, [store.isActive, startAgent, stopAgent]);

  return {
    isActive: store.isActive,
    isListening: store.isListening,
    isSpeaking: store.isSpeaking,
    isConnected: store.isConnected,
    error: store.error,
    conversationHistory: store.conversationHistory,
    startAgent,
    stopAgent,
    toggleAgent,
  };
}
