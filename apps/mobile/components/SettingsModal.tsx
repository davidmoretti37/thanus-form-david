import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert } from 'react-native';
import { useTheme } from '@/hooks/useThemeColor';
import { useAuth } from '@/hooks/useAuth';
import { useColorSchemeControls } from '@/hooks/useColorScheme';
import { 
  Zap, 
  CreditCard, 
  Plug, 
  Key, 
  Wrench, 
  Palette, 
  LogOut,
  ChevronRight 
} from 'lucide-react-native';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  onBilling: () => void;
  onIntegrations: () => void;
  onEnvManager: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ visible, onClose, onUpgrade, onBilling, onIntegrations, onEnvManager }) => {
  const theme = useTheme();
  const { signOut } = useAuth();
  const { colorScheme, setColorScheme } = useColorSchemeControls();

  const handleUpgrade = () => {
    onUpgrade(); // Use the prop from DashboardScreen
  };

  const handleBilling = () => {
    onBilling(); // Use the prop from DashboardScreen
  };

  const handleIntegrations = () => {
    onIntegrations(); // Use the prop from DashboardScreen
  };

  const handleApiKeys = () => {
    Alert.alert(
      'API Keys (Admin)',
      'API key management will be available soon!',
      [{ text: 'OK' }]
    );
    onClose();
  };

  const handleEnvManager = () => {
    onEnvManager(); // Use the prop from DashboardScreen
  };

  const handleThemeToggle = () => {
    setColorScheme?.(colorScheme === 'dark' ? 'light' : 'dark');
    onClose();
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              onClose();
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to log out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const settingsItems = [
    {
      id: 'upgrade',
      title: 'Upgrade',
      icon: <Zap size={18} color={theme.foreground} />,
      onPress: handleUpgrade,
    },
    {
      id: 'billing',
      title: 'Billing',
      icon: <CreditCard size={18} color={theme.foreground} />,
      onPress: handleBilling,
    },
    {
      id: 'integrations',
      title: 'Integrations',
      icon: <Plug size={18} color={theme.foreground} />,
      onPress: handleIntegrations,
    },
    {
      id: 'api-keys',
      title: 'API Keys (Admin)',
      icon: <Key size={18} color={theme.foreground} />,
      onPress: handleApiKeys,
    },
    {
      id: 'env-manager',
      title: 'Local .Env Manager',
      icon: <Wrench size={18} color={theme.foreground} />,
      onPress: handleEnvManager,
    },
    {
      id: 'theme',
      title: `Theme (${colorScheme === 'dark' ? 'Dark' : 'Light'})`,
      icon: <Palette size={18} color={theme.foreground} />,
      onPress: handleThemeToggle,
    },
    {
      id: 'logout',
      title: 'Log out',
      icon: <LogOut size={18} color="#ef4444" />,
      onPress: handleLogout,
      isDestructive: true,
    },
  ];

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-start',
      alignItems: 'flex-end',
      paddingTop: 100, // Position below the header
      paddingRight: 20,
    },
    modalContent: {
      backgroundColor: theme.background,
      borderRadius: 12,
      minWidth: 280,
      maxWidth: 320,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.foreground,
    },
    menuItems: {
      paddingVertical: 8,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
    },
    menuItemDestructive: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
    },
    menuItemText: {
      flex: 1,
      fontSize: 16,
      color: theme.foreground,
    },
    menuItemTextDestructive: {
      flex: 1,
      fontSize: 16,
      color: '#ef4444',
    },
    chevron: {
      opacity: 0.5,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <TouchableOpacity 
          style={styles.modalContent} 
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Personal Account</Text>
          </View>

          {/* Menu Items */}
          <View style={styles.menuItems}>
            {settingsItems.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={item.isDestructive ? styles.menuItemDestructive : styles.menuItem}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                {item.icon}
                <Text style={item.isDestructive ? styles.menuItemTextDestructive : styles.menuItemText}>
                  {item.title}
                </Text>
                <ChevronRight size={16} color={theme.mutedForeground} style={styles.chevron} />
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};
