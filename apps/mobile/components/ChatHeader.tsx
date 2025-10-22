import { useTheme } from '@/hooks/useThemeColor';
import { useSelectedAgent, useSelectedModel, useSetSelectedAgent, useSetSelectedModel } from '@/stores/ui-store';
import { ChevronRight, Monitor, Menu } from 'lucide-react-native';
import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AgentModelSelector } from './AgentModelSelector';
import { H5, H6 } from './Typography';
import { ThemeSwitcher } from './ThemeSwitcher';
import { useSetLeftPanelVisible, useSetRightPanelVisible, useUIStore } from '@/stores/ui-store';

interface ChatHeaderProps {
    onMenuPress?: () => void;
    onSettingsPress?: () => void;
    onBackPress?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
    onMenuPress,
    onSettingsPress,
    onBackPress,
}) => {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    
    const selectedAgent = useSelectedAgent();
    const selectedModel = useSelectedModel();
    const setSelectedAgent = useSetSelectedAgent();
    const setSelectedModel = useSetSelectedModel();

    const [selectorVisible, setSelectorVisible] = useState(false);

    const handleAgentSelect = (agent: any) => {
        setSelectedAgent(agent);
        console.log('[ChatHeader] Selected agent:', agent.name);
    };

    const handleModelSelect = (model: any) => {
        setSelectedModel(model);
        console.log('[ChatHeader] Selected model:', model.display_name);
    };

    const styles = StyleSheet.create({
        container: {
            backgroundColor: theme.background,
            borderBottomColor: theme.border,
            borderBottomWidth: 1,
            paddingTop: insets.top + 4,
            paddingHorizontal: 16,
            paddingBottom: 4,
        },
        content: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
        },
        leftRow: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        rightRow: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        spacing: {
            marginLeft: 8,
        },
        titleSection: {
            flex: 1,
            gap: 2,
        },
        title: {
            color: theme.foreground,
            fontSize: 24,
            fontWeight: '700',
        },
        subtitle: {
            color: theme.mutedForeground,
            fontSize: 13,
            opacity: 0.7,
        },
        iconButton: {
            width: 32,
            height: 32,
            borderRadius: 8,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: theme.mutedWithOpacity(0.08),
            borderWidth: 1,
            borderColor: theme.border,
        },
        iconButtonActive: {
            backgroundColor: theme.primary,
            borderColor: theme.primary,
        },
    });

    return (
        <>
            <View style={styles.container}>
            <View style={styles.content}>
                    {/* Left controls: chevron (open) + chat history button */}
                    <View style={styles.leftRow}>
                        <TouchableOpacity
                            style={styles.iconButton}
                            onPress={onBackPress}
                            activeOpacity={0.6}
                            accessibilityLabel="Back to Dashboard"
                            accessibilityHint="Goes back to the main dashboard"
                        >
                            <ChevronRight size={20} color={theme.foreground} strokeWidth={2} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.iconButton, styles.spacing]}
                            onPress={() => {
                                // Open HISTORY drawer
                                useUIStore.getState().setLeftPanelContent('history');
                                useUIStore.getState().setLeftPanelVisible(true);
                            }}
                            activeOpacity={0.6}
                            accessibilityLabel="Chat history"
                            accessibilityHint="Opens the left side chat history"
                        >
                            <Menu size={20} color={theme.foreground} strokeWidth={2} />
                        </TouchableOpacity>
                    </View>

                    {/* Spacer */}
                    <View style={styles.titleSection} />

                    {/* Right controls: theme toggle + settings */}
                    <View style={styles.rightRow}>
                        <ThemeSwitcher variant="icon" />
                        <TouchableOpacity
                            style={[styles.iconButton, styles.spacing]}
                            onPress={() => {
                                // Open RIGHT panel to show what agents are creating
                                useUIStore.getState().setRightPanelVisible(true);
                            }}
                            activeOpacity={0.6}
                            accessibilityLabel="Show Agent Creations"
                            accessibilityHint="Shows what the agents are creating"
                        >
                            <Monitor size={20} color={theme.foreground} strokeWidth={2} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Agent/Model Selector Modal - shown when triggered */}
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
