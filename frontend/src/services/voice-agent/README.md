# Voice Agent - Assistente de Voz Conversacional

Este módulo implementa um agente de voz conversacional usando a OpenAI Realtime API que pode guiar usuários pela aplicação.

## 🎯 Funcionalidades

- **Conversa por Voz**: Comunicação bidirecional em tempo real
- **Navegação Autônoma**: O agente pode navegar entre páginas automaticamente
- **Contexto Persistente**: Mantém o histórico da conversa entre páginas
- **Voz Feminina**: Usa a voz "shimmer" da OpenAI
- **Português Brasileiro**: Configurado para falar em PT-BR
- **Indicadores Visuais**: Feedback visual durante interações

## 📁 Estrutura de Arquivos

```
frontend/src/
├── services/voice-agent/
│   ├── types.ts                 # Definições de tipos TypeScript
│   ├── audio-manager.ts         # Gerenciamento de áudio (mic + playback)
│   ├── agent-tools.ts           # Ferramentas que o agente pode usar
│   ├── openai-realtime.ts       # Conexão WebSocket com OpenAI
│   └── README.md                # Esta documentação
├── stores/
│   └── voice-agent-store.ts     # Store global Zustand
├── hooks/
│   └── use-voice-agent.ts       # Hook React customizado
├── app/frontend-api/voice-agent/
│   └── route.ts                 # API route para obter chave OpenAI
└── components/home/ui/
    └── OrbToggle.tsx            # Componente UI integrado
```

## 🚀 Como Usar

### 1. Configurar Variável de Ambiente

Adicione a chave da OpenAI no arquivo `.env.local`:

```env
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### 2. Usar o Componente

O componente `OrbToggle` já está integrado na página `/home`:

```tsx
import { OrbToggle } from '@/components/home/ui/OrbToggle';

// O componente já está no navbar
<OrbToggle />
```

### 3. Interagir com o Agente

1. **Ativar**: Clique no botão da Orb
2. **Falar**: Permita acesso ao microfone e comece a falar
3. **Desativar**: Clique fora da Orb expandida

## 🔧 Ferramentas Disponíveis

O agente tem acesso às seguintes ferramentas:

### navigate_to_page
Navega para uma página específica da aplicação.

**Parâmetros:**
- `path` (string): Caminho da página (/home, /agents, /tasks, etc)
- `reason` (string, opcional): Motivo da navegação

**Exemplo:**
```typescript
{
  path: "/agents",
  reason: "para mostrar seus workers de IA"
}
```

### describe_current_page
Obtém informações sobre a página atual.

**Retorna:** Descrição da página e seus elementos principais.

## 📚 API Reference

### useVoiceAgent Hook

```typescript
const {
  isActive,      // boolean - Agent está ativo
  isListening,   // boolean - Está ouvindo o usuário
  isSpeaking,    // boolean - Está falando
  isConnected,   // boolean - Conectado ao OpenAI
  error,         // string | null - Erro se houver
  conversationHistory, // Array de mensagens
  startAgent,    // (apiKey: string) => Promise<void>
  stopAgent,     // () => Promise<void>
  toggleAgent,   // (apiKey: string) => Promise<void>
} = useVoiceAgent();
```

### Voice Agent Store

```typescript
const store = useVoiceAgentStore();

// State
store.isActive
store.isListening
store.isSpeaking
store.isConnected
store.currentPage
store.conversationHistory
store.error

// Actions
store.setActive(true)
store.setListening(true)
store.setSpeaking(true)
store.setConnected(true)
store.setCurrentPage('/home')
store.addMessage(message)
store.setError(error)
store.clearHistory()
store.reset()
```

## 🎨 Indicadores Visuais

### Botão Minimizado (8x8)
- **Normal**: Orb animado em tons de azul
- **Ativo**: Indicador verde no canto
- **Ouvindo**: Ícone de microfone + pulsação
- **Falando**: Escala pulsante

### Modo Expandido
- **Ouvindo**: Badge azul "Ouvindo..." com ícone de mic
- **Falando**: Badge roxo "Falando..." com dot animado
- **Pronta**: Badge verde "Pronta para ajudar"

## 🔐 Segurança

- A chave da OpenAI é armazenada apenas no backend (variáveis de ambiente)
- A API route `/frontend-api/voice-agent` fornece a chave de forma segura
- Nunca exponha a chave no código frontend

## 📝 Personalização

### Mudar a Voz

Em `openai-realtime.ts`, altere:

```typescript
voice: 'shimmer' // Opções: alloy, echo, fable, onyx, nova, shimmer
```

### Adicionar Novas Ferramentas

1. Defina a ferramenta em `agent-tools.ts`:

```typescript
{
  name: 'sua_ferramenta',
  description: 'Descrição da ferramenta',
  parameters: {
    type: 'object',
    properties: {
      param1: { type: 'string', description: '...' }
    },
    required: ['param1']
  }
}
```

2. Implemente a execução em `AgentToolExecutor`:

```typescript
async executeTool(toolName: string, parameters: any): Promise<string> {
  switch (toolName) {
    case 'sua_ferramenta':
      return this.suaFerramenta(parameters);
    // ...
  }
}
```

### Modificar Instruções do Sistema

Em `openai-realtime.ts`, edite `instructions`:

```typescript
instructions: `Você é uma assistente virtual...`
```

## 🐛 Troubleshooting

### Erro: "OpenAI API key not configured"
- Verifique se `OPENAI_API_KEY` está no `.env.local`
- Reinicie o servidor de desenvolvimento

### Erro: "Não foi possível acessar o microfone"
- Permita acesso ao microfone no browser
- Verifique se está usando HTTPS (requerido para mic access)

### Áudio não reproduz
- Verifique as permissões de áudio do browser
- Confirme que o AudioContext foi inicializado corretamente

### Agent não navega
- Verifique os logs do console para erros
- Confirme que o router está sendo passado corretamente

## 📖 Recursos Adicionais

- [OpenAI Realtime API Docs](https://platform.openai.com/docs/guides/realtime)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Zustand Documentation](https://docs.pmnd.rs/zustand/getting-started/introduction)

## 🎯 Próximos Passos

- [ ] Adicionar suporte para múltiplos idiomas
- [ ] Implementar transcrição em tempo real na UI
- [ ] Adicionar mais ferramentas (criar tasks, buscar info, etc)
- [ ] Melhorar tratamento de erros
- [ ] Adicionar testes unitários
- [ ] Implementar analytics de uso
