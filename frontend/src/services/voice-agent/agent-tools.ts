import { useRouter } from 'next/navigation';

export interface AgentToolDefinition {
  type: 'function';
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

// Definições das tools disponíveis para o agente
export const AGENT_TOOLS: AgentToolDefinition[] = [
  {
    type: 'function',
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
    type: 'function',
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
