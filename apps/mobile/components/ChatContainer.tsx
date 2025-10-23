import { commonStyles } from '@/constants/CommonStyles';
import { useChatSession, useNewChatSession } from '@/hooks/useChatHooks';
import { useThemedStyles, useTheme } from '@/hooks/useThemeColor';
import { useIsNewChatMode, useSelectedProject } from '@/stores/ui-store';
import { UploadedFile } from '@/utils/file-upload';
import React, { useEffect, useState } from 'react';
import { Keyboard, KeyboardEvent, Platform, View, TouchableOpacity, KeyboardAvoidingView, Text } from 'react-native';
import { CreateWorkerChatInput } from './CreateWorkerChatInput';
import { ToolsModal } from './ToolsModal';
import { InstructionsModal } from './InstructionsModal';
import { KnowledgeModal } from './KnowledgeModal';
import { TriggersModal } from './TriggersModal';
import { IntegrationsModal } from './IntegrationsModal';
import { MessageThread } from './MessageThread';
import { SkeletonText } from './Skeleton';
import { Body } from './Typography';
import { useUIStore } from '@/stores/ui-store';
import { X } from 'lucide-react-native';
import { QuickActionBar } from '@/components/quick-actions/QuickActionBar';
import { ChatHeader } from './ChatHeader';

interface ChatContainerProps {
    className?: string;
    onNavigateToDashboard?: () => void;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({ className, onNavigateToDashboard }) => {
    const theme = useTheme();
    const selectedProject = useSelectedProject();
    const [newMessage, setNewMessage] = useState('');
  const [toolsModalVisible, setToolsModalVisible] = useState(false);
  const [instructionsModalVisible, setInstructionsModalVisible] = useState(false);
  const [knowledgeModalVisible, setKnowledgeModalVisible] = useState(false);
  const [triggersModalVisible, setTriggersModalVisible] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<{id: string, name: string} | null>(null);
    const [integrationsModalVisible, setIntegrationsModalVisible] = useState(false);
    const isNewChatMode = useIsNewChatMode();
    const [isAtBottomOfChat, setIsAtBottomOfChat] = useState(true);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    // Use appropriate chat session based on mode
    const projectChatSession = useChatSession(
        (!isNewChatMode && selectedProject?.id && selectedProject.id !== 'new-chat-temp')
            ? selectedProject.id
            : ''
    );
    const newChatSession = useNewChatSession();

    // Select the right session based on mode
    const chatSession = isNewChatMode ? newChatSession : projectChatSession;

    const {
        messages,
        sendMessage,
        stopAgent,
        isGenerating,
        streamContent,
        streamError,
    } = chatSession;

    // For project mode, we still need these specific loading states
    const { isLoadingThread, isLoadingMessages, isSending: projectIsSending } = isNewChatMode ?
        { isLoadingThread: false, isLoadingMessages: false, isSending: false } :
        projectChatSession;

    // Get the correct isSending state based on mode
    const isSending = isNewChatMode ? (newChatSession.isSending || false) : projectIsSending;

    // Track keyboard height for dynamic adjustment
    useEffect(() => {
        const handleKeyboardShow = (event: KeyboardEvent) => {
            setKeyboardHeight(event.endCoordinates.height);
        };

        const handleKeyboardHide = () => {
            setKeyboardHeight(0);
        };

        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const showSubscription = Keyboard.addListener(showEvent, handleKeyboardShow);
        const hideSubscription = Keyboard.addListener(hideEvent, handleKeyboardHide);

        return () => {
            showSubscription.remove();
            hideSubscription.remove();
        };
    }, []);

    const styles = useThemedStyles((theme) => ({
        container: {
            flex: 1,
            backgroundColor: theme.background,
            position: 'relative',
        },
        loadingContainer: {
            ...commonStyles.flexCenter,
            backgroundColor: theme.background,
            paddingHorizontal: 32,
        },
        emptyContainer: {
            ...commonStyles.flexCenter,
            backgroundColor: theme.background,
            paddingHorizontal: 32,
        },
        emptyText: {
            color: theme.mutedForeground,
            fontSize: 18,
            textAlign: 'center' as const,
            lineHeight: 24,
        },
        emptySubtext: {
            color: theme.mutedForeground,
            fontSize: 14,
            textAlign: 'center' as const,
            marginTop: 8,
            opacity: 0.7,
        },
        chatContent: {
            flex: 1,
        },
    actionsSpacer: {
      height: 0,
    },
    chipsRow: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      paddingHorizontal: 16,
      paddingTop: 0,
      marginTop: 2,
      paddingBottom: 6,
      alignItems: 'center' as const,
      backgroundColor: theme.background,
    },
    chip: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginRight: 8,
      marginBottom: 8,
      borderRadius: 14,
      height: 28,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.mutedWithOpacity(0.08),
    },
    chipText: {
      color: theme.foreground,
      fontSize: 12,
    },
    }));

  const selectedQuickActions = useUIStore((s) => s.selectedQuickActions);
  const removeSelectedQuickAction = useUIStore((s) => s.removeSelectedQuickAction);

  const SelectedQuickActionChips = () => (
    <View style={styles.chipsRow}>
      {selectedQuickActions.map((qa) => (
        <View key={`${qa.actionId}:${qa.optionId}`} style={styles.chip}>
          <Body style={styles.chipText}>{qa.actionLabel}: {qa.optionLabel}</Body>
          <TouchableOpacity onPress={() => removeSelectedQuickAction(qa.optionId)}>
            <X size={14} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );

    const handleScrollPositionChange = (isAtBottom: boolean) => {
        setIsAtBottomOfChat(isAtBottom);
    };

    // Show loading state while thread is being fetched (NOT created) - only for project mode
    if (!isNewChatMode && selectedProject && isLoadingThread) {
        return (
            <View style={styles.loadingContainer}>
                <SkeletonText lines={3} />
            </View>
        );
    }

    // Show empty state when no project is selected - ONLY in project mode
    if (!isNewChatMode && !selectedProject) {
        return (
            <View style={styles.emptyContainer}>
                <Body style={styles.emptyText}>Select a project to start chatting</Body>
                <Body style={styles.emptySubtext}>
                    Choose a project from the sidebar to begin your conversation.
                </Body>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 20 : 0 }]}>
            {/* Chat Header with all original buttons */}
            <ChatHeader 
                onMenuPress={() => {
                    // Open chat history
                    useUIStore.getState().setLeftPanelContent('history');
                    useUIStore.getState().setLeftPanelVisible(true);
                }}
                onSettingsPress={() => {
                    // Open right panel to show agent creations
                    useUIStore.getState().setRightPanelVisible(true);
                }}
                onBackPress={onNavigateToDashboard}
            />
            <View style={styles.chatContent}>
                <MessageThread
                    messages={messages}
                    isGenerating={isGenerating}
                    isSending={isSending}
                    streamContent={streamContent}
                    streamError={streamError}
                    isLoadingMessages={isLoadingMessages}
                    onScrollPositionChange={handleScrollPositionChange}
                    keyboardHeight={keyboardHeight}
                    sandboxId={selectedProject?.sandbox?.id}
                />
            </View>
      {/* Hide quick actions while typing, but keep selected chips visible */}
      {keyboardHeight === 0 && (
        <>
          <QuickActionBar />
          <View style={styles.actionsSpacer} />
        </>
      )}
      <SelectedQuickActionChips />
      <CreateWorkerChatInput
        placeholder={
          isGenerating
            ? "AI is responding..."
            : isSending
                ? "Sending..."
                : isNewChatMode
                    ? "Start a new conversation..."
                    : `Chat with ${selectedProject?.name || 'project'}...`
        }
        value={newMessage}
        onChangeText={setNewMessage}
        onSubmit={(message, selectedAgent, attachedFiles) => {
          console.log('💬 CHAT CONTAINER onSubmit CALLED with:');
          console.log('📝 Message:', message);
          console.log('📎 Attached Files:', attachedFiles?.length || 0);
          console.log('🤖 Selected Agent:', selectedAgent?.agent_id || 'null');
          
          // Store the selected agent for use in modals
          if (selectedAgent) {
            const agentForModals = {
              id: selectedAgent.agent_id,
              name: selectedAgent.name || 'Unknown Agent'
            };
            setSelectedAgent(agentForModals);
            console.log('🔧 ChatContainer: Updated selectedAgent for modals:', agentForModals);
          }
          
          if (message.trim() || (attachedFiles && attachedFiles.length > 0)) {
            if (isNewChatMode) {
              (newChatSession.sendMessage as any)(message, attachedFiles || []);
            } else {
              sendMessage(message);
            }
            setNewMessage('');
          }
        }}
        onFileAttach={() => console.log('File attach pressed')}
        onAgentSelect={(agent) => {
          console.log('🔧 Agent selected in ChatContainer:', agent);
          if (agent) {
            setSelectedAgent({
              id: agent.agent_id,
              name: agent.name || 'Unknown Agent'
            });
            console.log('🔧 ChatContainer: Updated selectedAgent state:', agent.agent_id, agent.name);
          }
        }}
        onIntegrations={() => setIntegrationsModalVisible(true)}
        onTools={() => {
          console.log('🔧 Tools button clicked, selectedAgent:', selectedAgent);
          setToolsModalVisible(true);
        }}
        onInstructions={() => setInstructionsModalVisible(true)}
        onKnowledge={() => setKnowledgeModalVisible(true)}
        onTriggers={() => setTriggersModalVisible(true)}
      />

      {/* Dedicated Modals */}
      <ToolsModal
        visible={toolsModalVisible}
        onClose={() => setToolsModalVisible(false)}
        selectedAgent={selectedAgent}
      />
      
      <InstructionsModal
        visible={instructionsModalVisible}
        onClose={() => setInstructionsModalVisible(false)}
        selectedAgent={selectedAgent}
      />
      
      <KnowledgeModal
        visible={knowledgeModalVisible}
        onClose={() => setKnowledgeModalVisible(false)}
      />
      
      <TriggersModal
        visible={triggersModalVisible}
        onClose={() => setTriggersModalVisible(false)}
      />
      
      <IntegrationsModal
        visible={integrationsModalVisible}
        onClose={() => setIntegrationsModalVisible(false)}
      />
        </View>
    );
}; 