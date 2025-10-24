import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView, Alert } from 'react-native';
import { useTheme } from '../hooks/useThemeColor';
import { Paperclip, ArrowUp, Settings, Bot, ChevronDown, Wrench, Brain, Database, Zap, X, File } from 'lucide-react-native';
import { AgentSelectionModal } from './AgentSelectionModal';
import { Agent } from '../services/agentService';
import { useAgentPreloader } from '../hooks/useAgentPreloader';
import { pickFiles, UploadedFile, handleLocalFiles } from '../utils/file-upload';
import { FileAttachment } from './FileAttachment';
import { useSelectedAgent } from '../stores/ui-store';

interface CreateWorkerChatInputProps {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: (message: string, selectedAgent?: Agent, attachedFiles?: UploadedFile[]) => void;
  onFileAttach?: () => void;
  onAgentSelect?: (agent: Agent) => void;
  onIntegrations?: () => void;
  onTools?: () => void;
  onInstructions?: () => void;
  onKnowledge?: () => void;
  onTriggers?: () => void;
}

export const CreateWorkerChatInput: React.FC<CreateWorkerChatInputProps> = ({
  placeholder = "Describe what you need help with...",
  value,
  onChangeText,
  onSubmit,
  onFileAttach,
  onAgentSelect,
  onIntegrations,
  onTools,
  onInstructions,
  onKnowledge,
  onTriggers,
}) => {
  const theme = useTheme();
  const globalSelectedAgent = useSelectedAgent();
  const [agentSelectionVisible, setAgentSelectionVisible] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<UploadedFile[]>([]);
  
  // Debug selectedAgent state changes
  useEffect(() => {
    console.log('🔍 globalSelectedAgent state changed:', globalSelectedAgent);
  }, [globalSelectedAgent]);
  
  // Preload agents when this component mounts
  useAgentPreloader();
  
  // Debug component lifecycle
  useEffect(() => {
    console.log('🔄 CreateWorkerChatInput mounted/updated');
    console.log('🔍 Initial globalSelectedAgent:', globalSelectedAgent);
  }, []);

  const handleAgentSelect = (agent: Agent) => {
    console.log('Agent selected in CreateWorkerChatInput:', agent.name);
    console.log('🔍 Calling onAgentSelect with:', agent);
    onAgentSelect?.(agent); // Call the original callback with the agent
  };

  const handleAgentButtonPress = () => {
    console.log('🔘 Agent button pressed - opening modal');
    setAgentSelectionVisible(true);
  };

  const handleFileAttach = async () => {
    try {
      console.log('📎 File attach button pressed');
      const result = await pickFiles();
      
      if (!result.cancelled && result.files && result.files.length > 0) {
        console.log(`📎 Selected ${result.files.length} files`);
        
        // Handle local files (no sandbox needed for CreateWorker)
        const uploadedFiles = await handleLocalFiles(
          result.files,
          () => {}, // setPendingFiles - not needed for local files
          (files) => setAttachedFiles(prev => [...prev, ...files])
        );
        
        console.log(`📎 Added ${uploadedFiles.length} files to attachments`);
        onFileAttach?.(); // Call the original callback if provided
      }
    } catch (error) {
      console.error('📎 Error handling file attachment:', error);
      Alert.alert('Error', 'Failed to attach files. Please try again.');
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const styles = StyleSheet.create({
    mainContainer: {
      marginHorizontal: 16,
      marginBottom: 16,
      marginTop: 20,
    },
    container: {
      backgroundColor: theme.background,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      borderWidth: 1,
      borderColor: theme.border,
      borderBottomWidth: 0,
      padding: 16,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 12,
    },
    textInput: {
      flex: 1,
      minHeight: 40,
      maxHeight: 120,
      fontSize: 16,
      color: theme.foreground,
      textAlignVertical: 'top',
    },
    controlsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 12,
    },
    leftControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    rightControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    controlButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.mutedWithOpacity(0.1),
      alignItems: 'center',
      justifyContent: 'center',
    },
    agentButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.mutedWithOpacity(0.1),
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      gap: 6,
    },
    agentButtonSelected: {
      backgroundColor: theme.primaryWithOpacity(0.1),
      borderWidth: 1,
      borderColor: theme.primary,
    },
    agentButtonText: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.foreground,
    },
    sendButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.mutedWithOpacity(0.1),
      alignItems: 'center',
      justifyContent: 'center',
    },
    categoriesContainer: {
      backgroundColor: theme.mutedWithOpacity(0.05),
      borderBottomLeftRadius: 16,
      borderBottomRightRadius: 16,
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      borderWidth: 1,
      borderColor: theme.border,
      borderTopWidth: 0,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    categoriesScroll: {
      flexDirection: 'row',
      gap: 8,
    },
    categoryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'transparent',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'transparent',
      gap: 6,
    },
    categoryButtonActive: {
      backgroundColor: theme.mutedWithOpacity(0.1),
      borderColor: theme.border,
    },
    categoryButtonText: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.mutedForeground,
    },
           categoryButtonTextActive: {
             color: theme.foreground,
           },
           attachedFilesContainer: {
             marginTop: 12,
             marginBottom: 8,
           },
           attachedFilesScroll: {
             flexDirection: 'row',
             gap: 8,
           },
           attachedFileItem: {
             position: 'relative',
             width: 80,
             height: 80,
           },
           removeFileButton: {
             position: 'absolute',
             top: -4,
             right: -4,
             width: 20,
             height: 20,
             borderRadius: 10,
             backgroundColor: theme.background,
             borderWidth: 1,
             borderColor: theme.border,
             alignItems: 'center',
             justifyContent: 'center',
             zIndex: 1,
           },
         });

  return (
    <View style={styles.mainContainer}>
      {/* Chat Input Container */}
      <View style={styles.container}>
               {/* Text Input */}
               <View style={styles.inputContainer}>
                 <TextInput
                   style={styles.textInput}
                   placeholder={placeholder}
                   placeholderTextColor={theme.mutedForeground}
                   value={value}
                   onChangeText={onChangeText}
                   multiline
                   textAlignVertical="top"
                 />
               </View>

               {/* Attached Files Display */}
               {attachedFiles.length > 0 && (
                 <View style={styles.attachedFilesContainer}>
                   <ScrollView 
                     horizontal 
                     showsHorizontalScrollIndicator={false}
                     contentContainerStyle={styles.attachedFilesScroll}
                   >
                     {attachedFiles.map((file, index) => (
                       <View key={index} style={styles.attachedFileItem}>
                         <FileAttachment
                           filepath={file.path}
                           localUri={file.localUri}
                           showPreview={true}
                           layout="inline"
                           isUploading={file.isUploading}
                           uploadError={file.uploadError}
                           uploadedBlob={file.cachedBlob}
                         />
                         <TouchableOpacity 
                           style={styles.removeFileButton}
                           onPress={() => removeFile(index)}
                         >
                           <X size={12} color={theme.mutedForeground} />
                         </TouchableOpacity>
                       </View>
                     ))}
                   </ScrollView>
                 </View>
               )}

        {/* Controls Row */}
        <View style={styles.controlsRow}>
                 <View style={styles.leftControls}>
                   {/* File Button */}
                   <TouchableOpacity style={styles.controlButton} onPress={handleFileAttach}>
                     <Paperclip size={16} color={theme.mutedForeground} />
                   </TouchableOpacity>
            
                   {/* Agent Selection Button */}
                   <TouchableOpacity 
                     style={[
                       styles.agentButton, 
                       globalSelectedAgent && styles.agentButtonSelected
                     ]} 
                     onPress={() => {
                       console.log('🔘 AGENT BUTTON PRESSED!');
                       handleAgentButtonPress();
                     }}
                     activeOpacity={0.7}
                   >
              {globalSelectedAgent ? (
                <>
                  <Bot size={14} color={theme.primary} />
                  <Text style={[styles.agentButtonText, { color: theme.primary, fontWeight: '600' }]}>
                    {globalSelectedAgent.name}
                  </Text>
                  <ChevronDown size={12} color={theme.primary} />
                </>
              ) : (
                <>
                  <Settings size={14} color={theme.mutedForeground} />
                  <Text style={styles.agentButtonText}>Select Agent</Text>
                  <ChevronDown size={12} color={theme.mutedForeground} />
                </>
              )}
            </TouchableOpacity>
          </View>
          
                 <View style={styles.rightControls}>
                   {/* Send Button */}
                   <TouchableOpacity 
                     style={styles.sendButton} 
                     onPress={() => {
                       if (value.trim() || attachedFiles.length > 0) {
                         console.log('🚀 SUBMITTING MESSAGE:');
                         console.log('📝 Message:', value);
                         console.log('📎 Attached Files:', attachedFiles.length);
                         console.log('🔍 Current globalSelectedAgent state:', globalSelectedAgent);
                         console.log('🤖 Selected Agent:', globalSelectedAgent ? {
                           id: globalSelectedAgent.agent_id,
                           name: globalSelectedAgent.name,
                           description: globalSelectedAgent.description
                         } : 'No agent selected');
                         console.log('📡 Will send to backend with agent:', globalSelectedAgent?.agent_id || 'null');
                         console.log('🚀 CALLING onSubmit with:', {
                           message: value,
                           agent: globalSelectedAgent?.agent_id || 'null',
                           files: attachedFiles.length
                         });
                         
                         onSubmit(value, globalSelectedAgent || undefined, attachedFiles);
                         console.log('✅ onSubmit call completed');
                         onChangeText('');
                         setAttachedFiles([]); // Clear files after submit
                       }
                     }}
                   >
                     <ArrowUp size={16} color={theme.mutedForeground} />
                   </TouchableOpacity>
                 </View>
        </View>
      </View>

      {/* Categories Row - Connected extension */}
      <View style={styles.categoriesContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
        >
          <TouchableOpacity style={styles.categoryButton} onPress={onIntegrations}>
            <Wrench size={14} color={theme.mutedForeground} />
            <Text style={styles.categoryButtonText}>Integrações</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.categoryButton} onPress={onTools}>
            <Wrench size={14} color={theme.mutedForeground} />
            <Text style={styles.categoryButtonText}>Tools</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.categoryButton} onPress={onInstructions}>
            <Brain size={14} color={theme.mutedForeground} />
            <Text style={styles.categoryButtonText}>Instruções</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.categoryButton} onPress={onKnowledge}>
            <Database size={14} color={theme.mutedForeground} />
            <Text style={styles.categoryButtonText}>Conhecimento</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.categoryButton} onPress={onTriggers}>
            <Zap size={14} color={theme.mutedForeground} />
            <Text style={styles.categoryButtonText}>Gatilhos</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Agent Selection Modal */}
      <AgentSelectionModal
        visible={agentSelectionVisible}
        onClose={() => setAgentSelectionVisible(false)}
        onAgentSelect={handleAgentSelect}
        selectedAgentId={globalSelectedAgent?.agent_id}
      />
    </View>
  );
};
