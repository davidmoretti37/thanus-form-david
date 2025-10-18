import { useTheme } from '@/hooks/useThemeColor';
import { useSelectedAgent, useSelectedModel, useSetSelectedAgent, useSetSelectedModel } from '@/stores/ui-store';
import { ChevronDown } from 'lucide-react-native';
import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { AgentModelSelector } from './AgentModelSelector';
import { Body, Caption } from './Typography';
import { Agent, Model } from '@/api/chat-api';

export const AgentModelSelectorSection: React.FC = () => {
    const theme = useTheme();
    const [selectorVisible, setSelectorVisible] = useState(false);

    const selectedAgent = useSelectedAgent();
    const selectedModel = useSelectedModel();
    const setSelectedAgent = useSetSelectedAgent();
    const setSelectedModel = useSetSelectedModel();

    const handleAgentSelect = (agent: Agent) => {
        setSelectedAgent(agent);
        console.log('[AgentModelSelectorSection] Selected agent:', agent.name);
    };

    const handleModelSelect = (model: Model) => {
        setSelectedModel(model);
        console.log('[AgentModelSelectorSection] Selected model:', model.display_name);
    };

    const styles = StyleSheet.create({
        container: {
            paddingHorizontal: 16,
            paddingVertical: 8,
            gap: 8,
        },
        selectorButton: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 12,
            paddingVertical: 12,
            backgroundColor: theme.mutedWithOpacity(0.05),
            borderRadius: 8,
            borderWidth: 1,
            borderColor: theme.border,
        },
        selectorContent: {
            flex: 1,
            gap: 4,
        },
        selectorLabel: {
            color: theme.mutedForeground,
            fontSize: 12,
            fontWeight: '500',
            textTransform: 'uppercase' as const,
        },
        selectorValue: {
            color: theme.foreground,
            fontSize: 14,
            fontWeight: '500',
        },
        chevron: {
            marginLeft: 8,
        },
        row: {
            flexDirection: 'row',
            gap: 8,
        },
    });

    return (
        <>
            <View style={styles.container}>
                <TouchableOpacity
                    style={styles.selectorButton}
                    onPress={() => setSelectorVisible(true)}
                    activeOpacity={0.7}
                >
                    <View style={styles.selectorContent}>
                        <Caption style={styles.selectorLabel}>Agent & Model</Caption>
                        <View style={styles.row}>
                            <Body style={styles.selectorValue}>
                                {selectedAgent?.name || 'Select Agent'}
                            </Body>
                            {selectedModel && (
                                <>
                                    <Body style={[styles.selectorValue, { opacity: 0.5 }]}>•</Body>
                                    <Body style={styles.selectorValue}>
                                        {selectedModel.display_name}
                                    </Body>
                                </>
                            )}
                        </View>
                    </View>
                    <ChevronDown size={18} color={theme.mutedForeground} style={styles.chevron} />
                </TouchableOpacity>
            </View>

            {/* Modal Popup */}
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
