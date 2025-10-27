import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Image, TouchableOpacity } from 'react-native';
import { useTheme } from '@/hooks/useThemeColor';
import { useColorSchemeControls } from '@/hooks/useColorScheme';
import { useAgentPreloader } from '@/hooks/useAgentPreloader';
import { DashboardCard } from './DashboardCard';
import type { DashboardCardProps } from './DashboardCard';
import { AnimatedKnowledgeBackground } from './AnimatedKnowledgeBackground';
import { IntegrationsModal } from './IntegrationsModal';
import { WorkersModal } from './WorkersModal';
import { TasksModal } from './TasksModal';
import { SettingsModal } from './SettingsModal';
import { UpgradeModal } from './UpgradeModal';
import { BillingModal } from './BillingModal';
import { EnvManagerModal } from './EnvManagerModal';
import { CalendarModal } from './CalendarModal';
import { AgentMentionInput } from './AgentMentionInput';
import { KnowledgeModal } from './KnowledgeModal';
import { Plus, Zap, CreditCard, Plug, KeyRound, Wrench, Palette, MessageSquare, Calendar, Bell, Settings, Sun, Moon, Database } from 'lucide-react-native';

interface DashboardScreenProps {
  onNavigateToChat: () => void;
  onNavigateToArtifacts: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ onNavigateToChat, onNavigateToArtifacts }) => {
  const theme = useTheme();
  const { colorScheme, setColorScheme } = useColorSchemeControls();
  
  // Preload agents when dashboard loads
  useAgentPreloader();
  
  // Debug theme values
  console.log('Theme object:', theme);
  console.log('Theme mode:', theme.mode);
  console.log('Theme isDark:', theme.isDark);
  console.log('Color scheme:', colorScheme);
  console.log('Should use fads.png?', colorScheme === 'dark');
  console.log('Should use fadzz.png?', colorScheme !== 'dark');
  console.log('Theme background:', theme.background);
  console.log('Is dark background?', theme.background === '#000000' || theme.background === '#1a1a1a');
  const [integrationsVisible, setIntegrationsVisible] = useState(false);
  const [workersVisible, setWorkersVisible] = useState(false);
  const [tasksVisible, setTasksVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [upgradeVisible, setUpgradeVisible] = useState(false);
  const [billingVisible, setBillingVisible] = useState(false);
  const [envManagerVisible, setEnvManagerVisible] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [knowledgeVisible, setKnowledgeVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [chatInputValue, setChatInputValue] = useState('');

  const handleUpgrade = () => {
    setSettingsVisible(false); // Close settings modal
    setUpgradeVisible(true); // Open upgrade modal
  };

  const handleUpgradeClose = () => {
    setUpgradeVisible(false);
  };

  const handleUpgradeNow = () => {
    setUpgradeVisible(false);
    // Here you would typically open billing modal or redirect to billing
    console.log('Upgrade Now pressed - billing integration coming soon');
  };

  const handleBilling = () => {
    setSettingsVisible(false); // Close settings modal
    setBillingVisible(true); // Open billing modal
  };

  const handleIntegrations = () => {
    setSettingsVisible(false); // Close settings modal
    setIntegrationsVisible(true); // Open integrations modal
  };

  const handleEnvManager = () => {
    setSettingsVisible(false); // Close settings modal
    setEnvManagerVisible(true); // Open env manager modal
  };

  const handleCalendar = () => {
    setCalendarVisible(true); // Open calendar modal
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    console.log('Selected date:', date.toDateString());
    // Here you could add additional logic for date selection
  };

  const handleChatSubmit = (message: string, selectedAgent?: any) => {
    console.log('Chat submitted:', message);
    if (selectedAgent) {
      console.log('With selected agent:', selectedAgent.name);
    }
    // Here you would typically navigate to chat with the message and agent
    // For now, just clear the input
    setChatInputValue('');
  };

  const handleThemeToggle = () => {
    // Toggle between light and dark mode
    const newTheme = colorScheme === 'dark' ? 'light' : 'dark';
    console.log('Current colorScheme:', colorScheme);
    console.log('Switching to:', newTheme);
    setColorScheme(newTheme);
    console.log('Theme switched to:', newTheme);
  };

  const dashboardCards: DashboardCardProps[] = [
    {
      title: 'Create Worker',
      description: 'Create your own Virtual Employees with Create Worker',
      icon: <Plus size={28} color="#ffffff" />,
      onPress: onNavigateToChat,
      size: 'medium' as const,
      image: colorScheme === 'dark' ? require('../assets/images/fads.png') : require('../assets/images/fadzz.png'),
      webGradients: []
    },
    {
      title: 'Artifacts',
      description: 'Micro-applications and creative tools',
      icon: <Zap size={26} color="#ffffff" />,
      onPress: onNavigateToArtifacts,
      size: 'medium' as const,
      image: colorScheme === 'dark' ? require('../assets/images/artifacts-image.png') : require('../assets/images/fadzz2.png'),
      webGradients: []
    },
    {
      title: 'Integrations',
      description: 'Connect external services and APIs',
      icon: <Plug size={24} color="#ffffff" />,
      onPress: () => setIntegrationsVisible(true),
      size: 'medium' as const,
      image: colorScheme === 'dark' ? require('../assets/images/integrations-image.png') : require('../assets/images/fadzz3.png'),
      webGradients: []
    },
    {
      title: 'Workers',
      description: 'Your specialized virtual employees',
      icon: <Wrench size={26} color="#ffffff" />,
      onPress: () => setWorkersVisible(true),
      size: 'medium' as const,
      image: colorScheme === 'dark' ? require('../assets/images/workers-image.png') : require('../assets/images/fadzz4.png'),
      webGradients: []
    },
    {
      title: 'Tasks',
      description: 'Automated tasks and triggers',
      icon: <MessageSquare size={24} color="#ffffff" />,
      onPress: () => setTasksVisible(true),
      size: 'medium' as const,
      image: colorScheme === 'dark' ? require('../assets/images/tasks-image.png') : require('../assets/images/fadzz5.png'),
      webGradients: []
    },
    {
      title: 'Jardim do Conhecimento',
      description: 'Organize documentos, insights e arquivos em um só lugar',
      icon: <Database size={26} color="#ffffff" />,
      onPress: () => setKnowledgeVisible(true),
      size: 'medium' as const,
      customBackground: ({ height, borderRadius }) => (
        <AnimatedKnowledgeBackground
          height={height}
          style={{
            marginBottom: 0,
            borderRadius,
            backgroundColor: 'transparent',
          }}
          showShimmer={false}
          accentColor="#16a34a"
          motionSpeedMultiplier={2}
          connectionIntensity={0.55}
        />
      ),
      disableDefaultBackground: true,
    },
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    logoContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    echoLogo: {
      height: 18,
      width: 60,
    },
    aiFirstLogo: {
      height: 20,
      width: 70,
    },
    headerIcons: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 16,
    },
    iconButton: {
      padding: 8,
      borderRadius: 8,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.foreground,
      marginBottom: 16,
    },
    chatInputContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.background,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      paddingHorizontal: 20,
      paddingVertical: 16,
      paddingBottom: 34, // Extra padding for safe area
    },
  });

  return (
    <>
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/images/Logo Echo.png')} 
            style={styles.echoLogo}
            resizeMode="contain"
            onError={() => console.log('Echo logo failed to load')}
          />
          <Image 
            source={require('../assets/images/Ai First.png')} 
            style={styles.aiFirstLogo}
            resizeMode="contain"
            onError={() => console.log('Ai First logo failed to load')}
          />
        </View>
                 <View style={styles.headerIcons}>
                   <TouchableOpacity 
                     style={styles.iconButton}
                     onPress={handleCalendar}
                   >
                     <Calendar size={20} color={theme.mutedForeground} />
                   </TouchableOpacity>
                   <TouchableOpacity style={styles.iconButton}>
                     <Bell size={20} color={theme.mutedForeground} />
                   </TouchableOpacity>
                   <TouchableOpacity 
                     style={styles.iconButton}
                     onPress={handleThemeToggle}
                   >
                     {colorScheme === 'dark' ? (
                       <Sun size={20} color={theme.mutedForeground} />
                     ) : (
                       <Moon size={20} color={theme.mutedForeground} />
                     )}
                   </TouchableOpacity>
                   <TouchableOpacity 
                     style={styles.iconButton}
                     onPress={() => setSettingsVisible(true)}
                   >
                     <Settings size={20} color={theme.mutedForeground} />
                   </TouchableOpacity>
                 </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Dashboard</Text>
        {dashboardCards.map((card, index) => (
          <DashboardCard
            key={index}
            title={card.title}
            description={card.description}
            icon={card.icon}
            onPress={card.onPress}
            size={card.size}
            image={card.image}
            webGradients={card.webGradients}
            customBackground={card.customBackground}
            disableDefaultBackground={card.disableDefaultBackground}
          />
        ))}
        
        {/* Add some bottom padding for the input */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Chat Input with Agent Mentions */}
      <View style={styles.chatInputContainer}>
        <AgentMentionInput
          placeholder="Use @ to call an agent..."
          value={chatInputValue}
          onChangeText={setChatInputValue}
          onSubmit={handleChatSubmit}
        />
      </View>
    </SafeAreaView>

    {/* Integrations Modal */}
    <IntegrationsModal
      visible={integrationsVisible}
      onClose={() => setIntegrationsVisible(false)}
    />

    {/* Workers Modal */}
    <WorkersModal
      visible={workersVisible}
      onClose={() => setWorkersVisible(false)}
      onNavigateToChat={onNavigateToChat}
    />

      {/* Tasks Modal */}
      <TasksModal
        visible={tasksVisible}
        onClose={() => setTasksVisible(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        onUpgrade={handleUpgrade}
        onBilling={handleBilling}
        onIntegrations={handleIntegrations}
        onEnvManager={handleEnvManager}
      />

      {/* Upgrade Modal */}
      <UpgradeModal
        visible={upgradeVisible}
        onClose={handleUpgradeClose}
        onUpgrade={handleUpgradeNow}
      />

      {/* Billing Modal */}
      <BillingModal
        visible={billingVisible}
        onClose={() => setBillingVisible(false)}
      />

             {/* Env Manager Modal */}
             <EnvManagerModal
               visible={envManagerVisible}
               onClose={() => setEnvManagerVisible(false)}
             />

             {/* Calendar Modal */}
             <CalendarModal
               visible={calendarVisible}
               onClose={() => setCalendarVisible(false)}
               value={selectedDate}
               onChange={handleDateSelect}
             />

    {/* Knowledge Modal */ }
    <KnowledgeModal
      visible={knowledgeVisible}
      onClose={() => setKnowledgeVisible(false)}
    />

           </>
         );
       };
