'use client';

import React, { useState, Suspense, useCallback, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter, useSearchParams } from 'next/navigation';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import {
  ChatInput,
  ChatInputHandles,
} from '@/components/thread/chat-input/chat-input';
import {
  BillingError,
  AgentRunLimitError,
  ProjectLimitError,
} from '@/lib/api';
import { useIsMobile } from '@/hooks/use-mobile';
import { useBillingError } from '@/hooks/useBillingError';
import { BillingErrorAlert } from '@/components/billing/usage-limit-alert';
import { useAccounts } from '@/hooks/use-accounts';
import { useAuth } from '@/components/AuthProvider';
import { config, isLocalMode, isStagingMode } from '@/lib/config';
import { useInitiateAgentWithInvalidation } from '@/hooks/react-query/dashboard/use-initiate-agent';

import { useAgents } from '@/hooks/react-query/agents/use-agents';
import { cn } from '@/lib/utils';
import type { Agent } from '@/hooks/react-query/agents/utils';
import { BillingModal } from '@/components/billing/billing-modal';
import { useAgentSelection } from '@/lib/stores/agent-selection-store';
import { Examples } from './examples';
import { AgentExamples } from './examples/agent-examples';
import { useThreadQuery } from '@/hooks/react-query/threads/use-threads';
import { normalizeFilenameToNFC } from '@/lib/utils/unicode';
import { KortixLogo } from '../sidebar/kortix-logo';
import { AgentRunLimitDialog } from '@/components/thread/agent-run-limit-dialog';
import { CustomAgentsSection } from './custom-agents-section';
import { toast } from 'sonner';
import { ReleaseBadge } from '../auth/release-badge';
import { useDashboardTour } from '@/hooks/use-dashboard-tour';
import { TourConfirmationDialog } from '@/components/tour/TourConfirmationDialog';
import { Calendar, MessageSquare, Plus, Sparkles, Zap } from 'lucide-react';
import { AgentConfigurationDialog } from '@/components/agents/agent-configuration-dialog';
import { t, detectClientLanguage, type LanguageCode } from '@/lib/i18n';
import { LanguageSelectorSimple } from '@/components/ui/language-selector-simple';


const PENDING_PROMPT_KEY = 'pendingAgentPrompt';

  const dashboardTourSteps: Step[] = [
    {
      target: '[data-tour="chat-input"]',
      content: 'Type your questions or tasks here. Tars can help with research, analysis, automation, and much more.',
      title: 'Start a Conversation',
      placement: 'top',
      disableBeacon: true,
    },
    {
      target: '[data-tour="my-agents"]',
      content: 'Create and manage your custom AI agents here. Build specialized agents for different tasks and workflows.',
      title: 'Manage Your Agents',
      placement: 'right',
      disableBeacon: true,
    },
    {
      target: '[data-tour="examples"]',
      content: 'Get started quickly with these example prompts. Click any example to try it out.',
      title: 'Example Prompts',
      placement: 'top',
      disableBeacon: true,
    }
  ];

type DashboardContentProps = { evaMode?: 'only' | 'exclude' };

export function DashboardContent({ evaMode }: DashboardContentProps) {

  
  // Language state
  const [currentLang, setCurrentLang] = useState<LanguageCode>('en');

  // Initialize language
  useEffect(() => {
    const lang = detectClientLanguage();
    setCurrentLang(lang);
  }, []);
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [configAgentId, setConfigAgentId] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [autoSubmit, setAutoSubmit] = useState(false);
  const { 
    selectedAgentId, 
    setSelectedAgent, 
    initializeFromAgents,
    getCurrentAgent
  } = useAgentSelection();
  const [initiatedThreadId, setInitiatedThreadId] = useState<string | null>(null);
  const { billingError, handleBillingError, clearBillingError } =
    useBillingError();
  const [showAgentLimitDialog, setShowAgentLimitDialog] = useState(false);
  const [agentLimitData, setAgentLimitData] = useState<{
    runningCount: number;
    runningThreadIds: string[];
  } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { data: accounts } = useAccounts({ enabled: !!user });
  const personalAccount = accounts?.find((account) => account.personal_account);
  const chatInputRef = React.useRef<ChatInputHandles>(null);
  const initiateAgentMutation = useInitiateAgentWithInvalidation();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const disableTours = evaMode === 'only';

  // Tour integration
  const {
    run,
    stepIndex,
    setStepIndex,
    stopTour,
    showWelcome,
    handleWelcomeAccept,
    handleWelcomeDecline,
  } = useDashboardTour();

  // Ensure tour is completely disabled on pages that pass evaMode="only" (e.g., /construtor)
  useEffect(() => {
    if (disableTours) {
      stopTour();
    }
  }, [disableTours, stopTour]);

  // Feature flag for custom agents section

  // Fetch agents to get the selected agent's name
  const { data: agentsResponse } = useAgents({
    limit: 100,
    sort_by: 'name',
    sort_order: 'asc'
  });

  const filterByEva = (a: Agent) => {
    const name = (a.name || '').toLowerCase();
    if (evaMode === 'only') return name === 'eva';
    if (evaMode === 'exclude') return name !== 'eva';
    return true;
  };
  const filteredAgents = (agentsResponse?.agents || []).filter(filterByEva);

  // Force EVA as the active agent when evaMode="only" (e.g., /construtor)
  useEffect(() => {
    if (evaMode === 'only') {
      const eva = filteredAgents.find(a => (a.name || '').toLowerCase() === 'eva');
      if (eva && selectedAgentId !== eva.agent_id) {
        setSelectedAgent(eva.agent_id);
      }
    }
  }, [evaMode, filteredAgents, selectedAgentId, setSelectedAgent]);

  const selectedAgent = selectedAgentId
    ? filteredAgents.find(agent => agent.agent_id === selectedAgentId)
    : null;
  const displayName = selectedAgent?.name || 'Tars';
  const agentAvatar = undefined;
  const isTarsAgent = selectedAgent?.metadata?.is_suna_default || false;

  const threadQuery = useThreadQuery(initiatedThreadId || '');

  const enabledEnvironment = isStagingMode() || isLocalMode();

  React.useEffect(() => {
    if (filteredAgents.length > 0) {
      initializeFromAgents(filteredAgents, undefined, setSelectedAgent);
    }
  }, [filteredAgents, initializeFromAgents, setSelectedAgent]);

  React.useEffect(() => {
    const agentIdFromUrl = searchParams.get('agent_id');
    if (agentIdFromUrl && agentIdFromUrl !== selectedAgentId) {
      setSelectedAgent(agentIdFromUrl);
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('agent_id');
      router.replace(newUrl.pathname + newUrl.search, { scroll: false });
    }
  }, [searchParams, selectedAgentId, router, setSelectedAgent]);

  React.useEffect(() => {
    if (threadQuery.data && initiatedThreadId) {
      const thread = threadQuery.data;
      setIsRedirecting(true);
      if (thread.project_id) {
        router.push(`/projects/${thread.project_id}/thread/${initiatedThreadId}`);
      } else {
        router.push(`/agents/${initiatedThreadId}`);
      }
      setInitiatedThreadId(null);
    }
  }, [threadQuery.data, initiatedThreadId, router]);

  const handleTourCallback = useCallback((data: CallBackProps) => {
    const { status, type, index } = data;
    
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      stopTour();
    } else if (type === 'step:after') {
      setStepIndex(index + 1);
    }
  }, [stopTour, setStepIndex]);

  const handleSubmit = async (
    message: string,
    options?: {
      model_name?: string;
      enable_context_manager?: boolean;
    },
  ) => {
    if (
      (!message.trim() && !chatInputRef.current?.getPendingFiles().length) ||
      isSubmitting ||
      isRedirecting
    )
      return;

    setIsSubmitting(true);

    try {
      const files = chatInputRef.current?.getPendingFiles() || [];
      localStorage.removeItem(PENDING_PROMPT_KEY);

      const formData = new FormData();
      formData.append('prompt', message);

      // Add selected agent if one is chosen
      if (selectedAgentId) {
        formData.append('agent_id', selectedAgentId);
      }

      files.forEach((file, index) => {
        const normalizedName = normalizeFilenameToNFC(file.name);
        formData.append('files', file, normalizedName);
      });

      if (options?.model_name) formData.append('model_name', options.model_name);
      formData.append('stream', 'true'); // Always stream for better UX
      formData.append('enable_context_manager', String(options?.enable_context_manager ?? false));

      const result = await initiateAgentMutation.mutateAsync(formData);

      if (result.thread_id) {
        setInitiatedThreadId(result.thread_id);
        // Don't reset isSubmitting here - keep loading until redirect happens
      } else {
        throw new Error('Agent initiation did not return a thread_id.');
      }
      chatInputRef.current?.clearPendingFiles();
    } catch (error: any) {
      console.error('Error during submission process:', error);
      if (error instanceof BillingError) {
        setShowPaymentModal(true);
      } else if (error instanceof AgentRunLimitError) {
        const { running_thread_ids, running_count } = error.detail;
        setAgentLimitData({
          runningCount: running_count,
          runningThreadIds: running_thread_ids,
        });
        setShowAgentLimitDialog(true);
      } else if (error instanceof ProjectLimitError) {
        setShowPaymentModal(true);
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Operation failed';
        toast.error(errorMessage);
      }
      // Only reset loading state if there was an error or no thread_id was returned
      setIsSubmitting(false);
    }
  };

  React.useEffect(() => {
    const timer = setTimeout(() => {
      const pendingPrompt = localStorage.getItem(PENDING_PROMPT_KEY);

      if (pendingPrompt) {
        setInputValue(pendingPrompt);
        setAutoSubmit(true);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    if (autoSubmit && inputValue && !isSubmitting && !isRedirecting) {
      const timer = setTimeout(() => {
        handleSubmit(inputValue);
        setAutoSubmit(false);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [autoSubmit, inputValue, isSubmitting, isRedirecting]);

  return (
    <>
      {!disableTours && (
        <Joyride
        steps={dashboardTourSteps}
        run={run && !disableTours}
        stepIndex={stepIndex}
        callback={handleTourCallback}
        continuous
        showProgress
        showSkipButton
        disableOverlayClose
        disableScrollParentFix
        styles={{
          options: {
            primaryColor: '#000000',
            backgroundColor: '#ffffff',
            textColor: '#000000',
            overlayColor: 'rgba(0, 0, 0, 0.7)',
            arrowColor: '#ffffff',
            zIndex: 1000,
          },
          tooltip: {
            backgroundColor: '#ffffff',
            borderRadius: 8,
            fontSize: 14,
            padding: 20,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            border: '1px solid #e5e7eb',
          },
          tooltipTitle: {
            color: '#000000',
            fontSize: 16,
            fontWeight: 600,
            marginBottom: 8,
          },
          tooltipContent: {
            color: '#000000',
            fontSize: 14,
            lineHeight: 1.5,
          },
          buttonNext: {
            backgroundColor: '#000000',
            color: '#ffffff',
            fontSize: 12,
            padding: '8px 16px',
            borderRadius: 6,
            border: 'none',
            fontWeight: 500,
          },
          buttonBack: {
            color: '#6b7280',
            backgroundColor: 'transparent',
            fontSize: 12,
            padding: '8px 16px',
            border: '1px solid #e5e7eb',
            borderRadius: 6,
          },
          buttonSkip: {
            color: '#6b7280',
            backgroundColor: 'transparent',
            fontSize: 12,
            border: 'none',
          },
          buttonClose: {
            color: '#6b7280',
            backgroundColor: 'transparent',
          },
        }}
      />
      )}
      
      <TourConfirmationDialog
        open={showWelcome && !disableTours}
        onAccept={handleWelcomeAccept}
        onDecline={handleWelcomeDecline}
      />

      <BillingModal 
        open={showPaymentModal} 
        onOpenChange={setShowPaymentModal}
        showUsageLimitAlert={true}
      />
      
      <div className="flex flex-col h-screen w-full overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="min-h-full flex flex-col">
            {/* Language Selector - Wrapped in a client component */}
            <div className="absolute top-4 right-4 z-10">
              <LanguageSelectorSimple variant="icon" />
            </div>
            {/* {(
              <div className="flex justify-center px-4 pt-4 md:pt-8">
                <ReleaseBadge className='hover:cursor-pointer' text="Custom Agents, Playbooks, and more!" link="/agents?tab=my-agents" />
              </div>
            )} */}
            <div className="flex-1 flex items-center justify-center px-4 py-8">
              <div className="w-full max-w-[650px] flex flex-col items-center justify-center space-y-4 md:space-y-6">
                <div className="flex flex-col items-center text-center w-full">
                  <p 
                    className="tracking-tight text-2xl md:text-3xl font-normal text-foreground/90"
                    data-tour="dashboard-title"
                  >
                    {evaMode === 'only' ? (
                      <>{t('dashboard.question', currentLang).replace('?', '')} <span className="text-green-400">life</span>?</>
                    ) : (
                      t('dashboard.question', currentLang)
                    )}
                  </p>
                </div>
                <div className="w-full" data-tour="chat-input">
                  <ChatInput
                    ref={chatInputRef}
                    onSubmit={handleSubmit}
                    loading={isSubmitting || isRedirecting}
                    placeholder={t('dashboard.placeholder', currentLang) || 'Describe what you need help with...'}
                    value={inputValue}
                    onChange={setInputValue}
                    hideAttachments={false}
                    selectedAgentId={selectedAgentId}
                    onAgentSelect={setSelectedAgent}
                    enableAdvancedConfig={true}
                    evaMode={evaMode}
                    onConfigureAgent={(agentId) => {
                      setConfigAgentId(agentId);
                      setShowConfigDialog(true);
                    }}
                  />
                </div>
                
                {/* Examples section - right after chat input (hidden on /construtor) */}
                {evaMode !== 'only' && (
                  <div className="w-full pt-2" data-tour="examples">
                    <Examples 
                      onSelectPrompt={setInputValue} 
                      count={isMobile ? 2 : 4} 
                    />
                  </div>
                )}
                
                {/* AgentExamples section - commented out */}
                {/* <div className="w-full pt-2" data-tour="examples">
                  <AgentExamples 
                    selectedAgentId={selectedAgentId}
                    onSelectPrompt={setInputValue} 
                    count={isMobile ? 4 : 8} 
                  />
                </div> */}
              </div>
            </div>
            
          </div>
        </div>
        
        <BillingErrorAlert
          message={billingError?.message}
          currentUsage={billingError?.currentUsage}
          limit={billingError?.limit}
          accountId={personalAccount?.account_id}
          onDismiss={clearBillingError}
          isOpen={!!billingError}
        />
      </div>

      {agentLimitData && (
        <AgentRunLimitDialog
          open={showAgentLimitDialog}
          onOpenChange={setShowAgentLimitDialog}
          runningCount={agentLimitData.runningCount}
          runningThreadIds={agentLimitData.runningThreadIds}
          projectId={undefined}
        />
      )}
      
      {configAgentId && (
        <AgentConfigurationDialog
          open={showConfigDialog}
          onOpenChange={setShowConfigDialog}
          agentId={configAgentId}
          onAgentChange={(newAgentId) => {
            setConfigAgentId(newAgentId);
            setSelectedAgent(newAgentId);
          }}
        />
      )}
    </>
  );
}
