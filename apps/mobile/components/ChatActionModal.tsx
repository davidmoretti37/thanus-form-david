import { useTheme } from '@/hooks/useThemeColor';
import { Copy, Share2, Trash2 } from 'lucide-react-native';
import React from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Body } from './Typography';

interface ChatActionModalProps {
    visible: boolean;
    onClose: () => void;
    onCopy: () => void;
    onShare: () => void;
    onDelete: () => void;
    sourceLayout?: { x: number; y: number; width: number; height: number };
}

export const ChatActionModal: React.FC<ChatActionModalProps> = ({
    visible,
    onClose,
    onCopy,
    onShare,
    onDelete,
    sourceLayout,
}) => {
    const theme = useTheme();

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
                        onPress={() => {
                            onCopy();
                            onClose();
                        }}
                    >
                        <Copy size={18} color={theme.foreground} />
                        <Body style={[styles.menuItemText, { color: theme.foreground }]}>
                            Copy
                        </Body>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.menuItem, { borderBottomColor: theme.border }]}
                        onPress={() => {
                            onShare();
                            onClose();
                        }}
                    >
                        <Share2 size={18} color={theme.foreground} />
                        <Body style={[styles.menuItemText, { color: theme.foreground }]}>
                            Share
                        </Body>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => {
                            onDelete();
                            onClose();
                        }}
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
