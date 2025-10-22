import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '@/hooks/useThemeColor';
import { X, Play, Pause, Download, Share, RotateCcw } from 'lucide-react-native';

interface VideoEditorModalProps {
  visible: boolean;
  onClose: () => void;
}

export const VideoEditorModal: React.FC<VideoEditorModalProps> = ({ visible, onClose }) => {
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const webViewRef = useRef<WebView>(null);

  // OpenCut URL - you can change this to your OpenCut instance
  const opencutUrl = 'https://opencut.app/projects';

  const handleWebViewLoad = () => {
    setIsLoading(false);
    setIsReady(true);
  };

  const handleWebViewError = () => {
    setIsLoading(false);
    Alert.alert(
      'Error',
      'Failed to load video editor. Please check your internet connection and try again.',
      [{ text: 'OK', onPress: onClose }]
    );
  };

  const handleMessage = (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      console.log('OpenCut message:', message);
      
      // Handle OpenCut protocol messages
      switch (message.type) {
        case 'opencut:ready':
          console.log('OpenCut editor is ready');
          break;
        case 'opencut:error':
          console.error('OpenCut error:', message.message);
          break;
        default:
          break;
      }
    } catch (error) {
      console.log('Non-JSON message from OpenCut:', event.nativeEvent.data);
    }
  };

  const sendMessageToOpenCut = (message: any) => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify(message));
    }
  };

  const handleHandshake = () => {
    sendMessageToOpenCut({ type: 'opencut:handshake', version: 1 });
  };

  const handleImportVideo = () => {
    // Example: Import a sample video
    const sampleVideoUrl = 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4';
    sendMessageToOpenCut({
      type: 'opencut:import',
      clips: [{ url: sampleVideoUrl, start: 0, track: 0 }]
    });
  };

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: theme.background,
      borderRadius: 16,
      width: '95%',
      height: '90%',
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    title: {
      fontSize: 18,
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
    toolbar: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    toolbarButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: theme.mutedWithOpacity(0.1),
    },
    toolbarButtonText: {
      marginLeft: 6,
      fontSize: 12,
      color: theme.foreground,
    },
    webViewContainer: {
      flex: 1,
      backgroundColor: '#000000',
    },
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    loadingContent: {
      backgroundColor: theme.background,
      borderRadius: 12,
      padding: 20,
      alignItems: 'center',
    },
    loadingText: {
      color: theme.foreground,
      fontSize: 16,
      marginTop: 12,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    errorText: {
      color: theme.mutedForeground,
      fontSize: 16,
      textAlign: 'center',
      marginBottom: 20,
    },
    retryButton: {
      backgroundColor: theme.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
    },
    retryButtonText: {
      color: theme.primaryForeground,
      fontSize: 16,
      fontWeight: '600',
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
            <Text style={styles.title}>Video Editor</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={20} color={theme.foreground} />
            </TouchableOpacity>
          </View>

          {/* Toolbar */}
          <View style={styles.toolbar}>
            <TouchableOpacity style={styles.toolbarButton} onPress={handleHandshake}>
              <Play size={16} color={theme.foreground} />
              <Text style={styles.toolbarButtonText}>Connect</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolbarButton} onPress={handleImportVideo}>
              <Download size={16} color={theme.foreground} />
              <Text style={styles.toolbarButtonText}>Import</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolbarButton} onPress={() => console.log('Share')}>
              <Share size={16} color={theme.foreground} />
              <Text style={styles.toolbarButtonText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolbarButton} onPress={() => console.log('Reset')}>
              <RotateCcw size={16} color={theme.foreground} />
              <Text style={styles.toolbarButtonText}>Reset</Text>
            </TouchableOpacity>
          </View>

          {/* WebView Container */}
          <View style={styles.webViewContainer}>
            <WebView
              ref={webViewRef}
              source={{ uri: opencutUrl }}
              style={styles.webViewContainer}
              onLoad={handleWebViewLoad}
              onError={handleWebViewError}
              onMessage={handleMessage}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
              scalesPageToFit={true}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              mixedContentMode="compatibility"
              userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1"
            />
            
            {/* Loading Overlay */}
            {isLoading && (
              <View style={styles.loadingOverlay}>
                <View style={styles.loadingContent}>
                  <Play size={32} color={theme.primary} />
                  <Text style={styles.loadingText}>Loading Video Editor...</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};
