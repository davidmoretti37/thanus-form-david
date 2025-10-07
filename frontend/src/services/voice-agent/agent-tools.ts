import { useRouter } from 'next/navigation';
import { tool } from '@openai/agents-realtime';
import { z } from 'zod';

export interface AgentToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

// Legacy tool definitions (kept for reference)
export const AGENT_TOOLS: AgentToolDefinition[] = [
  {
    name: 'navigate_to_page',
    description: 'Navega para uma página específica da aplicação. Use esta função sempre que o usuário pedir para ir para algum lugar ou quando você quiser mostrar algo específico.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'O caminho da página para navegar. Exemplos: /home, /construtor, /agents?tab=my-agents, /agents?tab=marketplace, /tasks, /artefatos, /settings',
        },
        reason: {
          type: 'string',
          description: 'Breve explicação do por que está navegando para essa página',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'describe_current_page',
    description: 'Obtém informações sobre a página atual e seus elementos principais',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];

// Informações sobre as páginas da aplicação
export const PAGE_DESCRIPTIONS: Record<string, string> = {
  '/home': 'Página inicial com cards de acesso rápido para criar workers, explorar marketplace, artefatos, tasks e integrações.',
  '/construtor': 'Construtor de workers onde você pode criar novos agentes personalizados.',
  '/agents': 'Central de agentes com abas para My Agents, Marketplace e outros recursos relacionados.',
  '/agents?tab=my-agents': 'Página My Agents onde você pode ver, editar e gerenciar os agentes que já criou.',
  '/agents?tab=marketplace': 'Marketplace com agentes poderosos prontos para instalar, comprar e descobrir novas possibilidades.',
  '/tasks': 'Página de tarefas onde você gerencia suas tasks e workflows.',
  '/artefatos': 'Galeria de artefatos criados pelos workers.',
  '/settings': 'Configurações da aplicação e gerenciamento de credenciais.',
  '/settings/credentials': 'Página de integrações onde você conecta serviços externos.',
  '/billing': 'Página de faturamento e planos.',
};

// Classe para executar as tools
const PATH_ALIASES: Record<string, string> = {
  '/home': '/home',
  home: '/home',
  dashboard: '/home',
  '/dashboard': '/home',
  início: '/home',
  inicio: '/home',
  '/construtor': '/construtor',
  construtor: '/construtor',
  builder: '/construtor',
  '/builder': '/construtor',
  'novo worker': '/construtor',
  'criar worker': '/construtor',
  '/agents': '/agents?tab=my-agents',
  agents: '/agents?tab=my-agents',
  'my agents': '/agents?tab=my-agents',
  'meus agentes': '/agents?tab=my-agents',
  'mis agentes': '/agents?tab=my-agents',
  '/my-agents': '/agents?tab=my-agents',
  'agents?tab=my-agents': '/agents?tab=my-agents',
  marketplace: '/agents?tab=marketplace',
  mercado: '/agents?tab=marketplace',
  knowledge: '/knowledge',
  memories: '/knowledge',
  memória: '/knowledge',
  memórias: '/knowledge',
  memorias: '/knowledge',
  seeds: '/knowledge',
  sementes: '/knowledge',
  'knowledge base': '/knowledge',
  'base de conhecimento': '/knowledge',
  '/knowledge': '/knowledge',
  '/knowledge-base': '/knowledge',
  multi: '/multi-computer',
  'multi computer': '/multi-computer',
  'multi-computer': '/multi-computer',
  multicomputer: '/multi-computer',
  'multi computer room': '/multi-computer',
  watchtower: '/multi-computer',
  '/multi-computer': '/multi-computer',
  'agentes marketplace': '/agents?tab=marketplace',
  'agent marketplace': '/agents?tab=marketplace',
  'discover agents': '/agents?tab=marketplace',
  'explorar agentes': '/agents?tab=marketplace',
  'agents?tab=marketplace': '/agents?tab=marketplace',
  '/marketplace': '/agents?tab=marketplace',
  tasks: '/tasks',
  tarefas: '/tasks',
  '/tasks': '/tasks',
  '/tarefas': '/tasks',
  artefatos: '/artefatos',
  '/artefatos': '/artefatos',
  artifacts: '/artefatos',
  settings: '/settings',
  configurações: '/settings',
  '/settings': '/settings',
  integrations: '/settings/credentials',
  integracoes: '/settings/credentials',
  integrações: '/settings/credentials',
  '/integrations': '/settings/credentials',
  credenciais: '/settings/credentials',
  billing: '/billing',
  faturamento: '/billing',
  '/billing': '/billing',
};

export class AgentToolExecutor {
  private router: ReturnType<typeof useRouter> | null = null;

  setRouter(router: ReturnType<typeof useRouter>) {
    this.router = router;
  }

  async executeTool(toolName: string, parameters: any): Promise<string> {
    switch (toolName) {
      case 'navigate_to_page':
        return this.navigateToPage(parameters.path, parameters.reason);

      case 'describe_current_page':
        return this.describeCurrentPage();

      case 'type_in_builder_chat':
        return await this.typeInBuilderChat(parameters.text);

      default:
        return `Tool ${toolName} não encontrada.`;
    }
  }

  private navigateToPage(path: string, reason?: string): string {
    if (!this.router) {
      return 'Erro: Router não está disponível.';
    }

    const targetPath = this.normalizePath(path);

    // Navega para a página
    this.router.push(targetPath);

    const description =
      PAGE_DESCRIPTIONS[targetPath] ||
      PAGE_DESCRIPTIONS[this.normalizePath(window?.location?.pathname ?? '')] ||
      'Esta é uma página da aplicação.';
    const reasonText = reason ? ` ${reason}` : '';

    return `Navegando para ${targetPath}.${reasonText} ${description}`;
  }

  private describeCurrentPage(): string {
    if (typeof window === 'undefined') {
      return 'Não é possível descrever a página no servidor.';
    }

    const pathWithQuery = `${window.location.pathname}${window.location.search || ''}`;
    const normalizedPath = this.normalizePath(pathWithQuery);
    const description =
      PAGE_DESCRIPTIONS[normalizedPath] ||
      PAGE_DESCRIPTIONS[window.location.pathname] ||
      'Página atual da aplicação.';

    // Identifica elementos principais da página
    const buttons = document.querySelectorAll('button').length;
    const links = document.querySelectorAll('a').length;
    const inputs = document.querySelectorAll('input').length;

    return `Você está em ${normalizedPath}. ${description} A página contém ${buttons} botões, ${links} links e ${inputs} campos de entrada.`;
  }

  private async typeInBuilderChat(text: string): Promise<string> {
    if (typeof window === 'undefined') {
      return 'Erro: Esta ação só funciona no navegador.';
    }

    // Find the chat input using data-tour attribute (most reliable)
    const chatInput = document.querySelector('[data-tour="chat-input"] textarea') as HTMLTextAreaElement;

    if (!chatInput) {
      return 'Erro: Campo de chat não encontrado. Certifique-se de estar na página do construtor (/construtor).';
    }

    // Get native setter for React compatibility
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value'
    )?.set;

    // Clear existing text and focus
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(chatInput, '');
    } else {
      chatInput.value = '';
    }
    chatInput.focus();

    // Split text into words for word-by-word typing
    const words = text.split(' ');

    // Type word by word with animation
    for (let i = 0; i < words.length; i++) {
      const currentText = words.slice(0, i + 1).join(' ');

      // Set value using native setter
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(chatInput, currentText);
      } else {
        chatInput.value = currentText;
      }

      // Trigger React's onChange events
      const inputEvent = new Event('input', { bubbles: true });
      chatInput.dispatchEvent(inputEvent);

      // Wait before next word (150ms for natural typing speed)
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    return `Terminei de digitar. Você pode revisar e enviar quando estiver pronto.`;
  }

  private normalizePath(rawPath: string): string {
    const fallback = '/home';

    if (!rawPath) {
      return fallback;
    }

    const trimmed = rawPath.trim();
    if (!trimmed) {
      return fallback;
    }

    const lower = trimmed.toLowerCase();

    if (PATH_ALIASES[lower]) {
      return PATH_ALIASES[lower];
    }

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }

    if (trimmed.startsWith('/')) {
      return trimmed;
    }

    return `/${trimmed}`;
  }
}

// Instância singleton
export const agentToolExecutor = new AgentToolExecutor();

// ===== SDK-Compatible Tools (NEW) =====

// Tool 1: Navigate to page
export const navigateToPageTool = tool({
  name: 'navigate_to_page',
  description: 'Navega para uma página específica da aplicação. Use esta função sempre que o usuário pedir para ir para algum lugar ou quando você quiser mostrar algo específico.',
  parameters: z.object({
    path: z.string().describe('O caminho da página para navegar. Exemplos: /home, /construtor, /agents?tab=my-agents, /agents?tab=marketplace, /tasks, /artefatos, /settings'),
    reason: z.string().nullable().describe('Breve explicação do por que está navegando para essa página')
  }),
  execute: async ({ path, reason }) => {
    return await agentToolExecutor.executeTool('navigate_to_page', { path, reason });
  }
});

// Tool 2: Describe current page
export const describeCurrentPageTool = tool({
  name: 'describe_current_page',
  description: 'Obtém informações sobre a página atual e seus elementos principais',
  parameters: z.object({}),
  execute: async () => {
    return await agentToolExecutor.executeTool('describe_current_page', {});
  }
});

// Tool 3: Type in builder chat
export const typeInBuilderChatTool = tool({
  name: 'type_in_builder_chat',
  description: 'Digita texto palavra por palavra no chat do construtor (/construtor) com efeito de animação. Use APENAS quando o usuário pedir EXPLICITAMENTE para criar um agente. NUNCA use ao apenas navegar para /construtor. Sempre explique verbalmente o que vai digitar ANTES de usar esta ferramenta.',
  parameters: z.object({
    text: z.string().describe('O prompt completo que será digitado palavra por palavra no construtor. Deve ser uma descrição detalhada do agente que o usuário quer criar. Exemplo: "Crie um agente de vendas especializado em fechar negócios, gerenciar leads e automatizar follow-ups"')
  }),
  execute: async ({ text }) => {
    return await agentToolExecutor.executeTool('type_in_builder_chat', { text });
  }
});

// Export tools array for RealtimeAgent
export const REALTIME_TOOLS = [
  navigateToPageTool,
  describeCurrentPageTool,
  typeInBuilderChatTool
];
