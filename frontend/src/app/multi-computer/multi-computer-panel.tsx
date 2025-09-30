'use client';

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { ToolCallInput } from '@/components/thread/tool-call-side-panel';
import { ComputerCard } from './computer-card';
import {
  getMessages,
  getProject,
  getThread,
  getAgentRuns,
  Project,
} from '@/lib/api';
import { useAgentStream } from '@/hooks/useAgentStream';
import { UnifiedMessage, ApiMessageType } from '@/components/thread/types';
import {
  safeJsonParse,
  getUserFriendlyToolName,
} from '@/components/thread/utils';
import { extractToolName } from '@/components/thread/tool-views/xml-parser';
import { ParsedContent } from '@/components/thread/types';
import { Loader2 } from 'lucide-react';

interface MultiComputerPanelProps {
  threadId: string;
}

export function MultiComputerPanel({ threadId }: MultiComputerPanelProps) {
  const [messages, setMessages] = useState<UnifiedMessage[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCallInput[]>([]);
  const [currentToolIndex, setCurrentToolIndex] = useState<number>(0);
  const [project, setProject] = useState<Project | null>(null);
  const [agentStatus, setAgentStatus] = useState<
    'idle' | 'running' | 'connecting' | 'error'
  >('idle');
  const [agentRunId, setAgentRunId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialLoadCompleted = useRef<boolean>(false);

  // Função para processar mensagens e extrair chamadas de ferramentas
  const processToolCalls = useCallback((messages: UnifiedMessage[]) => {
    const historicalToolPairs: ToolCallInput[] = [];
    const assistantMessages = messages.filter(
      (m) => m.type === 'assistant' && m.message_id,
    );

    assistantMessages.forEach((assistantMsg) => {
      const resultMessage = messages.find((toolMsg) => {
        if (
          toolMsg.type !== 'tool' ||
          !toolMsg.metadata ||
          !assistantMsg.message_id
        )
          return false;
        try {
          const metadata = JSON.parse(toolMsg.metadata);
          return metadata.assistant_message_id === assistantMsg.message_id;
        } catch (e) {
          return false;
        }
      });

      if (resultMessage) {
        // Determinar o nome da ferramenta (usando a mesma lógica do chat original)
        let toolName = 'unknown';
        let isSuccess = true;

        try {
          const assistantContent = (() => {
            try {
              const parsed = safeJsonParse<ParsedContent>(
                assistantMsg.content,
                {},
              );
              return parsed.content || assistantMsg.content;
            } catch {
              return assistantMsg.content;
            }
          })();

          const extractedToolName = extractToolName(assistantContent);
          if (extractedToolName) {
            toolName = extractedToolName;
          } else {
            const assistantContentParsed = safeJsonParse<{
              tool_calls?: Array<{
                function?: { name?: string };
                name?: string;
              }>;
            }>(assistantMsg.content, {});
            if (
              assistantContentParsed.tool_calls &&
              assistantContentParsed.tool_calls.length > 0
            ) {
              const firstToolCall = assistantContentParsed.tool_calls[0];
              const rawName =
                firstToolCall.function?.name || firstToolCall.name || 'unknown';
              toolName = rawName.replace(/_/g, '-').toLowerCase();
            }
          }
        } catch {}

        // Pular tags <ask> e <complete>
        if (toolName === 'ask' || toolName === 'complete') {
          return;
        }

        // Parse success status from tool result
        try {
          const toolContent = resultMessage.content?.toLowerCase() || '';
          isSuccess = !(
            toolContent.includes('failed') ||
            toolContent.includes('error') ||
            toolContent.includes('failure')
          );
        } catch {}

        historicalToolPairs.push({
          assistantCall: {
            name: toolName,
            content: assistantMsg.content,
            timestamp: assistantMsg.created_at,
          },
          toolResult: {
            content: resultMessage.content,
            isSuccess: isSuccess,
            timestamp: resultMessage.created_at,
          },
        });
      }
    });

    return historicalToolPairs;
  }, []);

  // Funções para renderizar conteúdo no painel
  const toolViewAssistant = useCallback((assistantContent?: string) => {
    if (!assistantContent) return null;
    return (
      <div className="space-y-1">
        <div className="text-xs font-medium text-muted-foreground">
          Assistant Message
        </div>
        <div className="rounded-md border bg-muted/50 p-3">
          <div className="text-xs prose prose-xs dark:prose-invert chat-markdown max-w-none">
            {assistantContent}
          </div>
        </div>
      </div>
    );
  }, []);

  const toolViewResult = useCallback(
    (toolContent?: string, isSuccess?: boolean) => {
      if (!toolContent) return null;
      return (
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <div className="text-xs font-medium text-muted-foreground">
              Tool Result
            </div>
            <div
              className={`px-2 py-0.5 rounded-full text-xs ${
                isSuccess
                  ? 'bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-300'
                  : 'bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-300'
              }`}
            >
              {isSuccess ? 'Success' : 'Failed'}
            </div>
          </div>
          <div className="rounded-md border bg-muted/50 p-3">
            <div className="text-xs prose prose-xs dark:prose-invert chat-markdown max-w-none">
              {toolContent}
            </div>
          </div>
        </div>
      );
    },
    [],
  );

  // Callbacks para o hook de streaming
  const handleNewMessageFromStream = useCallback((message: UnifiedMessage) => {
    setMessages((prev) => {
      const messageExists = prev.some(
        (m) => m.message_id === message.message_id,
      );
      if (messageExists) {
        return prev.map((m) =>
          m.message_id === message.message_id ? message : m,
        );
      } else {
        return [...prev, message];
      }
    });
  }, []);

  const handleStreamStatusChange = useCallback((hookStatus: string) => {
    switch (hookStatus) {
      case 'idle':
      case 'completed':
      case 'stopped':
      case 'agent_not_running':
      case 'error':
      case 'failed':
        setAgentStatus('idle');
        setAgentRunId(null);
        break;
      case 'connecting':
        setAgentStatus('connecting');
        break;
      case 'streaming':
        setAgentStatus('running');
        break;
    }
  }, []);

  // Removida a detecção de ferramentas em tempo real, conforme solicitado

  // Configurar o hook de streaming
  const {
    status: streamHookStatus,
    agentRunId: currentHookRunId,
    startStreaming,
    toolCall: streamingToolCall,
    textContent: streamingTextContent,
  } = useAgentStream(
    {
      onMessage: handleNewMessageFromStream,
      onStatusChange: handleStreamStatusChange,
      onError: (error) => console.error(`[${threadId}] Stream error:`, error),
      onClose: () => console.log(`[${threadId}] Stream closed`),
    },
    threadId,
    setMessages,
  );

  // Removido o código relacionado à detecção de ferramentas

  // Iniciar streaming quando temos um agentRunId
  useEffect(() => {
    if (agentRunId && agentRunId !== currentHookRunId) {
      startStreaming(agentRunId);
    }
  }, [agentRunId, startStreaming, currentHookRunId]);

  // Carregar dados iniciais
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      setError(null);

      try {
        if (!threadId) throw new Error('Thread ID is required');

        // Verificar se é uma thread temporária
        if (threadId.startsWith('temp-')) {
          setIsLoading(false);
          initialLoadCompleted.current = true;
          return;
        }

        // Carregar dados da thread
        const threadData = await getThread(threadId);

        if (!isMounted) return;

        // Carregar dados do projeto
        if (threadData?.project_id) {
          const projectData = await getProject(threadData.project_id);
          if (isMounted && projectData) {
            setProject(projectData);
          }
        }

        // Carregar mensagens
        const messagesData = await getMessages(threadId);
        if (isMounted) {
          // Mapear mensagens da API para o formato UnifiedMessage
          const unifiedMessages = (messagesData || [])
            .filter((msg) => msg.type !== 'status')
            .map((msg: ApiMessageType) => ({
              message_id: msg.message_id || null,
              thread_id: msg.thread_id || threadId,
              type: (msg.type || 'system') as UnifiedMessage['type'],
              is_llm_message: Boolean(msg.is_llm_message),
              content: msg.content || '',
              metadata: msg.metadata || '{}',
              created_at: msg.created_at || new Date().toISOString(),
              updated_at: msg.updated_at || new Date().toISOString(),
            }));

          setMessages(unifiedMessages);

          // Processar chamadas de ferramentas
          const toolCallsData = processToolCalls(unifiedMessages);
          setToolCalls(toolCallsData);

          // Encontrar a última chamada de ferramenta completa (não em streaming)
          if (toolCallsData.length > 0) {
            // Verificar se há chamadas completas
            const completedCalls = toolCallsData.filter(
              (call) =>
                call.toolResult?.content &&
                call.toolResult.content !== 'STREAMING',
            );

            if (completedCalls.length > 0) {
              // Encontrar o índice da última chamada completa
              let lastCompletedIndex = -1;
              for (let i = toolCallsData.length - 1; i >= 0; i--) {
                const call = toolCallsData[i];
                if (
                  call.toolResult?.content &&
                  call.toolResult.content !== 'STREAMING'
                ) {
                  lastCompletedIndex = i;
                  break;
                }
              }
              // Definir o índice para a última chamada completa
              setCurrentToolIndex(Math.max(0, lastCompletedIndex));
            } else {
              // Se não houver chamadas completas, usar a última chamada
              setCurrentToolIndex(toolCallsData.length - 1);
            }
          }
        }

        // Verificar execuções de agente ativas
        try {
          const agentRuns = await getAgentRuns(threadId);
          const activeRun = agentRuns.find((run) => run.status === 'running');
          if (activeRun && isMounted) {
            setAgentRunId(activeRun.id);
          } else {
            if (isMounted) setAgentStatus('idle');
          }
        } catch (err) {
          console.error(`[${threadId}] Error checking for active runs:`, err);
          if (isMounted) setAgentStatus('idle');
        }

        initialLoadCompleted.current = true;
      } catch (err) {
        console.error(`[${threadId}] Error loading data:`, err);
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : 'Failed to load thread',
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [threadId, processToolCalls]);

  // Atualizar toolCalls quando as mensagens mudam
  useEffect(() => {
    if (messages.length > 0) {
      const newToolCalls = processToolCalls(messages);
      setToolCalls(newToolCalls);

      // Quando novas chamadas são adicionadas, atualizar o índice para a última chamada completa
      if (newToolCalls.length > 0 && newToolCalls.length > toolCalls.length) {
        // Verificar se há chamadas completas
        const completedCalls = newToolCalls.filter(
          (call) =>
            call.toolResult?.content && call.toolResult.content !== 'STREAMING',
        );

        if (completedCalls.length > 0) {
          // Encontrar o índice da última chamada completa
          let lastCompletedIndex = -1;
          for (let i = newToolCalls.length - 1; i >= 0; i--) {
            const call = newToolCalls[i];
            if (
              call.toolResult?.content &&
              call.toolResult.content !== 'STREAMING'
            ) {
              lastCompletedIndex = i;
              break;
            }
          }
          // Definir o índice para a última chamada completa
          setCurrentToolIndex(Math.max(0, lastCompletedIndex));
        } else {
          // Se não houver chamadas completas, usar a última chamada
          setCurrentToolIndex(newToolCalls.length - 1);
        }
      }
    }
  }, [messages, processToolCalls, toolCalls.length]);

  // Função para navegar entre chamadas de ferramentas
  const handleSidePanelNavigate = useCallback((newIndex: number) => {
    setCurrentToolIndex(newIndex);
  }, []);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-background p-4">
        <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg max-w-md">
          <p className="text-red-700 dark:text-red-400 font-medium">
            Error loading thread
          </p>
          <p className="text-sm text-red-600 dark:text-red-300 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      {/* Sempre renderizar o ComputerCard, mesmo durante o carregamento */}
      <ComputerCard
        toolCalls={toolCalls}
        messages={messages as ApiMessageType[]}
        agentStatus={agentStatus}
        currentIndex={currentToolIndex}
        onNavigate={handleSidePanelNavigate}
        project={project || undefined}
        isLoading={isLoading}
        renderAssistantMessage={toolViewAssistant}
        renderToolResult={toolViewResult}
        onFileClick={(filePath) => {
          console.log('File clicked:', filePath);
        }}
      />
    </div>
  );
}
