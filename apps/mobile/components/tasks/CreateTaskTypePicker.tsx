import React, { useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Clock, PlugZap, X } from 'lucide-react-native';
import { useTheme } from '@/hooks/useThemeColor';

interface CreateTaskTypePickerProps {
  visible: boolean;
  onClose: () => void;
  onPick: (type: 'schedule' | 'event') => void;
}

export const CreateTaskTypePicker: React.FC<CreateTaskTypePickerProps> = ({ visible, onClose, onPick }) => {
  const theme = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    overlay: { flex: 1, backgroundColor: theme.overlayColor, justifyContent: 'flex-end' },
    sheet: { backgroundColor: theme.background, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderWidth: 1, borderColor: theme.border, padding: 16 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    title: { color: theme.foreground, fontSize: 16, fontWeight: '600' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card, marginTop: 12 },
    optionTitle: { color: theme.foreground, fontWeight: '600' },
    optionDesc: { color: theme.mutedForeground, marginTop: 2 },
  }), [theme]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Choose task type</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Close">
              <X size={18} color={theme.mutedForeground} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.option} onPress={() => onPick('schedule')}>
            <Clock size={18} color={theme.foreground} />
            <View>
              <Text style={styles.optionTitle}>Scheduled Task</Text>
              <Text style={styles.optionDesc}>Run on a cron schedule</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={() => onPick('event')}>
            <PlugZap size={18} color={theme.foreground} />
            <View>
              <Text style={styles.optionTitle}>Event-based Task</Text>
              <Text style={styles.optionDesc}>Run when an external event occurs</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};



