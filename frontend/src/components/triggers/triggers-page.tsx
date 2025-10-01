"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { useAllTriggers, type TriggerWithAgent } from '@/hooks/react-query/triggers/use-all-triggers';
import { useLanguage } from '@/contexts/LanguageContext';
import { SimplifiedTriggerDetailPanel } from './simplified-trigger-detail-panel';
import { TriggerCreationDialog } from './trigger-creation-dialog';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MessageSquare,
  Github,
  Slack,
  Clock,
  AlertCircle,
  Zap,
  Hash,
  Globe,
  Sparkles,
  Plus,
  ChevronDown,
  PlugZap,
  Webhook,
  Repeat,
  History
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useProjects, useThreads, processThreadsWithProjects, groupThreadsByDate } from '@/hooks/react-query/sidebar/use-sidebar';
import type { ThreadWithProject, GroupedThreads } from '@/hooks/react-query/sidebar/use-sidebar';

const getTriggerIcon = (triggerType: string) => {
  switch (triggerType.toLowerCase()) {
    case 'schedule':
    case 'scheduled':
      return Repeat;
    case 'telegram':
      return MessageSquare;
    case 'github':
      return Github;
    case 'slack':
      return Slack;
    case 'webhook':
      return Webhook;
    case 'discord':
      return Hash;
    case 'event':
      return Sparkles;
    default:
      return Globe;
  }
};

const getTriggerCategory = (triggerType: string): 'scheduled' | 'app' => {
  const scheduledTypes = ['schedule', 'scheduled'];
  return scheduledTypes.includes(triggerType.toLowerCase()) ? 'scheduled' : 'app';
};

const formatCronExpression = (cron?: string) => {
  if (!cron) return 'Not configured';

  const parts = cron.split(' ');
  if (parts.length !== 5) return cron;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  if (minute === '0' && hour === '0' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return 'Daily at midnight';
  }
  if (minute === '0' && hour === '*/1' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return 'Every hour';
  }
  if (minute === '*/15' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return 'Every 15 minutes';
  }
  if (minute === '*/30' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return 'Every 30 minutes';
  }
  if (minute === '0' && hour === '9' && dayOfMonth === '*' && month === '*' && dayOfWeek === '1-5') {
    return 'Weekdays at 9 AM';
  }
  if (minute === '0' && hour === String(hour) && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return `Daily at ${hour}:${minute.padStart(2, '0')}`;
  }

  return cron;
};

const TriggerListItem = ({
  trigger,
  onClick,
  isSelected
}: {
  trigger: TriggerWithAgent;
  onClick: () => void;
  isSelected: boolean;
}) => {
  const Icon = getTriggerIcon(trigger.trigger_type);
  const isScheduled = getTriggerCategory(trigger.trigger_type) === 'scheduled';

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl border group flex items-center justify-between px-4 py-3 cursor-pointer transition-all",
        isSelected ? "bg-muted border-foreground/20" : "dark:bg-card hover:bg-muted/50"
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{trigger.name}</span>
            <Badge
              variant={trigger.is_active ? "highlight" : "secondary"}
              className="text-xs"
            >
              {trigger.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
          {trigger.description && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {trigger.description}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {isScheduled && trigger.config?.cron_expression && (
          <span className="hidden sm:block">{formatCronExpression(trigger.config.cron_expression)}</span>
        )}
        <Repeat className="h-3 w-3" />
      </div>
    </div>
  );
};

const EmptyState = () => {
  const { t } = useLanguage();
  
  return (
    <div className="bg-muted/20 rounded-3xl border flex flex-col items-center justify-center py-16 px-4">
      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
        <Zap className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-2">
        {t('tasks.noTasks')}
      </h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
        {t('tasks.getStartedDescription')}
      </p>
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="flex items-center gap-3 p-4 border rounded-lg">
        <Skeleton className="h-4 w-4 rounded" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-3 w-20" />
      </div>
    ))}
  </div>
);

export function TriggersPage() {
  const { data: triggers = [], isLoading, error } = useAllTriggers();
  const { t } = useLanguage();
  const [selectedTrigger, setSelectedTrigger] = useState<TriggerWithAgent | null>(null);
  const [pendingTriggerId, setPendingTriggerId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [triggerDialogType, setTriggerDialogType] = useState<'schedule' | 'event' | null>(null);
  const router = useRouter();
  
  // Fetch threads and projects for history
  const { data: projects = [], isLoading: isProjectsLoading } = useProjects();
  const { data: threads = [], isLoading: isThreadsLoading } = useThreads();
  
  // Process and group threads
  const processedThreads = useMemo(() => 
    isProjectsLoading || isThreadsLoading 
      ? [] 
      : processThreadsWithProjects(threads, projects)
  , [threads, projects, isProjectsLoading, isThreadsLoading]);
  
  const groupedThreads = useMemo(() => 
    groupThreadsByDate(processedThreads)
  , [processedThreads]);
  
  const combinedThreads = useMemo(() => {
    return Object.values(groupedThreads).flat();
  }, [groupedThreads]);
  
  const sortedTriggers = useMemo(() => {
    return [...triggers].sort((a, b) => {
      if (a.is_active !== b.is_active) {
        return a.is_active ? -1 : 1;
      }
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [triggers]);

  useEffect(() => {
    if (pendingTriggerId) {
      const newTrigger = triggers.find(t => t.trigger_id === pendingTriggerId);
      if (newTrigger) {
        setSelectedTrigger(newTrigger);
        setPendingTriggerId(null);
      }
    }
  }, [triggers, pendingTriggerId]);

  useEffect(() => {
    if (selectedTrigger) {
      const updatedTrigger = triggers.find(t => t.trigger_id === selectedTrigger.trigger_id);
      if (updatedTrigger) {
        setSelectedTrigger(updatedTrigger);
      } else {
        setSelectedTrigger(null);
      }
    }
  }, [triggers, selectedTrigger?.trigger_id]);

  const handleClosePanel = () => {
    setSelectedTrigger(null);
  };

  const handleTriggerCreated = (triggerId: string) => {
    setTriggerDialogType(null);
    setPendingTriggerId(triggerId);
  };

  // Error state
  if (error) {
    return (
      <div className="h-screen flex flex-col">
        <div className="max-w-4xl mx-auto w-full py-8 px-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('tasks.failedToLoad')}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex justify-center">
          <div className={cn(
            "w-full px-4 transition-all duration-300 ease-in-out",
            selectedTrigger ? "max-w-2xl" : "max-w-4xl"
          )}>
            <div className="flex items-center justify-between py-10">
              <h1 className="text-xl font-semibold">{t('tasks.title')}</h1>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
                  <History className="h-4 w-4 mr-1" />
                  {t('tasks.history')}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4" />
                      {t('tasks.newTask')}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72">
                    <DropdownMenuItem onClick={() => setTriggerDialogType('schedule')} className='rounded-lg'>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span>{t('tasks.scheduledTask')}</span>
                        <span className="text-xs text-muted-foreground">
                          {t('tasks.scheduledTaskDescription')}
                        </span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTriggerDialogType('event')} className='rounded-lg'>
                      <PlugZap className="h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span>{t('tasks.eventBasedTask')}</span>
                        <span className="text-xs text-muted-foreground">
                          {t('tasks.eventBasedTaskDescription')}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700 scrollbar-track-transparent">
              <div className="flex justify-center">
                <div className={cn(
                  "w-full px-4 pb-8 transition-all duration-300 ease-in-out",
                  selectedTrigger ? "max-w-2xl" : "max-w-4xl"
                )}>
                  {isLoading ? (
                    <LoadingSkeleton />
                  ) : sortedTriggers.length === 0 ? (
                    <EmptyState />
                  ) : (
                    <div className="space-y-4">
                      {sortedTriggers.map(trigger => (
                        <TriggerListItem
                          key={trigger.trigger_id}
                          trigger={trigger}
                          isSelected={selectedTrigger?.trigger_id === trigger.trigger_id}
                          onClick={() => {
                            if (selectedTrigger?.trigger_id === trigger.trigger_id) {
                              setSelectedTrigger(null);
                            } else {
                              setSelectedTrigger(trigger);
                            }
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={cn(
        "h-screen transition-all duration-300 ease-in-out overflow-hidden border-l",
        selectedTrigger
          ? "w-full sm:w-[440px] xl:w-2xl"
          : "w-0"
      )}>
        {selectedTrigger && (
          <SimplifiedTriggerDetailPanel
            trigger={selectedTrigger}
            onClose={handleClosePanel}
          />
        )}
      </div>

      {/* History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('tasks.historyTitle')}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto space-y-4">
            {combinedThreads.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                {t('tasks.noTasks')}
              </div>
            ) : (
              Object.entries(groupedThreads).map(([dateGroup, threadsInGroup]) => (
                <div key={dateGroup}>
                  <div className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wider mb-2">
                    {dateGroup} ({threadsInGroup.length})
                  </div>
                  <div className="space-y-1">
                    {threadsInGroup.map((thread) => (
                      <Link
                        key={thread.threadId}
                        href={thread.url}
                        prefetch={false}
                        onClick={() => setHistoryOpen(false)}
                        className="block px-3 py-2 rounded-lg hover:bg-accent text-sm"
                      >
                        {thread.projectName}
                      </Link>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Trigger Creation Dialog */}
      {triggerDialogType && (
        <TriggerCreationDialog
          open={!!triggerDialogType}
          onOpenChange={(open) => {
            if (!open) {
              setTriggerDialogType(null);
            }
          }}
          type={triggerDialogType}
          onTriggerCreated={handleTriggerCreated}
        />
      )}
    </div>
  );
}
