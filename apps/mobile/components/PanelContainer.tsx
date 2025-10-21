import { Message } from '@/api/chat-api';
import { useThemedStyles } from '@/hooks/useThemeColor';
import { useSelectedProject } from '@/stores/ui-store';
import React, { useEffect, useRef } from 'react';
import { Dimensions, View, Animated, Easing, TouchableWithoutFeedback } from 'react-native';
// Removed DrawerLayout from react-native-gesture-handler due to version conflicts
// import { DrawerLayout } from 'react-native-gesture-handler';
import { LeftPanel } from './LeftPanel';
import { MenuPanel } from './MenuPanel';
import { useLeftPanelVisible as useLPV, useSetLeftPanelVisible as useSetLPV } from '@/stores/ui-store';
import { useUIStore } from '@/stores/ui-store';
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

    // Animated drawer state for left panel
    const panelProgress = useRef(new Animated.Value(0)).current; // 0 hidden, 1 shown
    // Full-screen drawer when showing menu; history can still use same container
    const panelWidth = SCREEN_WIDTH;

    useEffect(() => {
        Animated.timing(panelProgress, {
            toValue: leftPanelVisible ? 1 : 0,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }, [leftPanelVisible]);

    // Push the drawer fully off-screen when hidden to avoid any sliver showing
    const hiddenOffset = panelWidth + 40; // extra to ensure fully off-screen
    const translateX = panelProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [-hiddenOffset, 0],
    });
    const overlayOpacity = panelProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.4],
    });

    return (
        <View style={theme.container}>
            <View style={theme.center}>
                {children}
            </View>
            {/* Overlay */}
            {(
                <TouchableWithoutFeedback onPress={leftPanelVisible ? onCloseLeft : undefined}>
                    <Animated.View pointerEvents={leftPanelVisible ? 'auto' : 'none'} style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: '#000',
                        opacity: overlayOpacity,
                        zIndex: 999,
                    }} />
                </TouchableWithoutFeedback>
            )}

            {/* Animated left drawer */}
            <Animated.View style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: panelWidth,
                height: '100%',
                zIndex: 1000,
                backgroundColor: theme.background,
                transform: [{ translateX }],
            }}>
                {useUIStore.getState().leftPanelContent === 'menu' ? (
                    <MenuPanel onClose={onCloseLeft} />
                ) : (
                    <LeftPanel isVisible={true} onClose={onCloseLeft} />
                )}
            </Animated.View>
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
