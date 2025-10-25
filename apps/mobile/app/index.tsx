import { AuthOverlay } from '@/components/AuthOverlay';
import { DashboardScreen } from '@/components/DashboardScreen';
import { ChatContainer } from '@/components/ChatContainer';
import { ArtifactsScreen } from '@/components/ArtifactsScreen';
import { PanelContainer } from '@/components/PanelContainer';
import { Skeleton } from '@/components/Skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useThemedStyles } from '@/hooks/useThemeColor';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useLeftPanelVisible, useSetLeftPanelVisible, useRightPanelVisible, useSetRightPanelVisible } from '@/stores/ui-store';

export default function HomeScreen() {
    const insets = useSafeAreaInsets();
    const { user, loading } = useAuth();
    const [currentView, setCurrentView] = useState<'dashboard' | 'chat' | 'artifacts'>('dashboard');
    
    // Panel state
    const leftPanelVisible = useLeftPanelVisible();
    const setLeftPanelVisible = useSetLeftPanelVisible();
    const rightPanelVisible = useRightPanelVisible();
    const setRightPanelVisible = useSetRightPanelVisible();

    const styles = useThemedStyles((theme) => ({
        container: {
            flex: 1,
            backgroundColor: theme.background,
        },
    }));

    if (loading) {
        return (
            <View style={styles.container}>
                <Skeleton />
            </View>
        );
    }

    if (!user) {
        return (
            <View style={styles.container}>
                <AuthOverlay
                    visible={true}
                    onClose={() => { }}
                />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {currentView === 'dashboard' ? (
                <DashboardScreen 
                    onNavigateToChat={() => setCurrentView('chat')}
                    onNavigateToArtifacts={() => setCurrentView('artifacts')}
                />
            ) : currentView === 'artifacts' ? (
                <ArtifactsScreen onBackPress={() => setCurrentView('dashboard')} />
            ) : (
                <PanelContainer
                    leftPanelVisible={leftPanelVisible}
                    rightPanelVisible={rightPanelVisible}
                    onCloseLeft={() => setLeftPanelVisible(false)}
                    onCloseRight={() => setRightPanelVisible(false)}
                    onOpenLeft={() => setLeftPanelVisible(true)}
                >
                    <ChatContainer onNavigateToDashboard={() => setCurrentView('dashboard')} />
                </PanelContainer>
            )}
        </View>
    );
}
