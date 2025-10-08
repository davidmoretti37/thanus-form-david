'use client';

import React, { useState, useEffect } from 'react';
import './styles.css';
import './ultrawide.css';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { getMessages, getUserActiveThreads } from '@/lib/api';
import {
  RefreshCw,
  LayoutGrid,
  LayoutList,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getUserFriendlyToolName } from '@/components/thread/utils';

// Import dinâmico para evitar SSR (corrige o erro do "self is not defined")
const MultiComputerPanel = dynamic(
  () => import('./multi-computer-panel').then(mod => mod.MultiComputerPanel),
  { ssr: false }
);

// Interface para informações de thread
interface ThreadInfo {
  threadId: string;
  projectId: string;
  projectName: string;
  updatedAt: string;
  isRunning?: boolean;
  currentTool?: string;
}

// Hook personalizado para detectar o tamanho da janela
function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
}

// Calcular número ideal de colunas
function calculateOptimalColumns(width: number): number {
  if (width < 640) return 1;
  else if (width < 1024) return 2;
  else return 3;
}

export default function MultiComputerPage() {
  const router = useRouter();
  const [threads, setThreads] = useState<ThreadInfo[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [columns, setColumns] = useState(2);
  const [currentPage, setCurrentPage] = useState(0);
  const { width } = useWindowSize();

  const MAX_COMPUTERS_PER_PAGE = 6;

  const getActiveThreads = async (): Promise<ThreadInfo[]> => {
    try {
      const activeThreads = await getUserActiveThreads();
      const threadsInfo: ThreadInfo[] = [];

      for (const thread of activeThreads) {
        try {
          const messages = await getMessages(thread.thread_id);
          let currentTool = 'execute_command';

          if (messages && messages.length > 0) {
            for (let i = messages.length - 1; i >= 0; i--) {
              const msg = messages[i];
              if (msg.type === 'assistant') {
                let content = msg.content || '';
                if (typeof content !== 'string') {
                  try {
                    content = JSON.stringify(content);
                  } catch {
                    content = '';
                  }
                }
                const toolMatch = content.match(
                  /<([a-zA-Z\-_]+)(?:\s+[^>]*)?>|<([a-zA-Z\-_]+)(?:\s+[^>]*)?\/>/,
                );
                if (toolMatch) {
                  const rawToolName =
                    toolMatch[1] || toolMatch[2] || 'execute_command';
                  currentTool = getUserFriendlyToolName(rawToolName);
                  break;
                }
              }
            }
          }

          threadsInfo.push({
            threadId: thread.thread_id,
            projectId: thread.project_id,
            projectName:
              thread.project_name || `Project ${thread.project_id.slice(0, 8)}`,
            updatedAt: thread.updated_at,
            isRunning: true,
            currentTool,
          });
        } catch (error) {
          console.error(
            `Erro ao processar informações para thread ${thread.thread_id}:`,
            error,
          );
        }
      }
      return threadsInfo;
    } catch (error) {
      console.error('Erro ao obter threads ativas:', error);
      return [];
    }
  };

  const loadThreads = async () => {
    setIsLoadingThreads(true);
    try {
      const runningThreads = await getActiveThreads();
      setThreads(runningThreads);
    } catch (error) {
      console.error('Erro ao carregar threads:', error);
    } finally {
      setIsLoadingThreads(false);
    }
  };

  // Set up polling for active threads
  useEffect(() => {
    // Initial load
    loadThreads();

    // Set up polling every minute (60000ms)
    const intervalId = setInterval(() => {
      // Only poll if the tab is visible
      if (!document.hidden) {
        loadThreads();
      }
    }, 60000);

    // Handle tab visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // If the tab becomes visible, immediately refresh the data
        loadThreads();
      }
    };

    // Add event listener for tab visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Clean up the interval and event listener when the component unmounts
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        router.push('/dashboard');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  useEffect(() => {
    if (width > 0) {
      const optimalColumns = calculateOptimalColumns(width);
      setColumns(optimalColumns);

      const mainContainer = document.querySelector('.grid-container');
      if (mainContainer) {
        mainContainer.classList.add('grid-layout-change');
        setTimeout(() => {
          mainContainer.classList.remove('grid-layout-change');
        }, 300);
      }
    }
  }, [width]);

  const totalPages = Math.ceil(threads.length / MAX_COMPUTERS_PER_PAGE);

  const getCurrentPageThreads = () => {
    const startIndex = currentPage * MAX_COMPUTERS_PER_PAGE;
    const endIndex = startIndex + MAX_COMPUTERS_PER_PAGE;
    return threads.slice(startIndex, endIndex);
  };

  const nextPage = () => {
    if (currentPage < totalPages - 1) {
      const gridContainer = document.querySelector('.grid-container');
      if (gridContainer) {
        gridContainer.classList.remove('page-transition');
        void (gridContainer as HTMLElement).offsetWidth;
        gridContainer.classList.add('page-transition');
      }
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      const gridContainer = document.querySelector('.grid-container');
      if (gridContainer) {
        gridContainer.classList.remove('page-transition');
        void (gridContainer as HTMLElement).offsetWidth;
        gridContainer.classList.add('page-transition');
      }
      setCurrentPage(currentPage - 1);
    }
  };

  useEffect(() => {
    const gridContainer = document.querySelector('.grid-container');
    if (gridContainer) {
      gridContainer.classList.add('page-transition');
      const timer = setTimeout(() => {
        gridContainer.classList.remove('page-transition');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentPage]);

  if (isLoadingThreads) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="fixed top-6 left-8 z-50">
        <Button
          variant="ghost"
          size="default"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            router.push('/dashboard');
          }}
          className="h-12 px-6 py-3 rounded-xl bg-background/40 backdrop-blur-md hover:bg-background/60 transition-all border border-blue-500/30 shadow-xl flex items-center gap-2 group"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-blue-400 group-hover:text-blue-300 transition-colors"
          >
            <path d="m12 19-7-7 7-7" />
            <path d="M19 12H5" />
          </svg>
          <span className="text-sm font-medium text-blue-300 group-hover:text-white transition-colors">Voltar ao Dashboard</span>
        </Button>
      </div>

      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={loadThreads}
          className="h-10 w-10 p-0 rounded-full bg-background/30 backdrop-blur-md hover:bg-background/50 transition-all border border-blue-500/20 shadow-lg"
        >
          <RefreshCw className="h-5 w-5 text-blue-400" />
        </Button>
      </div>

      {totalPages > 1 && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-2">
          <div className="bg-background/30 backdrop-blur-md border border-blue-500/20 rounded-lg shadow-lg flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={prevPage}
              disabled={currentPage === 0}
              className="h-10 px-4 py-2 text-blue-300 hover:bg-background/50 transition-all disabled:opacity-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-1"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
              Prev
            </Button>

            <div className="px-4 py-2 text-xs text-blue-300">
              {currentPage + 1} / {totalPages}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={nextPage}
              disabled={currentPage === totalPages - 1}
              className="h-10 px-4 py-2 text-blue-300 hover:bg-background/50 transition-all disabled:opacity-50"
            >
              Next
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="ml-1"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Button>
          </div>
        </div>
      )}

      <main className="w-full p-10 pt-32 pl-16 pr-8">
        {threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-blue-100/50 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-800/30">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-blue-500 dark:text-blue-400"
              >
                <rect width="14" height="8" x="5" y="2" rx="2" />
                <rect width="20" height="8" x="2" y="14" rx="2" />
                <path d="M6 18h2" />
                <path d="M12 18h6" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              No agents running
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Start a conversation to see active agents here
            </p>
            <Button
              onClick={loadThreads}
              variant="outline"
              size="sm"
              className="border-blue-500/20 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        ) : (
          <div
            className={cn(
              'w-full grid-container page-transition',
              layout === 'grid'
                ? 'grid gap-8 auto-rows-fr ultrawide-grid'
                : 'flex flex-col gap-8',
            )}
            style={
              layout === 'grid'
                ? {
                    display: 'grid',
                    gridTemplateColumns: `repeat(${columns}, minmax(250px, 1fr))`,
                    gridAutoRows: 'minmax(500px, auto)',
                    gap: '1.5rem',
                    width: '100%',
                    maxWidth: '100vw',
                    padding: '0 1rem',
                  }
                : {}
            }
          >
            {getCurrentPageThreads().map((thread) => (
              <div key={thread.threadId}>
                <div
                  className={cn(
                    'relative border rounded-xl overflow-hidden shadow-lg transition-all duration-300 hover:shadow-[0_0_30px_rgba(120,120,255,0.3)] hover:scale-[1.02] group cursor-pointer',
                    layout === 'list'
                      ? 'h-[500px]'
                      : columns > 3
                      ? 'card-height-compact'
                      : 'card-height-normal',
                    thread.isRunning
                      ? 'border-blue-500/50 bg-background/40 backdrop-blur-sm'
                      : 'border-border/30 bg-background/20 backdrop-blur-sm',
                  )}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    const isNavigationElement = target.closest(
                      'button[class*="h-7 w-7"], .border-t.border-zinc-200, [role="slider"]',
                    );
                    if (!isNavigationElement) {
                      router.push(
                        `/projects/${thread.projectId}/thread/${thread.threadId}`,
                      );
                    }
                  }}
                >
                  <div className="absolute bottom-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="bg-blue-600/80 backdrop-blur-md rounded-full p-2 shadow-lg border border-blue-400/30 flex items-center justify-center">
                      <MessageSquare className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div className="h-full">
                    <MultiComputerPanel threadId={thread.threadId} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
