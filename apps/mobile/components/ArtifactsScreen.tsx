import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '@/hooks/useThemeColor';
import { Calculator, Clock3, Mic, PenTool, Film, FolderKanban, Cog, ArrowLeft } from 'lucide-react-native';
import { CalculatorModal } from './CalculatorModal';
import { StopwatchModal } from './StopwatchModal';
import { RecorderModal } from './RecorderModal';
import { CreateModal } from './CreateModal';
import { VideoEditorModal } from './VideoEditorModal';

interface ArtifactsScreenProps {
  onBackPress: () => void;
}

export const ArtifactsScreen: React.FC<ArtifactsScreenProps> = ({ onBackPress }) => {
  const theme = useTheme();
  const [calculatorVisible, setCalculatorVisible] = useState(false);
  const [stopwatchVisible, setStopwatchVisible] = useState(false);
  const [recorderVisible, setRecorderVisible] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [videoEditorVisible, setVideoEditorVisible] = useState(false);

  const microApps = [
    {
      id: 'calculator',
      name: 'Calculadora',
      description: 'Basic calculator functionality',
      icon: <Calculator size={24} color="#ffffff" />,
      onPress: () => {
        console.log('=== CALCULATOR CARD CLICKED ===');
        setCalculatorVisible(true);
      },
    },
    {
      id: 'stopwatch',
      name: 'Cronômetro',
      description: 'Timer and stopwatch app',
      icon: <Clock3 size={24} color="#ffffff" />,
      onPress: () => setStopwatchVisible(true),
    },
    {
      id: 'recorder',
      name: 'Gravador',
      description: 'Audio recording app',
      icon: <Mic size={24} color="#ffffff" />,
      onPress: () => setRecorderVisible(true),
    },
    {
      id: 'create',
      name: 'Criar',
      description: 'Drawing and creative tools',
      icon: <PenTool size={24} color="#ffffff" />,
      onPress: () => setCreateVisible(true),
    },
    {
      id: 'video-editor',
      name: 'Video Editor',
      description: 'Editor de vídeo',
      icon: <Film size={24} color="#ffffff" />,
      onPress: () => setVideoEditorVisible(true),
    },
    {
      id: 'settings',
      name: 'Configurações',
      description: 'Configuration and settings',
      icon: <Cog size={24} color="#ffffff" />,
      onPress: () => {
        console.log('Open Settings');
        // TODO: Navigate to settings
      },
      disabled: true,
    },
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.mutedWithOpacity(0.1),
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    headerContent: {
      flex: 1,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.foreground,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      color: theme.mutedForeground,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    appCard: {
      backgroundColor: theme.mutedWithOpacity(0.05),
      borderRadius: 16,
      padding: 20,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.border,
      flexDirection: 'row',
      alignItems: 'center',
    },
    appCardDisabled: {
      opacity: 0.5,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: theme.mutedWithOpacity(0.1),
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    appContent: {
      flex: 1,
    },
    appName: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.foreground,
      marginBottom: 4,
    },
    appDescription: {
      fontSize: 14,
      color: theme.mutedForeground,
    },
    openButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: theme.mutedWithOpacity(0.1),
      borderWidth: 1,
      borderColor: theme.border,
    },
    openButtonDisabled: {
      backgroundColor: theme.mutedWithOpacity(0.05),
      borderColor: theme.mutedWithOpacity(0.2),
    },
    openButtonText: {
      color: theme.foreground,
      fontSize: 14,
      fontWeight: '500',
    },
    openButtonTextDisabled: {
      color: theme.mutedForeground,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
            <ArrowLeft size={24} color={theme.foreground} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>TARS / Artefatos</Text>
            <Text style={styles.subtitle}>
              Micro-aplicações integradas para tarefas rápidas, com experiência visual inspirada no iPad.
            </Text>
          </View>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {microApps.map((app) => (
            <TouchableOpacity
              key={app.id}
              style={[styles.appCard, app.disabled && styles.appCardDisabled]}
              onPress={app.disabled ? undefined : app.onPress}
              activeOpacity={app.disabled ? 1 : 0.7}
            >
              <View style={styles.iconContainer}>
                {app.icon}
              </View>
              <View style={styles.appContent}>
                <Text style={styles.appName}>{app.name}</Text>
                <Text style={styles.appDescription}>{app.description}</Text>
              </View>
              <View
                style={[
                  styles.openButton,
                  app.disabled && styles.openButtonDisabled,
                ]}
              >
                <Text
                  style={[
                    styles.openButtonText,
                    app.disabled && styles.openButtonTextDisabled,
                  ]}
                >
                  {app.disabled ? 'Em breve' : 'Abrir'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
          
          {/* Add some bottom padding */}
          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Calculator Modal */}
        <CalculatorModal
          visible={calculatorVisible}
          onClose={() => setCalculatorVisible(false)}
        />

        {/* Stopwatch Modal */}
        <StopwatchModal
          visible={stopwatchVisible}
          onClose={() => setStopwatchVisible(false)}
        />

        {/* Recorder Modal */}
        <RecorderModal
          visible={recorderVisible}
          onClose={() => setRecorderVisible(false)}
        />

        {/* Create Modal */}
        <CreateModal
          visible={createVisible}
          onClose={() => setCreateVisible(false)}
        />

        {/* Video Editor Modal */}
        <VideoEditorModal
          visible={videoEditorVisible}
          onClose={() => setVideoEditorVisible(false)}
        />
      </SafeAreaView>
  );
};
