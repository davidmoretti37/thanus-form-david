import { AttachmentGroup } from '@/components/AttachmentGroup';
import { useTheme } from '@/hooks/useThemeColor';
import { useSelectedProject, useSelectedAgent, useSelectedModel, useSetSelectedAgent, useSetSelectedModel } from '@/stores/ui-store';
import { handleLocalFiles, pickFiles, UploadedFile, uploadFilesToSandbox } from '@/utils/file-upload';
import { ArrowUp, Paperclip, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AgentModelSelector } from './AgentModelSelector';
import { Body, Caption } from './Typography';
import { Agent, Model } from '@/api/chat-api';

interface ChatInputProps {
    onSendMessage: (message: string, files?: UploadedFile[]) => void;
    placeholder?: string;
    isGenerating?: boolean;
    isSending?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
    onSendMessage,
    placeholder = 'What would you like to do today?',
    isGenerating = false,
    isSending = false,
}) => {
    const [message, setMessage] = useState('');
    const [attachedFiles, setAttachedFiles] = useState<UploadedFile[]>([]);
    const [selectorVisible, setSelectorVisible] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    
    const selectedProject = useSelectedProject();
    const theme = useTheme();
    const insets = useSafeAreaInsets();

    const selectedAgent = useSelectedAgent();
    const selectedModel = useSelectedModel();
    const setSelectedAgent = useSetSelectedAgent();
    const setSelectedModel = useSetSelectedModel();

    const sandboxId = selectedProject?.sandbox?.id;


    const handleSend = () => {
        if (message.trim() || attachedFiles.length > 0) {
            let finalMessage = message.trim();

            if (attachedFiles.length > 0 && sandboxId) {
                const fileInfo = attachedFiles
                    .map(file => `[Uploaded File: ${file.path}]`)
                    .join('\n');
                finalMessage = finalMessage ? `${finalMessage}\n\n${fileInfo}` : fileInfo;
            }

            onSendMessage(finalMessage, attachedFiles);
            setMessage('');
            setAttachedFiles([]);
        }
    };

    const handleAttach = async () => {
        try {
            const files = await pickFiles();
            if (files.length > 0) {
                const uploaded = await handleLocalFiles(files, sandboxId || '');
                setAttachedFiles(prev => [...prev, ...uploaded]);
            }
        } catch (error) {
            console.error('Error handling file attachment:', error);
        }
    };

    const handleAgentSelect = (agent: Agent) => {
        setSelectedAgent(agent);
        setSelectorVisible(false);
    };

    const handleModelSelect = (model: Model) => {
        setSelectedModel(model);
        setSelectorVisible(false);
    };

    const styles = StyleSheet.create({
        container: {
            paddingHorizontal: 12,
            paddingVertical: 4,
            paddingBottom: Math.max(2, insets.bottom),
            backgroundColor: theme.background,
            height: 132,
        },
        mainContainer: {
            borderRadius: 20,
            borderWidth: 1,
            borderColor: theme.border,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 5,
            backgroundColor: theme.mutedWithOpacity(0.04),
        },
        inputSection: {
            flexDirection: 'column',
            paddingHorizontal: 12,
            paddingTop: 6,
            paddingBottom: 0,
            gap: 0,
            height: 104,
        },
        inputRow: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 10,
            marginBottom: 8,
        },
        attachButton: {
            width: 40,
            height: 40,
            borderRadius: 10,
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 0,
            backgroundColor: theme.mutedWithOpacity(0.1),
            borderWidth: 1,
            borderColor: theme.border,
        },
        attachButtonActive: {
            backgroundColor: theme.primary,
            borderColor: theme.primary,
        },
        inputField: {
            flex: 1,
            fontSize: 15,
            color: theme.foreground,
            paddingVertical: 8,
            paddingHorizontal: 6,
            minHeight: 40,
            maxHeight: 100,
        },
        rightButtons: {
            gap: 8,
            alignItems: 'center',
            marginTop: 0,
        },
        sendButton: {
            width: 44,
            height: 44,
            borderRadius: 10,
            backgroundColor: '#007AFF',
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#007AFF',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.4,
            shadowRadius: 8,
            elevation: 5,
        },
        sendButtonDisabled: {
            backgroundColor: theme.mutedForeground,
            shadowOpacity: 0,
        },
        agentButton: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            paddingHorizontal: 10,
            paddingVertical: 8,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.mutedWithOpacity(0.1),
        },
        agentButtonText: {
            color: theme.foreground,
            fontSize: 11,
            fontWeight: '500',
        },
        agentButtonInline: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            height: 40,
            paddingHorizontal: 8,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.mutedWithOpacity(0.08),
        },
        agentButtonInlineText: {
            color: theme.foreground,
            fontSize: 10,
            fontWeight: '500',
        },

        attachmentGroup: {
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderTopWidth: 1,
            borderTopColor: theme.border,
        },
    });

  const SelectedQuickActionChips = () => (
    <View style={styles.chipsRow}>
      {selectedQuickActions.map((qa) => (
        <View key={`${qa.actionId}:${qa.optionId}`} style={styles.chip}>
          <Body style={styles.chipText}>{qa.actionLabel}: {qa.optionLabel}</Body>
          <TouchableOpacity onPress={() => removeSelectedQuickAction(qa.optionId)}>
            <X size={14} color={theme.mutedForeground} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );

    const isStreaming = isGenerating || isSending;
    const canSend = (message.trim() || attachedFiles.length > 0) && !isStreaming;

    return (
        <>
            <View style={styles.container}>
                <View style={styles.mainContainer}>
                    {/* Main Input Section */}
                    <View style={styles.inputSection}>
                        {/* Input Row */}
                        <View style={styles.inputRow}>
                            {/* Attach Button - Left */}
                            <TouchableOpacity
                            style={[styles.attachButton, attachedFiles.length > 0 && styles.attachButtonActive]}
                            onPress={handleAttach}
                            disabled={isStreaming}
                            activeOpacity={0.7}
                        >
                            <Paperclip 
                                size={18} 
                                color={attachedFiles.length > 0 ? '#fff' : theme.mutedForeground} 
                                strokeWidth={2} 
                            />
                        </TouchableOpacity>

                        {/* Text Input - Center */}
                        <TextInput
                            style={styles.inputField}
                            placeholder={placeholder}
                            placeholderTextColor={theme.mutedWithOpacity(0.4)}
                            value={message}
                            onChangeText={setMessage}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            multiline
                            maxLength={4000}
                            editable={!isStreaming}
                        />

                        {/* Right Side - Send Button Only */}
                        <View style={styles.rightButtons}>
                            {/* Send Button */}
                            <TouchableOpacity
                                style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
                                onPress={handleSend}
                                disabled={!canSend}
                                activeOpacity={0.85}
                            >
                                <ArrowUp 
                                    size={20} 
                                    color={canSend ? '#fff' : theme.mutedForeground} 
                                    strokeWidth={2.5} 
                                />
                            </TouchableOpacity>
                        </View>
                        </View>
                    </View>

                    {/* Attached Files - If any */}
                    {attachedFiles.length > 0 && (
                        <View style={styles.attachmentGroup}>
                            <AttachmentGroup
                                files={attachedFiles}
                                onRemove={(index) => {
                                    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
                                }}
                            />
                        </View>
                    )}
                </View>

            </View>

            {/* Agent/Model Selector Modal */}
            <AgentModelSelector
                visible={selectorVisible}
                onClose={() => setSelectorVisible(false)}
                selectedAgentId={selectedAgent?.agent_id}
                selectedModelName={selectedModel?.name}
                onAgentSelect={handleAgentSelect}
                onModelSelect={handleModelSelect}
            />
        </>
    );
};
