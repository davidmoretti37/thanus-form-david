import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '@/hooks/useThemeColor';
import { X, Mic, MicOff, Play, Square, Download } from 'lucide-react-native';
import { Audio } from 'expo-av';

interface RecorderModalProps {
  visible: boolean;
  onClose: () => void;
}

export const RecorderModal: React.FC<RecorderModalProps> = ({ visible, onClose }) => {
  const theme = useTheme();
  const [recording, setRecording] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!visible) {
      stopRecording();
      setRecordingUri(null);
      setSound(null);
      setIsPlaying(false);
      setRecordingDuration(0);
    }
  }, [visible]);

  const startRecording = async () => {
    try {
      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Erro', 'Permissão de microfone necessária para gravar áudio.');
        return;
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      recordingRef.current = recording;
      setRecording(true);
      setRecordingDuration(0);

      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Erro', 'Não foi possível iniciar a gravação.');
    }
  };

  const stopRecording = async () => {
    try {
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        setRecordingUri(uri);
        recordingRef.current = null;
      }
      
      setRecording(false);
      
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  const playRecording = async () => {
    try {
      if (!recordingUri) return;

      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: recordingUri },
        { shouldPlay: true }
      );

      setSound(newSound);
      setIsPlaying(true);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch (error) {
      console.error('Failed to play recording:', error);
      Alert.alert('Erro', 'Não foi possível reproduzir a gravação.');
    }
  };

  const stopPlayback = async () => {
    try {
      if (sound) {
        await sound.stopAsync();
        setIsPlaying(false);
      }
    } catch (error) {
      console.error('Failed to stop playback:', error);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 80,
      paddingBottom: 80,
    },
    modalContent: {
      backgroundColor: theme.background,
      borderRadius: 16,
      width: '90%',
      maxWidth: 400,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 20,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 30,
    },
    title: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.foreground,
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.mutedWithOpacity(0.1),
      alignItems: 'center',
      justifyContent: 'center',
    },
    recordingSection: {
      alignItems: 'center',
      marginBottom: 30,
    },
    recordButton: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    recordButtonActive: {
      backgroundColor: theme.destructive,
    },
    recordButtonInactive: {
      backgroundColor: theme.primary,
    },
    durationText: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.foreground,
      fontFamily: 'monospace',
    },
    previewSection: {
      backgroundColor: theme.mutedWithOpacity(0.1),
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },
    previewTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.foreground,
      marginBottom: 12,
    },
    noAudioText: {
      fontSize: 12,
      color: theme.mutedForeground,
      textAlign: 'center',
      fontStyle: 'italic',
    },
    playbackControls: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 12,
      marginTop: 12,
    },
    playbackButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.mutedWithOpacity(0.1),
    },
    playbackButtonText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.foreground,
      marginLeft: 6,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Gravador</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={20} color={theme.foreground} />
            </TouchableOpacity>
          </View>

          {/* Recording Section */}
          <View style={styles.recordingSection}>
            <TouchableOpacity
              style={[
                styles.recordButton,
                recording ? styles.recordButtonActive : styles.recordButtonInactive,
              ]}
              onPress={recording ? stopRecording : startRecording}
              activeOpacity={0.8}
            >
              {recording ? (
                <Square size={32} color={theme.destructiveForeground} />
              ) : (
                <Mic size={32} color={theme.primaryForeground} />
              )}
            </TouchableOpacity>
            
            {recording && (
              <Text style={styles.durationText}>
                {formatDuration(recordingDuration)}
              </Text>
            )}
          </View>

          {/* Preview Section */}
          <View style={styles.previewSection}>
            <Text style={styles.previewTitle}>Prévia</Text>
            {recordingUri ? (
              <View>
                <Text style={styles.noAudioText}>
                  Gravação concluída ({formatDuration(recordingDuration)})
                </Text>
                <View style={styles.playbackControls}>
                  {!isPlaying ? (
                    <TouchableOpacity
                      style={styles.playbackButton}
                      onPress={playRecording}
                      activeOpacity={0.7}
                    >
                      <Play size={16} color={theme.foreground} />
                      <Text style={styles.playbackButtonText}>Reproduzir</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.playbackButton}
                      onPress={stopPlayback}
                      activeOpacity={0.7}
                    >
                      <Square size={16} color={theme.foreground} />
                      <Text style={styles.playbackButtonText}>Parar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ) : (
              <Text style={styles.noAudioText}>Sem áudio gravado</Text>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};
