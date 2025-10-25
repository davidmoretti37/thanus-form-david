import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import 'react-native-url-polyfill/auto';

console.log('🚀 SUPABASE CONFIG LOADED 🚀');

// Debug environment variables
console.log('🔍 process.env.EXPO_PUBLIC_SUPABASE_URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
console.log('🔍 process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY:', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? 'Set (length: ' + process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY.length + ')' : 'Not set');

// Read from environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://yqbloumlsjjylabnoasg.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxYmxvdW1sc2pqeWxhYm5vYXNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MjY0MzcsImV4cCI6MjA3NDMwMjQzN30.Y0dgOB-zt_cQC_H787PhfHnZRwl9Uhou9jkY9FPtIbc';

console.log('✅ Final Supabase URL:', supabaseUrl);
console.log('✅ Final Supabase Key:', supabaseAnonKey ? 'Set (length: ' + supabaseAnonKey.length + ')' : 'Not set');

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Auto-refresh token when app becomes active
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

export const createSupabaseClient = () => {
  return supabase;
};

// Export server URL for other services
export const SERVER_URL = supabaseUrl;

// Export utility functions to avoid circular dependencies
export const getSupabaseSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting Supabase session:', error);
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('Error getting Supabase session:', error);
    return null;
  }
};

export const getSupabaseUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Error getting Supabase user:', error);
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Error getting Supabase user:', error);
    return null;
  }
};