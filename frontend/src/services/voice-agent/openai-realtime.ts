import { agentToolExecutor, AGENT_TOOLS } from './agent-tools';
import { useVoiceAgentStore } from '@/stores/voice-agent-store';

const OPENAI_REALTIME_API_URL = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17';

export class OpenAIRealtimeService {
  private static instance: OpenAIRealtimeService | null = null;
  private ws: WebSocket | null = null;
  private isConnecting = false;
  private audioContext: AudioContext | null = null;
  private audioQueue: AudioBufferSourceNode[] = [];
  private mediaStream: MediaStream | null = null;
  private audioProcessor: ScriptProcessorNode | null = null;
  private pendingAudioBuffers: AudioBuffer[] = [];
  private currentPlaybackSource: AudioBufferSourceNode | null = null;

  private constructor() {}

  static getInstance(): OpenAIRealtimeService {
    if (!OpenAIRealtimeService.instance) {
      OpenAIRealtimeService.instance = new OpenAIRealtimeService();
    }
    return OpenAIRealtimeService.instance;
  }

  async connect(apiKey: string): Promise<void> {
    // Desconecta qualquer conexão anterior
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('⚠️ Already connected, disconnecting first...');
      await this.disconnect();
    }

    if (this.isConnecting) {
      console.log('⚠️ Already connecting, please wait');
      return;
    }

    this.isConnecting = true;
    const store = useVoiceAgentStore.getState();

    try {
      // Conecta usando o formato correto da OpenAI Realtime API
      // O header de autenticação é passado como um subprotocolo especial
      const url = OPENAI_REALTIME_API_URL;
      
      console.log('Connecting to OpenAI Realtime API...');
      this.ws = new WebSocket(url, [
        'realtime',
        `openai-insecure-api-key.${apiKey}`,
        'openai-beta.realtime-v1'
      ]);

      this.ws.onopen = async () => {
        console.log('✅ Connected to OpenAI Realtime API');
        store.setConnected(true);
        this.isConnecting = false;

        // Configura a sessão
        await this.sendSessionUpdate();
        
        // Inicia captura de áudio
        await this.initializeAudio();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data));
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        store.setError('Erro na conexão com OpenAI. Verifique a API key.');
        this.isConnecting = false;
      };

      this.ws.onclose = (event) => {
        console.log(`🔌 Disconnected from OpenAI (Code: ${event.code}, Reason: ${event.reason})`);
        const wasConnected = store.isConnected || store.isActive;

        store.setConnected(false);
        this.isConnecting = false;
        store.setActive(false);

        if (event.code === 1000) {
          store.setError(null);
          return;
        }

        if (!wasConnected) {
          store.setError(null);
          return;
        }

        const message = this.describeCloseEvent(event);
        store.setError(message);
      };
    } catch (error) {
      console.error('Failed to connect:', error);
      store.setError('Falha ao conectar com OpenAI');
      this.isConnecting = false;
      throw error;
    }
  }

  private async initializeAudio(): Promise<void> {
    try {
      // Para qualquer stream anterior
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
      }

      // Cria AudioContext se não existir
      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new AudioContext({ sampleRate: 24000 });
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 24000,
        },
      });

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.audioProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.audioProcessor.onaudioprocess = (e) => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);
        
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        const base64 = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));

        this.ws.send(JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: base64,
        }));

        const outputData = e.outputBuffer.getChannelData(0);
        outputData.fill(0);
      };

      source.connect(this.audioProcessor);
      this.audioProcessor.connect(this.audioContext.destination);

      console.log('✅ Audio initialized (single instance)');
    } catch (error) {
      console.error('❌ Failed to initialize audio:', error);
      throw error;
    }
  }

  private sendSessionUpdate(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const store = useVoiceAgentStore.getState();

    this.ws.send(
      JSON.stringify({
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          voice: 'shimmer', // Voz feminina
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          input_audio_transcription: {
            model: 'whisper-1',
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500,
          },
          instructions: `Você é Echo, uma assistente virtual feminina especializada em guiar usuários pela aplicação.

Personalidade: Amigável, prestativa e proativa
Idioma: Português Brasileiro
Página atual: ${store.currentPage}

Navegação importante:
- "/construtor": criar novos workers/agentes personalizados
- "/agents?tab=my-agents" (My Agents): visualizar e gerenciar agentes existentes
- "/agents?tab=marketplace" (Marketplace): descobrir, comprar e instalar agentes poderosos
- "/tasks": gerenciar tasks e workflows
- "/artefatos": acompanhar artefatos gerados
- "/settings" e "/settings/credentials": configurar integrações e credenciais

Suas funções:
- Guiar usuários pela interface
- Explicar funcionalidades de forma simples
- Navegar automaticamente quando solicitado usando os caminhos corretos
- Responder perguntas sobre a aplicação

Sempre use as ferramentas disponíveis para navegar e mostrar recursos, garantindo que o usuário chegue à página correta.`,
          tools: AGENT_TOOLS,
          tool_choice: 'auto',
        },
      })
    );
  }


  private describeCloseEvent(event: CloseEvent): string {
    if (event.reason) {
      return `Conexão encerrada: ${event.reason}`;
    }

    switch (event.code) {
      case 1001:
        return 'Conexão encerrada porque a aba foi fechada ou a navegação mudou.';
      case 1006:
        return 'A sessão com a OpenAI foi encerrada automaticamente (tempo limite ou instabilidade). Toque no orbe para reconectar.';
      case 1011:
        return 'A OpenAI sinalizou uma falha interna. Tente reconectar em instantes.';
      default:
        return `Conexão encerrada (código ${event.code}). Toque no orbe para iniciar novamente.`;
    }
  }

  private async handleMessage(message: any): Promise<void> {
    const store = useVoiceAgentStore.getState();

    switch (message.type) {
      case 'response.audio.delta':
        // Reproduz áudio recebido
        if (message.delta) {
          store.setSpeaking(true);
          await this.playAudioChunk(message.delta);
        }
        break;

      case 'response.audio.done':
        store.setSpeaking(false);
        console.log('🔊 Audio playback completed');
        break;

      case 'response.audio_transcript.delta':
        // Atualiza transcrição
        console.log('Assistant:', message.delta);
        break;

      case 'response.audio_transcript.done':
        // Salva mensagem completa no histórico
        store.addMessage({
          role: 'assistant',
          content: message.transcript,
          timestamp: Date.now(),
        });
        break;

      case 'input_audio_buffer.speech_started':
        store.setListening(true);
        console.log('🎤 User started speaking');
        break;

      case 'input_audio_buffer.speech_stopped':
        store.setListening(false);
        console.log('🎤 User stopped speaking');
        break;

      case 'conversation.item.input_audio_transcription.completed':
        // Salva transcrição do usuário
        store.addMessage({
          role: 'user',
          content: message.transcript,
          timestamp: Date.now(),
        });
        break;

      case 'response.function_call_arguments.done':
        // Executa função chamada pelo agente
        await this.executeFunctionCall(
          message.name,
          JSON.parse(message.arguments),
          message.call_id
        );
        break;

      case 'response.done':
        store.setSpeaking(false);
        break;

      case 'error':
        console.error('❌ OpenAI Error Details:', JSON.stringify(message.error, null, 2));
        const errorMsg = message.error?.message || message.error?.type || 'Erro desconhecido';
        store.setError(`OpenAI Error: ${errorMsg}`);
        break;

      default:
        // Log outros tipos de mensagem para debug
        if (process.env.NODE_ENV === 'development') {
          console.log('Received message:', message.type);
        }
    }
  }

  private async executeFunctionCall(functionName: string, args: any, callId?: string): Promise<void> {
    console.log('🔧 Executing function:', functionName, args);

    try {
      const result = await agentToolExecutor.executeTool(functionName, args);
      console.log('✅ Function result:', result);

      // Envia resultado de volta no formato correto
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(
          JSON.stringify({
            type: 'response.create',
            response: {
              modalities: ['text', 'audio'],
              instructions: `Resultado da função ${functionName}: ${result}. Continue a conversa normalmente baseado nesse resultado.`,
            }
          })
        );
      }
    } catch (error) {
      console.error('❌ Function execution error:', error);
    }
  }

  private async playAudioChunk(base64Audio: string): Promise<void> {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      console.error('❌ AudioContext not initialized');
      return;
    }

    try {
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);

      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 0x8000;
      }

      const audioBuffer = this.audioContext.createBuffer(1, float32Array.length, 24000);
      audioBuffer.getChannelData(0).set(float32Array);

      this.enqueueAudioBuffer(audioBuffer);
    } catch (error) {
      console.error('❌ Failed to play audio chunk:', error);
    }
  }

  private enqueueAudioBuffer(buffer: AudioBuffer): void {
    this.pendingAudioBuffers.push(buffer);

    // Evita backlog infinito caso a API dispare chunks demais
    if (this.pendingAudioBuffers.length > 200) {
      this.pendingAudioBuffers.shift();
    }

    if (!this.currentPlaybackSource) {
      this.playNextAudioBuffer();
    }
  }

  private playNextAudioBuffer(): void {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.pendingAudioBuffers = [];
      return;
    }

    const nextBuffer = this.pendingAudioBuffers.shift();
    if (!nextBuffer) {
      this.currentPlaybackSource = null;
      return;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = nextBuffer;
    source.connect(this.audioContext.destination);

    source.onended = () => {
      this.audioQueue = this.audioQueue.filter((node) => node !== source);
      this.currentPlaybackSource = null;
      this.playNextAudioBuffer();
    };

    this.currentPlaybackSource = source;
    this.audioQueue.push(source);
    const startTime = this.audioContext.currentTime + 0.02;
    source.start(startTime);
  }

  async disconnect(): Promise<void> {
    console.log('🔌 Disconnecting from OpenAI...');

    // Para processor de áudio
    if (this.audioProcessor) {
      this.audioProcessor.disconnect();
      this.audioProcessor = null;
    }

    // Para stream de microfone
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    // Para todos os áudios em reprodução
    this.audioQueue.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // Ignora se já parou
      } finally {
        source.disconnect();
      }
    });
    this.audioQueue = [];

    if (this.currentPlaybackSource) {
      try {
        this.currentPlaybackSource.stop();
      } catch (e) {
        // Ignora
      } finally {
        this.currentPlaybackSource.disconnect();
      }
    }
    this.currentPlaybackSource = null;
    this.pendingAudioBuffers = [];

    // Fecha AudioContext
    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close();
      this.audioContext = null;
    }

    // Fecha WebSocket
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    const store = useVoiceAgentStore.getState();
    store.setConnected(false);
    store.setActive(false);
    
    console.log('✅ Disconnected from OpenAI');
  }
}

// Instância singleton
export const openAIRealtimeService = OpenAIRealtimeService.getInstance();
