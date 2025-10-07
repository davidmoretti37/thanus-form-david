import { RealtimeAgent, RealtimeSession } from "@openai/agents/realtime";
import { agentToolExecutor, REALTIME_TOOLS } from './agent-tools';
import { useVoiceAgentStore } from '@/stores/voice-agent-store';

export class OpenAIRealtimeService {
  private static instance: OpenAIRealtimeService | null = null;
  private agent: RealtimeAgent | null = null;
  private session: RealtimeSession | null = null;
  private isConnecting = false;

  private constructor() {}

  static getInstance(): OpenAIRealtimeService {
    if (!OpenAIRealtimeService.instance) {
      OpenAIRealtimeService.instance = new OpenAIRealtimeService();
    }
    return OpenAIRealtimeService.instance;
  }

  async connect(): Promise<void> {
    // Disconnect any existing session
    if (this.session) {
      await this.disconnect();
    }

    if (this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    const store = useVoiceAgentStore.getState();

    try {
      // Fetch ephemeral key from backend
      const response = await fetch('/api/voice-agent/token');

      if (!response.ok) {
        throw new Error('Failed to fetch ephemeral key from backend');
      }

      const { clientSecret } = await response.json();

      // Create the agent with instructions and tools
      this.agent = new RealtimeAgent({
        name: "Echo",
        model: "gpt-realtime-mini-2025-10-06",
        voice: "shimmer",
        instructions: `Você é Echo, uma assistente virtual feminina especializada em guiar usuários pela aplicação Thanus.

Personalidade: Amigável, prestativa e proativa
Idioma: Português Brasileiro
Página atual: ${store.currentPage}

NAVEGAÇÃO DA APLICAÇÃO:
- "/construtor": criar novos workers/agentes personalizados
- "/agents?tab=my-agents": visualizar e gerenciar agentes criados
- "/agents?tab=marketplace": descobrir e instalar agentes prontos
- "/tasks": gerenciar tasks e workflows
- "/artefatos": visualizar artefatos gerados pelos agentes
- "/settings" e "/settings/credentials": configurações e integrações
- "/knowledge": base de conhecimento e memórias
- "/multi-computer": sala multi-agente

SUAS FUNÇÕES:
- Navegar pela aplicação quando solicitado
- Explicar funcionalidades e recursos da plataforma
- Ajudar a criar agentes no construtor através de conversa
- Responder perguntas sobre a aplicação
- Executar ações de forma eficiente

COMO CRIAR AGENTES NO /construtor:

Se o usuário pedir de forma VAGA (ex: "quero criar um agente"):
1. Pergunte UMA VEZ: "Ok! Que tipo de agente você quer criar?"
2. Após a resposta, diga: "Perfeito! Vou começar a criar o prompt para gerar seu novo agente..."
3. Navegue para /construtor se necessário
4. Use type_in_builder_chat para digitar o prompt detalhado
5. Enquanto digita, narre o que está fazendo (ex: "Estou definindo as capacidades de vendas...", "Adicionando integração com CRM...")

Se o usuário pedir de forma ESPECÍFICA (ex: "crie um agente de vendas que gerencia leads"):
1. Diga imediatamente: "Perfeito! Vou começar a criar o prompt para gerar seu agente..."
2. Navegue para /construtor se necessário
3. Use type_in_builder_chat para criar o agente
4. Narre enquanto digita

REGRAS IMPORTANTES:
- Se o pedido é claro, CRIE IMEDIATAMENTE sem fazer perguntas extras
- Se o pedido é vago, pergunte APENAS uma vez que tipo de agente deseja
- NUNCA faça múltiplas perguntas em sequência
- NUNCA peça confirmação depois de já ter entendido
- NUNCA sugira agentes ao apenas navegar para /construtor sem pedido
- Sempre narre enquanto digita (seja educativa)
- NÃO use type_in_builder_chat apenas ao navegar para /construtor
- Deixe o usuário revisar o texto antes de enviar (não envie automaticamente)

Seja uma assistente de ação: menos perguntas, mais execução. Quando o usuário pede algo claro, execute imediatamente.
Sempre use as ferramentas disponíveis para navegar e executar ações.`,
        tools: REALTIME_TOOLS,
      });

      // Create session (uses WebRTC by default with ephemeral keys)
      this.session = new RealtimeSession(this.agent);

      // Set up event listeners before connecting
      this.setupEventListeners();

      // Connect with ephemeral key (automatically connects microphone and audio output)
      await this.session.connect({ apiKey: clientSecret });

      store.setConnected(true);
      this.isConnecting = false;
    } catch (error: any) {
      console.error('❌ Failed to connect:', error);
      store.setError('Falha ao conectar com OpenAI');
      store.setConnected(false);
      this.isConnecting = false;
      throw error;
    }
  }

  private setupEventListeners(): void {
    if (!this.session) return;

    const store = useVoiceAgentStore.getState();

    // Transcription events
    this.session.on('transcription', (data: any) => {
      if (data.role === 'user') {
        store.addMessage({
          role: 'user',
          content: data.text,
          timestamp: Date.now(),
        });
      } else if (data.role === 'assistant') {
        store.addMessage({
          role: 'assistant',
          content: data.text,
          timestamp: Date.now(),
        });
      }
    });

    // Voice activity detection
    this.session.on('speech_started', () => {
      store.setListening(true);
    });

    this.session.on('speech_stopped', () => {
      store.setListening(false);
    });

    // Audio playback state
    this.session.on('audio_started', () => {
      store.setSpeaking(true);
    });

    this.session.on('audio_stopped', () => {
      store.setSpeaking(false);
    });

    // Error handling
    this.session.on('error', (error: any) => {
      console.error('❌ Realtime error:', error);
      store.setError(error?.message || 'Erro desconhecido');
    });

    // Connection state
    this.session.on('disconnect', (event: any) => {
      store.setConnected(false);
      store.setActive(false);

      if (event?.error) {
        store.setError('Conexão perdida. Toque no orbe para reconectar.');
      }
    });
  }

  async disconnect(): Promise<void> {
    if (this.session) {
      await this.session.disconnect();
      this.session = null;
    }

    this.agent = null;

    const store = useVoiceAgentStore.getState();
    store.setConnected(false);
    store.setActive(false);
  }
}

// Export singleton instance
export const openAIRealtimeService = OpenAIRealtimeService.getInstance();
