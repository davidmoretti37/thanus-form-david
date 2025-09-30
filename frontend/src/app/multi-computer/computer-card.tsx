'use client';

import React from 'react';
import { ToolCallInput } from '@/components/thread/tool-call-side-panel';
import { ApiMessageType } from '@/components/thread/types';
import { Project } from '@/lib/api';
import { ToolView } from '@/components/thread/tool-views/wrapper';
import { Computer, ChevronLeft, ChevronRight } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface ComputerCardProps {
  toolCalls: ToolCallInput[];
  messages?: ApiMessageType[];
  agentStatus: string;
  currentIndex: number;
  onNavigate: (newIndex: number) => void;
  project?: Project;
  isLoading?: boolean;
  renderAssistantMessage?: (
    assistantContent?: string,
    toolContent?: string,
  ) => React.ReactNode;
  renderToolResult?: (
    toolContent?: string,
    isSuccess?: boolean,
  ) => React.ReactNode;
  onFileClick?: (filePath: string) => void;
  agentName?: string;
}

export function ComputerCard({
  toolCalls,
  messages,
  agentStatus,
  currentIndex,
  onNavigate,
  project,
  isLoading = false,
  renderAssistantMessage,
  renderToolResult,
  onFileClick,
  agentName,
}: ComputerCardProps) {
  // Mostrar estado de carregamento
  if (isLoading) {
    return (
      <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-background">
        {/* Header */}
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-md font-medium text-zinc-900 dark:text-zinc-100">
            {project?.name || 'Project'}
          </h2>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-4">
            <Computer className="h-8 w-8 text-zinc-400 dark:text-zinc-500 mx-auto mb-2 animate-pulse" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Loading...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Se não houver chamadas de ferramentas, mostrar mensagem
  if (toolCalls.length === 0) {
    return (
      <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-background">
        {/* Header */}
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-md font-medium text-zinc-900 dark:text-zinc-100">
            {project?.name || 'Project'}
          </h2>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-4">
            <Computer className="h-8 w-8 text-zinc-400 dark:text-zinc-500 mx-auto mb-2" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No tool activity
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
              Tool calls will appear here when executed
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Garantir que o índice atual é válido (como no ToolCallSidePanel)
  const safeIndex = Math.min(currentIndex, Math.max(0, toolCalls.length - 1));
  const displayToolCall = toolCalls[safeIndex];
  const displayIndex = safeIndex;
  const displayTotalCalls = toolCalls.length;
  const isSuccess = displayToolCall?.toolResult?.isSuccess ?? true;

  const navigateToPrevious = () => {
    if (currentIndex > 0) {
      onNavigate(currentIndex - 1);
    }
  };

  const navigateToNext = () => {
    if (currentIndex < toolCalls.length - 1) {
      onNavigate(currentIndex + 1);
    }
  };

  const handleSliderChange = ([newValue]: [number]) => {
    if (newValue !== currentIndex) {
      onNavigate(newValue);
    }
  };

  const renderStatusButton = () => {
    const baseClasses =
      'flex items-center justify-center gap-1.5 px-2 py-0.5 rounded-full w-[116px]';
    const dotClasses = 'w-1.5 h-1.5 rounded-full';
    const textClasses = 'text-xs font-medium';

    if (agentStatus === 'running') {
      return (
        <div
          className={`${baseClasses} bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800`}
        >
          <div className={`${dotClasses} bg-green-500 animate-pulse`} />
          <span className={`${textClasses} text-green-700 dark:text-green-400`}>
            Live Updates
          </span>
        </div>
      );
    } else {
      return (
        <div
          className={`${baseClasses} bg-neutral-50 dark:bg-neutral-900/20 border border-neutral-200 dark:border-neutral-800`}
        >
          <div className={`${dotClasses} bg-neutral-500`} />
          <span
            className={`${textClasses} text-neutral-700 dark:text-neutral-400`}
          >
            Latest Tool
          </span>
        </div>
      );
    }
  };

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-background">
      {/* Header */}
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
        <h2 className="text-md font-medium text-zinc-900 dark:text-zinc-100">
          {project?.name || 'Project'}
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {displayToolCall ? (
          <ToolView
            name={displayToolCall.assistantCall.name}
            assistantContent={displayToolCall.assistantCall.content}
            toolContent={displayToolCall.toolResult?.content}
            assistantTimestamp={displayToolCall.assistantCall.timestamp}
            toolTimestamp={displayToolCall.toolResult?.timestamp}
            isSuccess={isSuccess}
            isStreaming={false}
            project={project}
            messages={messages}
            agentStatus={agentStatus}
            currentIndex={displayIndex + 1}
            totalCalls={displayTotalCalls}
            onFileClick={onFileClick}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-4">
              <Computer className="h-8 w-8 text-zinc-400 dark:text-zinc-500 mx-auto mb-2" />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No tool activity
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                Tool calls will appear here when executed
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Footer - copied exactly from ToolCallSidePanel */}
      {displayTotalCalls > 1 && (
        <div className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button
                onClick={navigateToPrevious}
                disabled={displayIndex <= 0}
                className="h-7 w-7 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-zinc-600 dark:text-zinc-400 font-medium tabular-nums px-1 min-w-[44px] text-center">
                {displayIndex + 1}/{displayTotalCalls}
              </span>
              <button
                onClick={navigateToNext}
                disabled={displayIndex >= displayTotalCalls - 1}
                className="h-7 w-7 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 relative">
              <Slider
                min={0}
                max={displayTotalCalls - 1}
                step={1}
                value={[displayIndex]}
                onValueChange={handleSliderChange}
                className="w-full [&>span:first-child]:h-1.5 [&>span:first-child]:bg-zinc-200 dark:[&>span:first-child]:bg-zinc-800 [&>span:first-child>span]:bg-zinc-500 dark:[&>span:first-child>span]:bg-zinc-400 [&>span:first-child>span]:h-1.5"
              />
            </div>

            <div className="flex items-center gap-1.5">
              {renderStatusButton()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
