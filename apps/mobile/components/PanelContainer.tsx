import { Message } from '@/api/chat-api';
import { useThemedStyles } from '@/hooks/useThemeColor';
import { useSelectedProject } from '@/stores/ui-store';
import React, { useRef } from 'react';
import { Dimensions, View } from 'react-native';
// Removed DrawerLayout from react-native-gesture-handler due to version conflicts
// import { DrawerLayout } from 'react-native-gesture-handler';
import { LeftPanel } from './LeftPanel';
import { RightPanel } from './RightPanel';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PanelContainerProps {
    leftPanelVisible: boolean;
    rightPanelVisible: boolean;
    onCloseLeft: () => void;
    onCloseRight: () => void;
    onOpenLeft: () => void;
    children: React.ReactNode;
    messages?: Message[];
}

export const PanelContainer: React.FC<PanelContainerProps> = ({
    leftPanelVisible,
    rightPanelVisible,
    onCloseLeft,
    onCloseRight,
    onOpenLeft,
    children,
    messages = [],
}) => {
    const theme = useThemedStyles(t => ({
        container: {
            flex: 1,
            backgroundColor: t.background,
            flexDirection: 'row',
        },
        center: {
            flex: 1,
        },
    }));

    return (
        <View style={theme.container}>
            <View style={theme.center}>
                {children}
            </View>
            {leftPanelVisible && (
                <View style={{ 
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: SCREEN_WIDTH * 0.8, 
                    maxWidth: 300,
                    height: '100%',
                    zIndex: 1000,
                    borderRightWidth: 0, 
                    borderRightColor: 'transparent',
                    backgroundColor: theme.background,
                }}>
                    <LeftPanel isVisible={leftPanelVisible} onClose={onCloseLeft} />
                </View>
            )}
            {rightPanelVisible && (
                <View style={{ 
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: SCREEN_WIDTH,
                    height: '100%',
                    zIndex: 1000,
                    backgroundColor: theme.background,
                    borderLeftWidth: 0,
                    borderLeftColor: 'transparent',
                }}>
                    <RightPanel isVisible={rightPanelVisible} onClose={onCloseRight} messages={messages} />
                </View>
            )}
        </View>
    );
};
