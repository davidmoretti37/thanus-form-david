import React, { useMemo, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useTheme } from '@/hooks/useThemeColor';

type MCPType = 'http' | 'sse';

interface AddCustomMCPModalProps {
  visible: boolean;
  onClose: () => void;
  agentId: string;
  onSaved?: () => void;
  embedded?: boolean;
}

export const AddCustomMCPModal: React.FC<AddCustomMCPModalProps> = ({ visible, onClose, agentId, onSaved, embedded }) => {
  const theme = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    sheet: { width: '90%', backgroundColor: theme.background, borderRadius: 14, borderWidth: 1, borderColor: theme.border, padding: 16 },
    title: { color: theme.foreground, fontSize: 18, fontWeight: '600', marginBottom: 12 },
    label: { color: theme.mutedForeground, marginBottom: 6 },
    input: { borderWidth: 1, borderColor: theme.border, backgroundColor: theme.mutedWithOpacity(0.06), color: theme.foreground, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: theme.border },
    chipActive: { backgroundColor: theme.primary + '20', borderColor: theme.primary },
    footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
    btn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card },
    btnPrimary: { borderColor: theme.primary, backgroundColor: theme.primary + '20' },
    btnText: { color: theme.foreground, fontWeight: '600' },
  }), [theme]);

  const [serverType, setServerType] = useState<MCPType>('http');
  const [serverUrl, setServerUrl] = useState('');
  const [name, setName] = useState('Custom MCP');
  const [toolsCsv, setToolsCsv] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      if (!agentId) {
        Alert.alert('Select an agent', 'Open a chat and select an agent first, then add the MCP.');
        return;
      }
      if (!serverUrl.trim()) {
        Alert.alert('Missing URL', 'Please enter the MCP server URL.');
        return;
      }
      const enabledTools = toolsCsv
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      setSaving(true);
      const { toolsService } = await import('@/services/toolsService');
      await toolsService.updateAgentCustomMCPTools(agentId, serverType, serverUrl.trim(), enabledTools);
      onSaved?.();
      onClose();
    } catch (e: any) {
      Alert.alert('Failed to add MCP', e?.message || 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  const content = (
    <View style={[styles.overlay, embedded ? { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } : null]}>
      <View style={styles.sheet}>
        <Text style={styles.title}>Add Custom MCP</Text>
        <Text style={styles.label}>Type</Text>
        <View style={styles.row}>
          {(['http','sse'] as MCPType[]).map(t => (
            <TouchableOpacity key={t} onPress={() => setServerType(t)} style={[styles.chip, serverType===t && styles.chipActive]}>
              <Text style={styles.btnText}>{t.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>Server URL</Text>
        <TextInput style={styles.input} placeholder="https://server.example.com/mcp" placeholderTextColor={theme.placeholderText} value={serverUrl} onChangeText={setServerUrl} autoCapitalize="none" autoCorrect={false} />
        <Text style={styles.label}>Display name</Text>
        <TextInput style={styles.input} placeholder="Custom MCP" placeholderTextColor={theme.placeholderText} value={name} onChangeText={setName} />
        <Text style={styles.label}>Enabled tools (comma separated)</Text>
        <TextInput style={[styles.input, { height: 80 }]} placeholder="tool_one, tool_two" multiline placeholderTextColor={theme.placeholderText} value={toolsCsv} onChangeText={setToolsCsv} />
        <View style={styles.footer}>
          <TouchableOpacity onPress={onClose} style={styles.btn} disabled={saving}><Text style={styles.btnText}>Cancel</Text></TouchableOpacity>
          <TouchableOpacity onPress={handleSave} style={[styles.btn, styles.btnPrimary]} disabled={saving}><Text style={styles.btnText}>{saving ? 'Saving…' : 'Save'}</Text></TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (embedded) return content;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {content}
    </Modal>
  );
};

export default AddCustomMCPModal;



