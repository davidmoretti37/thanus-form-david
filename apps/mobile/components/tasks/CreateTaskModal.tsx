import React, { useMemo, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { Clock, PlugZap, X } from 'lucide-react-native';
import { useTheme } from '@/hooks/useThemeColor';
import { useSelectedAgent } from '@/stores/ui-store';
import { agentService, Agent } from '@/services/agentService';
import { triggersService } from '@/services/triggersService';

import type { TriggerConfiguration } from '@/services/triggersService';

interface CreateTaskModalProps {
  visible: boolean;
  type: 'schedule' | 'event';
  onClose: () => void;
  onCreated?: () => void;
  mode?: 'create' | 'edit';
  existingTrigger?: TriggerConfiguration | null;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ visible, type, onClose, onCreated, mode = 'create', existingTrigger = null }) => {
  const theme = useTheme();
  const agent = useSelectedAgent();

  const styles = useMemo(() => StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.overlayColor,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: theme.background,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { color: theme.foreground, fontSize: 18, fontWeight: '600' },
    desc: { color: theme.mutedForeground, marginTop: 2 },
    field: { marginTop: 12 },
    label: { color: theme.mutedForeground, marginBottom: 6 },
    input: {
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.mutedWithOpacity(0.06),
      color: theme.foreground,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    row: { flexDirection: 'row', gap: 12 },
    half: { flex: 1 },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 16 },
    btn: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
    },
    btnPrimary: { borderColor: theme.primary, backgroundColor: theme.primary + '20' },
    btnText: { color: theme.foreground, fontWeight: '600' },
  }), [theme]);

  const [name, setName] = useState('Scheduled task');
  const [cron, setCron] = useState('0 9 * * *');
  const [timezone, setTimezone] = useState('UTC');
  const [prompt, setPrompt] = useState('Run the agent task.');
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(agent?.agent_id || null);
  const [showAgents, setShowAgents] = useState(false);
  const [composioId, setComposioId] = useState('');

  React.useEffect(() => {
    if (visible) {
      setSelectedAgentId(agent?.agent_id || null);
      agentService.getAgents(1, 50).then((res) => setAgents(res.agents)).catch(() => {});
      if (existingTrigger) {
        setName(existingTrigger.name || '');
        const cfg = existingTrigger.config || {} as any;
        if (type === 'schedule') {
          setCron(String(cfg.cron_expression || ''));
          setTimezone(String(cfg.timezone || 'UTC'));
          setPrompt(String(cfg.agent_prompt || ''));
        } else {
          setComposioId(String(cfg.composio_trigger_id || ''));
          setPrompt(String(cfg.agent_prompt || ''));
        }
        setSelectedAgentId(existingTrigger.agent_id || selectedAgentId);
      }
    }
  }, [visible, agent?.agent_id]);

  const submit = async () => {
    try {
      const targetAgentId = selectedAgentId || agent?.agent_id;
      if (!targetAgentId) {
        Alert.alert('Select an agent', 'Choose an agent before creating a task.');
        return;
      }

      if (type === 'schedule') {
        setLoading(true);
        if (mode === 'edit' && existingTrigger) {
          await triggersService.updateTrigger(existingTrigger.trigger_id, {
            name: name.trim(),
            config: {
              ...(existingTrigger.config || {}),
              cron_expression: cron.trim(),
              agent_prompt: prompt.trim(),
              timezone: timezone.trim() || 'UTC',
            },
          });
        } else {
          await triggersService.createTrigger(targetAgentId, {
            provider_id: 'schedule',
            name: name.trim() || 'Scheduled task',
            config: {
              cron_expression: cron.trim(),
              agent_prompt: prompt.trim(),
              timezone: timezone.trim() || 'UTC',
            },
          });
        }
        onCreated?.();
      } else {
        if (!composioId.trim()) {
          Alert.alert('Missing info', 'Provide a Composio Trigger ID.');
          return;
        }
        setLoading(true);
        if (mode === 'edit' && existingTrigger) {
          await triggersService.updateTrigger(existingTrigger.trigger_id, {
            name: name.trim(),
            config: {
              ...(existingTrigger.config || {}),
              composio_trigger_id: composioId.trim(),
              agent_prompt: prompt.trim(),
            },
          });
        } else {
          await triggersService.createTrigger(targetAgentId, {
            provider_id: 'composio',
            name: name.trim() || 'Event task',
            config: {
              composio_trigger_id: composioId.trim(),
              agent_prompt: prompt.trim(),
            },
          });
        }
        onCreated?.();
      }
    } catch (e: any) {
      Alert.alert('Failed to create task', e?.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              {type === 'schedule' ? <Clock size={18} color={theme.foreground} /> : <PlugZap size={18} color={theme.foreground} />}
              <Text style={styles.title}>{type === 'schedule' ? 'Create Scheduled Task' : 'Create Event-based Task'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Close">
              <X size={18} color={theme.mutedForeground} />
            </TouchableOpacity>
          </View>

          <Text style={styles.desc}>{selectedAgentId ? `Agent: ${agents.find(a=>a.agent_id===selectedAgentId)?.name || agent?.name || 'Selected'}` : 'No agent selected'}</Text>

          {/* Agent selector */}
          <TouchableOpacity style={styles.field} onPress={() => setShowAgents(v=>!v)}>
            <Text style={styles.label}>Choose agent</Text>
            <View style={[styles.input, { paddingVertical: 14 }]}> 
              <Text style={{ color: selectedAgentId ? theme.foreground : theme.placeholderText }}>
                {selectedAgentId ? (agents.find(a=>a.agent_id===selectedAgentId)?.name || 'Selected') : 'Tap to choose'}
              </Text>
            </View>
          </TouchableOpacity>
          {showAgents && (
            <View style={[styles.field, { maxHeight: 180 }]}> 
              <ScrollView>
                {agents.map((a) => (
                  <TouchableOpacity key={a.agent_id} style={[styles.input, { paddingVertical: 12, marginBottom: 8 }]} onPress={() => { setSelectedAgentId(a.agent_id); setShowAgents(false); }}>
                    <Text style={{ color: theme.foreground }}>{a.name}</Text>
                    <Text style={{ color: theme.mutedForeground, marginTop: 2 }} numberOfLines={1}>{a.description}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {type === 'schedule' ? (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>Name</Text>
                <TextInput value={name} onChangeText={setName} style={styles.input} placeholderTextColor={theme.placeholderText} placeholder="Daily summary" />
              </View>
              <View style={[styles.field, styles.row]}>
                <View style={styles.half}>
                  <Text style={styles.label}>Cron expression</Text>
                  <TextInput value={cron} onChangeText={setCron} style={styles.input} placeholderTextColor={theme.placeholderText} placeholder="0 9 * * *" />
                </View>
                <View style={styles.half}>
                  <Text style={styles.label}>Timezone</Text>
                  <TextInput value={timezone} onChangeText={setTimezone} style={styles.input} placeholderTextColor={theme.placeholderText} placeholder="UTC" />
                </View>
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Agent prompt</Text>
                <TextInput value={prompt} onChangeText={setPrompt} style={[styles.input, { height: 96 }]} multiline placeholderTextColor={theme.placeholderText} placeholder="Describe what the agent should do when this runs" />
              </View>
            </>
          ) : (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>Name</Text>
                <TextInput value={name} onChangeText={setName} style={styles.input} placeholderTextColor={theme.placeholderText} placeholder="New event task" />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Composio Trigger ID</Text>
                <TextInput value={composioId} onChangeText={setComposioId} style={styles.input} placeholderTextColor={theme.placeholderText} placeholder="e.g. n8x3k1..." />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Agent prompt</Text>
                <TextInput value={prompt} onChangeText={setPrompt} style={[styles.input, { height: 96 }]} multiline placeholderTextColor={theme.placeholderText} placeholder="What should the agent do when the event fires?" />
              </View>
            </>
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.btn} onPress={onClose} disabled={loading}>
              <Text style={styles.btnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={submit} disabled={loading}>
              <Text style={styles.btnText}>{loading ? 'Creating…' : 'Create'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};


