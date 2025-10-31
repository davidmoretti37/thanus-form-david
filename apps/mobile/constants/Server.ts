import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Prefer EXPO_PUBLIC_SERVER_URL from app.json → expo.extra
const EXTRA: any = Constants.expoConfig?.extra ?? {};
const BACKEND_URL =
  EXTRA.EXPO_PUBLIC_SERVER_URL ||
  EXTRA.EXPO_PUBLIC_BACKEND_URL ||
  process.env.EXPO_PUBLIC_SERVER_URL ||
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  'http://localhost:8000/api';

console.log('[Server] Config loaded:', {
  EXPO_PUBLIC_SERVER_URL: EXTRA.EXPO_PUBLIC_SERVER_URL,
  EXPO_PUBLIC_BACKEND_URL: EXTRA.EXPO_PUBLIC_BACKEND_URL,
  env_SERVER_URL: process.env.EXPO_PUBLIC_SERVER_URL,
  env_BACKEND_URL: process.env.EXPO_PUBLIC_BACKEND_URL,
  final_BACKEND_URL: BACKEND_URL,
});

// Handle React Native localhost issues
const getServerUrl = (): string => {
  let serverUrl = BACKEND_URL;
  
  if (Platform.OS === 'web') {
    return serverUrl;
  }
  
  // Only replace localhost/127.0.0.1 if explicitly set (not if a network IP is configured)
  // Trust the configured URL from app.json - it's already correct for the environment
  if (serverUrl.includes('localhost') || serverUrl.includes('127.0.0.1')) {
    // For physical devices or Android emulator, replace localhost with network IP
    // iOS Simulator can use localhost, but to be safe, use network IP too
    const networkIp = '192.168.1.23';
    console.log(`[Server] Replacing localhost with network IP: ${networkIp}`);
    serverUrl = serverUrl.replace('localhost', networkIp).replace('127.0.0.1', networkIp);
  }
  
  console.log(`[Server] Using backend URL: ${serverUrl} (Platform: ${Platform.OS}, Dev: ${__DEV__})`);
  return serverUrl;
};

export const SERVER_URL = getServerUrl();
