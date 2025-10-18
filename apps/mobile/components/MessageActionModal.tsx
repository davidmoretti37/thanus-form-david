import { Message } from '@/api/chat-api';
import { useTheme } from '@/hooks/useThemeColor';
import { Copy, Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { Modal, Platform, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Body, Caption } from './Typography';

interface MessageActionModalProps {
    visible: boolean;
    message?: Message;
    onClose: () => void;
    onCopy: (text: string) => void;
    onDelete: (messageId: string) => void;
    sourceLayout?: { x: number; y: number; width: number; height: number };
}

export const MessageActionModal: React.FC<MessageActionModalProps> = ({
    visible,
    message,
    onClose,
    onCopy,
    onDelete,
    sourceLayout,
}) => {
    const theme = useTheme();
    const insets = useSafeAreaInsets();

    if (!message) return null;

    const handleCopy = () => {
        const text = message.message || '';
        onCopy(text);
        onClose();
    };

    const handleDelete = () => {
        onDelete(message.message_id);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
                activeOpacity={1}
                onPress={onClose}
            >
                <View
                    style={[
                        styles.menuContainer,
                        {
                            backgroundColor: theme.card,
                            borderColor: theme.border,
                            top: sourceLayout?.y ?? 100,
                            left: sourceLayout?.x ?? 20,
                        },
                    ]}
                >
                    <TouchableOpacity
                        style={[styles.menuItem, { borderBottomColor: theme.border }]}
                        onPress={handleCopy}
                    >
                        <Copy size={18} color={theme.foreground} />
                        <Body style={[styles.menuItemText, { color: theme.foreground }]}>
                            Copy
                        </Body>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={handleDelete}
                    >
                        <Trash2 size={18} color={theme.destructive} />
                        <Body style={[styles.menuItemText, { color: theme.destructive }]}>
                            Delete
                        </Body>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
    },
    menuContainer: {
        position: 'absolute',
        borderRadius: 8,
        borderWidth: 1,
        minWidth: 150,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    menuItemText: {
        marginLeft: 12,
        fontSize: 14,
    },
});
