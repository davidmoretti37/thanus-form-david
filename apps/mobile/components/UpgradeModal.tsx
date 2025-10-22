import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useTheme } from '@/hooks/useThemeColor';
import { 
  Crown, 
  Sparkles, 
  Brain, 
  Zap, 
  Clock,
  X 
} from 'lucide-react-native';

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ visible, onClose, onUpgrade }) => {
  const theme = useTheme();
  
  // Debug theme values
  console.log('UpgradeModal theme:', {
    mode: theme.mode,
    primary: theme.primary,
    foreground: theme.foreground
  });

  const features = [
    {
      icon: <Brain size={16} color={theme.primary} />,
      title: 'Advanced AI Models',
      description: 'Get access to advanced models suited for complex tasks',
    },
    {
      icon: <Zap size={16} color={theme.primary} />,
      title: 'Faster Responses',
      description: 'Get access to faster models that breeze through your tasks',
    },
    {
      icon: <Clock size={16} color={theme.primary} />,
      title: 'Higher Usage Limits',
      description: 'Enjoy more conversations and longer run durations',
    },
  ];

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      backgroundColor: theme.background,
      borderRadius: 16,
      width: '100%',
      maxWidth: 400,
      maxHeight: '80%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
      borderWidth: 1,
      borderColor: theme.border,
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
    iconContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.primary + '20',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    headerText: {
      flex: 1,
    },
    title: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.foreground,
      marginBottom: 4,
    },
    description: {
      fontSize: 14,
      color: theme.mutedForeground,
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.mutedWithOpacity(0.1),
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    featuresTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.foreground,
      marginBottom: 16,
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    featureIconContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.primary + '10',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      marginTop: 2,
    },
    featureText: {
      flex: 1,
    },
    featureTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.foreground,
      marginBottom: 4,
    },
    featureDescription: {
      fontSize: 12,
      color: theme.mutedForeground,
      lineHeight: 16,
    },
    footer: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      gap: 12,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 12,
    },
    button: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    outlineButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.border,
    },
    primaryButton: {
      backgroundColor: '#1f2937', // Force dark color for now
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '500',
    },
    outlineButtonText: {
      color: theme.foreground,
    },
    primaryButtonText: {
      color: '#ffffff', // Force white text
    },
    buttonIcon: {
      marginRight: 8,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Crown size={18} color={theme.primary} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Unlock the Full Tars Experience</Text>
              <Text style={styles.description}>
                Upgrade to unlock Tars's full potential. Access our most powerful AI models and enhanced capabilities.
              </Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={16} color={theme.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.featuresTitle}>What you'll get:</Text>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={styles.featureIconContainer}>
                  {feature.icon}
                </View>
                <View style={styles.featureText}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[styles.button, styles.outlineButton]} 
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={[styles.buttonText, styles.outlineButtonText]}>Maybe Later</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, styles.primaryButton]} 
                onPress={onUpgrade}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Sparkles 
                    size={16} 
                    color="#ffffff" 
                    style={styles.buttonIcon} 
                  />
                  <Text style={[styles.buttonText, styles.primaryButtonText]}>Upgrade Now</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};
