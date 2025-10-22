import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { useTheme } from '@/hooks/useThemeColor';
import { X, Play, Pause, RotateCcw } from 'lucide-react-native';

interface StopwatchModalProps {
  visible: boolean;
  onClose: () => void;
}

export const StopwatchModal: React.FC<StopwatchModalProps> = ({ visible, onClose }) => {
  const theme = useTheme();
  const [ms, setMs] = useState(0);
  const [running, setRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => setMs((v) => v + 10), 10) as any;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [running]);

  const reset = () => {
    setMs(0);
    setRunning(false);
  };

  const formatTime = useMemo(() => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const mm = m % 60;
    const ss = s % 60;
    const cs = Math.floor((ms % 1000) / 10);
    return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  }, [ms]);

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
    timeDisplay: {
      fontSize: 32,
      fontWeight: '600',
      color: theme.foreground,
      textAlign: 'center',
      letterSpacing: 2,
      fontFamily: 'monospace',
      marginBottom: 40,
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 12,
    },
    button: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      minHeight: 48,
    },
    startButton: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    stopButton: {
      backgroundColor: theme.destructive,
      borderColor: theme.destructive,
    },
    resetButton: {
      backgroundColor: theme.mutedWithOpacity(0.1),
      borderColor: theme.border,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    startButtonText: {
      color: theme.primaryForeground,
    },
    stopButtonText: {
      color: theme.destructiveForeground,
    },
    resetButtonText: {
      color: theme.foreground,
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
            <Text style={styles.title}>Cronômetro</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={20} color={theme.foreground} />
            </TouchableOpacity>
          </View>

          {/* Time Display */}
          <Text style={styles.timeDisplay}>{formatTime}</Text>

          {/* Control Buttons */}
          <View style={styles.buttonContainer}>
            {!running ? (
              <TouchableOpacity
                style={[styles.button, styles.startButton]}
                onPress={() => setRunning(true)}
                activeOpacity={0.8}
              >
                <Play size={20} color={theme.primaryForeground} />
                <Text style={[styles.buttonText, styles.startButtonText]}>Iniciar</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.button, styles.stopButton]}
                onPress={() => setRunning(false)}
                activeOpacity={0.8}
              >
                <Pause size={20} color={theme.destructiveForeground} />
                <Text style={[styles.buttonText, styles.stopButtonText]}>Parar</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[styles.button, styles.resetButton]}
              onPress={reset}
              activeOpacity={0.8}
            >
              <RotateCcw size={20} color={theme.foreground} />
              <Text style={[styles.buttonText, styles.resetButtonText]}>Zerar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
