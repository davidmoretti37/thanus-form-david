import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Wrench } from 'lucide-react-native';

import { ParsedContent } from '@/api/chat-api';
import { useTheme } from '@/hooks/useThemeColor';
import { formatToolNameForDisplay } from '@/utils/xml-parser';

interface ChatSnackProps {
  toolCall?: ParsedContent | null;
  visible?: boolean;
  onPressTool?: () => void;
}

export const ChatSnack: React.FC<ChatSnackProps> = ({ toolCall, visible = false, onPressTool }) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const opacity = useRef(new Animated.Value(0)).current;
  const [shouldRender, setShouldRender] = useState(Boolean(toolCall) && visible);

  useEffect(() => {
    const nextVisible = Boolean(toolCall) && visible;

    if (nextVisible) {
      setShouldRender(true);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setShouldRender(false);
        }
      });
    }
  }, [toolCall, visible, opacity]);

  const toolName = useMemo(() => {
    if (!toolCall) return '';

    const rawName =
      toolCall.name ||
      toolCall.xml_tag_name ||
      toolCall.tool_execution?.function_name ||
      toolCall.content;

    if (!rawName) {
      return 'Tool';
    }

    try {
      return formatToolNameForDisplay(String(rawName));
    } catch (error) {
      return String(rawName);
    }
  }, [toolCall]);

  const argumentSummary = useMemo(() => {
    if (!toolCall) return '';

    const args = (toolCall as any).arguments || toolCall.tool_execution?.arguments;
    if (!args) return '';

    if (typeof args === 'string') {
      const trimmed = args.trim();
      return trimmed.length > 80 ? `${trimmed.slice(0, 77)}...` : trimmed;
    }

    if (typeof args !== 'object') return '';

    const entries = Object.entries(args).filter(([_, value]) => value !== undefined && value !== null);
    if (entries.length === 0) return '';

    const formatted = entries.slice(0, 2).map(([key, value]) => {
      const valueString = typeof value === 'object' ? JSON.stringify(value) : String(value);
      const truncated = valueString.length > 36 ? `${valueString.slice(0, 33)}...` : valueString;
      return `${key}: ${truncated}`;
    });

    return entries.length > 2 ? `${formatted.join(' • ')} • …` : formatted.join(' • ');
  }, [toolCall]);

  if (!shouldRender) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, { opacity }]}> 
      <TouchableOpacity
        style={styles.card}
        activeOpacity={onPressTool ? 0.85 : 1}
        onPress={onPressTool}
        disabled={!onPressTool}
      >
        <View style={styles.iconContainer}>
          <Wrench size={16} color={theme.primary} strokeWidth={2.5} />
        </View>

        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
            Running {toolName}
          </Text>
          {!!argumentSummary && (
            <Text style={styles.subtitle} numberOfLines={2} ellipsizeMode="tail">
              {argumentSummary}
            </Text>
          )}
        </View>

        <ActivityIndicator size="small" color={theme.primary} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      width: '100%',
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 18,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: theme.mutedWithOpacity(0.1),
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.foreground,
    },
    subtitle: {
      marginTop: 4,
      fontSize: 13,
      color: theme.mutedForeground,
    },
  });



