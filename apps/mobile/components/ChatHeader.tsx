import { useTheme } from '@/hooks/useThemeColor';
import { useSelectedAgent, useSelectedModel, useSetSelectedAgent, useSetSelectedModel } from '@/stores/ui-store';
import { Menu, Settings } from 'lucide-react-native';
import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AgentModelSelector } from './AgentModelSelector';
import { H5, H6 } from './Typography';

interface ChatHeaderProps {
    onMenuPress?: () => void;
    onSettingsPress?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
    onMenuPress,
    onSettingsPress,
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
            paddingTop: insets.top + 14,
            paddingHorizontal: 16,
            paddingBottom: 14,
        },
        content: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
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
            width: 40,
            height: 40,
            borderRadius: 10,
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
                    {/* Menu Button */}
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={onMenuPress}
                        activeOpacity={0.6}
                    >
                        <Menu size={20} color={theme.foreground} strokeWidth={2} />
                    </TouchableOpacity>

                    {/* Spacer */}
                    <View style={styles.titleSection} />

                    {/* Settings Button */}
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={onSettingsPress}
                        activeOpacity={0.6}
                    >
                        <Settings size={20} color={theme.foreground} strokeWidth={2} />
                    </TouchableOpacity>
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
