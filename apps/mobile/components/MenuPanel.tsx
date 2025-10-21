import React from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemedStyles } from '@/hooks/useThemeColor';
import { Body, Caption, H3 } from './Typography';
import { ChevronLeft, MessageCircle, Briefcase, Zap } from 'lucide-react-native';

interface MenuPanelProps {
  onClose: () => void;
}

export const MenuPanel: React.FC<MenuPanelProps> = ({ onClose }) => {
  const styles = useThemedStyles((theme) => ({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    chevron: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginRight: 12,
      backgroundColor: theme.mutedWithOpacity(0.1),
    },
    headerTitle: {
      color: theme.foreground,
      fontSize: 14,
    },
    section: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    itemRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 10,
      marginTop: 12,
    },
    inlineChevron: {
      width: 32,
      height: 32,
      borderRadius: 10,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      backgroundColor: theme.mutedWithOpacity(0.1),
    },
    itemText: {
      color: theme.foreground,
      fontSize: 15,
    },
    bottomBar: {
      paddingHorizontal: 16,
      paddingVertical: 20,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    navRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      gap: 12,
    },
    navItem: {
      flex: 1,
      height: 68,
      borderRadius: 16,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      backgroundColor: theme.mutedWithOpacity(0.08),
      borderWidth: 1,
      borderColor: theme.border,
    },
    navLabel: {
      color: theme.foreground,
      fontSize: 13,
      marginTop: 6,
    },
  }));

  return (
    <SafeAreaView edges={['top','bottom']} style={styles.container}>
      {/* Removed top header so back button lives inline near content */}

      <ScrollView>
        <View style={[styles.section, { paddingTop: 16 }] }>
          <Caption style={{ opacity: 0.7 }}>Navigate</Caption>
          {/* Content area could list conversations/agents later */}
          <View style={[styles.itemRow, { marginTop: 16 }]}>
            <TouchableOpacity
              style={styles.inlineChevron}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Go back"
            >
              <ChevronLeft size={18} color={styles.itemText.color} />
            </TouchableOpacity>
            <Body style={styles.itemText}>Your automation Triggers will appear here</Body>
          </View>
        </View>
      </ScrollView>

      {/* Bottom navigation - three buttons */}
      <View style={styles.bottomBar}>
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.navItem} onPress={() => {}}>
            <MessageCircle size={20} color={styles.navLabel.color} />
            <Caption style={styles.navLabel}>Chats</Caption>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => {}}>
            <Briefcase size={20} color={styles.navLabel.color} />
            <Caption style={styles.navLabel}>Workers</Caption>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => {}}>
            <Zap size={20} color={styles.navLabel.color} />
            <Caption style={styles.navLabel}>Triggers</Caption>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};


